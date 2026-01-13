/**
 * Admin API: Single Document Operations
 *
 * GET /api/admin/documents/[id] - Get document details
 * PUT /api/admin/documents/[id] - Update/verify document
 * DELETE /api/admin/documents/[id] - Deactivate document
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentWithContent,
  verifyDocument,
  deactivateDocument,
} from '@/lib/knowledge/document-ingestion';
import { extractTariffRulesFromDocument } from '@/lib/knowledge/tariff-extraction';

function isAdminRequest(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_API_KEY || process.env.NODE_ENV === 'development';
}

/**
 * GET: Get document with full content and extracted rules
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const document = await getDocumentWithContent(id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Don't send full PDF base64 in list view - only in explicit download
    const { rawPdfBase64, ...docWithoutPdf } = document;

    return NextResponse.json({
      document: docWithoutPdf,
      hasPdf: !!rawPdfBase64,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update document (verify or extract tariffs)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, verifiedBy, notes } = body;

    if (action === 'verify') {
      if (!verifiedBy) {
        return NextResponse.json({ error: 'verifiedBy required' }, { status: 400 });
      }
      await verifyDocument(id, verifiedBy, notes);
      return NextResponse.json({ success: true, action: 'verified' });
    }

    if (action === 'extract') {
      const result = await extractTariffRulesFromDocument(id);
      return NextResponse.json({
        success: result.success,
        rulesExtracted: result.rulesExtracted,
        errors: result.errors,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "verify" or "extract"' }, { status: 400 });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Deactivate document (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deactivateDocument(id);
    return NextResponse.json({ success: true, action: 'deactivated' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
