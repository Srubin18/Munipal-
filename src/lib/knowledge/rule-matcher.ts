/**
 * Rule Matcher Service for MUNIPAL
 *
 * Matches bill line items to the appropriate TariffRule.
 * Returns the matched rule with confidence and source citation.
 *
 * Matching hierarchy:
 * 1. Verified rules for current financial year
 * 2. Unverified rules for current financial year (lower confidence)
 * 3. Previous financial year rules (even lower confidence)
 * 4. No match - flag for admin attention
 */

import { prisma } from '../db';
import type { RuleMatchResult, RuleMatchCriteria, PricingStructure } from './types';

/**
 * Find matching tariff rule for given criteria
 */
export async function findMatchingRule(
  criteria: RuleMatchCriteria
): Promise<RuleMatchResult | null> {
  const {
    provider,
    serviceType,
    customerCategory,
    asOfDate = new Date(),
    financialYear,
  } = criteria;

  // Determine financial year if not provided
  const targetFinancialYear = financialYear || getCurrentFinancialYear(asOfDate);

  // 1. Try verified rule for current financial year
  let rule = await prisma.tariffRule.findFirst({
    where: {
      provider,
      serviceType,
      customerCategory,
      financialYear: targetFinancialYear,
      isActive: true,
      isVerified: true,
      effectiveDate: { lte: asOfDate },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: asOfDate } },
      ],
    },
    include: {
      knowledgeDocument: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      effectiveDate: 'desc',
    },
  });

  if (rule) {
    return {
      tariffRuleId: rule.id,
      knowledgeDocumentId: rule.knowledgeDocumentId,
      confidence: 95,
      sourcePageNumber: rule.sourcePageNumber ?? undefined,
      sourceExcerpt: rule.sourceExcerpt,
      pricingStructure: rule.pricingStructure as unknown as PricingStructure,
      financialYear: rule.financialYear,
      isVerified: true,
    };
  }

  // 2. Try unverified rule for current financial year
  rule = await prisma.tariffRule.findFirst({
    where: {
      provider,
      serviceType,
      customerCategory,
      financialYear: targetFinancialYear,
      isActive: true,
      isVerified: false,
      effectiveDate: { lte: asOfDate },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: asOfDate } },
      ],
    },
    include: {
      knowledgeDocument: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      extractionConfidence: 'desc',
    },
  });

  if (rule) {
    // Confidence based on extraction confidence
    const baseConfidence = Number(rule.extractionConfidence) || 70;
    return {
      tariffRuleId: rule.id,
      knowledgeDocumentId: rule.knowledgeDocumentId,
      confidence: Math.min(baseConfidence, 80), // Cap at 80 for unverified
      sourcePageNumber: rule.sourcePageNumber ?? undefined,
      sourceExcerpt: rule.sourceExcerpt,
      pricingStructure: rule.pricingStructure as unknown as PricingStructure,
      financialYear: rule.financialYear,
      isVerified: false,
    };
  }

  // 3. Try previous financial year
  const previousFinancialYear = getPreviousFinancialYear(targetFinancialYear);
  rule = await prisma.tariffRule.findFirst({
    where: {
      provider,
      serviceType,
      customerCategory,
      financialYear: previousFinancialYear,
      isActive: true,
    },
    include: {
      knowledgeDocument: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: [
      { isVerified: 'desc' },
      { extractionConfidence: 'desc' },
    ],
  });

  if (rule) {
    return {
      tariffRuleId: rule.id,
      knowledgeDocumentId: rule.knowledgeDocumentId,
      confidence: rule.isVerified ? 60 : 40, // Lower confidence for old rules
      sourcePageNumber: rule.sourcePageNumber ?? undefined,
      sourceExcerpt: `[Previous year: ${previousFinancialYear}] ${rule.sourceExcerpt}`,
      pricingStructure: rule.pricingStructure as unknown as PricingStructure,
      financialYear: rule.financialYear,
      isVerified: rule.isVerified,
    };
  }

  // 4. No match found - create alert for admin
  await createMissingTariffAlert(provider, serviceType, targetFinancialYear);

  return null;
}

/**
 * Get all matching rules (for admin review of conflicts)
 */
