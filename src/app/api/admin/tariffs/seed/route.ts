import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Commercial electricity tariffs from NERSA 2025/26
const COMMERCIAL_TARIFFS = [
  {
    tariffCode: 'COM_CREDIT_METER',
    customerCategory: 'commercial',
    description: 'Commercial Credit Meter Tariff (up to 250A 3-phase / 172 kVA)',
    pricingStructure: {
      energyCharges: {
        flatRate: 391900, // R3.9190/kWh in cents × 100
      },
      fixedCharges: [
        { name: 'Monthly Service Charge', amount: 27858, frequency: 'monthly' },
      ],
    },
    sourceExcerpt: 'B.1 COMMERCIAL CREDIT METER TARIFF: Active Energy Charge R3.9190/kWh, Monthly Charge R278.5760',
    confidence: 95,
  },
  {
    tariffCode: 'COM_PREPAID_METER',
    customerCategory: 'commercial',
    description: 'Commercial Prepaid Meter Tariff (up to 250A 3-phase / 172 kVA)',
    pricingStructure: {
      energyCharges: {
        flatRate: 411750, // R4.1175/kWh in cents × 100
      },
      fixedCharges: [
        { name: 'Monthly Service Charge', amount: 24580, frequency: 'monthly' },
      ],
    },
    sourceExcerpt: 'B.2 COMMERCIAL PREPAID METER TARIFF: Active Energy Charge R4.1175/kWh, Monthly Charge R245.80',
    confidence: 95,
  },
  {
    tariffCode: 'BULK_INDUSTRIAL_LOW',
    customerCategory: 'industrial',
    description: 'Bulk Tariff - Industrial Low (Time of Use, min 50 kVA)',
    pricingStructure: {
      timeOfUse: true,
      demandCharges: {
        notifiedDemand: 12044,
        actualDemand: 5906,
      },
      fixedCharges: [
        { name: 'Monthly Service Charge', amount: 1969347, frequency: 'monthly' },
      ],
      energyCharges: {
        summer: {
          peak: 326340,
          standard: 232050,
          offPeak: 155990,
        },
        winter: {
          peak: 916700,
          standard: 305480,
          offPeak: 174620,
        },
      },
    },
    sourceExcerpt: 'C.1 BULK TARIFF INDUSTRIAL LOW: Notified Demand R120.4420/kVA, Summer Peak R3.2634/kWh, Winter Peak R9.1670/kWh',
    confidence: 95,
  },
  {
    tariffCode: 'BULK_INDUSTRIAL_HIGH',
    customerCategory: 'industrial',
    description: 'Bulk Tariff - Industrial High Voltage (Time of Use)',
    pricingStructure: {
      timeOfUse: true,
      networkCharges: {
        summerAccess: 5682,
        summerDemand: 7127,
        winterAccess: 6818,
        winterDemand: 7955,
      },
      fixedCharges: [
        { name: 'Service Charge (Summer)', amount: 1909202, frequency: 'monthly' },
        { name: 'Service Charge (Winter)', amount: 1931937, frequency: 'monthly' },
      ],
      energyCharges: {
        summer: {
          peak: 236910,
          standard: 168500,
          offPeak: 113300,
        },
        winter: {
          peak: 669660,
          standard: 218780,
          offPeak: 126770,
        },
      },
    },
    sourceExcerpt: 'C.1 BULK TARIFF INDUSTRIAL HIGH: Summer Peak R2.3691/kWh, Winter Peak R6.6966/kWh',
    confidence: 95,
  },
];

export async function POST() {
  try {
    // Get existing document
    const document = await prisma.knowledgeDocument.findFirst({
      where: {
        financialYear: '2025/26',
        provider: 'city_power',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!document) {
      return NextResponse.json({ error: 'No document found' }, { status: 404 });
    }

    const results = [];

    for (const rule of COMMERCIAL_TARIFFS) {
      // Check if exists
      const existing = await prisma.tariffRule.findFirst({
        where: {
          tariffCode: rule.tariffCode,
          financialYear: '2025/26',
        },
      });

      if (existing) {
        // Update
        await prisma.tariffRule.update({
          where: { id: existing.id },
          data: {
            pricingStructure: rule.pricingStructure,
            sourceExcerpt: rule.sourceExcerpt,
            extractionConfidence: rule.confidence,
          },
        });
        results.push({ tariffCode: rule.tariffCode, status: 'updated' });
      } else {
        // Create
        await prisma.tariffRule.create({
          data: {
            knowledgeDocumentId: document.id,
            provider: 'city_power',
            serviceType: 'electricity',
            tariffCode: rule.tariffCode,
            customerCategory: rule.customerCategory,
            description: rule.description,
            pricingStructure: rule.pricingStructure,
            vatRate: 15,
            vatInclusive: false,
            effectiveDate: new Date('2025-07-01'),
            expiryDate: new Date('2026-06-30'),
            financialYear: '2025/26',
            sourceExcerpt: rule.sourceExcerpt,
            extractionMethod: 'MANUAL',
            extractionConfidence: rule.confidence,
            isVerified: true,
            isActive: true,
          },
        });
        results.push({ tariffCode: rule.tariffCode, status: 'created' });
      }
    }

    // Get all electricity rules
    const allRules = await prisma.tariffRule.findMany({
      where: { serviceType: 'electricity' },
      select: { tariffCode: true, customerCategory: true },
    });

    return NextResponse.json({
      success: true,
      results,
      allElectricityRules: allRules,
    });
  } catch (error) {
    console.error('Error seeding tariffs:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  const rules = await prisma.tariffRule.findMany({
    where: { serviceType: 'electricity' },
    select: {
      tariffCode: true,
      customerCategory: true,
      description: true,
      pricingStructure: true,
    },
  });

  return NextResponse.json({ rules });
}
