/**
 * Admin API: Knowledge Document Management
 *
 * POST /api/admin/documents - Upload new document
 * GET /api/admin/documents - List all documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { DocumentCategory, IngestionMethod } from '@prisma/client';
import {
  ingestPdfDocument,
  getActiveDocuments,
  getIngestionStats,
} from '@/lib/knowledge/document-ingestion';

// Validate admin access (simple check for now - enhance with proper auth)
function isAdminRequest(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  // In production, use proper authentication
  return adminKey === process.env.ADMIN_API_KEY || process.env.NODE_ENV === 'development';
}

/**
 * POST: Upload a new knowledge document
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Get metadata from form
    const provider = formData.get('provider') as string;
    const documentType = formData.get('documentType') as string;
    const category = formData.get('category') as DocumentCategory;
    const financialYear = formData.get('financialYear') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const effectiveDate = formData.get('effectiveDate') as string;
    const expiryDate = formData.get('expiryDate') as string | null;
    const sourceUrl = formData.get('sourceUrl') as string | null;
    const ingestedBy = formData.get('ingestedBy') as string | null;

    // Validate required fields
    if (!provider || !documentType || !category || !financialYear || !title || !effectiveDate) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, documentType, category, financialYear, title, effectiveDate' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Ingest the document
    const result = await ingestPdfDocument(buffer, {
      provider: provider as 'city_power' | 'joburg_water' | 'coj' | 'pikitup',
      documentType: documentType as 'tariff_schedule' | 'by_law' | 'rates_policy' | 'credit_control',
      category,
      financialYear,
      title,
      description: description || undefined,
      effectiveDate: new Date(effectiveDate),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      sourceUrl: sourceUrl || undefined,
      ingestionMethod: IngestionMethod.PDF_UPLOAD,
      ingestedBy: ingestedBy || undefined,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        documentId: result.documentId,
        checksum: result.checksum,
        pageCount: result.pageCount,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error, documentId: result.documentId },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

/**
 * GET: List all documents with optional filtering
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || undefined;
    const financialYear = searchParams.get('financialYear') || undefined;
    const includeStats = searchParams.get('stats') === 'true';

    const documents = await getActiveDocuments(provider, financialYear);

    if (includeStats) {
      const stats = await getIngestionStats();
      return NextResponse.json({ documents, stats });
    }

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    );
  }
}
