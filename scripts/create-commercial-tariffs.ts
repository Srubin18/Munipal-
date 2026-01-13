// Create commercial electricity tariff rules from NERSA document
import { config } from 'dotenv';
config({ path: '.env.local' });

import { prisma } from '../src/lib/db';

const NERSA_TARIFF_DOC_TEXT = `
ELECTRICITY TARIFF SCHEDULE: 2025/2026

B: COMMERCIAL CONSUMERS
This tariff shall apply to all businesses with a maximum load of 100A single phase but not exceeding 250A three phase (172 kVA).

B.1 COMMERCIAL CREDIT METER TARIFF
Active Energy Charge: R3.9190/kWh
Monthly Charge: R278.5760

B.2 COMMERCIAL PREPAID METER TARIFF
Active Energy Charge: R4.1175/kWh
Monthly Charge: R245.80

C: BULK CONSUMERS
Minimum Notified Demand of 50 kVA. Three-part Time of Use tariff.

C.1 BULK TARIFF - INDUSTRIAL LOW
NOTIFIED DEMAND: R120.4420/kVA/month
ACTUAL DEMAND: R59.0553/kVA/month
Monthly Charge: R19693.4721/month

SUMMER Rates (Sep-May):
Peak: R3.2634/kWh
Standard: R2.3205/kWh
Off Peak: R1.5599/kWh

WINTER Rates (Jun-Aug):
Peak: R9.1670/kWh
Standard: R3.0548/kWh
Off Peak: R1.7462/kWh

C.1 BULK TARIFF - INDUSTRIAL HIGH
Service Charge Summer: R19092.0157/month
Service Charge Winter: R19319.3701/month

SUMMER Rates:
Peak: R2.3691/kWh
Standard: R1.6850/kWh
Off Peak: R1.1330/kWh
Network Access Charge: R56.8198/kVA
Network Demand Charge: R71.2693/kVA

WINTER Rates:
Peak: R6.6966/kWh
Standard: R2.1878/kWh
Off Peak: R1.2677/kWh
Network Access Charge: R68.1838/kVA
Network Demand Charge: R79.5477/kVA
`;

async function main() {
  console.log('Creating commercial electricity tariff rules...\n');

  // First, get or create the document
  let document = await prisma.knowledgeDocument.findFirst({
    where: {
      financialYear: '2025/26',
      provider: 'city_power',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!document) {
    console.error('No base document found. Creating one...');
    document = await prisma.knowledgeDocument.create({
      data: {
        provider: 'city_power',
        documentType: 'tariff_schedule_nersa',
        category: 'TARIFF',
        financialYear: '2025/26',
        title: 'City Power NERSA Approved Electricity Tariffs 2025/26',
        sourceUrl: 'https://www.nersa.org.za/file/7596',
        checksum: 'nersa-2025-26-commercial',
        rawText: NERSA_TARIFF_DOC_TEXT,
        effectiveDate: new Date('2025-07-01'),
        expiryDate: new Date('2026-06-30'),
        ingestionMethod: 'FIRECRAWL',
        isVerified: false,
      },
    });
    console.log('Created document:', document.id);
  }

  console.log('Using document:', document.id);

  // Commercial tariff rules
  const commercialRules = [
    {
      tariffCode: 'COM_CREDIT_METER',
      customerCategory: 'commercial',
      description: 'Commercial Credit Meter Tariff (up to 250A 3-phase / 172 kVA)',
      pricingStructure: {
        energyCharges: {
          flatRate: 391900, // R3.9190/kWh in cents × 100
        },
        fixedCharges: [
          { name: 'Monthly Service Charge', amount: 27858, frequency: 'monthly' }, // R278.58 in cents
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
          { name: 'Monthly Service Charge', amount: 24580, frequency: 'monthly' }, // R245.80 in cents
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
          notifiedDemand: 12044, // R120.4420/kVA in cents
          actualDemand: 5906,   // R59.0553/kVA in cents
        },
        fixedCharges: [
          { name: 'Monthly Service Charge', amount: 1969347, frequency: 'monthly' }, // R19,693.47 in cents
        ],
        energyCharges: {
          summer: { // Sep-May
            peak: 326340,     // R3.2634/kWh in cents × 100
            standard: 232050, // R2.3205/kWh
            offPeak: 155990,  // R1.5599/kWh
          },
          winter: { // Jun-Aug
            peak: 916700,     // R9.1670/kWh in cents × 100
            standard: 305480, // R3.0548/kWh
            offPeak: 174620,  // R1.7462/kWh
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
          summerAccess: 5682,  // R56.8198/kVA in cents
          summerDemand: 7127,  // R71.2693/kVA in cents
          winterAccess: 6818,  // R68.1838/kVA in cents
          winterDemand: 7955,  // R79.5477/kVA in cents
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

  // Create or update rules
  for (const rule of commercialRules) {
    try {
      // Check if exists
      const existing = await prisma.tariffRule.findFirst({
        where: {
          tariffCode: rule.tariffCode,
          financialYear: '2025/26',
        },
      });

      if (existing) {
        console.log(`Updating: ${rule.tariffCode}`);
        await prisma.tariffRule.update({
          where: { id: existing.id },
          data: {
            pricingStructure: rule.pricingStructure,
            sourceExcerpt: rule.sourceExcerpt,
            extractionConfidence: rule.confidence,
          },
        });
      } else {
        console.log(`Creating: ${rule.tariffCode}`);
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
            isVerified: true, // Manually verified from NERSA document
            isActive: true,
          },
        });
      }
    } catch (err) {
      console.error(`Failed ${rule.tariffCode}:`, err);
    }
  }

  // Show all rules
  const allRules = await prisma.tariffRule.findMany({
    where: { serviceType: 'electricity' },
    select: { tariffCode: true, customerCategory: true, description: true },
  });

  console.log('\n=== ALL ELECTRICITY TARIFF RULES ===');
  for (const r of allRules) {
    console.log(`  ${r.tariffCode} (${r.customerCategory}): ${r.description}`);
  }
}

main().catch(console.error);
