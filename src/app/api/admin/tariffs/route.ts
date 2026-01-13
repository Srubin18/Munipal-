/**
 * Admin API: Tariff Rule Management
 *
 * GET /api/admin/tariffs - List all tariff rules
 * POST /api/admin/tariffs - Add manual tariff rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addManualTariffRule, getUnverifiedRules } from '@/lib/knowledge/tariff-extraction';
import { ExtractionMethod } from '@prisma/client';
import type { TariffRuleInput } from '@/lib/knowledge/types';

function isAdminRequest(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_API_KEY || process.env.NODE_ENV === 'development';
}

/**
 * GET: List tariff rules with optional filtering
 */
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || undefined;
    const serviceType = searchParams.get('serviceType') || undefined;
    const financialYear = searchParams.get('financialYear') || undefined;
    const verifiedOnly = searchParams.get('verified') === 'true';
    const unverifiedOnly = searchParams.get('unverified') === 'true';

    if (unverifiedOnly) {
      const rules = await getUnverifiedRules();
      return NextResponse.json({ rules, unverifiedCount: rules.length });
    }

    const rules = await prisma.tariffRule.findMany({
      where: {
        isActive: true,
        ...(provider && { provider }),
        ...(serviceType && { serviceType }),
        ...(financialYear && { financialYear }),
        ...(verifiedOnly && { isVerified: true }),
      },
      include: {
        knowledgeDocument: {
          select: {
            id: true,
            title: true,
            provider: true,
          },
        },
      },
      orderBy: [
        { financialYear: 'desc' },
        { provider: 'asc' },
        { serviceType: 'asc' },
      ],
    });

    // Calculate stats
    const stats = {
      total: rules.length,
      verified: rules.filter(r => r.isVerified).length,
      byProvider: {} as Record<string, number>,
      byServiceType: {} as Record<string, number>,
    };

    rules.forEach(r => {
      stats.byProvider[r.provider] = (stats.byProvider[r.provider] || 0) + 1;
      stats.byServiceType[r.serviceType] = (stats.byServiceType[r.serviceType] || 0) + 1;
    });

    return NextResponse.json({ rules, stats });
  } catch (error) {
    console.error('Error fetching tariff rules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fetch failed' },
      { status: 500 }
    );
  }
}

/**
 * POST: Add a manual tariff rule
 */
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      knowledgeDocumentId,
      provider,
      serviceType,
      tariffCode,
      customerCategory,
      description,
      pricingStructure,
      vatRate,
      vatInclusive,
      effectiveDate,
      expiryDate,
      financialYear,
      sourcePageNumber,
      sourceExcerpt,
      sourceTableReference,
    } = body;

    // Validate required fields
    if (!knowledgeDocumentId || !provider || !serviceType || !tariffCode ||
        !customerCategory || !description || !pricingStructure ||
        !effectiveDate || !financialYear || !sourceExcerpt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const input: TariffRuleInput = {
      knowledgeDocumentId,
      provider,
      serviceType,
      tariffCode,
      customerCategory,
      description,
      pricingStructure,
      vatRate: vatRate ?? 15,
      vatInclusive: vatInclusive ?? false,
      effectiveDate: new Date(effectiveDate),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      financialYear,
      sourcePageNumber,
      sourceExcerpt,
      sourceTableReference,
      extractionMethod: ExtractionMethod.MANUAL,
    };

    const ruleId = await addManualTariffRule(input);

    return NextResponse.json({ success: true, ruleId });
  } catch (error) {
    console.error('Error adding tariff rule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Add failed' },
      { status: 500 }
    );
  }
}
