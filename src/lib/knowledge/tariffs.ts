/**
 * Tariff Service for MUNIPAL
 *
 * Main entry point for tariff lookups and calculations.
 * Wraps the rule matcher and calculator services.
 */

import { findMatchingRule, getCurrentFinancialYear, inferCustomerCategory } from './rule-matcher';
import {
  calculateElectricityCharge,
  calculateWaterCharge,
  calculateSanitationCharge,
  calculateRefuseCharge,
  calculateRatesCharge,
} from './tariff-calculator';
import type {
  RuleMatchResult,
  CalculationBreakdown,
  ElectricityPricingStructure,
  WaterPricingStructure,
  SanitationPricingStructure,
  RefusePricingStructure,
  RatesPricingStructure,
} from './types';

export interface TariffLookupResult {
  found: boolean;
  rule?: RuleMatchResult;
  cannotVerifyReason?: string;
}

export interface ChargeCalculationResult {
  success: boolean;
  expectedAmount?: number;
  breakdown?: CalculationBreakdown;
  rule?: RuleMatchResult;
  error?: string;
  cannotVerify?: boolean;
  cannotVerifyReason?: string;
}

/**
 * Look up tariff rule for a service
 */
export async function lookupTariff(
  provider: string,
  serviceType: string,
  customerCategory: string,
  billDate?: Date
): Promise<TariffLookupResult> {
  const rule = await findMatchingRule({
    provider,
    serviceType,
    customerCategory,
    asOfDate: billDate,
    financialYear: billDate ? getCurrentFinancialYear(billDate) : undefined,
  });

  if (!rule) {
    return {
      found: false,
      cannotVerifyReason: `No ${serviceType} tariff found for ${provider} (${customerCategory})`,
    };
  }

  return { found: true, rule };
}

/**
 * Calculate expected electricity charge with full breakdown
 */
export async function calculateElectricity(
  consumption: number,
  customerCategory: string,
  billDate?: Date,
  billingDays?: number
): Promise<ChargeCalculationResult> {
  const lookup = await lookupTariff('city_power', 'electricity', customerCategory, billDate);

  if (!lookup.found || !lookup.rule) {
    return {
      success: false,
      cannotVerify: true,
      cannotVerifyReason: lookup.cannotVerifyReason,
    };
  }

  const result = calculateElectricityCharge(
    lookup.rule.pricingStructure as ElectricityPricingStructure,
    consumption,
    lookup.rule.tariffRuleId,
    lookup.rule.financialYear,
    customerCategory,
    billingDays
  );

  return {
    ...result,
    rule: lookup.rule,
    cannotVerify: !result.success,
    cannotVerifyReason: result.error,
  };
}

/**
 * Calculate expected water charge with full breakdown
 */
export async function calculateWater(
  consumption: number,
  customerCategory: string,
  billDate?: Date
): Promise<ChargeCalculationResult> {
  const lookup = await lookupTariff('joburg_water', 'water', customerCategory, billDate);

  if (!lookup.found || !lookup.rule) {
    return {
      success: false,
      cannotVerify: true,
      cannotVerifyReason: lookup.cannotVerifyReason,
    };
  }

  const result = calculateWaterCharge(
    lookup.rule.pricingStructure as WaterPricingStructure,
    consumption,
    lookup.rule.tariffRuleId,
    lookup.rule.financialYear,
    customerCategory
  );

  return {
    ...result,
    rule: lookup.rule,
    cannotVerify: !result.success,
    cannotVerifyReason: result.error,
  };
}

/**
 * Calculate expected sanitation charge with full breakdown
 */
export async function calculateSanitation(
  waterChargeExclVat: number,
  units: number,
  customerCategory: string,
  billDate?: Date
): Promise<ChargeCalculationResult> {
  const lookup = await lookupTariff('joburg_water', 'sanitation', customerCategory, billDate);

  if (!lookup.found || !lookup.rule) {
    return {
      success: false,
      cannotVerify: true,
      cannotVerifyReason: lookup.cannotVerifyReason,
    };
  }

  const result = calculateSanitationCharge(
    lookup.rule.pricingStructure as SanitationPricingStructure,
    waterChargeExclVat,
    units,
    lookup.rule.tariffRuleId,
    lookup.rule.financialYear,
    customerCategory
  );

  return {
    ...result,
    rule: lookup.rule,
    cannotVerify: !result.success,
    cannotVerifyReason: result.error,
  };
}

/**
 * Calculate expected refuse charge with full breakdown
 */
export async function calculateRefuse(
  customerCategory: string,
  billDate?: Date
): Promise<ChargeCalculationResult> {
  const lookup = await lookupTariff('pikitup', 'refuse', customerCategory, billDate);

  if (!lookup.found || !lookup.rule) {
    return {
      success: false,
      cannotVerify: true,
      cannotVerifyReason: lookup.cannotVerifyReason,
    };
  }

  const result = calculateRefuseCharge(
    lookup.rule.pricingStructure as RefusePricingStructure,
    customerCategory,
    lookup.rule.tariffRuleId,
    lookup.rule.financialYear
  );

  return {
    ...result,
    rule: lookup.rule,
    cannotVerify: !result.success,
    cannotVerifyReason: result.error,
  };
}

/**
 * Calculate expected property rates with full breakdown
 */
export async function calculateRates(
  propertyValue: number,
  isPrimaryResidence: boolean,
  customerCategory: string,
  billDate?: Date
): Promise<ChargeCalculationResult> {
  const lookup = await lookupTariff('coj', 'rates', customerCategory, billDate);

  if (!lookup.found || !lookup.rule) {
    return {
      success: false,
      cannotVerify: true,
      cannotVerifyReason: lookup.cannotVerifyReason,
    };
  }

  const result = calculateRatesCharge(
    lookup.rule.pricingStructure as RatesPricingStructure,
    propertyValue,
    isPrimaryResidence,
    lookup.rule.tariffRuleId,
    lookup.rule.financialYear,
    customerCategory
  );

  return {
    ...result,
    rule: lookup.rule,
    cannotVerify: !result.success,
    cannotVerifyReason: result.error,
  };
}

// Re-export utilities
export { getCurrentFinancialYear, inferCustomerCategory };
