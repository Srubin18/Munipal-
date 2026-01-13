/**
 * Tariff Extraction Service for MUNIPAL
 *
 * Uses Claude AI to extract structured tariff rules from official documents.
 * Every extraction must include:
 * - Source page number
 * - Exact excerpt from source
 * - Confidence score
 *
 * Human verification is required before rules become "verified"
 */

import { prisma } from '../db';
import { ExtractionMethod } from '@prisma/client';

// Dynamic import for Anthropic - only used when extracting tariffs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let anthropic: any = null;
async function getAnthropic() {
  if (!anthropic) {
    try {
      // Dynamic import to avoid build-time dependency
      const module = await import(/* webpackIgnore: true */ '@anthropic-ai/sdk');
      const Anthropic = module.default;
      anthropic = new Anthropic();
    } catch {
      throw new Error('Anthropic SDK not available. Install with: npm install @anthropic-ai/sdk');
    }
  }
  return anthropic;
}
import type {
  TariffRuleInput,
  ElectricityPricingStructure,
  WaterPricingStructure,
  PricingStructure,
} from './types';

/**
 * Extract tariff rules from a knowledge document using AI
 */
export async function extractTariffRulesFromDocument(
  documentId: string
): Promise<{
  success: boolean;
  rulesExtracted: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // 1. Get document with chunks
  const document = await prisma.knowledgeDocument.findUnique({
    where: { id: documentId },
    include: {
      chunks: {
        orderBy: { chunkIndex: 'asc' },
      },
    },
  });

  if (!document) {
    return { success: false, rulesExtracted: 0, errors: ['Document not found'] };
  }

  // 2. Prepare text for AI extraction
  const fullText = document.rawText || document.chunks.map(c => c.content).join('\n\n');

  // 3. Determine service type from provider
  const serviceTypeMap: Record<string, string[]> = {
    city_power: ['electricity'],
    joburg_water: ['water', 'sanitation'],
    pikitup: ['refuse'],
    coj: ['rates'],
  };

  const serviceTypes = serviceTypeMap[document.provider] || [];

  // 4. Extract rules for each service type
  let rulesExtracted = 0;

  for (const serviceType of serviceTypes) {
    try {
      const extractedRules = await extractRulesWithAI(
        fullText,
        document.provider,
        serviceType,
        document.financialYear
      );

      // 5. Save extracted rules
      for (const rule of extractedRules) {
        try {
          await prisma.tariffRule.create({
            data: {
              knowledgeDocumentId: documentId,
              provider: document.provider,
              serviceType: serviceType, // Use the loop variable, not AI response
              tariffCode: rule.tariffCode,
              customerCategory: rule.customerCategory,
              description: rule.description,
              pricingStructure: rule.pricingStructure as any,
              vatRate: rule.vatRate ?? 15,
              vatInclusive: rule.vatInclusive ?? false,
              effectiveDate: document.effectiveDate,
              expiryDate: document.expiryDate,
              financialYear: document.financialYear,
              sourcePageNumber: rule.sourcePageNumber,
              sourceExcerpt: rule.sourceExcerpt,
              sourceTableReference: rule.sourceTableReference,
              extractionMethod: ExtractionMethod.AI_PARSED,
              extractionConfidence: rule.confidence,
              isVerified: false,
              isActive: true,
            },
          });
          rulesExtracted++;
        } catch (dbError) {
          // Handle unique constraint violations (rule already exists)
          if (dbError instanceof Error && dbError.message.includes('Unique constraint')) {
            errors.push(`Rule already exists: ${rule.tariffCode}`);
          } else {
            errors.push(`Failed to save rule ${rule.tariffCode}: ${dbError}`);
          }
        }
      }
    } catch (extractError) {
      errors.push(`Failed to extract ${serviceType} rules: ${extractError}`);
    }
  }

  return {
    success: errors.length === 0,
    rulesExtracted,
    errors,
  };
}

/**
 * Use Claude to extract structured tariff rules from document text
 */
