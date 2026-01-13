/**
 * FindingBuilder - Elegant construction of verification findings
 *
 * Transforms verbose, repetitive finding objects into expressive, self-documenting calls.
 *
 * Philosophy:
 * - Every finding tells a story: what we checked, what we found, how confident we are
 * - The builder API should read like that story
 * - Type safety ensures we can't create incomplete findings
 *
 * Usage:
 *   Finding.tariff('electricity')
 *     .verified('Electricity charges correct')
 *     .because(`Matched ${category} tariff for ${consumption} kWh`)
 *     .confidence(92)
 *     .citedFrom(rule)
 *     .build();
 */

import type { Finding, FindingStatus, CheckType, Citation } from './types';
import type { RuleMatchResult, CalculationBreakdown } from '../knowledge/types';

// ═══════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/** Format cents as Rand with 2 decimal places */
export const formatAmount = (cents: number): string =>
  (cents / 100).toFixed(2);

/** Format number with thousand separators */
export const formatNumber = (n: number): string =>
  n.toLocaleString('en-ZA');

/** Capitalize first letter */
export const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

// ═══════════════════════════════════════════════════════════════════════════
// CITATION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build citation from a matched tariff rule
 */
export function citationFrom(rule?: RuleMatchResult): Citation {
  if (!rule) {
    return {
      hasSource: false,
      noSourceReason: 'No matching tariff rule found in knowledge base.',
    };
  }

  return {
    hasSource: true,
    knowledgeDocumentId: rule.knowledgeDocumentId,
    tariffRuleId: rule.tariffRuleId,
    sourcePageNumber: rule.sourcePageNumber,
    excerpt: rule.sourceExcerpt,
  };
}

/**
 * Build citation when source is unavailable
 */
export function noCitation(reason: string): Citation {
  return {
    hasSource: false,
    noSourceReason: reason,
  };
}

/**
 * Build citation for arithmetic verification (self-evident from bill)
 */
