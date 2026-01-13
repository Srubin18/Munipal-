/**
 * Admin API: Single Tariff Rule Operations
 *
 * GET /api/admin/tariffs/[id] - Get rule details
 * PUT /api/admin/tariffs/[id] - Verify or update rule
 * DELETE /api/admin/tariffs/[id] - Deactivate rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyTariffRule } from '@/lib/knowledge/tariff-extraction';

function isAdminRequest(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_API_KEY || process.env.NODE_ENV === 'development';
}

/**
 * GET: Get tariff rule details
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

    const rule = await prisma.tariffRule.findUnique({
      where: { id },
      include: {
        knowledgeDocument: {
          select: {
            id: true,
            title: true,
            provider: true,
            documentType: true,
            financialYear: true,
            sourceUrl: true,
          },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Error fetching rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Verify or update tariff rule
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
    const { action, verifiedBy, notes, pricingStructure, sourceExcerpt } = body;

    if (action === 'verify') {
      if (!verifiedBy) {
        return NextResponse.json({ error: 'verifiedBy required' }, { status: 400 });
      }
      await verifyTariffRule(id, verifiedBy, notes);
      return NextResponse.json({ success: true, action: 'verified' });
    }

    if (action === 'update') {
      // Allow updating pricing structure and source excerpt for corrections
      await prisma.tariffRule.update({
        where: { id },
        data: {
          ...(pricingStructure && { pricingStructure }),
          ...(sourceExcerpt && { sourceExcerpt }),
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, action: 'updated' });
    }

    return NextResponse.json({ error: 'Invalid action. Use "verify" or "update"' }, { status: 400 });
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Deactivate tariff rule
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

    await prisma.tariffRule.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, action: 'deactivated' });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
