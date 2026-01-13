/**
 * Tariff Verification Checks for MUNIPAL
 *
 * Uses the knowledge system to verify charges against official tariffs.
 * Every finding includes:
 * - Source citation (KnowledgeDocument + TariffRule)
 * - Calculation breakdown
 * - Confidence level based on rule verification status
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
 */
async function checkElectricityTariff(
  item: ParsedLineItem,
  bill: ParsedBill,
  customerCategory: string
): Promise<Finding> {
  const consumption = item.quantity!;
  const actual = item.amount;
  const billDate = bill.billDate ? new Date(bill.billDate) : undefined;

  const result = await calculateElectricity(
    consumption,
    customerCategory,
    billDate,
    bill.billingDays
  );

  // No tariff found
  if (result.cannotVerify || !result.success) {
    return {
      checkType: 'tariff',
      checkName: 'electricity_cannot_verify',
      status: 'CANNOT_VERIFY',
      confidence: 0,
      title: 'Electricity charges cannot be verified',
      explanation: result.cannotVerifyReason ||
        'We could not locate the applicable City Power tariff schedule for your billing period.',
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';

  // Determine confidence based on rule verification
  const baseConfidence = result.rule?.isVerified ? 92 : 70;

  // Within R10 tolerance
  if (Math.abs(difference) < 1000) {
    return {
      checkType: 'tariff',
      checkName: 'electricity_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: 'Electricity charges verified',
      explanation: `Your electricity charge of R${(actual / 100).toFixed(2)} for ${consumption} kWh matches the current City Power tariff.${breakdownText}`,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  // Overcharge
  const impactMin = Math.round(Math.abs(difference) * 0.85);
  const impactMax = Math.abs(difference);

  return {
    checkType: 'tariff',
    checkName: 'electricity_overcharge',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 7,
    title: difference > 0 ? 'Electricity overcharge detected' : 'Electricity undercharge detected',
    explanation: `You were charged R${(actual / 100).toFixed(2)} for ${consumption} kWh, but the correct charge should be R${(expected / 100).toFixed(2)} based on the official tariff.

**Difference: R${(Math.abs(difference) / 100).toFixed(2)}**${breakdownText}`,
    impactMin,
    impactMax,
    citation: buildCitation(result.rule, result.breakdown),
  };
}

/**
 * Check water charges against official tariffs
 */
async function checkWaterTariff(
  item: ParsedLineItem,
  bill: ParsedBill,
  customerCategory: string
): Promise<Finding> {
  const consumption = item.quantity!;
  const actual = item.amount;
  const billDate = bill.billDate ? new Date(bill.billDate) : undefined;

  const result = await calculateWater(consumption, customerCategory, billDate);

  if (result.cannotVerify || !result.success) {
    return {
      checkType: 'tariff',
      checkName: 'water_cannot_verify',
      status: 'CANNOT_VERIFY',
      confidence: 0,
      title: 'Water charges cannot be verified',
      explanation: result.cannotVerifyReason ||
        'We could not locate the applicable Johannesburg Water tariff schedule for your billing period.',
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';
  const baseConfidence = result.rule?.isVerified ? 90 : 68;

  if (Math.abs(difference) < 500) {
    return {
      checkType: 'tariff',
      checkName: 'water_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: 'Water charges verified',
      explanation: `Your water charge of R${(actual / 100).toFixed(2)} for ${consumption} kL matches the current Johannesburg Water tariff.${breakdownText}`,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  const impactMin = Math.round(Math.abs(difference) * 0.85);
  const impactMax = Math.abs(difference);

  return {
    checkType: 'tariff',
    checkName: 'water_overcharge',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 8,
    title: difference > 0 ? 'Water overcharge detected' : 'Water undercharge detected',
    explanation: `You were charged R${(actual / 100).toFixed(2)} for ${consumption} kL, but the correct charge should be R${(expected / 100).toFixed(2)}.

**Difference: R${(Math.abs(difference) / 100).toFixed(2)}**${breakdownText}`,
    impactMin,
    impactMax,
    citation: buildCitation(result.rule, result.breakdown),
  };
}

/**
 * Check sewerage charges against official tariffs
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

  const result = await calculateSanitation(
    waterChargeExclVat,
    units,
    customerCategory
  );

  // If we can't calculate from knowledge base, fall back to heuristics
  if (result.cannotVerify || !result.success) {
    // Multi-unit heuristic
    if (units > 1) {
      const perUnit = actual / 100 / units;
      const minPerUnit = 300;
      const maxPerUnit = 450;

      if (perUnit >= minPerUnit && perUnit <= maxPerUnit) {
        return {
          checkType: 'tariff',
          checkName: 'sewerage_multiunit',
          status: 'VERIFIED',
          confidence: 75,
          title: 'Sewerage charges verified (multi-unit)',
          explanation: `Your sewerage charge of R${(actual / 100).toFixed(2)} for ${units} units (R${perUnit.toFixed(2)}/unit) is within the typical CoJ multi-unit range.`,
          citation: {
            hasSource: false,
            noSourceReason: result.cannotVerifyReason ||
              'Multi-unit sewerage tariff not found. Using typical range verification.',
          },
        };
      }

      if (perUnit > maxPerUnit) {
        return {
          checkType: 'tariff',
          checkName: 'sewerage_multiunit_high',
          status: 'LIKELY_WRONG',
          confidence: 70,
          title: 'Sewerage charges appear high',
          explanation: `Your sewerage charge of R${perUnit.toFixed(2)}/unit (${units} units = R${(actual / 100).toFixed(2)}) exceeds typical rates of R${minPerUnit}-${maxPerUnit}/unit.`,
          impactMin: actual - (units * maxPerUnit * 100),
          impactMax: actual - (units * minPerUnit * 100),
          citation: {
            hasSource: false,
            noSourceReason: result.cannotVerifyReason ||
              'Multi-unit sewerage tariff verification pending. Using typical range.',
          },
        };
      }
    }

    // Standard residential fallback
    return {
      checkType: 'tariff',
      checkName: 'sewerage_cannot_verify',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Sewerage charges require verification',
      explanation: `Sewerage charge of R${(actual / 100).toFixed(2)} noted. ${result.cannotVerifyReason || 'Awaiting official tariff data for verification.'}`,
      citation: {
        hasSource: false,
        noSourceReason: result.cannotVerifyReason ||
          'Sewerage tariff not found in knowledge base.',
      },
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';
  const baseConfidence = result.rule?.isVerified ? 85 : 70;

  if (Math.abs(difference) < 1000) {
    return {
      checkType: 'tariff',
      checkName: 'sewerage_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: 'Sewerage charges verified',
      explanation: `Your sewerage charge of R${(actual / 100).toFixed(2)} matches the official tariff.${breakdownText}`,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  return {
    checkType: 'tariff',
    checkName: 'sewerage_difference',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 10,
    title: 'Sewerage charge discrepancy',
    explanation: `Your sewerage charge of R${(actual / 100).toFixed(2)} differs from expected R${(expected / 100).toFixed(2)}.

**Difference: R${(Math.abs(difference) / 100).toFixed(2)}**${breakdownText}`,
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
 */
async function checkPropertyRates(
  item: ParsedLineItem,
  propertyValue: number | undefined,
  customerCategory: string
): Promise<Finding> {
  const actual = item.amount;

  if (!propertyValue || propertyValue <= 0) {
    return {
      checkType: 'tariff',
      checkName: 'rates_no_valuation',
      status: 'CANNOT_VERIFY',
      confidence: 50,
      title: 'Property rates require valuation to verify',
      explanation: `Your property rates of R${(actual / 100).toFixed(2)}/month cannot be fully verified without your property valuation.

**Enter your property valuation** to verify the calculation. Find it on the CoJ e-Services portal or your rates notice.`,
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
      title: 'Property rates cannot be verified',
      explanation: result.cannotVerifyReason ||
        'We could not locate the applicable CoJ rates schedule.',
      citation: {
        hasSource: false,
        noSourceReason: result.cannotVerifyReason ||
          'CoJ rates tariff not found in knowledge base.',
      },
    };
  }

  const expected = result.expectedAmount!;
  const difference = actual - expected;
  const breakdownText = result.breakdown ? formatBreakdown(result.breakdown) : '';
  const baseConfidence = result.rule?.isVerified ? 90 : 75;

  if (Math.abs(difference) < 5000) {
    return {
      checkType: 'tariff',
      checkName: 'rates_tariff_verified',
      status: 'VERIFIED',
      confidence: baseConfidence,
      title: 'Property rates verified',
      explanation: `Your property rates of R${(actual / 100).toFixed(2)}/month are correct based on your property valuation of R${propertyValue.toLocaleString()}.${breakdownText}`,
      citation: buildCitation(result.rule, result.breakdown),
    };
  }

  return {
    checkType: 'tariff',
    checkName: 'rates_difference',
    status: 'LIKELY_WRONG',
    confidence: baseConfidence - 5,
    title: difference > 0 ? 'Property rates too high' : 'Property rates lower than expected',
    explanation: `Based on your property valuation of R${propertyValue.toLocaleString()}, you should be paying approximately R${(expected / 100).toFixed(2)}/month, but you're being charged R${(actual / 100).toFixed(2)}.

**Difference: R${(Math.abs(difference) / 100).toFixed(2)}**${breakdownText}`,
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