async function extractRulesWithAI(
  documentText: string,
  provider: string,
  serviceType: string,
  financialYear: string
): Promise<ExtractedRule[]> {
  const prompt = buildExtractionPrompt(provider, serviceType, financialYear);

  // Truncate text if too long (keep first 50k chars for context)
  const truncatedText = documentText.length > 50000
    ? documentText.substring(0, 50000) + '\n\n[... document truncated ...]'
    : documentText;

  const client = await getAnthropic();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${prompt}\n\n---\n\nDOCUMENT TEXT:\n\n${truncatedText}`,
      },
    ],
  });

  // Parse the AI response
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from AI');
  }

  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      content.text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      console.error('AI response:', content.text);
      throw new Error('No JSON found in AI response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const rules = JSON.parse(jsonStr) as ExtractedRule[];
    return rules;
  } catch (parseError) {
    console.error('Failed to parse AI response:', content.text);
    throw new Error(`Failed to parse AI extraction result: ${parseError}`);
  }
}

interface ExtractedRule {
  serviceType: string;
  tariffCode: string;
  customerCategory: string;
  description: string;
  pricingStructure: PricingStructure;
  vatRate?: number;
  vatInclusive?: boolean;
  sourcePageNumber?: number;
  sourceExcerpt: string;
  sourceTableReference?: string;
  confidence: number;
}

/**
 * Build extraction prompt based on provider and service type
 */
function buildExtractionPrompt(
  provider: string,
  serviceType: string,
  financialYear: string
): string {
  const basePrompt = `You are extracting official tariff rules from a City of Johannesburg ${financialYear} document.

CRITICAL REQUIREMENTS:
1. Only extract rates that are EXPLICITLY stated in the document
2. Include the EXACT source excerpt for each rate
3. Note the page number or table reference if visible
4. Express all monetary values in CENTS (R1.00 = 100 cents)
5. If a rate is unclear or you're not confident, set confidence < 70

Output JSON array of rules. Each rule must have:
- tariffCode: unique identifier (e.g., "RES_BLOCK1")
- customerCategory: "residential" | "commercial" | "industrial" | "business"
- description: brief description
- pricingStructure: structured pricing data
- sourceExcerpt: EXACT text from document (30-100 chars)
- sourcePageNumber: if identifiable
- sourceTableReference: e.g., "Table 4.2"
- confidence: 0-100 (your confidence in the extraction)
`;

  const servicePrompts: Record<string, string> = {
    electricity: `
ELECTRICITY TARIFF EXTRACTION:

Look for:
- Energy charges in c/kWh or R/kWh (convert to cents)
- Stepped/block tariffs (different rates for different usage bands)
- Service charges (monthly fixed fees)
- Network charges
- Demand charges (for commercial/industrial)

pricingStructure format:
{
  "energyCharges": {
    "bands": [
      { "minKwh": 0, "maxKwh": 100, "ratePerKwh": 26444, "description": "Block 1" },
      { "minKwh": 100, "maxKwh": null, "ratePerKwh": 30348, "description": "Block 2" }
    ]
  },
  "fixedCharges": [
    { "name": "Service charge", "amount": 27898, "frequency": "monthly" }
  ]
}`,

    water: `
WATER TARIFF EXTRACTION:

Look for:
- Consumption charges in R/kL or c/kL
- Stepped tariffs (e.g., 0-6kL, 6-10kL, etc.)
- Free basic water allocation (usually 6kL)
- Demand management levy

pricingStructure format:
{
  "consumptionCharges": {
    "bands": [
      { "minKl": 0, "maxKl": 6, "ratePerKl": 0, "description": "Free basic water" },
      { "minKl": 6, "maxKl": 10, "ratePerKl": 2984, "description": "Step 2" }
    ]
  },
  "fixedCharges": [
    { "name": "Demand Management Levy", "amount": 6508, "frequency": "monthly" }
  ]
}`,

    sanitation: `
SANITATION/SEWERAGE TARIFF EXTRACTION:

Look for:
- Percentage of water charges
- Per-unit charges for multi-unit properties
- Fixed monthly charges

pricingStructure format:
{
  "percentageOfWater": 85,
  "perUnitCharge": 12500,
  "fixedCharges": []
}`,

    refuse: `
REFUSE/WASTE TARIFF EXTRACTION:

Look for:
- Business refuse charges
- Residential charges
- Additional bin charges

pricingStructure format:
{
  "businessCharge": 45000,
  "residentialCharge": 15000,
  "additionalBinCharge": 8000
}`,

    rates: `
PROPERTY RATES EXTRACTION:

Look for:
- Rate in Rand per property value
- Rebates and thresholds
- Primary residence rebate
- Pensioner rebates

pricingStructure format:
{
  "rateInRand": 0.011529,
  "rebates": [
    { "name": "Primary Residence Threshold", "type": "threshold", "amount": 350000 }
  ],
  "formula": "Monthly = (MarketValue - Rebate) × RateInRand ÷ 12"
}`,
  };

  return basePrompt + (servicePrompts[serviceType] || '');
}

/**
 * Manually add a tariff rule (admin override)
 */
export async function addManualTariffRule(input: TariffRuleInput): Promise<string> {
  const rule = await prisma.tariffRule.create({
    data: {
      knowledgeDocumentId: input.knowledgeDocumentId,
      provider: input.provider,
      serviceType: input.serviceType,
      tariffCode: input.tariffCode,
      customerCategory: input.customerCategory,
      description: input.description,
      pricingStructure: input.pricingStructure as any,
      vatRate: input.vatRate ?? 15,
      vatInclusive: input.vatInclusive ?? false,
      effectiveDate: input.effectiveDate,
      expiryDate: input.expiryDate,
      financialYear: input.financialYear,
      sourcePageNumber: input.sourcePageNumber,
      sourceExcerpt: input.sourceExcerpt,
      sourceTableReference: input.sourceTableReference,
      extractionMethod: ExtractionMethod.MANUAL,
      extractionConfidence: 100,
      isVerified: true, // Manual entries are pre-verified
      verifiedAt: new Date(),
      isActive: true,
    },
  });

  return rule.id;
}

/**
 * Verify extracted tariff rule
 */
export async function verifyTariffRule(
  ruleId: string,
  verifiedBy: string,
  notes?: string
): Promise<void> {
  await prisma.tariffRule.update({
    where: { id: ruleId },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy,
      verificationNotes: notes,
    },
  });
}

/**
 * Get unverified rules for admin review
 */
export async function getUnverifiedRules() {
  return prisma.tariffRule.findMany({
    where: {
      isActive: true,
      isVerified: false,
    },
    include: {
      knowledgeDocument: {
        select: {
          title: true,
          provider: true,
          financialYear: true,
        },
      },
    },
    orderBy: [
      { extractionConfidence: 'asc' }, // Show lowest confidence first
      { createdAt: 'desc' },
    ],
  });
}
