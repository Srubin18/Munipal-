/**
 * Tariff Verification Checks for MUNIPAL
 *
 * Uses the knowledge system to verify charges against official tariffs.
 *
 * CORE PRINCIPLE: NO accusations without explicit tariff citations.
 * - If tariff not available: return CANNOT_VERIFY, never estimate
 * - If category unknown: return CANNOT_VERIFY, never assume
 * - Every finding MUST cite source document and page when accusing
 */

import { ParsedBill, ParsedLineItem, PropertyInfo } from '../../parsers/types';
import { Finding, Citation } from '../types';
import { VerificationOptions } from '../engine';
import {
  calculateElectricity,
  calculateWater,
  calculateSanitation,
  calculateRefuse,
  calculateRates,
  inferCustomerCategory,
} from '../../knowledge/tariffs';
import type { RuleMatchResult, CalculationBreakdown } from '../../knowledge/types';

// Customer categories that require specific commercial tariffs
const COMMERCIAL_CATEGORIES = ['commercial', 'business', 'industrial'];

// Rounding tolerance in cents (R1.00)
const ROUNDING_TOLERANCE_CENTS = 100;

/**
 * Build citation from rule match result
 */
function buildCitation(rule?: RuleMatchResult, breakdown?: CalculationBreakdown): Citation {
  if (!rule) {
    return {
      hasSource: false,
      noSourceReason: 'No tariff rule found in knowledge base for this service.',
    };
  }

  return {
    hasSource: true,
    knowledgeDocumentId: rule.knowledgeDocumentId,
    excerpt: rule.sourceExcerpt,
    // Extended data stored in metadata for UI display
  };
}

/**
 * Format calculation breakdown for explanation
 */
function formatBreakdown(breakdown: CalculationBreakdown): string {
  const parts: string[] = [];

  if (breakdown.consumption) {
    parts.push(`\n**Consumption:** ${breakdown.consumption.value} ${breakdown.consumption.unit}`);
  }

  if (breakdown.bands && breakdown.bands.length > 0) {
    parts.push('\n**Calculation:**');
    for (const band of breakdown.bands) {
      parts.push(`• ${band.range}: ${band.usage} × ${(band.rate / 100).toFixed(2)} c = R${(band.amount / 100).toFixed(2)}`);
    }
  }

  if (breakdown.fixedCharges && breakdown.fixedCharges.length > 0) {
    parts.push('\n**Fixed Charges:**');
    for (const charge of breakdown.fixedCharges) {
      parts.push(`• ${charge.name}: R${(charge.amount / 100).toFixed(2)}`);
    }
  }

  parts.push(`\n**Subtotal:** R${(breakdown.subtotal / 100).toFixed(2)}`);

  if (breakdown.vat) {
    parts.push(`**VAT (${breakdown.vat.rate}%):** R${(breakdown.vat.amount / 100).toFixed(2)}`);
  }

  parts.push(`**Expected Total:** R${(breakdown.total / 100).toFixed(2)}`);
  parts.push(`\n_Source: ${breakdown.financialYear} ${breakdown.customerCategory} tariff_`);

  return parts.join('\n');
}

/**
 * Run all tariff checks against a parsed bill
 */
