/**
 * Tariff Calculator for MUNIPAL
 *
 * Calculates expected charges using official TariffRules.
 * Returns full calculation breakdown for transparency and citations.
 *
 * All amounts are in CENTS to avoid floating point issues.
 */

import { prisma } from '../db';
import type {
  CalculationBreakdown,
  CalculationBand,
  ElectricityPricingStructure,
  WaterPricingStructure,
  SanitationPricingStructure,
  RefusePricingStructure,
  RatesPricingStructure,
  PricingStructure,
} from './types';

interface CalculationInput {
  consumption?: number; // kWh for electricity, kL for water
  propertyValue?: number; // For rates calculation
  units?: number; // Number of units for multi-unit properties
  billingDays?: number; // Actual days in billing period
}

interface CalculationResult {
  success: boolean;
  expectedAmount?: number; // Total in cents
  breakdown?: CalculationBreakdown;
  error?: string;
}

/**
 * Calculate expected charge for electricity consumption
 */
export function calculateElectricityCharge(
  pricing: ElectricityPricingStructure,
  consumption: number,
  tariffRuleId: string,
  financialYear: string,
  customerCategory: string,
  billingDays: number = 30
): CalculationResult {
  try {
    const bands: CalculationBand[] = [];
    let remainingConsumption = consumption;
    let energyTotal = 0;

    // Sort bands by minKwh
    const sortedBands = [...pricing.energyCharges.bands].sort((a, b) => a.minKwh - b.minKwh);

    // Calculate band by band
    for (const band of sortedBands) {
      if (remainingConsumption <= 0) break;

      const bandMin = band.minKwh;
      const bandMax = band.maxKwh ?? Infinity;
      const bandWidth = bandMax - bandMin;

      // Adjust for billing period if specified
      const periodDays = pricing.energyCharges.billingPeriodDays || 30;
      const adjustedBandWidth = bandWidth * (billingDays / periodDays);

      const usageInBand = Math.min(remainingConsumption, adjustedBandWidth);
      const bandAmount = Math.round(usageInBand * band.ratePerKwh);

      if (usageInBand > 0) {
        bands.push({
          range: band.maxKwh
            ? `${band.minKwh} - ${band.maxKwh} kWh`
            : `${band.minKwh}+ kWh`,
          usage: Math.round(usageInBand * 100) / 100,
          rate: band.ratePerKwh,
          amount: bandAmount,
          ruleSource: `${band.description} @ ${(band.ratePerKwh / 100).toFixed(2)} c/kWh`,
        });

        energyTotal += bandAmount;
        remainingConsumption -= usageInBand;
      }
    }

    // Add fixed charges
    const fixedCharges: CalculationBreakdown['fixedCharges'] = [];
    let fixedTotal = 0;

    for (const fixed of pricing.fixedCharges) {
      // Prorate if not monthly
      let chargeAmount = fixed.amount;
      if (fixed.frequency === 'daily') {
        chargeAmount = fixed.amount * billingDays;
      } else if (fixed.frequency === 'annual') {
        chargeAmount = Math.round(fixed.amount / 12);
      }

      fixedCharges.push({
        name: fixed.name,
        amount: chargeAmount,
        ruleSource: `${fixed.name}: R${(fixed.amount / 100).toFixed(2)} ${fixed.frequency}`,
      });

      fixedTotal += chargeAmount;
    }

    const subtotal = energyTotal + fixedTotal;
    const vat = Math.round(subtotal * 0.15);
    const total = subtotal + vat;

    return {
      success: true,
      expectedAmount: total,
      breakdown: {
        consumption: { value: consumption, unit: 'kWh' },
        bands,
        fixedCharges,
        subtotal,
        vat: { rate: 15, amount: vat },
        total,
        tariffRuleId,
        financialYear,
        customerCategory,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Calculate expected charge for water consumption
 */
export function calculateWaterCharge(
  pricing: WaterPricingStructure,
  consumption: number,
  tariffRuleId: string,
  financialYear: string,
  customerCategory: string
): CalculationResult {
  try {
    const bands: CalculationBand[] = [];
    let remainingConsumption = consumption;
    let consumptionTotal = 0;

    // Sort bands by minKl
    const sortedBands = [...pricing.consumptionCharges.bands].sort((a, b) => a.minKl - b.minKl);

    for (const band of sortedBands) {
      if (remainingConsumption <= 0) break;

      const bandMin = band.minKl;
      const bandMax = band.maxKl ?? Infinity;
      const bandWidth = bandMax - bandMin;

      const usageInBand = Math.min(remainingConsumption, bandWidth);
      const bandAmount = Math.round(usageInBand * band.ratePerKl);

      if (usageInBand > 0) {
        bands.push({
          range: band.maxKl
            ? `${band.minKl} - ${band.maxKl} kL`
            : `${band.minKl}+ kL`,
          usage: Math.round(usageInBand * 100) / 100,
          rate: band.ratePerKl,
          amount: bandAmount,
          ruleSource: `${band.description} @ R${(band.ratePerKl / 100).toFixed(2)}/kL`,
        });

        consumptionTotal += bandAmount;
        remainingConsumption -= usageInBand;
      }
    }

    // Add fixed charges
    const fixedCharges: CalculationBreakdown['fixedCharges'] = [];
    let fixedTotal = 0;

    for (const fixed of pricing.fixedCharges) {
      fixedCharges.push({
        name: fixed.name,
        amount: fixed.amount,
        ruleSource: `${fixed.name}: R${(fixed.amount / 100).toFixed(2)}/month`,
      });
      fixedTotal += fixed.amount;
    }

    const subtotal = consumptionTotal + fixedTotal;
    const vat = Math.round(subtotal * 0.15);
    const total = subtotal + vat;

    return {
      success: true,
      expectedAmount: total,
      breakdown: {
        consumption: { value: consumption, unit: 'kL' },
        bands,
        fixedCharges,
        subtotal,
        vat: { rate: 15, amount: vat },
        total,
        tariffRuleId,
        financialYear,
        customerCategory,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Calculate expected sanitation charge
 */
export function calculateSanitationCharge(
  pricing: SanitationPricingStructure,
  waterCharge: number, // Water charge excl VAT for percentage calc
  units: number,
  tariffRuleId: string,
  financialYear: string,
  customerCategory: string
): CalculationResult {
  try {
    const fixedCharges: CalculationBreakdown['fixedCharges'] = [];
    let subtotal = 0;

    // Percentage of water charges
    if (pricing.percentageOfWater) {
      const percentageCharge = Math.round(waterCharge * (pricing.percentageOfWater / 100));
      fixedCharges.push({
        name: 'Sewerage (% of water)',
        amount: percentageCharge,
        ruleSource: `${pricing.percentageOfWater}% of water charges`,
      });
      subtotal += percentageCharge;
    }

    // Per-unit charge for multi-unit properties
    if (pricing.perUnitCharge && units > 1) {
      const perUnitTotal = pricing.perUnitCharge * units;
      fixedCharges.push({
        name: `Sewerage per unit (${units} units)`,
        amount: perUnitTotal,
        ruleSource: `R${(pricing.perUnitCharge / 100).toFixed(2)} × ${units} units`,
      });
      subtotal += perUnitTotal;
    }

    // Add any additional fixed charges
    for (const fixed of pricing.fixedCharges) {
      fixedCharges.push({
        name: fixed.name,
        amount: fixed.amount,
        ruleSource: `${fixed.name}: R${(fixed.amount / 100).toFixed(2)}/month`,
      });
      subtotal += fixed.amount;
    }

    const vat = Math.round(subtotal * 0.15);
    const total = subtotal + vat;

    return {
      success: true,
      expectedAmount: total,
      breakdown: {
        consumption: { value: units, unit: 'units' },
        fixedCharges,
        subtotal,
        vat: { rate: 15, amount: vat },
        total,
        tariffRuleId,
        financialYear,
        customerCategory,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Calculate expected refuse charge
 */
export function calculateRefuseCharge(
  pricing: RefusePricingStructure,
  customerCategory: string,
  tariffRuleId: string,
  financialYear: string
): CalculationResult {
  try {
    const isBusiness = customerCategory === 'commercial' || customerCategory === 'business';
    const baseCharge = isBusiness ? pricing.businessCharge : pricing.residentialCharge;

    const fixedCharges: CalculationBreakdown['fixedCharges'] = [
      {
        name: isBusiness ? 'Business refuse' : 'Residential refuse',
        amount: baseCharge,
        ruleSource: `Pikitup ${customerCategory} tariff`,
      },
    ];

    const subtotal = baseCharge;
    const vat = Math.round(subtotal * 0.15);
    const total = subtotal + vat;

    return {
      success: true,
      expectedAmount: total,
      breakdown: {
        fixedCharges,
        subtotal,
        vat: { rate: 15, amount: vat },
        total,
        tariffRuleId,
        financialYear,
        customerCategory,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Calculate expected property rates
 */
export function calculateRatesCharge(
  pricing: RatesPricingStructure,
  propertyValue: number,
  isPrimaryResidence: boolean,
  tariffRuleId: string,
  financialYear: string,
  customerCategory: string
): CalculationResult {
  try {
    const fixedCharges: CalculationBreakdown['fixedCharges'] = [];
    let assessableValue = propertyValue;

    // Apply rebates
    for (const rebate of pricing.rebates) {
      if (rebate.type === 'threshold' && isPrimaryResidence) {
        const rebateAmount = Math.min(rebate.amount, propertyValue);
        assessableValue -= rebateAmount;
        fixedCharges.push({
          name: rebate.name,
          amount: -rebateAmount * 100, // Show as negative (deduction)
          ruleSource: `First R${rebate.amount.toLocaleString()} exempt`,
        });
      }
    }

    // Calculate monthly rates
    const annualRates = Math.round(assessableValue * pricing.rateInRand * 100);
    const monthlyRates = Math.round(annualRates / 12);

    fixedCharges.push({
      name: 'Property rates',
      amount: monthlyRates,
      ruleSource: `R${assessableValue.toLocaleString()} × ${pricing.rateInRand} ÷ 12`,
    });

    // Rates are typically VAT-exempt
    const total = monthlyRates;

    return {
      success: true,
      expectedAmount: total,
      breakdown: {
        fixedCharges,
        subtotal: total,
        total,
        tariffRuleId,
        financialYear,
        customerCategory,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Generic calculator that routes to the appropriate service calculator
 */
export async function calculateExpectedCharge(
  tariffRuleId: string,
  input: CalculationInput
): Promise<CalculationResult> {
  const rule = await prisma.tariffRule.findUnique({
    where: { id: tariffRuleId },
  });

  if (!rule) {
    return { success: false, error: 'Tariff rule not found' };
  }

  const pricing = rule.pricingStructure as unknown as PricingStructure;

  switch (rule.serviceType) {
    case 'electricity':
      if (!input.consumption) {
        return { success: false, error: 'Consumption required for electricity calculation' };
      }
      return calculateElectricityCharge(
        pricing as ElectricityPricingStructure,
        input.consumption,
        rule.id,
        rule.financialYear,
        rule.customerCategory,
        input.billingDays
      );

    case 'water':
      if (!input.consumption) {
        return { success: false, error: 'Consumption required for water calculation' };
      }
      return calculateWaterCharge(
        pricing as WaterPricingStructure,
        input.consumption,
        rule.id,
        rule.financialYear,
        rule.customerCategory
      );

    case 'sanitation':
      // Sanitation needs water charge - this is typically called separately
      return { success: false, error: 'Use calculateSanitationCharge with water charge' };

    case 'refuse':
      return calculateRefuseCharge(
        pricing as RefusePricingStructure,
        rule.customerCategory,
        rule.id,
        rule.financialYear
      );

    case 'rates':
      if (!input.propertyValue) {
        return { success: false, error: 'Property value required for rates calculation' };
      }
      return calculateRatesCharge(
        pricing as RatesPricingStructure,
        input.propertyValue,
        true, // Assume primary residence for now
        rule.id,
        rule.financialYear,
        rule.customerCategory
      );

    default:
      return { success: false, error: `Unknown service type: ${rule.serviceType}` };
  }
}
