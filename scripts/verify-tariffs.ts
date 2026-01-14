/**
 * TARIFF VERIFICATION TEST
 *
 * This is the REAL test - parsing 10 COJ PDFs and verifying each charge
 * against official COJ tariffs.
 *
 * What we verify:
 * - Electricity: kWh × rate = correct amount (stepped tariffs)
 * - Water: kL × rate = correct amount (stepped tariffs)
 * - Rates: valuation × rate = correct amount (with rebate)
 * - Sewerage: based on consumption or per-unit levy
 * - Refuse: based on property classification
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseCojBill } from '../src/lib/parsers/coj-bill';
import { runTariffChecks } from '../src/lib/verification/checks/tariff-check';
import type { Finding } from '../src/lib/verification/types';

const DATA_DIR = join(__dirname, '../data');

interface VerificationResult {
  file: string;
  accountNumber: string;
  classification: string;
  valuation: string;
  services: {
    electricity: FindingSummary | null;
    water: FindingSummary | null;
    sewerage: FindingSummary | null;
    rates: FindingSummary | null;
    refuse: FindingSummary | null;
  };
  overallStatus: 'ALL_VERIFIED' | 'PARTIAL' | 'ISSUES_FOUND' | 'PARSE_FAILED';
}

interface FindingSummary {
  status: string;
  confidence: number;
  billed: number;
  expected?: number;
  difference?: number;
  explanation: string;
}

function summarizeFinding(finding: Finding, billedAmount: number): FindingSummary {
  const expected = finding.impactMax
    ? billedAmount - (finding.status === 'LIKELY_WRONG' ? (finding.impactMax || 0) : 0)
    : undefined;

  return {
    status: finding.status,
    confidence: finding.confidence,
    billed: billedAmount,
    expected: expected,
    difference: finding.impactMax,
    explanation: finding.title,
  };
}

async function verifyAllBills() {
  console.log('\n' + '═'.repeat(80));
  console.log('TARIFF VERIFICATION TEST - Checking COJ bills against official tariffs');
  console.log('═'.repeat(80) + '\n');

  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files to verify\n`);

  const results: VerificationResult[] = [];
  let totalVerified = 0;
  let totalCannotVerify = 0;
  let totalIssues = 0;
  let totalChecks = 0;

  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`FILE: ${file}`);
    console.log(`${'─'.repeat(80)}`);

    try {
      // Step 1: Parse the PDF
      const buffer = readFileSync(filePath);
      const parsed = await parseCojBill(buffer);

      const valuationRands = parsed.propertyInfo?.municipalValuation
        ? `R${(parsed.propertyInfo.municipalValuation / 100).toLocaleString()}`
        : 'NOT FOUND';

      console.log(`\n  Account: ${parsed.accountNumber || 'NOT FOUND'}`);
      console.log(`  Valuation: ${valuationRands}`);
      console.log(`  Property Type: ${parsed.propertyInfo?.propertyType || 'unknown'}`);
      console.log(`  Units: ${parsed.propertyInfo?.units || 1}`);

      // Step 2: Run tariff verification
      const findings = await runTariffChecks(parsed);

      console.log(`\n  TARIFF VERIFICATION RESULTS:`);
      console.log(`  ${'─'.repeat(50)}`);

      const result: VerificationResult = {
        file,
        accountNumber: parsed.accountNumber || 'unknown',
        classification: parsed.propertyInfo?.propertyType || 'unknown',
        valuation: valuationRands,
        services: {
          electricity: null,
          water: null,
          sewerage: null,
          rates: null,
          refuse: null,
        },
        overallStatus: 'ALL_VERIFIED',
      };

      // Map findings to services
      for (const finding of findings) {
        totalChecks++;
        const statusIcon = finding.status === 'VERIFIED' ? '✓' :
                          finding.status === 'CANNOT_VERIFY' ? '?' :
                          finding.status === 'LIKELY_WRONG' ? '✗' : '~';

        if (finding.status === 'VERIFIED') totalVerified++;
        else if (finding.status === 'CANNOT_VERIFY') totalCannotVerify++;
        else totalIssues++;

        // Find the line item for this check
        const serviceType = finding.checkName.split('_')[0] as keyof typeof result.services;
        const lineItem = parsed.lineItems.find(i => i.serviceType === serviceType);
        const billedAmount = lineItem?.amount || 0;

        console.log(`  ${statusIcon} ${serviceType.toUpperCase()}: ${finding.title}`);
        console.log(`      Status: ${finding.status} (${finding.confidence}% confidence)`);
        if (billedAmount > 0) {
          console.log(`      Billed: R${(billedAmount / 100).toFixed(2)}`);
        }
        if (finding.impactMax) {
          console.log(`      Discrepancy: R${(finding.impactMax / 100).toFixed(2)}`);
        }

        if (result.services[serviceType] === undefined || result.services[serviceType] === null) {
          result.services[serviceType] = summarizeFinding(finding, billedAmount);
        }

        if (finding.status !== 'VERIFIED') {
          result.overallStatus = finding.status === 'LIKELY_WRONG' ? 'ISSUES_FOUND' : 'PARTIAL';
        }
      }

      results.push(result);

    } catch (error) {
      console.log(`\n  ❌ PARSE/VERIFY ERROR: ${error}`);
      results.push({
        file,
        accountNumber: 'PARSE_FAILED',
        classification: 'unknown',
        valuation: 'N/A',
        services: {
          electricity: null,
          water: null,
          sewerage: null,
          rates: null,
          refuse: null,
        },
        overallStatus: 'PARSE_FAILED',
      });
    }
  }

  // Summary Report
  console.log('\n\n' + '═'.repeat(80));
  console.log('TARIFF VERIFICATION SUMMARY');
  console.log('═'.repeat(80));

  console.log(`\n  Total bills tested: ${results.length}`);
  console.log(`  Total checks performed: ${totalChecks}`);
  console.log(`  ✓ Verified: ${totalVerified} (${Math.round(totalVerified/totalChecks*100)}%)`);
  console.log(`  ? Cannot Verify: ${totalCannotVerify} (${Math.round(totalCannotVerify/totalChecks*100)}%)`);
  console.log(`  ✗ Issues Found: ${totalIssues} (${Math.round(totalIssues/totalChecks*100)}%)`);

  // Detailed service breakdown
  console.log(`\n  VERIFICATION BY SERVICE:`);
  console.log(`  ${'─'.repeat(50)}`);

  const services = ['electricity', 'water', 'sewerage', 'rates', 'refuse'] as const;
  for (const service of services) {
    const serviceResults = results
      .map(r => r.services[service])
      .filter(s => s !== null);

    const verified = serviceResults.filter(s => s?.status === 'VERIFIED').length;
    const cannotVerify = serviceResults.filter(s => s?.status === 'CANNOT_VERIFY').length;
    const issues = serviceResults.filter(s => s?.status === 'LIKELY_WRONG').length;
    const total = serviceResults.length;

    if (total > 0) {
      console.log(`  ${service.toUpperCase().padEnd(12)} ✓${verified}/${total}  ?${cannotVerify}/${total}  ✗${issues}/${total}`);
    }
  }

  // List any issues
  const billsWithIssues = results.filter(r => r.overallStatus === 'ISSUES_FOUND');
  if (billsWithIssues.length > 0) {
    console.log(`\n  BILLS WITH DISCREPANCIES:`);
    console.log(`  ${'─'.repeat(50)}`);
    for (const r of billsWithIssues) {
      console.log(`\n  Account ${r.accountNumber}:`);
      for (const [service, finding] of Object.entries(r.services)) {
        if (finding && finding.status === 'LIKELY_WRONG') {
          console.log(`    - ${service}: Discrepancy of R${((finding.difference || 0) / 100).toFixed(2)}`);
        }
      }
    }
  }

  // Key findings
  console.log(`\n  KEY FINDINGS:`);
  console.log(`  ${'─'.repeat(50)}`);

  const avgConfidence = results
    .flatMap(r => Object.values(r.services))
    .filter(s => s !== null)
    .reduce((sum, s) => sum + (s?.confidence || 0), 0) / totalChecks;

  console.log(`  • Average verification confidence: ${avgConfidence.toFixed(1)}%`);

  const verifiedBills = results.filter(r => r.overallStatus === 'ALL_VERIFIED').length;
  console.log(`  • Bills fully verified: ${verifiedBills}/${results.length}`);

  const partialBills = results.filter(r => r.overallStatus === 'PARTIAL').length;
  console.log(`  • Bills partially verified: ${partialBills}/${results.length}`);

  // Tariff gaps
  console.log(`\n  TARIFF KNOWLEDGE GAPS:`);
  console.log(`  ${'─'.repeat(50)}`);

  const cannotVerifyByService: Record<string, number> = {};
  for (const r of results) {
    for (const [service, finding] of Object.entries(r.services)) {
      if (finding && finding.status === 'CANNOT_VERIFY') {
        cannotVerifyByService[service] = (cannotVerifyByService[service] || 0) + 1;
      }
    }
  }

  for (const [service, count] of Object.entries(cannotVerifyByService)) {
    console.log(`  • ${service}: ${count} bills missing tariff data`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('END OF VERIFICATION REPORT');
  console.log('═'.repeat(80) + '\n');
}

verifyAllBills().catch(console.error);