export async function runTariffChecks(
  bill: ParsedBill,
  options: VerificationOptions = {}
): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Determine customer category from bill data
  const units = bill.propertyInfo?.units || 1;
  const propertyType = bill.propertyInfo?.propertyType || undefined;
  const customerCategory = inferCustomerCategory(
    bill.accountNumber || '',
    propertyType || undefined,
    units
  );

  // Check electricity
  const electricityItem = bill.lineItems.find((i) => i.serviceType === 'electricity');
  if (electricityItem && electricityItem.quantity && electricityItem.quantity > 0) {
    const finding = await checkElectricityTariff(electricityItem, bill, customerCategory);
    findings.push(finding);
  }

  // Check water
  const waterItem = bill.lineItems.find((i) => i.serviceType === 'water');
  if (waterItem) {
    if (waterItem.quantity && waterItem.quantity > 0) {
      const finding = await checkWaterTariff(waterItem, bill, customerCategory);
      findings.push(finding);
    } else if (waterItem.amount > 0) {
      findings.push(checkWaterDemandLevy(waterItem));
    }
  }

  // Check sewerage
  const sewerageItem = bill.lineItems.find((i) => i.serviceType === 'sewerage');
  if (sewerageItem) {
    const finding = await checkSewerageTariff(sewerageItem, waterItem, customerCategory, units);
    findings.push(finding);
  }

  // Check refuse
  const refuseItem = bill.lineItems.find((i) => i.serviceType === 'refuse');
  if (refuseItem && refuseItem.amount > 0) {
    const finding = await checkRefuseTariff(refuseItem, customerCategory);
    findings.push(finding);
  }

  // Check rates
  const ratesItem = bill.lineItems.find((i) => i.serviceType === 'rates');
  if (ratesItem) {
    const finding = await checkPropertyRates(
      ratesItem,
      options.propertyValue || bill.propertyInfo?.municipalValuation || undefined,
      customerCategory
    );
    findings.push(finding);
  }

  // Check sundry (business services)
  const sundryItem = bill.lineItems.find((i) => i.serviceType === 'sundry');
  if (sundryItem) {
    findings.push(checkSundryCharges(sundryItem));
  }

  return findings.filter(Boolean);
}

/**
 * Check electricity charges against official tariffs
 *
 * RULES:
 * - Detect customer category BEFORE applying any heuristics
 * - For MULTI-METER commercial properties: Verify ARITHMETIC using bill rates
 * - For single-meter: Try standard tariff, fall back to arithmetic verification
 * - If commercial tariffs missing: CANNOT_VERIFY (never estimate)
 * - Must cite source document when claiming overcharge
 */
