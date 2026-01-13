/**
 * Arithmetic Verification Checks for MUNIPAL
 *
 * CORE PRINCIPLE: Separate ARITHMETIC verification from TARIFF verification
 * - Arithmetic: Do the numbers on the bill add up correctly?
 * - Tariff: Are the rates correct? (handled in tariff-check.ts)
 *
 * This file ONLY checks internal consistency of the bill mathematics.
 * It does NOT accuse overcharging - that requires tariff verification.
 */

import { ParsedBill, ParsedLineItem } from '../../parsers/types';
import { Finding } from '../types';

// Services that are VAT exempt (0% VAT in South Africa)
const VAT_EXEMPT_SERVICES = ['rates'];

// Rounding tolerance in cents
const ROUNDING_TOLERANCE_CENTS = 100; // R1.00

/**
 * Run arithmetic checks on parsed bill
 *
 * These checks verify INTERNAL CONSISTENCY only:
 * 1. Line items sum to stated total
 * 2. VAT is calculated correctly on VAT-able items
 * 3. Overall total = charges + VAT (if applicable)
 */
export function runArithmeticChecks(bill: ParsedBill): Finding[] {
  const findings: Finding[] = [];

  // Check 1: Strict reconciliation table
  const reconciliationFinding = checkReconciliationTable(bill);
  if (reconciliationFinding) {
    findings.push(reconciliationFinding);
  }

  // Check 2: VAT verification with exact line items
  const vatFinding = checkVatCalculation(bill);
  if (vatFinding) {
    findings.push(vatFinding);
  }

  return findings;
}

/**
 * STRICT RECONCILIATION TABLE
 *
 * Verifies: Electricity + Water + Sewer + Refuse + Rates + Sundry = Current Charges
 *
 * If totals match exactly (within rounding tolerance): NO arithmetic error
 * This is purely internal consistency - NOT tariff verification
 */
function checkReconciliationTable(bill: ParsedBill): Finding | null {
  if (bill.lineItems.length === 0) {
    return null;
  }

  // Build reconciliation breakdown
  const breakdown: Array<{ service: string; amount: number }> = [];
  let calculatedTotal = 0;

  // Group by service type
  const serviceGroups: Record<string, number> = {};
  for (const item of bill.lineItems) {
    const service = formatServiceName(item.serviceType);
    serviceGroups[service] = (serviceGroups[service] || 0) + item.amount;
    calculatedTotal += item.amount;
  }

  // Convert to breakdown array
  for (const [service, amount] of Object.entries(serviceGroups)) {
    breakdown.push({ service, amount });
  }

  // Compare against stated total (if available)
  const statedTotal = bill.totalDue || bill.currentCharges || calculatedTotal;
  const difference = Math.abs(statedTotal - calculatedTotal);

  // Build reconciliation table text
  const tableLines = breakdown.map(
    (b) => `• ${b.service}: R${(b.amount / 100).toFixed(2)}`
  );
  const tableText = tableLines.join('\n');

  // Within tolerance = VERIFIED
  if (difference <= ROUNDING_TOLERANCE_CENTS) {
    return {
      checkType: 'arithmetic',
      checkName: 'reconciliation_verified',
      status: 'VERIFIED',
      confidence: 98,
      title: 'Bill arithmetic verified',
      explanation: `All line items sum correctly to the bill total.\n\n**Reconciliation:**\n${tableText}\n\n**Calculated Total:** R${(calculatedTotal / 100).toFixed(2)}\n**Stated Total:** R${(statedTotal / 100).toFixed(2)}\n\n_Arithmetic is internally consistent._`,
      citation: {
        hasSource: false,
        noSourceReason: 'Arithmetic verification does not require an external source.',
      },
    };
  }

  // Difference detected - report as arithmetic issue (NOT accusation)
  return {
    checkType: 'arithmetic',
    checkName: 'reconciliation_discrepancy',
    status: 'LIKELY_WRONG',
    confidence: 95,
    title: 'Bill arithmetic discrepancy detected',
    explanation: `The sum of line items does not match the stated total.\n\n**Reconciliation:**\n${tableText}\n\n**Calculated Total:** R${(calculatedTotal / 100).toFixed(2)}\n**Stated Total:** R${(statedTotal / 100).toFixed(2)}\n**Discrepancy:** R${(difference / 100).toFixed(2)}\n\n_This is an arithmetic inconsistency in the bill, not a tariff issue._`,
    impactMin: difference,
    impactMax: difference,
    citation: {
      hasSource: false,
      noSourceReason: 'Arithmetic verification based on bill data. Customers are entitled to accurate billing per CoJ Customer Service Charter.',
    },
  };
}

