/**
 * Document Ingestion Service for MUNIPAL Knowledge Base
 *
 * Handles ingestion of official CoJ documents (tariff schedules, by-laws, etc.)
 * Primary method: PDF upload from admin
 *
 * Every document is:
 * - Hashed (SHA-256) for deduplication and audit
 * - Text-extracted for search and RAG
 * - Stored with full provenance metadata
 */

import { prisma } from '../db';
import { createHash } from 'crypto';
import pdf from 'pdf-parse';
import { DocumentCategory, IngestionMethod } from '@prisma/client';
import type { DocumentIngestionInput, DocumentIngestionResult } from './types';

/**
 * Calculate SHA-256 checksum of a buffer
 */
export function calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const data = await pdf(buffer);
    return {
      text: data.text,
      pageCount: data.numpages,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ingest a PDF document into the knowledge base
 *
 * @param pdfBuffer - The raw PDF file buffer
 * @param input - Document metadata
 * @returns Ingestion result with document ID if successful
 */
export async function ingestPdfDocument(
  pdfBuffer: Buffer,
  input: DocumentIngestionInput
): Promise<DocumentIngestionResult> {
  try {
    // 1. Calculate checksum for deduplication
    const checksum = calculateChecksum(pdfBuffer);

    // 2. Check for duplicate
    const existing = await prisma.knowledgeDocument.findFirst({
      where: {
        provider: input.provider,
        documentType: input.documentType,
        financialYear: input.financialYear,
        checksum,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Document already exists with ID: ${existing.id}`,
        documentId: existing.id,
        checksum,
      };
    }

    // 3. Extract text from PDF
    const { text, pageCount } = await extractTextFromPdf(pdfBuffer);

    // 4. Store in database
    const document = await prisma.knowledgeDocument.create({
      data: {
        provider: input.provider,
        documentType: input.documentType,
        category: input.category,
        financialYear: input.financialYear,
        title: input.title,
        description: input.description,
        effectiveDate: input.effectiveDate,
        expiryDate: input.expiryDate,
        sourceUrl: input.sourceUrl,
        checksum,
        rawText: text,
        rawPdfBase64: pdfBuffer.toString('base64'),
        pageCount,
        ingestionMethod: input.ingestionMethod,
        ingestedBy: input.ingestedBy,
        isActive: true,
        isVerified: false,
      },
    });

    // 5. Create text chunks for RAG (simple page-based chunking)
    const chunks = splitTextIntoChunks(text, pageCount);
    await prisma.knowledgeChunk.createMany({
      data: chunks.map((chunk, index) => ({
        documentId: document.id,
        content: chunk.content,
        chunkIndex: index,
        pageNumber: chunk.pageNumber,
        section: chunk.section,
      })),
    });

    return {
      success: true,
      documentId: document.id,
      checksum,
      pageCount,
    };
  } catch (error) {
    console.error('Document ingestion error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown ingestion error',
    };
  }
}

/**
 * Simple text chunking for RAG
 * Splits text into ~1000 character chunks with overlap
 */
function splitTextIntoChunks(
  text: string,
  pageCount: number
): { content: string; pageNumber?: number; section?: string }[] {
  const chunks: { content: string; pageNumber?: number; section?: string }[] = [];
  const chunkSize = 1000;
  const overlap = 100;

  // If we have page markers, try to split by page
  const pageMarkers = text.match(/Page \d+/gi);

  if (pageMarkers && pageMarkers.length > 0) {
    // Split by page markers
    const pages = text.split(/(?=Page \d+)/i);
    pages.forEach((page, idx) => {
      if (page.trim()) {
        chunks.push({
          content: page.trim(),
          pageNumber: idx + 1,
        });
      }
    });
  } else {
    // Simple character-based chunking
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      if (chunk.trim()) {
        chunks.push({
          content: chunk.trim(),
          pageNumber: Math.ceil((i / text.length) * pageCount) || 1,
        });
      }
    }
  }

  return chunks;
}

/**
 * Mark a document as verified by admin
 */
export async function verifyDocument(
  documentId: string,
  verifiedBy: string,
  notes?: string
): Promise<void> {
  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy,
      verificationNotes: notes,
    },
  });
}

/**
 * Get active documents for a provider and financial year
 */
export async function getActiveDocuments(
  provider?: string,
  financialYear?: string
) {
  return prisma.knowledgeDocument.findMany({
    where: {
      isActive: true,
      ...(provider && { provider }),
      ...(financialYear && { financialYear }),
    },
    select: {
      id: true,
      provider: true,
      documentType: true,
      category: true,
      financialYear: true,
      title: true,
      description: true,
      effectiveDate: true,
      expiryDate: true,
      pageCount: true,
      isVerified: true,
      verifiedAt: true,
      ingestedAt: true,
      checksum: true,
    },
    orderBy: [
      { provider: 'asc' },
      { financialYear: 'desc' },
    ],
  });
}

/**
 * Get document with full content (for admin viewing)
 */
export async function getDocumentWithContent(documentId: string) {
  return prisma.knowledgeDocument.findUnique({
    where: { id: documentId },
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
      },
      tariffRules: true,
    },
  });
}

/**
 * Deactivate a document (soft delete)
 */
export async function deactivateDocument(documentId: string): Promise<void> {
  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: { isActive: false },
  });
}

/**
 * Get ingestion stats for admin dashboard
 */
export async function getIngestionStats() {
  const [totalDocs, verifiedDocs, activeRules, providers] = await Promise.all([
    prisma.knowledgeDocument.count({ where: { isActive: true } }),
    prisma.knowledgeDocument.count({ where: { isActive: true, isVerified: true } }),
    prisma.tariffRule.count({ where: { isActive: true } }),
    prisma.knowledgeDocument.groupBy({
      by: ['provider'],
      where: { isActive: true },
      _count: { id: true },
    }),
  ]);

  return {
    totalDocuments: totalDocs,
    verifiedDocuments: verifiedDocs,
    activeTariffRules: activeRules,
    documentsByProvider: providers.reduce((acc, p) => {
      acc[p.provider] = p._count.id;
      return acc;
    }, {} as Record<string, number>),
  };
}
