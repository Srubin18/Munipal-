/**
 * Test verification logic fixes
 *
 * Tests the corrected verification engine against Account 554528356
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync } from 'fs';
import { parseCojBill } from '../src/lib/parsers/coj-bill';
import { verifyBill, generateSummary } from '../src/lib/verification/engine';

async function main() {
  console.log('='.repeat(80));
  console.log('VERIFICATION LOGIC FIX TEST - Account 554528356');
  console.log('='.repeat(80));

  // Try to parse the real bill
  const pdfPath = '/Users/simon/Dropbox/554528356 - Magnum2.pdf';
  let parsedBill: any;

  try {
    console.log(`\nParsing: ${pdfPath}\n`);
    const buffer = readFileSync(pdfPath);
    parsedBill = await parseCojBill(buffer);
    console.log('✅ Bill parsed successfully');
  } catch (error) {
    console.log(`❌ Could not parse bill: ${error}`);
    console.log('\nUsing synthetic commercial bill for demonstration...\n');

    // Create a synthetic commercial bill to test the logic
    parsedBill = {
      accountNumber: '554528356',
      billDate: new Date('2025-01-01'),
      totalDue: 5000000, // R50,000 - typical commercial bill
      currentCharges: 4500000, // R45,000
      vatAmount: 650000, // ~R6,500 VAT
      propertyInfo: {
        address: '123 Commercial St, Johannesburg',
        units: 10, // Multi-unit = commercial
        propertyType: 'Commercial',
        municipalValuation: 5000000,
      },
      lineItems: [
        {
          serviceType: 'electricity',
          description: 'Electricity - Commercial Time of Use',
          amount: 2500000, // R25,000
          quantity: 15000, // 15,000 kWh - high usage
          tariffCode: 'COM_TOU',
          isEstimated: false,
        },
        {
          serviceType: 'water',
          description: 'Water Consumption',
          amount: 800000, // R8,000
          quantity: 500, // 500 kL - high usage
          tariffCode: 'WATER_COM',
          isEstimated: false,
        },
        {
          serviceType: 'sewerage',
          description: 'Sanitation (10 units)',
          amount: 350000, // R3,500 = ~R350/unit
          quantity: null,
          tariffCode: null,
          isEstimated: false,
        },
        {
          serviceType: 'refuse',
          description: 'Refuse Removal - Commercial',
          amount: 250000, // R2,500
          quantity: null,
          tariffCode: 'REFUSE_COM',
          isEstimated: false,
        },
        {
          serviceType: 'rates',
          description: 'Property Rates',
          amount: 0, // R0.00 - testing zero rates
          quantity: null,
          tariffCode: null,
          isEstimated: false,
        },
        {
          serviceType: 'sundry',
          description: 'Business Services Surcharge',
          amount: 100000, // R1,000
          quantity: null,
          tariffCode: null,
          isEstimated: false,
        },
      ],
      rawText: 'Test bill for verification logic',
    };

    console.log('Created synthetic commercial bill:\n');
    console.log(`Account: ${parsedBill.accountNumber}`);
    console.log(`Property Type: ${parsedBill.propertyInfo.propertyType}`);
    console.log(`Units: ${parsedBill.propertyInfo.units}`);
    console.log(`Total Due: R${(parsedBill.totalDue / 100).toFixed(2)}`);
    console.log(`\nLine Items:`);
    for (const item of parsedBill.lineItems) {
      console.log(`  [${item.serviceType}] R${(item.amount / 100).toFixed(2)} ${item.quantity ? `(${item.quantity} units)` : ''}`);
    }
  }

  // Run verification
  console.log('\n' + '─'.repeat(80));
  console.log('RUNNING VERIFICATION ENGINE');
  console.log('─'.repeat(80) + '\n');

  const result = await verifyBill(parsedBill, {
    propertyValue: parsedBill.propertyInfo?.municipalValuation,
  });

  // Display findings
  console.log('FINDINGS:\n');
  for (const finding of result.findings) {
    const icon = finding.status === 'VERIFIED' ? '✅' :
                 finding.status === 'LIKELY_WRONG' ? '❌' : '⚠️';

    console.log(`${icon} [${finding.checkType.toUpperCase()}] ${finding.title}`);
    console.log(`   Status: ${finding.status} (${finding.confidence}% confidence)`);
    console.log(`   ${finding.explanation.split('\n')[0]}...`);

    if (finding.citation.hasSource) {
      console.log(`   📚 Source: Document ${finding.citation.knowledgeDocumentId}`);
    } else {
      console.log(`   📚 No Source: ${finding.citation.noSourceReason}`);
    }
    console.log('');
  }

  // Summary
  console.log('\n' + '─'.repeat(80));
  console.log('SUMMARY');
  console.log('─'.repeat(80) + '\n');

  console.log(`Verified: ${result.summary.verified}`);
  console.log(`Likely Wrong: ${result.summary.likelyWrong}`);
  console.log(`Cannot Verify: ${result.summary.unknown}`);
  console.log(`\nTotal Impact: R${(result.totalImpactMin / 100).toFixed(2)} - R${(result.totalImpactMax / 100).toFixed(2)}`);
  console.log(`Recommendation: ${result.recommendation}`);
  console.log(`\n${generateSummary(result)}`);

  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION TEST COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
