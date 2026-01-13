// Demo: Complete bill verification with citations from official tariff document
import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync } from 'fs';
import { prisma } from '../src/lib/db';
import { parseCojBill } from '../src/lib/parsers/coj-bill';

async function main() {
  console.log('='.repeat(70));
  console.log('MUNIPAL BILL VERIFICATION DEMO - OFFICIAL TARIFF SOURCES');
  console.log('='.repeat(70));

  // 1. Show the ingested official document
  console.log('\n📄 OFFICIAL DOCUMENT IN DATABASE:\n');
  const document = await prisma.knowledgeDocument.findFirst({
    where: {
      financialYear: '2025/26',
      provider: 'city_power',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!document) {
    console.error('No document found - run fetch-pdf-firecrawl.ts first');
    process.exit(1);
  }

  console.log(`Document ID: ${document.id}`);
  console.log(`Title: ${document.title}`);
  console.log(`Source URL: ${document.sourceUrl}`);
  console.log(`Financial Year: ${document.financialYear}`);
  console.log(`Effective: ${document.effectiveDate?.toISOString().split('T')[0]} to ${document.expiryDate?.toISOString().split('T')[0]}`);
  console.log(`Ingestion Method: ${document.ingestionMethod}`);
  console.log(`Checksum: ${document.checksum?.substring(0, 16)}...`);

  // 2. Show extracted tariff rules
  console.log('\n📊 EXTRACTED TARIFF RULES:\n');
  const rules = await prisma.tariffRule.findMany({
    where: { knowledgeDocumentId: document.id },
    orderBy: { tariffCode: 'asc' },
  });

  for (const rule of rules) {
    console.log(`[${rule.tariffCode}] ${rule.description}`);
    console.log(`  Extraction Confidence: ${rule.extractionConfidence}%`);
    console.log(`  Source Excerpt: "${rule.sourceExcerpt}"`);
    console.log(`  Verified: ${rule.isVerified ? 'Yes' : 'Pending admin verification'}`);
    console.log('');
  }

  // 3. Use the example from the official PDF (374 kWh residential)
  // This matches the exact example in the 2025/26 tariff document
  console.log('\n📝 RESIDENTIAL BILL EXAMPLE (from PDF):\n');

  // Values taken directly from the official tariff document tables
  // "Residential Prepaid Low (indigent)" example: 374 kWh = R947.86
  const billData = {
    accountNumber: 'EXAMPLE-2025',
    billDate: '2025-07-15',
    totalDue: 94786, // R947.86 in cents
    lineItems: [
      {
        serviceType: 'electricity',
        description: 'Electricity - Prepaid Low (Indigent)',
        amount: 94786, // R947.86 as shown in PDF table
        quantity: 374,
        unit: 'kWh',
      },
    ],
  };

  console.log(`Account Number: ${billData.accountNumber}`);
  console.log(`Bill Date: ${billData.billDate}`);
  console.log(`Total Due: R${(billData.totalDue / 100).toFixed(2)}`);
  console.log(`\nLine Items:`);

  for (const item of billData.lineItems) {
    console.log(`  - ${item.serviceType}: ${item.description} = R${(item.amount / 100).toFixed(2)}`);
    if (item.quantity) {
      console.log(`    Usage: ${item.quantity} ${item.unit}`);
    }
  }

  // 4. Verify electricity charge against extracted tariffs
  console.log('\n🔍 VERIFICATION AGAINST OFFICIAL TARIFFS:\n');

  const electricityItem = billData.lineItems.find((item: any) => item.serviceType === 'electricity');
  if (electricityItem && electricityItem.quantity) {
    const usage = electricityItem.quantity;
    const billedAmount = electricityItem.amount;

    console.log(`Electricity Usage: ${usage} kWh`);
    console.log(`Billed Amount: R${(billedAmount / 100).toFixed(2)}`);

    // Find matching tariff rule (use Indigent tariff for this example)
    const electricityRule = rules.find(r => r.tariffCode === 'RES_PREPAID_LOW_INDIGENT');

    if (electricityRule) {
      const pricing = electricityRule.pricingStructure as any;
      const bands = pricing.energyCharges?.bands || [];

      // Calculate expected amount using stepped tariff
      let expectedAmountCents = 0;
      let remainingUsage = usage;
      const breakdown: string[] = [];

      // Rates stored as c/kWh × 100 (e.g., 24986 = 249.86 c/kWh)
      for (const band of bands) {
        if (remainingUsage <= 0) break;

        const bandMin = band.minKwh || 0;
        const bandMax = band.maxKwh || Infinity;
        const bandSize = bandMax - bandMin;
        const usageInBand = Math.min(remainingUsage, bandSize);

        if (usageInBand > 0) {
          const rateInCents = band.ratePerKwh / 100; // Convert from stored format
          const bandCost = usageInBand * rateInCents;
          expectedAmountCents += bandCost;
          breakdown.push(`  ${band.description}: ${usageInBand.toFixed(0)} kWh × ${rateInCents.toFixed(2)} c/kWh = R${(bandCost / 100).toFixed(2)}`);
          remainingUsage -= usageInBand;
        }
      }

      // Add fixed charges (stored in cents)
      const fixedCharges = pricing.fixedCharges || [];
      for (const charge of fixedCharges) {
        expectedAmountCents += charge.amount;
        breakdown.push(`  ${charge.name}: R${(charge.amount / 100).toFixed(2)}`);
      }

      const expectedAmount = expectedAmountCents;

      console.log(`\nMatched Tariff: ${electricityRule.tariffCode}`);
      console.log(`Description: ${electricityRule.description}`);
      console.log(`\nCalculation breakdown:`);
      breakdown.forEach(line => console.log(line));
      console.log(`  -----------------------------------------`);
      console.log(`  Expected Total: R${(expectedAmount / 100).toFixed(2)}`);
      console.log(`  Billed Amount:  R${(billedAmount / 100).toFixed(2)}`);

      const difference = billedAmount - expectedAmount;
      const percentDiff = Math.abs(difference / expectedAmount * 100);

      if (Math.abs(difference) < 100) { // Within R1
        console.log(`\n✅ VERIFIED: Amount matches official tariff (within R1)`);
      } else if (percentDiff < 5) {
        console.log(`\n⚠️ MINOR VARIANCE: ${percentDiff.toFixed(1)}% difference (R${(difference / 100).toFixed(2)})`);
      } else {
        console.log(`\n❌ DISCREPANCY FOUND: ${percentDiff.toFixed(1)}% difference (R${(difference / 100).toFixed(2)})`);
      }

      // Show citation
      console.log('\n📚 CITATION:');
      console.log(`  Source: ${document.title}`);
      console.log(`  URL: ${document.sourceUrl}`);
      console.log(`  Financial Year: ${document.financialYear}`);
      console.log(`  Effective Period: ${document.effectiveDate?.toISOString().split('T')[0]} - ${document.expiryDate?.toISOString().split('T')[0]}`);
      console.log(`  Excerpt: "${electricityRule.sourceExcerpt}"`);
      console.log(`  Extraction Method: ${electricityRule.extractionMethod}`);
      console.log(`  Confidence: ${electricityRule.extractionConfidence}%`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('DEMO COMPLETE - All tariffs sourced from official CoJ document');
  console.log('='.repeat(70));
}

main().catch(console.error);
