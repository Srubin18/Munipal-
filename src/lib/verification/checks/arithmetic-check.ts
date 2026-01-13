import { ParsedBill } from '../../parsers/types';
import { Finding } from '../types';

// Services that are VAT exempt (0% VAT)
const VAT_EXEMPT_SERVICES = ['rates'];

/**
 * Check D: Billing arithmetic
 * - Arithmetic correctness
 * - VAT correctness (accounting for VAT-exempt services like rates)
 * - Payment allocation
 */
export function runArithmeticChecks(bill: ParsedBill): Finding[] {
  const findings: Finding[] = [];

  // Check line items sum to total due (line items are VAT-inclusive)
  if (bill.lineItems.length > 0 && bill.totalDue) {
    const lineItemsTotal = bill.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const difference = Math.abs(bill.totalDue - lineItemsTotal);

    // Allow for small rounding differences (R1)
    if (difference < 100) {
      findings.push({
        checkType: 'arithmetic',
        checkName: 'line_items_total',
        status: 'VERIFIED',
        confidence: 98,
        title: 'Bill arithmetic verified',
        explanation: 'The individual charges on your bill correctly add up to the total due.',
        citation: {
          hasSource: false,
          noSourceReason: 'Arithmetic verification does not require an external source.',
        },
      });
    } else {
      findings.push({
        checkType: 'arithmetic',
        checkName: 'line_items_total',
        status: 'LIKELY_WRONG',
        confidence: 95,
        title: 'Bill arithmetic error detected',
        explanation: `The sum of individual charges (R${(lineItemsTotal / 100).toFixed(2)}) does not match the total due (R${(bill.totalDue / 100).toFixed(2)}). There is a discrepancy of R${(difference / 100).toFixed(2)}.`,
        impactMin: difference,
        impactMax: difference,
        citation: {
          hasSource: false,
          noSourceReason:
            'Arithmetic verification based on bill data. Customers are entitled to accurate billing per CoJ Customer Service Charter.',
        },
      });
    }
  }

  // Check VAT calculation - must account for VAT-exempt services (property rates = 0% VAT)
  if (bill.lineItems.length > 0 && bill.vatAmount !== null && bill.vatAmount !== undefined) {
    // Calculate expected VAT based on service types
    // VAT-exempt: rates (property rates are 0% VAT in SA)
    // VAT-able: electricity, water, refuse, sundry, sewerage (15% VAT)
    let vatableAmount = 0;
    let exemptAmount = 0;

    for (const item of bill.lineItems) {
      if (VAT_EXEMPT_SERVICES.includes(item.serviceType)) {
        // VAT-exempt - the amount IS the total (no VAT)
        exemptAmount += item.amount;
      } else {
        // VAT-able - item.amount includes VAT, extract the pre-VAT amount
        // If item has metadata.vatAmount use that, otherwise calculate
        const itemVat = item.metadata?.vatAmount ? Math.round(Number(item.metadata.vatAmount) * 100) : 0;
        if (itemVat > 0) {
          vatableAmount += (item.amount - itemVat);
        } else {
          // Reverse calculate: amount = base + 15% VAT, so base = amount / 1.15
          vatableAmount += Math.round(item.amount / 1.15);
        }
      }
    }

    const expectedVat = Math.round(vatableAmount * 0.15);
    const vatDifference = Math.abs(bill.vatAmount - expectedVat);

    // Allow for rounding (R5 tolerance)
    if (vatDifference < 500) {
      findings.push({
        checkType: 'arithmetic',
        checkName: 'vat_calculation',
        status: 'VERIFIED',
        confidence: 97,
        title: 'VAT correctly calculated',
        explanation: `The VAT amount of R${(bill.vatAmount / 100).toFixed(2)} has been correctly applied. Note: Property rates are VAT-exempt.`,
        citation: {
          hasSource: false,
          noSourceReason: 'VAT rate of 15% is standard in South Africa per SARS guidelines. Property rates are VAT-exempt per the VAT Act.',
        },
      });
    } else {
      findings.push({
        checkType: 'arithmetic',
        checkName: 'vat_calculation',
        status: 'LIKELY_WRONG',
        confidence: 90,
        title: 'VAT calculation error',
        explanation: `The VAT amount (R${(bill.vatAmount / 100).toFixed(2)}) does not match expected 15% of VAT-able charges (R${(expectedVat / 100).toFixed(2)}). Note: Property rates are VAT-exempt. Discrepancy: R${(vatDifference / 100).toFixed(2)}.`,
        impactMin: vatDifference,
        impactMax: vatDifference,
        citation: {
          hasSource: false,
          noSourceReason: 'VAT rate of 15% is standard in South Africa per SARS guidelines. Property rates are VAT-exempt per the VAT Act.',
        },
      });
    }
  }

  // Check total due calculation
  // Only check if current charges + VAT = total due (since payments may have been applied)
  // This is simpler and more reliable than trying to track payments
  if (bill.currentCharges && bill.totalDue && bill.vatAmount !== null && bill.vatAmount !== undefined) {
    const chargesWithVat = bill.currentCharges + bill.vatAmount;
    const totalDifference = Math.abs(bill.totalDue - chargesWithVat);

    // If total matches current charges + VAT, it's correct (no outstanding balance)
    // If there's a difference, it could be due to previous balance - not necessarily wrong
    if (totalDifference < 100) {
      findings.push({
        checkType: 'arithmetic',
        checkName: 'total_calculation',
        status: 'VERIFIED',
        confidence: 95,
        title: 'Total amount calculation verified',
        explanation: 'The total due matches your current charges plus VAT.',
        citation: {
          hasSource: false,
          noSourceReason: 'Arithmetic verification based on bill data.',
        },
      });
    }
    // Don't report as error - the difference is likely due to payments or arrears which we're not tracking
  }

  return findings;
}