export async function findAllMatchingRules(
  criteria: RuleMatchCriteria
): Promise<RuleMatchResult[]> {
  const {
    provider,
    serviceType,
    customerCategory,
    asOfDate = new Date(),
    financialYear,
  } = criteria;

  const rules = await prisma.tariffRule.findMany({
    where: {
      provider,
      serviceType,
      customerCategory,
      ...(financialYear && { financialYear }),
      isActive: true,
    },
    include: {
      knowledgeDocument: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: [
      { financialYear: 'desc' },
      { isVerified: 'desc' },
      { extractionConfidence: 'desc' },
    ],
  });

  return rules.map(rule => ({
    tariffRuleId: rule.id,
    knowledgeDocumentId: rule.knowledgeDocumentId,
    confidence: rule.isVerified ? 95 : (Number(rule.extractionConfidence) || 70),
    sourcePageNumber: rule.sourcePageNumber ?? undefined,
    sourceExcerpt: rule.sourceExcerpt,
    pricingStructure: rule.pricingStructure as unknown as PricingStructure,
    financialYear: rule.financialYear,
    isVerified: rule.isVerified,
  }));
}

/**
 * Determine financial year from a date
 * CoJ financial year runs July 1 to June 30
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month >= 7) {
    // July onwards = current/next year
    return `${year}/${(year + 1).toString().slice(2)}`;
  } else {
    // Before July = previous/current year
    return `${year - 1}/${year.toString().slice(2)}`;
  }
}

/**
 * Get previous financial year string
 */
function getPreviousFinancialYear(fy: string): string {
  const match = fy.match(/(\d{4})\/(\d{2})/);
  if (!match) return '2024/25'; // Fallback

  const startYear = parseInt(match[1]) - 1;
  return `${startYear}/${(startYear + 1).toString().slice(2)}`;
}

/**
 * Create alert for missing tariff (admin dashboard)
 */
async function createMissingTariffAlert(
  provider: string,
  serviceType: string,
  financialYear: string
): Promise<void> {
  try {
    await prisma.missingTariffAlert.upsert({
      where: {
        provider_serviceType_financialYear: {
          provider,
          serviceType,
          financialYear,
        },
      },
      update: {
        affectedAnalysisCount: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        provider,
        serviceType,
        financialYear,
        affectedAnalysisCount: 1,
        priority: 'high',
        status: 'open',
        suggestedUrls: getSuggestedUrls(provider),
      },
    });
  } catch (error) {
    // Don't fail the main request if alert creation fails
    console.error('Failed to create missing tariff alert:', error);
  }
}

/**
 * Get suggested URLs for finding tariff documents
 */
function getSuggestedUrls(provider: string): string[] {
  const urls: Record<string, string[]> = {
    city_power: [
      'https://www.citypower.co.za/customers/Pages/Tariffs.aspx',
      'https://www.joburg.org.za/documents',
    ],
    joburg_water: [
      'https://www.johannesburgwater.co.za/tariffs/',
      'https://www.joburg.org.za/documents',
    ],
    pikitup: [
      'https://www.pikitup.co.za/tariffs/',
      'https://www.joburg.org.za/documents',
    ],
    coj: [
      'https://www.joburg.org.za/documents',
      'https://www.joburg.org.za/budget',
    ],
  };

  return urls[provider] || ['https://www.joburg.org.za/documents'];
}

/**
 * Map bill line item description to provider and service type
 */
export function inferServiceFromDescription(
  description: string
): { provider: string; serviceType: string } | null {
  const lowered = description.toLowerCase();

  // Electricity
  if (lowered.includes('city power') || lowered.includes('electricity') || lowered.includes('kwh')) {
    return { provider: 'city_power', serviceType: 'electricity' };
  }

  // Water
  if (lowered.includes('joburg water') || lowered.includes('water consumption') ||
      (lowered.includes('water') && !lowered.includes('sewer'))) {
    return { provider: 'joburg_water', serviceType: 'water' };
  }

  // Sanitation
  if (lowered.includes('sewer') || lowered.includes('sanitation')) {
    return { provider: 'joburg_water', serviceType: 'sanitation' };
  }

  // Refuse
  if (lowered.includes('pikitup') || lowered.includes('refuse') || lowered.includes('waste')) {
    return { provider: 'pikitup', serviceType: 'refuse' };
  }

  // Rates
  if (lowered.includes('rates') || lowered.includes('property tax') || lowered.includes('assessment')) {
    return { provider: 'coj', serviceType: 'rates' };
  }

  return null;
}

/**
 * Infer customer category from bill data
 */
export function inferCustomerCategory(
  accountNumber: string,
  propertyType?: string,
  units?: number
): 'residential' | 'commercial' | 'business' | 'industrial' {
  // Multi-unit properties are typically commercial
  if (units && units > 4) {
    return 'commercial';
  }

  // Check property type if provided
  if (propertyType) {
    const lowered = propertyType.toLowerCase();
    if (lowered.includes('business') || lowered.includes('commercial')) {
      return 'commercial';
    }
    if (lowered.includes('industrial')) {
      return 'industrial';
    }
  }

  // Default to residential
  return 'residential';
}
