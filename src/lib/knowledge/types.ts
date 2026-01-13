// Knowledge system types for MUNIPAL
// These mirror the Prisma schema but provide TypeScript interfaces for the service layer

import { DocumentCategory, IngestionMethod, ExtractionMethod } from '@prisma/client';

// ============================================
// DOCUMENT INGESTION
// ============================================

export interface DocumentIngestionInput {
  provider: 'city_power' | 'joburg_water' | 'coj' | 'pikitup';
  documentType: 'tariff_schedule' | 'by_law' | 'rates_policy' | 'credit_control';
  category: DocumentCategory;
  financialYear: string; // e.g., "2025/26"
  title: string;
  description?: string;
  effectiveDate: Date;
  expiryDate?: Date;
  sourceUrl?: string;
  ingestionMethod: IngestionMethod;
  ingestedBy?: string;
}

export interface DocumentIngestionResult {
  success: boolean;
  documentId?: string;
  checksum?: string;
  pageCount?: number;
  error?: string;
}

// ============================================
// TARIFF PRICING STRUCTURES
// ============================================

export interface EnergyBand {
  minKwh: number;
  maxKwh: number | null;
  ratePerKwh: number; // cents
  description: string;
}

export interface WaterBand {
  minKl: number;
  maxKl: number | null;
  ratePerKl: number; // cents
  description: string;
}

export interface FixedCharge {
  name: string;
  amount: number; // cents
  frequency: 'monthly' | 'daily' | 'annual';
}

export interface ElectricityPricingStructure {
  energyCharges: {
    // Residential: banded pricing
    bands?: EnergyBand[];
    billingPeriodDays?: number;
    // Commercial: flat rate per kWh (in cents × 100, e.g., 391900 = R3.9190)
    flatRate?: number;
    // Industrial TOU: seasonal rates
    summer?: { peak: number; standard: number; offPeak: number };
    winter?: { peak: number; standard: number; offPeak: number };
  };
  fixedCharges: FixedCharge[];
  demandCharges?: {
    ratePerKva?: number;
    notifiedDemand?: number;
    actualDemand?: number;
    threshold?: number;
  } | null;
  // Industrial: network charges
  networkCharges?: {
    summerAccess?: number;
    summerDemand?: number;
    winterAccess?: number;
    winterDemand?: number;
  };
  timeOfUse?: boolean;
}

export interface WaterPricingStructure {
  consumptionCharges: {
    bands: WaterBand[];
  };
  fixedCharges: FixedCharge[];
}

export interface SanitationPricingStructure {
  // Usually a percentage of water charges
  percentageOfWater?: number;
  // Or fixed rate per unit
  perUnitCharge?: number;
  fixedCharges: FixedCharge[];
}

export interface RefusePricingStructure {
  businessCharge: number; // cents per month
  residentialCharge: number; // cents per month
  additionalBinCharge?: number;
}

export interface RatesPricingStructure {
  rateInRand: number; // rate per Rand of property value
  rebates: {
    name: string;
    type: 'threshold' | 'percentage' | 'fixed';
    amount: number;
    conditions?: string;
  }[];
  formula: string;
}

export type PricingStructure =
  | ElectricityPricingStructure
  | WaterPricingStructure
  | SanitationPricingStructure
  | RefusePricingStructure
  | RatesPricingStructure;

// ============================================
// TARIFF RULE EXTRACTION
// ============================================

export interface TariffRuleInput {
  knowledgeDocumentId: string;
  provider: string;
  serviceType: 'electricity' | 'water' | 'sanitation' | 'refuse' | 'rates';
  tariffCode: string;
  customerCategory: 'residential' | 'commercial' | 'industrial' | 'business';
  description: string;
  pricingStructure: PricingStructure;
  vatRate?: number;
  vatInclusive?: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
  financialYear: string;
  sourcePageNumber?: number;
  sourceExcerpt: string;
  sourceTableReference?: string;
  extractionMethod: ExtractionMethod;
  extractionConfidence?: number;
}

// ============================================
// CALCULATION BREAKDOWN (for findings)
// ============================================

export interface CalculationBand {
  range: string;
  usage: number;
  rate: number; // cents
  amount: number; // cents
  ruleSource: string;
}

export interface CalculationBreakdown {
  consumption?: {
    value: number;
    unit: 'kWh' | 'kL' | 'units';
  };
  bands?: CalculationBand[];
  fixedCharges?: {
    name: string;
    amount: number; // cents
    ruleSource: string;
  }[];
  subtotal: number; // cents
  vat?: {
    rate: number;
    amount: number; // cents
  };
  total: number; // cents
  tariffRuleId: string;
  financialYear: string;
  customerCategory: string;
}

// ============================================
// RULE MATCHING
// ============================================

export interface RuleMatchResult {
  tariffRuleId: string;
  knowledgeDocumentId: string;
  confidence: number; // 0-100
  sourcePageNumber?: number;
  sourceExcerpt: string;
  pricingStructure: PricingStructure;
  financialYear: string;
  isVerified: boolean;
}

export interface RuleMatchCriteria {
  provider: string;
  serviceType: string;
  customerCategory: string;
  asOfDate?: Date;
  financialYear?: string;
}
