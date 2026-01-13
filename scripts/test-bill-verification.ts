/**
 * MUNIPAL Bill Verification Test
 *
 * Tests the ACTUAL parser and verification engine against known bills
 * This is the "brain" that validates our system works correctly
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { parseCojBill } from '../src/lib/parsers/coj-bill';
import { verifyBill } from '../src/lib/verification/engine';

// Test configuration
const TEST_BILLS = [
  {
    name: 'Account 554528356 - Magnum Multi-Meter Commercial',
    pdfPath: '/Users/simon/Dropbox/554528356 - Magnum2.pdf',
    expected: {
      accountNumber: '554528356',
      totalDue: 15941234, // R159,412.34 in cents
      lineItems: {
        electricity: {
          amount: 13496347,
          consumption: 38572, // 19,616 + 18,956
          meterCount: 2,
        },
        water: {
          amount: 2289017,
          consumption: 0,
        },
        rates: {
          amount: 0,
        },
        sundry: {
          amount: 155870,
        },
      },
      // Expected verification status for each finding
      expectedStatuses: {
        electricity: 'VERIFIED',
        water: 'VERIFIED',
        rates: 'VERIFIED',
        arithmetic: 'VERIFIED',
      },
    },
  },
];

interface TestResult {
  name: string;
  passed: boolean;
  parsingResults: {
    accountNumber: { expected: string; actual: string | null; pass: boolean };
    totalDue: { expected: number; actual: number | null; pass: boolean };
    lineItems: Record<string, { expected: number; actual: number; pass: boolean }>;
    meterCount: { expected: number; actual: number; pass: boolean };
  };
  verificationResults: {
    findingCount: number;
    findings: Array<{
      checkName: string;
      status: string;
      expectedStatus?: string;
      pass: boolean;
    }>;
  };
  errors: string[];
}

async function runTest(testConfig: typeof TEST_BILLS[0]): Promise<TestResult> {
  const result: TestResult = {
    name: testConfig.name,
    passed: true,
    parsingResults: {
      accountNumber: { expected: testConfig.expected.accountNumber, actual: null, pass: false },
      totalDue: { expected: testConfig.expected.totalDue, actual: null, pass: false },
      lineItems: {},
      meterCount: { expected: testConfig.expected.lineItems.electricity.meterCount, actual: 0, pass: false },
    },
    verificationResults: {
      findingCount: 0,
      findings: [],
    },
    errors: [],
  };

  try {
    // 1. Read PDF
    console.log(`  Reading PDF: ${testConfig.pdfPath}`);
    if (!fs.existsSync(testConfig.pdfPath)) {
      result.errors.push(`PDF not found: ${testConfig.pdfPath}`);
      result.passed = false;
      return result;
    }

    const pdfBuffer = fs.readFileSync(testConfig.pdfPath);

    // 2. Parse bill
    console.log('  Parsing bill...');
    const parsedBill = await parseCojBill(pdfBuffer);

    // 3. Validate parsing
    result.parsingResults.accountNumber.actual = parsedBill.accountNumber;
    result.parsingResults.accountNumber.pass =
      parsedBill.accountNumber === testConfig.expected.accountNumber;

    result.parsingResults.totalDue.actual = parsedBill.totalDue;
    result.parsingResults.totalDue.pass =
      Math.abs((parsedBill.totalDue || 0) - testConfig.expected.totalDue) <= 100;

    // Validate line items
    for (const item of parsedBill.lineItems) {
      const expectedItem = testConfig.expected.lineItems[item.serviceType as keyof typeof testConfig.expected.lineItems];
      if (expectedItem) {
        const expected = expectedItem.amount;
        const actual = item.amount;
        const pass = Math.abs(actual - expected) <= 100;

        result.parsingResults.lineItems[item.serviceType] = { expected, actual, pass };

        if (!pass) result.passed = false;
      }

      // Check meter count for electricity
      if (item.serviceType === 'electricity' && item.metadata) {
        const metadata = item.metadata as { meters?: Array<unknown> };
        result.parsingResults.meterCount.actual = metadata.meters?.length || 0;
        result.parsingResults.meterCount.pass =
          result.parsingResults.meterCount.actual === testConfig.expected.lineItems.electricity.meterCount;

        if (!result.parsingResults.meterCount.pass) result.passed = false;
      }
    }

    if (!result.parsingResults.accountNumber.pass) result.passed = false;
    if (!result.parsingResults.totalDue.pass) result.passed = false;

    // 4. Run verification
    console.log('  Running verification...');
    const verificationResult = await verifyBill(parsedBill, {});

    result.verificationResults.findingCount = verificationResult.findings.length;

    for (const finding of verificationResult.findings) {
      const expectedStatus = testConfig.expected.expectedStatuses[
        finding.checkName.split('_')[0] as keyof typeof testConfig.expected.expectedStatuses
      ];

      const pass = !expectedStatus || finding.status === expectedStatus;

      result.verificationResults.findings.push({
        checkName: finding.checkName,
        status: finding.status,
        expectedStatus,
        pass,
      });

      if (!pass) result.passed = false;
    }

  } catch (error) {
    result.errors.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    result.passed = false;
  }

  return result;
}

async function runAllTests(): Promise<void> {
  console.log('='.repeat(70));
  console.log('MUNIPAL BILL VERIFICATION TEST SUITE');
  console.log('='.repeat(70));
  console.log('');

  let totalPassed = 0;
  let totalFailed = 0;

  for (const testConfig of TEST_BILLS) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`TEST: ${testConfig.name}`);
    console.log(`${'─'.repeat(70)}`);

    const result = await runTest(testConfig);

    // Print parsing results
    console.log('\n  PARSING RESULTS:');
    console.log(`    Account Number: ${result.parsingResults.accountNumber.actual}`);
    console.log(`      Expected: ${result.parsingResults.accountNumber.expected}`);
    console.log(`      Status: ${result.parsingResults.accountNumber.pass ? '✓ PASS' : '✗ FAIL'}`);

    console.log(`    Total Due: R${((result.parsingResults.totalDue.actual || 0) / 100).toFixed(2)}`);
    console.log(`      Expected: R${(result.parsingResults.totalDue.expected / 100).toFixed(2)}`);
    console.log(`      Status: ${result.parsingResults.totalDue.pass ? '✓ PASS' : '✗ FAIL'}`);

    console.log(`    Meter Count: ${result.parsingResults.meterCount.actual}`);
    console.log(`      Expected: ${result.parsingResults.meterCount.expected}`);
    console.log(`      Status: ${result.parsingResults.meterCount.pass ? '✓ PASS' : '✗ FAIL'}`);

    console.log('\n    Line Items:');
    for (const [service, data] of Object.entries(result.parsingResults.lineItems)) {
      const status = data.pass ? '✓' : '✗';
      console.log(`      ${status} ${service}: R${(data.actual / 100).toFixed(2)} (expected: R${(data.expected / 100).toFixed(2)})`);
    }

    // Print verification results
    console.log('\n  VERIFICATION RESULTS:');
    console.log(`    Total Findings: ${result.verificationResults.findingCount}`);

    for (const finding of result.verificationResults.findings) {
      const status = finding.pass ? '✓' : '✗';
      const expected = finding.expectedStatus ? ` (expected: ${finding.expectedStatus})` : '';
      console.log(`      ${status} ${finding.checkName}: ${finding.status}${expected}`);
    }

    // Print errors
    if (result.errors.length > 0) {
      console.log('\n  ERRORS:');
      for (const error of result.errors) {
        console.log(`    ✗ ${error}`);
      }
    }

    // Summary
    console.log(`\n  RESULT: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);

    if (result.passed) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Total Tests: ${TEST_BILLS.length}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`\n  Overall: ${totalFailed === 0 ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
  console.log('');
}

// Run tests
runAllTests().catch(console.error);