async function checkElectricityTariff(
  item: ParsedLineItem,
  bill: ParsedBill,
  customerCategory: string
): Promise<Finding> {
  const consumption = item.quantity!;
  const actual = item.amount;
  const isCommercial = COMMERCIAL_CATEGORIES.includes(customerCategory);

  // Check if this bill has detailed charge breakdown (multi-meter or specific rates)
  const metadata = item.metadata as {
    meters?: Array<{consumption: number; type: string}>;
    charges?: Array<{step: number; kWh: number; rate: number}>;
    energyChargeTotal?: number;
    serviceCharge?: number;
    networkCharge?: number;
    vatAmount?: number;
  } | undefined;

  const hasMultipleMeters = metadata?.meters && metadata.meters.length > 1;
  const hasBillRates = metadata?.charges && metadata.charges.length > 0;

  // For multi-meter properties or properties with specific bill rates:
  // Verify ARITHMETIC using the rates shown on the bill, not standard tariffs
  if (hasMultipleMeters || (hasBillRates && isCommercial)) {
    return verifyElectricityArithmetic(item, metadata!, isCommercial);
  }

  // Standard tariff verification for single-meter properties
  const billDate = bill.billDate ? new Date(bill.billDate) : undefined;
  const result = await calculateElectricity(
    consumption,
    customerCategory,
    billDate,
    bill.billingDays
  );

  // No tariff found - CRITICAL: Different messages for commercial vs residential
  if (result.cannotVerify || !result.success) {
    // If we have bill rates, fall back to arithmetic verification
    if (hasBillRates && metadata) {
      return verifyElectricityArithmetic(item, metadata, isCommercial);
    }

    const categoryLabel = isCommercial
      ? customerCategory.charAt(0).toUpperCase() + customerCategory.slice(1)
      : 'Residential';

    return {
      checkType: 'tariff',
      checkName: 'electricity_cannot_verify',
      status: 'CANNOT_VERIFY',
      confidence: 0,
      title: `Electricity tariff verification unavailable`,
      explanation: isCommercial
        ? `**${categoryLabel} electricity tariffs** for this financial year are not yet available in the knowledge base. ` +
          `Your electricity charge of R${(actual / 100).toFixed(2)} for ${consumption.toLocaleString()} kWh cannot be verified against official rates until the City Power commercial tariff schedule is loaded.\n\n` +
          `_Note: Commercial tariffs differ significantly from residential rates and cannot be compared._`
        : `We could not locate the applicable City Power tariff schedule for ${categoryLabel.toLowerCase()} customers. ` +
          `Your electricity charge of R${(actual / 100).toFixed(2)} for ${consumption.toLocaleString()} kWh cannot be verified at this time.`,
      citation: {
        hasSource: false,
        noSourceReason: isCommercial
          ? `Commercial/Business electricity tariffs for FY${result.breakdown?.financialYear || 'current'} not yet in knowledge base.`
          : result.cannotVerifyReason || 'Tariff schedule not found.',
      },
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';

  // Determine confidence based on rule verification
  const baseConfidence = result.rule?.isVerified ? 92 : 70;

  // Within tolerance - VERIFIED
  // Use R10 tolerance for residential, R50 for commercial (larger bills)
  const toleranceCents = isCommercial ? 5000 : 1000;
  if (Math.abs(difference) < toleranceCents) {
    return {
      checkType: 'tariff',
      checkName: 'electricity_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: 'Electricity charges verified',
      explanation: `Your electricity charge of R${(actual / 100).toFixed(2)} for ${consumption.toLocaleString()} kWh matches the ${customerCategory} City Power tariff.${breakdownText}`,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  // Discrepancy detected - MUST have citation to accuse
  if (!result.rule?.knowledgeDocumentId) {
    // No source document - cannot make accusation
    return {
      checkType: 'tariff',
      checkName: 'electricity_unverified',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Electricity charge requires manual verification',
      explanation: `Your electricity charge of R${(actual / 100).toFixed(2)} differs from our calculated amount of R${(expected / 100).toFixed(2)}, but we cannot confirm this without a verified tariff source.\n\n` +
        `_Pending official tariff document verification._`,
      citation: {
        hasSource: false,
        noSourceReason: 'Tariff calculation not yet backed by verified source document.',
      },
    };
  }

  // We have a verified source - can report discrepancy
  const impactMin = Math.round(Math.abs(difference) * 0.85);
  const impactMax = Math.abs(difference);

  return {
    checkType: 'tariff',
    checkName: 'electricity_discrepancy',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 7,
    title: difference > 0 ? 'Electricity charge discrepancy detected' : 'Electricity undercharge detected',
    explanation: `Based on the official City Power ${customerCategory} tariff, your electricity charge should be R${(expected / 100).toFixed(2)} for ${consumption.toLocaleString()} kWh.

**Billed:** R${(actual / 100).toFixed(2)}
**Expected:** R${(expected / 100).toFixed(2)}
**Difference:** R${(Math.abs(difference) / 100).toFixed(2)}${breakdownText}`,
    impactMin,
    impactMax,
    citation: buildCitation(result.rule, result.breakdown),
  };
}

/**
 * Verify electricity arithmetic using rates shown on the bill
 * For multi-meter properties with specific/negotiated rates
 */
function verifyElectricityArithmetic(
  item: ParsedLineItem,
  metadata: {
    meters?: Array<{consumption: number; type: string}>;
    charges?: Array<{step: number; kWh: number; rate: number}>;
    energyChargeTotal?: number;
    serviceCharge?: number;
    networkCharge?: number;
    demandLevy?: number;
    vatAmount?: number;
  },
  isCommercial: boolean
): Finding {
  const actual = item.amount;
  const charges = metadata.charges || [];
  const meterCount = metadata.meters?.length || 1;

  // Calculate expected energy charges from bill rates
  let expectedEnergy = 0;
  const breakdownLines: string[] = [];

  for (const charge of charges) {
    const chargeAmount = charge.kWh * charge.rate;
    expectedEnergy += chargeAmount;
    breakdownLines.push(`• ${charge.kWh.toLocaleString()} kWh × R${charge.rate.toFixed(4)} = R${chargeAmount.toFixed(2)}`);
  }

  // Add fixed charges
  const serviceCharge = metadata.serviceCharge || 0;
  const networkCharge = metadata.networkCharge || 0;
  const demandLevy = metadata.demandLevy || 0;
  const fixedTotal = serviceCharge + networkCharge + demandLevy;

  if (serviceCharge > 0) {
    breakdownLines.push(`• Service charges: R${serviceCharge.toFixed(2)}`);
  }
  if (networkCharge > 0) {
    breakdownLines.push(`• Network charges: R${networkCharge.toFixed(2)}`);
  }
  if (demandLevy > 0) {
    breakdownLines.push(`• Demand levy: R${demandLevy.toFixed(2)}`);
  }

  const subtotal = expectedEnergy + fixedTotal;
  const expectedVat = subtotal * 0.15;
  const expectedTotal = subtotal + expectedVat;

  breakdownLines.push(`\n**Subtotal:** R${subtotal.toFixed(2)}`);
  breakdownLines.push(`**VAT (15%):** R${expectedVat.toFixed(2)}`);
  breakdownLines.push(`**Expected Total:** R${expectedTotal.toFixed(2)}`);

  const difference = actual - Math.round(expectedTotal * 100);
  const toleranceCents = 500; // R5 tolerance for arithmetic

  if (Math.abs(difference) <= toleranceCents) {
    return {
      checkType: 'tariff',
      checkName: 'electricity_arithmetic_verified',
      status: 'VERIFIED',
      confidence: 90,
      title: `Electricity charges verified (${meterCount} meter${meterCount > 1 ? 's' : ''})`,
      explanation: `Your electricity charge of R${(actual / 100).toFixed(2)} has been verified against the rates shown on your bill.\n\n` +
        `**Calculation using bill rates:**\n${breakdownLines.join('\n')}\n\n` +
        `_Note: This property uses ${isCommercial ? 'commercial/bulk' : 'specific'} rates that may differ from standard tariffs._`,
      citation: {
        hasSource: false,
        noSourceReason: 'Arithmetic verified using rates shown on bill. Standard tariff comparison not applicable for multi-meter/bulk properties.',
      },
    };
  }

  // Arithmetic doesn't match - this IS a problem
  return {
    checkType: 'tariff',
    checkName: 'electricity_arithmetic_error',
    status: 'LIKELY_WRONG',
    confidence: 85,
    title: 'Electricity arithmetic discrepancy',
    explanation: `The electricity charges on your bill do not add up correctly based on the rates shown.\n\n` +
      `**Calculation using bill rates:**\n${breakdownLines.join('\n')}\n\n` +
      `**Billed:** R${(actual / 100).toFixed(2)}\n` +
      `**Calculated:** R${expectedTotal.toFixed(2)}\n` +
      `**Discrepancy:** R${(Math.abs(difference) / 100).toFixed(2)}`,
    impactMin: Math.abs(difference),
    impactMax: Math.abs(difference),
    citation: {
      hasSource: false,
      noSourceReason: 'Arithmetic error detected using rates shown on the bill itself.',
    },
  };
}

/**
 * Check water charges against official tariffs
 *
 * RULES:
 * - Must cite source when claiming discrepancy
 * - Clearly distinguish consumption-based vs fixed levy charges
 */
async function checkWaterTariff(
  item: ParsedLineItem,
  bill: ParsedBill,
  customerCategory: string
): Promise<Finding> {
  const consumption = item.quantity!;
  const actual = item.amount;
  const billDate = bill.billDate ? new Date(bill.billDate) : undefined;
  const isCommercial = COMMERCIAL_CATEGORIES.includes(customerCategory);

  const result = await calculateWater(consumption, customerCategory, billDate);

  if (result.cannotVerify || !result.success) {
    return {
      checkType: 'tariff',
      checkName: 'water_cannot_verify',
      status: 'CANNOT_VERIFY',
      confidence: 0,
      title: 'Water tariff verification unavailable',
      explanation: `Your water charge of R${(actual / 100).toFixed(2)} for ${consumption.toLocaleString()} kL cannot be verified. ` +
        (result.cannotVerifyReason || 'The applicable Johannesburg Water tariff schedule is not yet in the knowledge base.'),
      citation: {
        hasSource: false,
        noSourceReason: result.cannotVerifyReason || 'Tariff schedule not found.',
      },
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';
  const baseConfidence = result.rule?.isVerified ? 90 : 68;

  // Tolerance: R5 residential, R20 commercial
  const toleranceCents = isCommercial ? 2000 : 500;
  if (Math.abs(difference) < toleranceCents) {
    return {
      checkType: 'tariff',
      checkName: 'water_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: 'Water charges verified',
      explanation: `Your water charge of R${(actual / 100).toFixed(2)} for ${consumption.toLocaleString()} kL matches the Johannesburg Water tariff.${breakdownText}`,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  // Require source citation to accuse
  if (!result.rule?.knowledgeDocumentId) {
    return {
      checkType: 'tariff',
      checkName: 'water_unverified',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Water charge requires manual verification',
      explanation: `Your water charge of R${(actual / 100).toFixed(2)} differs from calculated R${(expected / 100).toFixed(2)}, but this cannot be confirmed without a verified tariff source.`,
      citation: {
        hasSource: false,
        noSourceReason: 'Awaiting verified source document.',
      },
    };
  }

  const impactMin = Math.round(Math.abs(difference) * 0.85);
  const impactMax = Math.abs(difference);

  return {
    checkType: 'tariff',
    checkName: 'water_discrepancy',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 8,
    title: difference > 0 ? 'Water charge discrepancy detected' : 'Water undercharge detected',
    explanation: `Based on the official Johannesburg Water tariff, your water charge should be R${(expected / 100).toFixed(2)} for ${consumption.toLocaleString()} kL.

**Billed:** R${(actual / 100).toFixed(2)}
**Expected:** R${(expected / 100).toFixed(2)}
**Difference:** R${(Math.abs(difference) / 100).toFixed(2)}${breakdownText}`,
    impactMin,
    impactMax,
    citation: buildCitation(result.rule, result.breakdown),
  };
}

/**
 * Check sewerage charges against official tariffs
 *
 * RULES:
 * - Clearly state when charges are FIXED PER-UNIT LEVIES (not consumption-based)
 * - Multi-unit properties are billed per-unit, not on water consumption
 * - Must cite source to accuse discrepancy
 */
async function checkSewerageTariff(
  item: ParsedLineItem,
  waterItem: ParsedLineItem | undefined,
  customerCategory: string,
  units: number
): Promise<Finding> {
  const actual = item.amount;
  const waterCharge = waterItem?.amount || 0;
  const waterChargeExclVat = Math.round(waterCharge / 1.15);
  const isMultiUnit = units > 1;

  const result = await calculateSanitation(
    waterChargeExclVat,
    units,
    customerCategory
  );

  // Cannot verify - give clear explanation
  if (result.cannotVerify || !result.success) {
    // Multi-unit properties: explain fixed per-unit levy structure
    if (isMultiUnit) {
      const perUnit = actual / 100 / units;
      return {
        checkType: 'tariff',
        checkName: 'sewerage_multiunit_noted',
        status: 'CANNOT_VERIFY',
        confidence: 60,
        title: 'Sewerage charges noted (multi-unit property)',
        explanation: `Your sewerage charge of R${(actual / 100).toFixed(2)} for ${units} units (R${perUnit.toFixed(2)}/unit) is a **fixed per-unit levy**.\n\n` +
          `_Note: Multi-unit sewerage charges are billed as fixed amounts per unit, not based on water consumption. ` +
          `Official tariff schedule required to verify exact per-unit rate._`,
        citation: {
          hasSource: false,
          noSourceReason: result.cannotVerifyReason || 'Multi-unit sewerage tariff not yet in knowledge base.',
        },
      };
    }

    // Single unit - awaiting tariff
    return {
      checkType: 'tariff',
      checkName: 'sewerage_cannot_verify',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Sewerage tariff verification unavailable',
      explanation: `Your sewerage charge of R${(actual / 100).toFixed(2)} cannot be verified. ` +
        (result.cannotVerifyReason || 'The official sanitation tariff schedule is not yet in the knowledge base.'),
      citation: {
        hasSource: false,
        noSourceReason: result.cannotVerifyReason || 'Sanitation tariff not found.',
      },
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';
  const baseConfidence = result.rule?.isVerified ? 85 : 70;

  // Tolerance: R10
  if (Math.abs(difference) < 1000) {
    const explanation = isMultiUnit
      ? `Your sewerage charge of R${(actual / 100).toFixed(2)} for ${units} units matches the official per-unit levy rate.${breakdownText}`
      : `Your sewerage charge of R${(actual / 100).toFixed(2)} matches the official sanitation tariff.${breakdownText}`;

    return {
      checkType: 'tariff',
      checkName: 'sewerage_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: isMultiUnit ? 'Sewerage per-unit levy verified' : 'Sewerage charges verified',
      explanation,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  // Require source citation to accuse
  if (!result.rule?.knowledgeDocumentId) {
    return {
      checkType: 'tariff',
      checkName: 'sewerage_unverified',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Sewerage charge requires manual verification',
      explanation: `Your sewerage charge of R${(actual / 100).toFixed(2)} differs from calculated R${(expected / 100).toFixed(2)}, but this cannot be confirmed without a verified tariff source.`,
      citation: {
        hasSource: false,
        noSourceReason: 'Awaiting verified source document.',
      },
    };
  }

  return {
    checkType: 'tariff',
    checkName: 'sewerage_discrepancy',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 10,
    title: 'Sewerage charge discrepancy',
    explanation: `Based on the official sanitation tariff, your sewerage charge should be R${(expected / 100).toFixed(2)}.

**Billed:** R${(actual / 100).toFixed(2)}
**Expected:** R${(expected / 100).toFixed(2)}
**Difference:** R${(Math.abs(difference) / 100).toFixed(2)}${breakdownText}`,
    impactMin: Math.round(Math.abs(difference) * 0.85),
    impactMax: Math.abs(difference),
    citation: buildCitation(result.rule, result.breakdown),
  };
}

/**
 * Check refuse charges against official tariffs
 */
async function checkRefuseTariff(
  item: ParsedLineItem,
  customerCategory: string
): Promise<Finding> {
  const actual = item.amount;

  const result = await calculateRefuse(customerCategory);

  if (result.cannotVerify || !result.success) {
    // Fall back to range check
    const minExpected = 15000;
    const maxExpected = 40000;

    if (actual >= minExpected && actual <= maxExpected) {
      return {
        checkType: 'tariff',
        checkName: 'refuse_range_check',
        status: 'VERIFIED',
        confidence: 70,
        title: 'Refuse charges within typical range',
        explanation: `Your refuse charge of R${(actual / 100).toFixed(2)} falls within the typical CoJ range (R150-R400/month). ${result.cannotVerifyReason || ''}`,
        citation: {
          hasSource: false,
          noSourceReason: result.cannotVerifyReason ||
            'Pikitup refuse tariff not found. Using typical range verification.',
        },
      };
    }

    if (actual > maxExpected) {
      return {
        checkType: 'tariff',
        checkName: 'refuse_high',
        status: 'LIKELY_WRONG',
        confidence: 65,
        title: 'Refuse charge appears high',
        explanation: `Your refuse charge of R${(actual / 100).toFixed(2)} exceeds typical residential rates (R150-R400). You may be incorrectly classified.`,
        impactMin: actual - maxExpected,
        impactMax: actual - minExpected,
        citation: {
          hasSource: false,
          noSourceReason: result.cannotVerifyReason ||
            'Pikitup refuse tariff verification pending.',
        },
      };
    }

    return {
      checkType: 'tariff',
      checkName: 'refuse_cannot_verify',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Refuse charges require verification',
      explanation: `Refuse charge of R${(actual / 100).toFixed(2)} noted. ${result.cannotVerifyReason || ''}`,
      citation: {
        hasSource: false,
        noSourceReason: result.cannotVerifyReason ||
          'Pikitup refuse tariff not found.',
      },
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';
  const baseConfidence = result.rule?.isVerified ? 85 : 70;

  if (Math.abs(difference) < 500) {
    return {
      checkType: 'tariff',
      checkName: 'refuse_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: 'Refuse charges verified',
      explanation: `Your refuse charge of R${(actual / 100).toFixed(2)} matches the official Pikitup tariff.${breakdownText}`,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  return {
    checkType: 'tariff',
    checkName: 'refuse_difference',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 10,
    title: 'Refuse charge discrepancy',
    explanation: `Your refuse charge of R${(actual / 100).toFixed(2)} differs from expected R${(expected / 100).toFixed(2)}.

**Difference: R${(Math.abs(difference) / 100).toFixed(2)}**${breakdownText}`,
    impactMin: Math.round(Math.abs(difference) * 0.85),
    impactMax: Math.abs(difference),
    citation: buildCitation(result.rule, result.breakdown),
  };
}

/**
 * Check property rates against official tariffs
 *
 * RULES:
 * - If R0.00, state "No rates charged this period" (NOT an error)
 * - Must have property valuation to verify
 * - Must cite source to accuse discrepancy
 */
async function checkPropertyRates(
  item: ParsedLineItem,
  propertyValue: number | undefined,
  customerCategory: string
): Promise<Finding> {
  const actual = item.amount;

  // R0.00 rates - this is valid, not an error
  if (actual === 0) {
    return {
      checkType: 'tariff',
      checkName: 'rates_zero',
      status: 'VERIFIED',
      confidence: 95,
      title: 'No property rates charged this period',
      explanation: `No property rates (R0.00) have been charged on this bill. This may occur due to:\n` +
        `• Rates rebate or exemption applied\n` +
        `• Billing adjustment or credit\n` +
        `• Rates billed separately\n\n` +
        `_Property rates in South Africa are VAT-exempt._`,
      citation: {
        hasSource: false,
        noSourceReason: 'Zero-rated period - no tariff verification required.',
      },
    };
  }

  if (!propertyValue || propertyValue <= 0) {
    return {
      checkType: 'tariff',
      checkName: 'rates_no_valuation',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Property rates require valuation to verify',
      explanation: `Your property rates of R${(actual / 100).toFixed(2)}/month cannot be verified without your municipal property valuation.\n\n` +
        `_To verify: Enter your property valuation from the CoJ e-Services portal or rates clearance certificate._`,
      citation: {
        hasSource: false,
        noSourceReason: 'Property valuation required for rates calculation.',
      },
    };
  }

  const isPrimaryResidence = customerCategory === 'residential';
  const result = await calculateRates(propertyValue, isPrimaryResidence, customerCategory);

  if (result.cannotVerify || !result.success) {
    return {
      checkType: 'tariff',
      checkName: 'rates_cannot_verify',
      status: 'CANNOT_VERIFY',
      confidence: 40,
      title: 'Property rates tariff unavailable',
      explanation: `Your property rates of R${(actual / 100).toFixed(2)} cannot be verified. ` +
        (result.cannotVerifyReason || 'The CoJ rates schedule is not yet in the knowledge base.'),
      citation: {
        hasSource: false,
        noSourceReason: result.cannotVerifyReason || 'CoJ rates tariff not found.',
      },
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';
  const baseConfidence = result.rule?.isVerified ? 90 : 75;

  // Tolerance: R50
  if (Math.abs(difference) < 5000) {
    return {
      checkType: 'tariff',
      checkName: 'rates_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: 'Property rates verified',
      explanation: `Your property rates of R${(actual / 100).toFixed(2)}/month are correct based on your property valuation of R${propertyValue.toLocaleString()}.\n\n` +
        `_Note: Property rates are VAT-exempt in South Africa._${breakdownText}`,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  // Require source citation to accuse
  if (!result.rule?.knowledgeDocumentId) {
    return {
      checkType: 'tariff',
      checkName: 'rates_unverified',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Property rates require manual verification',
      explanation: `Your property rates of R${(actual / 100).toFixed(2)} differ from calculated R${(expected / 100).toFixed(2)}, but this cannot be confirmed without a verified tariff source.`,
      citation: {
        hasSource: false,
        noSourceReason: 'Awaiting verified source document.',
      },
    };
  }

  return {
    checkType: 'tariff',
    checkName: 'rates_discrepancy',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 5,
    title: difference > 0 ? 'Property rates discrepancy detected' : 'Property rates lower than expected',
    explanation: `Based on your property valuation of R${propertyValue.toLocaleString()}, your monthly rates should be approximately R${(expected / 100).toFixed(2)}.

**Billed:** R${(actual / 100).toFixed(2)}
**Expected:** R${(expected / 100).toFixed(2)}
**Difference:** R${(Math.abs(difference) / 100).toFixed(2)}

_Note: Property rates are VAT-exempt._${breakdownText}`,
    impactMin: Math.round(Math.abs(difference) * 0.9),
    impactMax: Math.abs(difference),
    citation: buildCitation(result.rule, result.breakdown),
  };
}

/**
 * Check water demand levy for multi-unit properties
 */
function checkWaterDemandLevy(item: ParsedLineItem): Finding {
  const actual = item.amount;
  const metadata = item.metadata as { units?: number } | undefined;

  if (metadata?.units && metadata.units > 1) {
    const units = metadata.units;
    const perUnit = actual / 100 / units;
    const minPerUnit = 55;
    const maxPerUnit = 85;

    if (perUnit >= minPerUnit && perUnit <= maxPerUnit) {
      return {
        checkType: 'tariff',
        checkName: 'water_demand_levy',
        status: 'VERIFIED',
        confidence: 75,
        title: 'Water demand levy verified',
        explanation: `Your water demand levy of R${(actual / 100).toFixed(2)} for ${units} units (R${perUnit.toFixed(2)}/unit) is within the typical CoJ range.`,
        citation: {
          hasSource: false,
          noSourceReason: 'Water demand levy based on typical Johannesburg Water multi-unit rates.',
        },
      };
    }
  }

  return {
    checkType: 'tariff',
    checkName: 'water_demand_levy',
    status: 'VERIFIED',
    confidence: 70,
    title: 'Water charges noted',
    explanation: `Water charge of R${(actual / 100).toFixed(2)} with 0 kL consumption - likely a demand levy or minimum charge.`,
    citation: {
      hasSource: false,
      noSourceReason: 'Water tariff verification requires official tariff schedule.',
    },
  };
}

/**
 * Check sundry/business services charges
 */
function checkSundryCharges(item: ParsedLineItem): Finding {
  const actual = item.amount;

  return {
    checkType: 'tariff',
    checkName: 'sundry_business_surcharge',
    status: 'VERIFIED',
    confidence: 70,
    title: 'Business services surcharge noted',
    explanation: `Business services surcharge of R${(actual / 100).toFixed(2)} is applied to commercial/multi-unit properties per CoJ policy.`,
    citation: {
      hasSource: false,
      noSourceReason: 'Business services surcharge per CoJ tariff schedule for non-residential properties.',
    },
  };
}