export function arithmeticCitation(): Citation {
  return {
    hasSource: false,
    noSourceReason: 'Arithmetic verified using values shown on the bill itself.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FLUENT FINDING BUILDER
// ═══════════════════════════════════════════════════════════════════════════

type ServiceType = 'electricity' | 'water' | 'sewerage' | 'refuse' | 'rates' | 'sundry' | 'vat' | 'reconciliation';

interface PartialFinding {
  checkType: CheckType;
  checkName: string;
  status?: FindingStatus;
  confidence?: number;
  title?: string;
  explanation?: string;
  impactMin?: number;
  impactMax?: number;
  citation?: Citation;
  calculationBreakdown?: Finding['calculationBreakdown'];
}

class FindingBuilder {
  private partial: PartialFinding;

  constructor(checkType: CheckType, service: ServiceType | string) {
    this.partial = {
      checkType,
      checkName: service,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATUS SETTERS - These are the "verdict" of the finding
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Mark as VERIFIED - charges match official tariff
   * @param title Short description of what was verified
   */
  verified(title: string): this {
    this.partial.status = 'VERIFIED';
    this.partial.title = title;
    this.partial.checkName = `${this.partial.checkName}_verified`;
    return this;
  }

  /**
   * Mark as LIKELY_WRONG - discrepancy detected with evidence
   * @param title Short description of the issue
   * @param impact Potential overcharge in cents
   */
  likelyWrong(title: string, impact: number): this {
    this.partial.status = 'LIKELY_WRONG';
    this.partial.title = title;
    this.partial.checkName = `${this.partial.checkName}_discrepancy`;
    this.partial.impactMin = Math.round(impact * 0.85); // Conservative estimate
    this.partial.impactMax = Math.abs(impact);
    return this;
  }

  /**
   * Mark as CANNOT_VERIFY - insufficient data to make determination
   * @param title Short description of what couldn't be verified
   */
  cannotVerify(title: string): this {
    this.partial.status = 'CANNOT_VERIFY';
    this.partial.title = title;
    this.partial.checkName = `${this.partial.checkName}_cannot_verify`;
    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPLANATION SETTERS - The story behind the finding
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set the detailed explanation
   * @param text Full explanation shown to user
   */
  because(text: string): this {
    this.partial.explanation = text;
    return this;
  }

  /**
   * Set confidence level (0-100)
   * @param level How certain we are about this finding
   */
  confidence(level: number): this {
    this.partial.confidence = Math.max(0, Math.min(100, level));
    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CITATION SETTERS - The evidence trail
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set citation from a matched tariff rule
   */
  citedFrom(rule?: RuleMatchResult): this {
    this.partial.citation = citationFrom(rule);
    return this;
  }

  /**
   * Set citation when no source is available
   */
  withoutSource(reason: string): this {
    this.partial.citation = noCitation(reason);
    return this;
  }

  /**
   * Set custom citation
   */
  withCitation(citation: Citation): this {
    this.partial.citation = citation;
    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OPTIONAL ENRICHMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Override the check name (for special cases)
   */
  named(checkName: string): this {
    this.partial.checkName = checkName;
    return this;
  }

  /**
   * Set explicit impact range (for non-standard calculations)
   */
  withImpact(min: number, max: number): this {
    this.partial.impactMin = min;
    this.partial.impactMax = max;
    return this;
  }

  /**
   * Attach calculation breakdown for UI display
   */
  withBreakdown(breakdown: Finding['calculationBreakdown']): this {
    this.partial.calculationBreakdown = breakdown;
    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD - Validate and construct final finding
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Build the final Finding object
   * @throws Error if required fields are missing
   */
  build(): Finding {
    const { checkType, checkName, status, confidence, title, explanation, citation } = this.partial;

    // Validate required fields
    if (!status) throw new Error('Finding must have a status (verified/likelyWrong/cannotVerify)');
    if (!title) throw new Error('Finding must have a title');
    if (!explanation) throw new Error('Finding must have an explanation (use .because())');
    if (confidence === undefined) throw new Error('Finding must have a confidence level');
    if (!citation) throw new Error('Finding must have a citation (use .citedFrom() or .withoutSource())');

    return {
      checkType,
      checkName,
      status,
      confidence,
      title,
      explanation,
      citation,
      ...(this.partial.impactMin !== undefined && { impactMin: this.partial.impactMin }),
      ...(this.partial.impactMax !== undefined && { impactMax: this.partial.impactMax }),
      ...(this.partial.calculationBreakdown && { calculationBreakdown: this.partial.calculationBreakdown }),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY ENTRY POINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a new finding builder - the entry point for elegant finding construction
 *
 * @example
 * F.tariff('electricity')
 *   .verified('Electricity charges correct')
 *   .because(`Your charge of R${amount} matches the City Power tariff.`)
 *   .confidence(92)
 *   .citedFrom(rule)
 *   .build();
 */
export const F = {
  /** Create tariff check finding (rate verification) */
  tariff: (service: ServiceType | string) => new FindingBuilder('tariff', service),

  /** Create meter check finding (consumption/reading verification) */
  meter: (service: ServiceType | string) => new FindingBuilder('meter', service),

  /** Create arithmetic check finding (calculation verification) */
  arithmetic: (checkName: string) => new FindingBuilder('arithmetic', checkName),
};

// ═══════════════════════════════════════════════════════════════════════════
// PRE-BUILT FINDING TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pre-built finding templates for common verification patterns.
 * These encode domain knowledge about what each finding means.
 */
export const Findings = {
  /**
   * Service charge verified against tariff
   */
  serviceVerified: (
    service: ServiceType,
    billed: number,
    consumption: number,
    category: string,
    breakdown: string,
    rule?: RuleMatchResult
  ): Finding =>
    F.tariff(service)
      .verified(`${capitalize(service)} charges verified`)
      .because(
        `Your ${service} charge of R${formatAmount(billed)} for ${formatNumber(consumption)} ` +
        `${service === 'water' ? 'kL' : 'kWh'} matches the ${category} tariff.${breakdown}`
      )
      .confidence(rule?.isVerified ? 92 : 70)
      .citedFrom(rule)
      .build(),

  /**
   * Service charge has discrepancy
   */
  serviceDiscrepancy: (
    service: ServiceType,
    billed: number,
    expected: number,
    consumption: number,
    category: string,
    breakdown: string,
    rule?: RuleMatchResult
  ): Finding => {
    const difference = billed - expected;
    const isOvercharge = difference > 0;

    return F.tariff(service)
      .likelyWrong(
        isOvercharge ? `${capitalize(service)} charge discrepancy detected` : `${capitalize(service)} undercharge detected`,
        difference
      )
      .because(
        `Based on the official ${category} tariff, your ${service} charge should be ` +
        `R${formatAmount(expected)} for ${formatNumber(consumption)} ${service === 'water' ? 'kL' : 'kWh'}.\n\n` +
        `**Billed:** R${formatAmount(billed)}\n` +
        `**Expected:** R${formatAmount(expected)}\n` +
        `**Difference:** R${formatAmount(Math.abs(difference))}${breakdown}`
      )
      .confidence(rule?.isVerified ? 85 : 63)
      .citedFrom(rule)
      .build();
  },

  /**
   * Service cannot be verified (missing tariff data)
   */
  serviceCannotVerify: (
    service: ServiceType,
    billed: number,
    consumption: number,
    isCommercial: boolean,
    reason: string
  ): Finding =>
    F.tariff(service)
      .cannotVerify(`${capitalize(service)} tariff verification unavailable`)
      .because(
        isCommercial
          ? `**Commercial ${service} tariffs** for this financial year are not yet available in the knowledge base. ` +
            `Your ${service} charge of R${formatAmount(billed)} for ${formatNumber(consumption)} ` +
            `${service === 'water' ? 'kL' : 'kWh'} cannot be verified against official rates until the tariff schedule is loaded.\n\n` +
            `_Note: Commercial tariffs differ significantly from residential rates and cannot be compared._`
          : `We could not locate the applicable tariff schedule for ${service}. ` +
            `Your charge of R${formatAmount(billed)} for ${formatNumber(consumption)} ` +
            `${service === 'water' ? 'kL' : 'kWh'} cannot be verified at this time.`
      )
      .confidence(0)
      .withoutSource(reason)
      .build(),

  /**
   * Arithmetic verified using bill rates (multi-meter/commercial)
   */
  arithmeticVerified: (
    service: string,
    billed: number,
    calculated: number,
    meterCount: number,
    breakdown: string
  ): Finding =>
    F.tariff(service)
      .named(`${service}_arithmetic_verified`)
      .verified(`${capitalize(service)} charges verified (${meterCount} meter${meterCount > 1 ? 's' : ''})`)
      .because(
        `Your ${service} charge of R${formatAmount(billed)} has been verified against the rates shown on your bill.\n\n` +
        `**Calculation using bill rates:**\n${breakdown}\n\n` +
        `_Note: This property uses specific rates that may differ from standard tariffs._`
      )
      .confidence(90)
      .withoutSource('Arithmetic verified using rates shown on bill. Standard tariff comparison not applicable for multi-meter/bulk properties.')
      .build(),

  /**
   * Arithmetic error detected
   */
  arithmeticError: (
    service: string,
    billed: number,
    calculated: number,
    breakdown: string
  ): Finding => {
    const diff = billed - Math.round(calculated * 100);
    return F.tariff(service)
      .named(`${service}_arithmetic_error`)
      .likelyWrong(`${capitalize(service)} arithmetic discrepancy`, diff)
      .because(
        `The ${service} charges on your bill do not add up correctly based on the rates shown.\n\n` +
        `**Calculation using bill rates:**\n${breakdown}\n\n` +
        `**Billed:** R${formatAmount(billed)}\n` +
        `**Calculated:** R${calculated.toFixed(2)}\n` +
        `**Discrepancy:** R${formatAmount(Math.abs(diff))}`
      )
      .confidence(85)
      .withoutSource('Arithmetic error detected using rates shown on the bill itself.')
      .build();
  },

  /**
   * Zero amount for service (expected, like rates on separate account)
   */
  zeroAmount: (service: ServiceType, reason: string): Finding =>
    F.tariff(service)
      .named(`${service}_zero`)
      .verified(`${capitalize(service)} at R0.00`)
      .because(reason)
      .confidence(85)
      .withoutSource(`${capitalize(service)} shows R0.00 - ${reason.toLowerCase()}`)
      .build(),

  /**
   * Water demand levy (no consumption, just fixed charges)
   */
  waterDemandLevy: (billed: number, units: number, demandLevy: number): Finding =>
    F.tariff('water')
      .named('water_demand_levy')
      .verified('Water charges verified (demand levy only)')
      .because(
        `This property shows no water consumption for the billing period. ` +
        `The charge of R${formatAmount(billed)} consists of demand levy charges ` +
        `(${units} units × R${(demandLevy / units / 100).toFixed(2)} per unit) plus sanitation charges.\n\n` +
        `_Note: Demand levy is a fixed monthly charge applied to each unit on the property._`
      )
      .confidence(80)
      .withoutSource('Demand levy verified based on unit count. No consumption-based verification needed.')
      .build(),

  /**
   * Sundry/business surcharge noted
   */
  sundryBusinessSurcharge: (billed: number, baseAmount: number): Finding =>
    F.tariff('sundry')
      .named('sundry_business_surcharge')
      .verified('Sundry charges noted')
      .because(
        `Business services surcharge of R${formatAmount(billed)} applied ` +
        `(R${(baseAmount / 100).toFixed(2)} + 15% VAT).\n\n` +
        `_This charge applies to commercial/business properties._`
      )
      .confidence(75)
      .withoutSource('Business surcharge standard for commercial properties.')
      .build(),

  /**
   * Reconciliation verified (all line items sum to total)
   */
  reconciliationVerified: (items: { service: string; amount: number }[], total: number): Finding => {
    const breakdown = items.map(i => `• ${capitalize(i.service)}: R${formatAmount(i.amount)}`).join('\n');
    const sum = items.reduce((s, i) => s + i.amount, 0);

    return F.arithmetic('reconciliation')
      .named('reconciliation_verified')
      .verified('Bill reconciliation verified')
      .because(
        `All line items sum correctly to the total due.\n\n${breakdown}\n` +
        `────────────────\n**Total:** R${formatAmount(sum)}\n\n` +
        `_Stated total: R${formatAmount(total)}_`
      )
      .confidence(95)
      .withoutSource('Arithmetic reconciliation verified from bill data.')
      .build();
  },

  /**
   * VAT calculation verified
   */
  vatVerified: (vatableAmount: number, vatAmount: number, exemptAmount: number): Finding =>
    F.arithmetic('vat')
      .named('vat_verified')
      .verified('VAT calculation verified')
      .because(
        `VAT calculated correctly at 15% on VAT-able services.\n\n` +
        `**VAT-able subtotal:** R${formatAmount(vatableAmount)}\n` +
        `**VAT (15%):** R${formatAmount(vatAmount)}\n` +
        (exemptAmount > 0 ? `**VAT-exempt (rates):** R${formatAmount(exemptAmount)}\n\n` : '\n') +
        `_Property rates are exempt from VAT per South African tax law._`
      )
      .confidence(95)
      .withoutSource('VAT calculation verified against standard 15% rate.')
      .build(),
};

export default F;
