/**
 * Test arithmetic verification logic (no database required)
 *
 * Tests the reconciliation table and VAT verification
 */

import { runArithmeticChecks } from '../src/lib/verification/checks/arithmetic-check';
import { ParsedBill } from '../src/lib/parsers/types';

function main() {
  console.log('='.repeat(80));
  console.log('ARITHMETIC VERIFICATION LOGIC TEST');
  console.log('='.repeat(80));

  // Test Case 1: Commercial bill with correct arithmetic
  console.log('\n\n📋 TEST CASE 1: Commercial Bill - Correct Arithmetic\n');

  const commercialBill: ParsedBill = {
    accountNumber: '554528356',
    billDate: new Date('2025-01-01'),
    periodStart: null,
    periodEnd: null,
    dueDate: null,
    totalDue: 4000000, // R40,000
    previousBalance: null,
    currentCharges: 3478300, // R34,783
    vatAmount: 521700, // R5,217 (exactly 15% of VAT-able excl rates)
    lineItems: [
      {
        serviceType: 'electricity',
        description: 'Electricity - Commercial',
        amount: 2500000, // R25,000 incl VAT
        quantity: 15000,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'water',
        description: 'Water Consumption',
        amount: 800000, // R8,000 incl VAT
        quantity: 500,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'sewerage',
        description: 'Sanitation',
        amount: 350000, // R3,500 incl VAT
        quantity: null,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'refuse',
        description: 'Refuse',
        amount: 250000, // R2,500 incl VAT
        quantity: null,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'rates',
        description: 'Property Rates',
        amount: 0, // R0.00 - zero rates (VAT exempt)
        quantity: null,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'sundry',
        description: 'Business Services',
        amount: 100000, // R1,000 incl VAT
        quantity: null,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
    ],
    rawText: 'Test',
  };

  const results1 = runArithmeticChecks(commercialBill);
  displayFindings(results1);

  // Test Case 2: Residential bill with VAT discrepancy
  console.log('\n\n📋 TEST CASE 2: Residential Bill - VAT Discrepancy\n');

  const residentialBill: ParsedBill = {
    accountNumber: '123456789',
    billDate: new Date('2025-01-01'),
    periodStart: null,
    periodEnd: null,
    dueDate: null,
    totalDue: 250000, // R2,500
    previousBalance: null,
    currentCharges: 217400, // R2,174 (pre-VAT)
    vatAmount: 40000, // R400 - WRONG (should be ~R326)
    lineItems: [
      {
        serviceType: 'electricity',
        description: 'Electricity',
        amount: 150000, // R1,500 incl VAT
        quantity: 450,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'water',
        description: 'Water',
        amount: 30000, // R300 incl VAT
        quantity: 15,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'sewerage',
        description: 'Sewerage',
        amount: 20000, // R200 incl VAT
        quantity: null,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'refuse',
        description: 'Refuse',
        amount: 20000, // R200 incl VAT
        quantity: null,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'rates',
        description: 'Property Rates',
        amount: 30000, // R300 - VAT exempt
        quantity: null,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
    ],
    rawText: 'Test',
  };

  const results2 = runArithmeticChecks(residentialBill);
  displayFindings(results2);

  // Test Case 3: Bill with correct arithmetic including rates
  console.log('\n\n📋 TEST CASE 3: Bill with R0.00 Rates - Correct Arithmetic\n');

  const zeroRatesBill: ParsedBill = {
    accountNumber: '987654321',
    billDate: new Date('2025-01-01'),
    periodStart: null,
    periodEnd: null,
    dueDate: null,
    totalDue: 172500, // R1,725
    previousBalance: null,
    currentCharges: 150000, // R1,500 (pre-VAT)
    vatAmount: 22500, // R225 (exactly 15%)
    lineItems: [
      {
        serviceType: 'electricity',
        description: 'Electricity',
        amount: 172500, // R1,725 incl VAT = R1,500 + R225
        quantity: 300,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
      {
        serviceType: 'rates',
        description: 'Property Rates',
        amount: 0, // R0.00 - no rates this period
        quantity: null,
        unitPrice: null,
        tariffCode: null,
        isEstimated: false,
      },
    ],
    rawText: 'Test',
  };

  const results3 = runArithmeticChecks(zeroRatesBill);
  displayFindings(results3);

  console.log('\n' + '='.repeat(80));
  console.log('ARITHMETIC VERIFICATION TEST COMPLETE');
  console.log('='.repeat(80));
}

function displayFindings(findings: any[]) {
  for (const finding of findings) {
    const icon = finding.status === 'VERIFIED' ? '✅' :
                 finding.status === 'LIKELY_WRONG' ? '❌' : '⚠️';

    console.log(`${icon} ${finding.title}`);
    console.log(`   Status: ${finding.status} (${finding.confidence}% confidence)`);
    console.log('');
    console.log('   Explanation:');
    const lines = finding.explanation.split('\n');
    for (const line of lines) {
      console.log(`   ${line}`);
    }
    console.log('');
  }
}

main();
