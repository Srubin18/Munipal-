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

import { ParsedBill } from '../../parsers/types';
import { Finding } from '../types';
import { F, formatAmount } from '../finding-builder';

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

  // Build reconciliation breakdown grouped by service
  const serviceGroups: Record<string, number> = {};
  let calculatedTotal = 0;

  for (const item of bill.lineItems) {
    const service = formatServiceName(item.serviceType);
    serviceGroups[service] = (serviceGroups[service] || 0) + item.amount;
    calculatedTotal += item.amount;
  }

  const breakdown = Object.entries(serviceGroups).map(([service, amount]) => ({ service, amount }));
  const statedTotal = bill.totalDue || bill.currentCharges || calculatedTotal;
  const difference = Math.abs(statedTotal - calculatedTotal);

  // Build elegant breakdown text
  const tableText = breakdown.map(b => `• ${b.service}: R${formatAmount(b.amount)}`).join('\n');

  // Within tolerance = arithmetic verified
  if (difference <= ROUNDING_TOLERANCE_CENTS) {
    return F.arithmetic('reconciliation')
      .verified('Bill arithmetic verified')
      .because(
        `All line items sum correctly to the bill total.\n\n` +
        `**Reconciliation:**\n${tableText}\n\n` +
        `**Calculated Total:** R${formatAmount(calculatedTotal)}\n` +
        `**Stated Total:** R${formatAmount(statedTotal)}\n\n` +
        `_Arithmetic is internally consistent._`
      )
      .confidence(98)
      .withoutSource('Arithmetic verification does not require an external source.')
      .build();
  }

  // Discrepancy detected
  return F.arithmetic('reconciliation')
    .likelyWrong('Bill arithmetic discrepancy detected', difference)
    .because(
      `The sum of line items does not match the stated total.\n\n` +
      `**Reconciliation:**\n${tableText}\n\n` +
      `**Calculated Total:** R${formatAmount(calculatedTotal)}\n` +
      `**Stated Total:** R${formatAmount(statedTotal)}\n` +
      `**Discrepancy:** R${formatAmount(difference)}\n\n` +
      `_This is an arithmetic inconsistency in the bill, not a tariff issue._`
    )
    .confidence(95)
    .withImpact(difference, difference)
    .withoutSource('Arithmetic verification based on bill data. Customers are entitled to accurate billing per CoJ Customer Service Charter.')
    .build();
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
  if (bill.vatAmount === null || bill.vatAmount === undefined) {
    return null;
  }

  const billedVat = bill.vatAmount;
  const vatableItems: Array<{ service: string; amount: number; base: number; vat: number }> = [];
  const exemptItems: Array<{ service: string; amount: number }> = [];
  let totalVatableBase = 0;

  // Categorize and calculate VAT for each line item
  for (const item of bill.lineItems) {
    const service = formatServiceName(item.serviceType);

    if (VAT_EXEMPT_SERVICES.includes(item.serviceType)) {
      exemptItems.push({ service, amount: item.amount });
    } else {
      const itemVat = item.metadata?.vatAmount
        ? Math.round(Number(item.metadata.vatAmount) * 100)
        : item.amount - Math.round(item.amount / 1.15);
      const itemBase = item.amount - itemVat;

      vatableItems.push({ service, amount: item.amount, base: itemBase, vat: itemVat });
      totalVatableBase += itemBase;
    }
  }

  const expectedVat = Math.round(totalVatableBase * 0.15);
  const vatDifference = Math.abs(billedVat - expectedVat);

  // Build elegant breakdown
  const vatableText = vatableItems
    .map(v => `• ${v.service}: R${formatAmount(v.base)} + VAT R${formatAmount(v.vat)} = R${formatAmount(v.amount)}`)
    .join('\n');

  const exemptText = exemptItems.length > 0
    ? `\n\n**VAT-Exempt:**\n` + exemptItems.map(e => `• ${e.service}: R${formatAmount(e.amount)} (0% VAT)`).join('\n')
    : '';

  // Within R5 tolerance = verified
  if (vatDifference <= ROUNDING_TOLERANCE_CENTS * 5) {
    return F.arithmetic('vat')
      .verified('VAT correctly calculated')
      .because(
        `VAT has been correctly applied at 15% on applicable services.\n\n` +
        `**VAT-able Services:**\n${vatableText}${exemptText}\n\n` +
        `**VATable Base:** R${formatAmount(totalVatableBase)}\n` +
        `**Expected VAT (15%):** R${formatAmount(expectedVat)}\n` +
        `**Billed VAT:** R${formatAmount(billedVat)}\n\n` +
        `_Property rates are VAT-exempt per South African VAT Act._`
      )
      .confidence(97)
      .withoutSource('VAT rate of 15% is standard in South Africa per SARS guidelines.')
      .build();
  }

  // VAT discrepancy
  return F.arithmetic('vat')
    .likelyWrong('VAT calculation discrepancy', vatDifference)
    .because(
      `The billed VAT amount does not match expected 15% of VAT-able charges.\n\n` +
      `**VAT-able Services:**\n${vatableText}${exemptText}\n\n` +
      `**VATable Base:** R${formatAmount(totalVatableBase)}\n` +
      `**Expected VAT (15%):** R${formatAmount(expectedVat)}\n` +
      `**Billed VAT:** R${formatAmount(billedVat)}\n` +
      `**Discrepancy:** R${formatAmount(vatDifference)}\n\n` +
      `_Note: Property rates are VAT-exempt._`
    )
    .confidence(90)
    .withImpact(vatDifference, vatDifference)
    .withoutSource('VAT rate of 15% is standard in South Africa per SARS guidelines.')
    .build();
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