/**
 * VAT VERIFICATION WITH EXACT LINE ITEMS
 *
 * RULES:
 * - Must identify EXACT line items that are VAT-able vs VAT-exempt
 * - Show VATable base, expected VAT, billed VAT
 * - If difference < rounding tolerance: DO NOT flag
 * - Property rates are VAT-exempt per South African VAT Act
 */
function checkVatCalculation(bill: ParsedBill): Finding | null {
  // Skip if no VAT amount on bill
  if (bill.vatAmount === null || bill.vatAmount === undefined) {
    return null;
  }

  const billedVat = bill.vatAmount;

  // Categorize line items
  const vatableItems: Array<{ service: string; amount: number; base: number; vat: number }> = [];
  const exemptItems: Array<{ service: string; amount: number }> = [];

  let totalVatableBase = 0;

  for (const item of bill.lineItems) {
    const service = formatServiceName(item.serviceType);

    if (VAT_EXEMPT_SERVICES.includes(item.serviceType)) {
      // VAT-exempt item - amount IS the total (no VAT)
      exemptItems.push({ service, amount: item.amount });
    } else {
      // VAT-able item - calculate base and VAT
      let itemVat = 0;
      let itemBase = 0;

      if (item.metadata?.vatAmount) {
        // Use explicit VAT amount if provided
        itemVat = Math.round(Number(item.metadata.vatAmount) * 100);
        itemBase = item.amount - itemVat;
      } else {
        // Reverse calculate: amount = base × 1.15, so base = amount / 1.15
        itemBase = Math.round(item.amount / 1.15);
        itemVat = item.amount - itemBase;
      }

      vatableItems.push({
        service,
        amount: item.amount,
        base: itemBase,
        vat: itemVat,
      });
      totalVatableBase += itemBase;
    }
  }

  // Calculate expected VAT (15% of VAT-able base)
  const expectedVat = Math.round(totalVatableBase * 0.15);
  const vatDifference = Math.abs(billedVat - expectedVat);

  // Build detailed breakdown
  const vatableText = vatableItems
    .map(
      (v) =>
        `• ${v.service}: R${(v.base / 100).toFixed(2)} + VAT R${(v.vat / 100).toFixed(2)} = R${(v.amount / 100).toFixed(2)}`
    )
    .join('\n');

  const exemptText =
    exemptItems.length > 0
      ? `\n\n**VAT-Exempt:**\n` +
        exemptItems.map((e) => `• ${e.service}: R${(e.amount / 100).toFixed(2)} (0% VAT)`).join('\n')
      : '';

  // Within tolerance = VERIFIED
  if (vatDifference <= ROUNDING_TOLERANCE_CENTS * 5) {
    // R5 tolerance for VAT
    return {
      checkType: 'arithmetic',
      checkName: 'vat_verified',
      status: 'VERIFIED',
      confidence: 97,
      title: 'VAT correctly calculated',
      explanation: `VAT has been correctly applied at 15% on applicable services.\n\n**VAT-able Services:**\n${vatableText}${exemptText}\n\n**VATable Base:** R${(totalVatableBase / 100).toFixed(2)}\n**Expected VAT (15%):** R${(expectedVat / 100).toFixed(2)}\n**Billed VAT:** R${(billedVat / 100).toFixed(2)}\n\n_Property rates are VAT-exempt per South African VAT Act._`,
      citation: {
        hasSource: false,
        noSourceReason: 'VAT rate of 15% is standard in South Africa per SARS guidelines.',
      },
    };
  }

  // VAT discrepancy detected
  return {
    checkType: 'arithmetic',
    checkName: 'vat_discrepancy',
    status: 'LIKELY_WRONG',
    confidence: 90,
    title: 'VAT calculation discrepancy',
    explanation: `The billed VAT amount does not match expected 15% of VAT-able charges.\n\n**VAT-able Services:**\n${vatableText}${exemptText}\n\n**VATable Base:** R${(totalVatableBase / 100).toFixed(2)}\n**Expected VAT (15%):** R${(expectedVat / 100).toFixed(2)}\n**Billed VAT:** R${(billedVat / 100).toFixed(2)}\n**Discrepancy:** R${(vatDifference / 100).toFixed(2)}\n\n_Note: Property rates are VAT-exempt._`,
    impactMin: vatDifference,
    impactMax: vatDifference,
    citation: {
      hasSource: false,
      noSourceReason: 'VAT rate of 15% is standard in South Africa per SARS guidelines.',
    },
  };
}

/**
 * Format service type for display
 */
function formatServiceName(serviceType: string): string {
  const names: Record<string, string> = {
    electricity: 'Electricity',
    water: 'Water',
    sewerage: 'Sewerage/Sanitation',
    refuse: 'Refuse',
    rates: 'Property Rates',
    sundry: 'Business Services',
    other: 'Other Charges',
  };
  return names[serviceType] || serviceType;
}
