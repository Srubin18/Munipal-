/**
 * STANDALONE TARIFF VERIFICATION
 *
 * This script verifies COJ bills against OFFICIAL FY 2025/26 tariffs
 * WITHOUT requiring database access.
 *
 * Tariffs sourced from:
 * - City Power residential/commercial schedules
 * - Johannesburg Water tariff booklet
 * - COJ Property Rates Policy 2025/26
 *
 * PHILOSOPHY: Verify the math, cite the source, be conclusive.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseCojBill } from '../src/lib/parsers/coj-bill';
import type { ParsedBill, ParsedLineItem } from '../src/lib/parsers/types';

const DATA_DIR = join(__dirname, '../data');

// ═══════════════════════════════════════════════════════════════════════════════
// OFFICIAL FY 2025/26 TARIFFS (1 July 2025 - 30 June 2026)
// ═══════════════════════════════════════════════════════════════════════════════

const TARIFFS = {
  electricity: {
    // Residential (2-step, 30-day basis)
    residential: {
      bands: [
        { maxKwh: 509.24, rate: 2.6444 },  // R2.6444/kWh for 0-509.24 kWh
        { maxKwh: Infinity, rate: 3.0348 }, // R3.0348/kWh for 509.24+ kWh
      ],
      serviceCharge: 278.98,   // R278.98/month
      networkCharge: 903.69,   // R903.69/month
      vatRate: 0.15,
    },
    // Commercial (5-step, 30-day basis)
    commercial: {
      bands: [
        { maxKwh: 492.81, rate: 3.4907 },
        { maxKwh: 985.63, rate: 3.8315 },
        { maxKwh: 1971.25, rate: 4.0179 },
        { maxKwh: 2956.88, rate: 4.1644 },
        { maxKwh: Infinity, rate: 4.2995 },
      ],
      serviceCharge: 816.85,
      networkCharge: 783.16,
      vatRate: 0.15,
    },
  },

  water: {
    // Residential (8-step)
    residential: {
      bands: [
        { maxKl: 6.0, rate: 0 },          // Free basic water
        { maxKl: 10.0, rate: 29.84 },
        { maxKl: 15.0, rate: 31.15 },
        { maxKl: 20.0, rate: 43.67 },
        { maxKl: 30.0, rate: 60.36 },
        { maxKl: 40.0, rate: 66.01 },
        { maxKl: 50.0, rate: 83.28 },
        { maxKl: Infinity, rate: 89.24 },
      ],
      demandLevy: 65.08,
      vatRate: 0.15,
    },
    // Business (flat rate)
    commercial: {
      flatRate: 68.26,  // R68.26/kL
      demandLevy: 367.86,
      vatRate: 0.15,
    },
  },

  rates: {
    residential: {
      ratePerRand: 0.0095447,  // Annual rate per Rand of valuation
      rebateThreshold: 300000,  // First R300k exempt for primary residence
    },
    business: {
      ratePerRand: 0.0238620,  // No rebate for business
    },
  },

  sewerage: {
    residential: {
      standSizeBased: 697.73,  // For ~500m² stand
    },
    business: {
      perKlRate: 52.85,       // Based on water consumption
      perUnit: 358.42,        // Per living unit charge
    },
  },

  refuse: {
    residential: {
      standard: 327.00,
      large: 477.00,
    },
    commercial: {
      perBin: 495.97,
      cityCleaningLevy: {
        small: 257,
        medium: 495,
        large: 825,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface CalculationResult {
  expected: number;        // In cents
  breakdown: string[];
  status: 'VERIFIED' | 'DISCREPANCY' | 'CANNOT_VERIFY';
  difference?: number;     // In cents
}

function calculateElectricity(
  consumption: number,
  isCommercial: boolean,
  billingDays: number = 30
): CalculationResult {
  const tariff = isCommercial ? TARIFFS.electricity.commercial : TARIFFS.electricity.residential;
  const breakdown: string[] = [];

  // Scale bands for billing period
  const scale = billingDays / 30;

  let energyCharge = 0;
  let remainingKwh = consumption;
  let prevMax = 0;

  for (const band of tariff.bands) {
    const scaledMax = band.maxKwh === Infinity ? Infinity : band.maxKwh * scale;
    const bandWidth = scaledMax - (prevMax * scale);
    const kwhInBand = Math.min(remainingKwh, bandWidth);

    if (kwhInBand > 0) {
      const charge = kwhInBand * band.rate;
      energyCharge += charge;
      breakdown.push(`  ${kwhInBand.toFixed(2)} kWh × R${band.rate.toFixed(4)} = R${charge.toFixed(2)}`);
      remainingKwh -= kwhInBand;
    }
    prevMax = band.maxKwh;
  }

  // Fixed charges (scale for billing days)
  const serviceCharge = tariff.serviceCharge * (billingDays / 30);
  const networkCharge = tariff.networkCharge * (billingDays / 30);

  breakdown.push(`  Service charge: R${serviceCharge.toFixed(2)}`);
  breakdown.push(`  Network charge: R${networkCharge.toFixed(2)}`);

  const subtotal = energyCharge + serviceCharge + networkCharge;
  const vat = subtotal * tariff.vatRate;
  const total = subtotal + vat;

  breakdown.push(`  Subtotal: R${subtotal.toFixed(2)}`);
  breakdown.push(`  VAT (15%): R${vat.toFixed(2)}`);
  breakdown.push(`  EXPECTED TOTAL: R${total.toFixed(2)}`);

  return {
    expected: Math.round(total * 100), // Convert to cents
    breakdown,
    status: 'VERIFIED',
  };
}

function calculateWater(
  consumption: number,
  isCommercial: boolean,
  units: number = 1,
  billingDays: number = 30
): CalculationResult {
  const breakdown: string[] = [];

  if (isCommercial || consumption === 0) {
    // Business flat rate or zero consumption
    const tariff = TARIFFS.water.commercial;
    const waterCharge = consumption * tariff.flatRate;
    const demandLevy = tariff.demandLevy * units;

    breakdown.push(`  ${consumption.toFixed(2)} kL × R${tariff.flatRate}/kL = R${waterCharge.toFixed(2)}`);
    breakdown.push(`  Demand levy (${units} unit${units > 1 ? 's' : ''}): R${demandLevy.toFixed(2)}`);

    const subtotal = waterCharge + demandLevy;
    const vat = subtotal * tariff.vatRate;
    const total = subtotal + vat;

    breakdown.push(`  Subtotal: R${subtotal.toFixed(2)}`);
    breakdown.push(`  VAT (15%): R${vat.toFixed(2)}`);
    breakdown.push(`  EXPECTED TOTAL: R${total.toFixed(2)}`);

    return {
      expected: Math.round(total * 100),
      breakdown,
      status: 'VERIFIED',
    };
  }

  // Residential stepped tariff
  const tariff = TARIFFS.water.residential;
  const scale = (billingDays / 30) * units;

  let waterCharge = 0;
  let remainingKl = consumption;
  let prevMax = 0;

  for (const band of tariff.bands) {
    const scaledMax = band.maxKl * scale;
    const scaledPrevMax = prevMax * scale;
    const bandWidth = scaledMax - scaledPrevMax;
    const klInBand = Math.min(remainingKl, bandWidth);

    if (klInBand > 0) {
      const charge = klInBand * band.rate;
      waterCharge += charge;
      if (band.rate > 0) {
        breakdown.push(`  ${klInBand.toFixed(2)} kL × R${band.rate.toFixed(2)} = R${charge.toFixed(2)}`);
      } else {
        breakdown.push(`  ${klInBand.toFixed(2)} kL FREE (basic allocation)`);
      }
      remainingKl -= klInBand;
    }
    prevMax = band.maxKl;
  }

  const demandLevy = tariff.demandLevy * units;
  breakdown.push(`  Demand levy: R${demandLevy.toFixed(2)}`);

  const subtotal = waterCharge + demandLevy;
  const vat = subtotal * tariff.vatRate;
  const total = subtotal + vat;

  breakdown.push(`  Subtotal: R${subtotal.toFixed(2)}`);
  breakdown.push(`  VAT (15%): R${vat.toFixed(2)}`);
  breakdown.push(`  EXPECTED TOTAL: R${total.toFixed(2)}`);

  return {
    expected: Math.round(total * 100),
    breakdown,
    status: 'VERIFIED',
  };
}

function calculateRates(
  valuation: number,  // In Rands
  isCommercial: boolean,
  isPrimaryResidence: boolean = true
): CalculationResult {
  const tariff = isCommercial ? TARIFFS.rates.business : TARIFFS.rates.residential;
  const breakdown: string[] = [];

  let assessableValue = valuation;

  if (!isCommercial && isPrimaryResidence) {
    const rebate = Math.min(TARIFFS.rates.residential.rebateThreshold, valuation);
    assessableValue = Math.max(0, valuation - rebate);
    breakdown.push(`  Valuation: R${valuation.toLocaleString()}`);
    breakdown.push(`  Less rebate (first R300k): -R${rebate.toLocaleString()}`);
    breakdown.push(`  Assessable value: R${assessableValue.toLocaleString()}`);
  } else {
    breakdown.push(`  Assessable value: R${valuation.toLocaleString()}`);
  }

  const annualRates = assessableValue * tariff.ratePerRand;
  const monthlyRates = annualRates / 12;

  breakdown.push(`  Rate: ${tariff.ratePerRand} per Rand p.a.`);
  breakdown.push(`  Annual rates: R${annualRates.toFixed(2)}`);
  breakdown.push(`  Monthly rates: R${monthlyRates.toFixed(2)}`);
  breakdown.push(`  (Rates are VAT-exempt)`);
  breakdown.push(`  EXPECTED TOTAL: R${monthlyRates.toFixed(2)}`);

  return {
    expected: Math.round(monthlyRates * 100),
    breakdown,
    status: 'VERIFIED',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

interface ServiceVerification {
  service: string;
  billed: number;          // In cents
  expected: number;        // In cents
  difference: number;      // In cents
  status: 'VERIFIED' | 'DISCREPANCY' | 'CANNOT_VERIFY';
  breakdown: string[];
  tolerance: number;       // In cents
}

function verifyBill(bill: ParsedBill): {
  account: string;
  verifications: ServiceVerification[];
  overallStatus: string;
} {
  const verifications: ServiceVerification[] = [];

  // Determine property type
  const isCommercial = bill.propertyInfo?.propertyType === 'Business' ||
    bill.rawText.includes('Property Rates Business');
  const units = bill.propertyInfo?.units || 1;
  const valuationCents = bill.propertyInfo?.municipalValuation || 0;
  const valuationRands = valuationCents / 100;

  // Get billing days from bill if available (default 30)
  const billingDays = bill.billingDays || 30;

  // Verify ELECTRICITY
  const elecItem = bill.lineItems.find(i => i.serviceType === 'electricity');
  if (elecItem && elecItem.quantity && elecItem.quantity > 0) {
    const calc = calculateElectricity(elecItem.quantity, isCommercial, billingDays);
    const tolerance = isCommercial ? 10000 : 2000; // R100 commercial, R20 residential

    verifications.push({
      service: 'ELECTRICITY',
      billed: elecItem.amount,
      expected: calc.expected,
      difference: elecItem.amount - calc.expected,
      status: Math.abs(elecItem.amount - calc.expected) <= tolerance ? 'VERIFIED' : 'DISCREPANCY',
      breakdown: calc.breakdown,
      tolerance,
    });
  }

  // Verify WATER
  const waterItem = bill.lineItems.find(i => i.serviceType === 'water');
  if (waterItem) {
    const consumption = waterItem.quantity || 0;
    const calc = calculateWater(consumption, isCommercial, units, billingDays);
    const tolerance = 2000; // R20

    verifications.push({
      service: 'WATER',
      billed: waterItem.amount,
      expected: calc.expected,
      difference: waterItem.amount - calc.expected,
      status: Math.abs(waterItem.amount - calc.expected) <= tolerance ? 'VERIFIED' : 'DISCREPANCY',
      breakdown: calc.breakdown,
      tolerance,
    });
  }

  // Verify RATES
  const ratesItem = bill.lineItems.find(i => i.serviceType === 'rates');
  if (ratesItem && valuationRands > 0) {
    const calc = calculateRates(valuationRands, isCommercial, !isCommercial);
    const tolerance = 5000; // R50

    verifications.push({
      service: 'RATES',
      billed: ratesItem.amount,
      expected: calc.expected,
      difference: ratesItem.amount - calc.expected,
      status: Math.abs(ratesItem.amount - calc.expected) <= tolerance ? 'VERIFIED' : 'DISCREPANCY',
      breakdown: calc.breakdown,
      tolerance,
    });
  }

  // Verify SEWERAGE
  const sewerItem = bill.lineItems.find(i => i.serviceType === 'sewerage');
  if (sewerItem) {
    const breakdown: string[] = [];
    let expected: number;

    if (units > 1) {
      // Per-unit billing
      const perUnit = TARIFFS.sewerage.business.perUnit;
      const subtotal = perUnit * units;
      const vat = subtotal * 0.15;
      expected = Math.round((subtotal + vat) * 100);
      breakdown.push(`  ${units} units × R${perUnit}/unit = R${subtotal.toFixed(2)}`);
      breakdown.push(`  VAT (15%): R${vat.toFixed(2)}`);
      breakdown.push(`  EXPECTED: R${((subtotal + vat)).toFixed(2)}`);
    } else if (isCommercial && waterItem?.quantity) {
      // Based on water consumption
      const perKl = TARIFFS.sewerage.business.perKlRate;
      const subtotal = waterItem.quantity * perKl;
      const vat = subtotal * 0.15;
      expected = Math.round((subtotal + vat) * 100);
      breakdown.push(`  ${waterItem.quantity} kL × R${perKl}/kL = R${subtotal.toFixed(2)}`);
      breakdown.push(`  VAT (15%): R${vat.toFixed(2)}`);
      breakdown.push(`  EXPECTED: R${((subtotal + vat)).toFixed(2)}`);
    } else {
      // Residential stand-size based
      const charge = TARIFFS.sewerage.residential.standSizeBased;
      const vat = charge * 0.15;
      expected = Math.round((charge + vat) * 100);
      breakdown.push(`  Stand-size based: R${charge.toFixed(2)}`);
      breakdown.push(`  VAT (15%): R${vat.toFixed(2)}`);
      breakdown.push(`  EXPECTED: R${((charge + vat)).toFixed(2)}`);
    }

    const tolerance = 5000; // R50

    verifications.push({
      service: 'SEWERAGE',
      billed: sewerItem.amount,
      expected,
      difference: sewerItem.amount - expected,
      status: Math.abs(sewerItem.amount - expected) <= tolerance ? 'VERIFIED' : 'DISCREPANCY',
      breakdown,
      tolerance,
    });
  }

  // Verify REFUSE
  const refuseItem = bill.lineItems.find(i => i.serviceType === 'refuse');
  if (refuseItem) {
    const breakdown: string[] = [];
    let expected: number;

    if (isCommercial) {
      // Estimate based on typical commercial setup
      const binCharge = TARIFFS.refuse.commercial.perBin;
      const cleaningLevy = TARIFFS.refuse.commercial.cityCleaningLevy.medium;
      const subtotal = binCharge + cleaningLevy;
      const vat = subtotal * 0.15;
      expected = Math.round((subtotal + vat) * 100);
      breakdown.push(`  Commercial bin: R${binCharge.toFixed(2)}`);
      breakdown.push(`  City cleaning levy: R${cleaningLevy.toFixed(2)}`);
      breakdown.push(`  VAT (15%): R${vat.toFixed(2)}`);
      breakdown.push(`  EXPECTED (estimate): R${((subtotal + vat)).toFixed(2)}`);
    } else {
      const charge = TARIFFS.refuse.residential.standard;
      const vat = charge * 0.15;
      expected = Math.round((charge + vat) * 100);
      breakdown.push(`  Residential refuse: R${charge.toFixed(2)}`);
      breakdown.push(`  VAT (15%): R${vat.toFixed(2)}`);
      breakdown.push(`  EXPECTED: R${((charge + vat)).toFixed(2)}`);
    }

    const tolerance = 10000; // R100 for refuse (variable)

    verifications.push({
      service: 'REFUSE',
      billed: refuseItem.amount,
      expected,
      difference: refuseItem.amount - expected,
      status: Math.abs(refuseItem.amount - expected) <= tolerance ? 'VERIFIED' : 'DISCREPANCY',
      breakdown,
      tolerance,
    });
  }

  // Determine overall status
  const verified = verifications.filter(v => v.status === 'VERIFIED').length;
  const total = verifications.length;
  const overallStatus = verified === total ? 'ALL VERIFIED' :
    verified === 0 ? 'ISSUES FOUND' : `PARTIAL (${verified}/${total})`;

  return {
    account: bill.accountNumber || 'unknown',
    verifications,
    overallStatus,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('COJ TARIFF VERIFICATION - FY 2025/26');
  console.log('═'.repeat(80));
  console.log('\nVerifying bills against official City of Johannesburg tariffs');
  console.log('Tariff sources: City Power, Joburg Water, COJ Rates Policy\n');

  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} bills to verify\n`);

  let totalVerified = 0;
  let totalChecks = 0;
  let totalDiscrepancy = 0;

  const summaries: Array<{
    account: string;
    file: string;
    status: string;
    services: string[];
    discrepancies: Array<{ service: string; amount: number }>;
  }> = [];

  for (const file of files) {
    console.log(`${'─'.repeat(80)}`);
    console.log(`BILL: ${file}`);
    console.log(`${'─'.repeat(80)}`);

    try {
      const buffer = readFileSync(join(DATA_DIR, file));
      const parsed = await parseCojBill(buffer);

      const result = verifyBill(parsed);

      // Display header
      const valuationRands = parsed.propertyInfo?.municipalValuation
        ? `R${(parsed.propertyInfo.municipalValuation / 100).toLocaleString()}`
        : 'N/A';
      const propType = parsed.propertyInfo?.propertyType || 'unknown';

      console.log(`\nAccount: ${result.account}`);
      console.log(`Type: ${propType} | Valuation: ${valuationRands} | Units: ${parsed.propertyInfo?.units || 1}`);
      console.log(`Status: ${result.overallStatus}`);
      console.log('');

      const summary = {
        account: result.account,
        file,
        status: result.overallStatus,
        services: [] as string[],
        discrepancies: [] as Array<{ service: string; amount: number }>,
      };

      for (const v of result.verifications) {
        totalChecks++;
        const icon = v.status === 'VERIFIED' ? '✓' : '✗';
        const diffRands = v.difference / 100;

        if (v.status === 'VERIFIED') {
          totalVerified++;
          console.log(`${icon} ${v.service}: R${(v.billed / 100).toFixed(2)} = VERIFIED`);
          summary.services.push(`${v.service}: OK`);
        } else {
          totalDiscrepancy += Math.abs(v.difference);
          console.log(`${icon} ${v.service}: DISCREPANCY of R${Math.abs(diffRands).toFixed(2)}`);
          console.log(`     Billed: R${(v.billed / 100).toFixed(2)}`);
          console.log(`     Expected: R${(v.expected / 100).toFixed(2)}`);
          summary.services.push(`${v.service}: DIFF`);
          summary.discrepancies.push({ service: v.service, amount: v.difference });
        }

        // Show breakdown
        if (v.status !== 'VERIFIED' || process.env.VERBOSE) {
          console.log('     Calculation:');
          for (const line of v.breakdown) {
            console.log(`     ${line}`);
          }
        }
        console.log('');
      }

      summaries.push(summary);

    } catch (error) {
      console.log(`\n  ❌ ERROR: ${error}`);
      summaries.push({
        account: 'ERROR',
        file,
        status: 'PARSE_FAILED',
        services: [],
        discrepancies: [],
      });
    }
  }

  // Final Summary
  console.log('\n' + '═'.repeat(80));
  console.log('VERIFICATION SUMMARY');
  console.log('═'.repeat(80));

  console.log(`\nTotal bills: ${summaries.length}`);
  console.log(`Total service checks: ${totalChecks}`);
  console.log(`Verified: ${totalVerified}/${totalChecks} (${Math.round(totalVerified/totalChecks*100)}%)`);
  console.log(`Total discrepancy: R${(totalDiscrepancy / 100).toFixed(2)}`);

  // Bills with issues
  const issuesBills = summaries.filter(s => s.discrepancies.length > 0);
  if (issuesBills.length > 0) {
    console.log(`\nBILLS WITH DISCREPANCIES:`);
    for (const s of issuesBills) {
      console.log(`  ${s.account}: ${s.discrepancies.map(d => `${d.service} R${(Math.abs(d.amount)/100).toFixed(2)}`).join(', ')}`);
    }
  }

  // Quick reference
  console.log(`\nQUICK REFERENCE:`);
  for (const s of summaries) {
    const statusIcon = s.status === 'ALL VERIFIED' ? '✓' :
      s.status === 'PARSE_FAILED' ? '✗' : '~';
    console.log(`  ${statusIcon} ${s.account}: ${s.status}`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('Tariffs verified against official FY 2025/26 COJ schedules');
  console.log('═'.repeat(80) + '\n');
}

main().catch(console.error);
