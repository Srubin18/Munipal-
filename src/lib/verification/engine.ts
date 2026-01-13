import { ParsedBill } from '../parsers/types';
import { Finding, VerificationResult } from './types';
import { runTariffChecks } from './checks/tariff-check';
import { runMeterChecks } from './checks/meter-check';
import { runArithmeticChecks } from './checks/arithmetic-check';

export interface VerificationOptions {
  propertyValue?: number; // Property valuation in Rands
}

/**
 * Main verification engine
 * Runs all checks against a parsed bill
 */
export async function verifyBill(
  bill: ParsedBill,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const findings: Finding[] = [];

  // Run all checks
  const tariffFindings = await runTariffChecks(bill, options);
  const meterFindings = runMeterChecks(bill);
  const arithmeticFindings = runArithmeticChecks(bill);

  findings.push(...tariffFindings, ...meterFindings, ...arithmeticFindings);

  // Summarize
  const summary = {
    verified: findings.filter((f) => f.status === 'VERIFIED').length,
    likelyWrong: findings.filter((f) => f.status === 'LIKELY_WRONG').length,
    unknown: findings.filter((f) => f.status === 'CANNOT_VERIFY').length,
  };

  // Calculate total impact
  const wrongFindings = findings.filter((f) => f.status === 'LIKELY_WRONG');
  const totalImpactMin = wrongFindings.reduce((sum, f) => sum + (f.impactMin || 0), 0);
  const totalImpactMax = wrongFindings.reduce((sum, f) => sum + (f.impactMax || 0), 0);

  // Determine recommendation
  let recommendation: VerificationResult['recommendation'];
  if (summary.likelyWrong === 0) {
    recommendation = 'do_nothing';
  } else if (totalImpactMax < 20000) {
    // < R200
    recommendation = 'handle_yourself';
  } else {
    recommendation = 'let_munipal_handle';
  }

  return {
    findings,
    summary,
    totalImpactMin,
    totalImpactMax,
    recommendation,
  };
}

/**
 * Generate a case summary from verification results
 */
export function generateSummary(result: VerificationResult): string {
  const { summary, totalImpactMin, totalImpactMax } = result;

  if (summary.likelyWrong === 0 && summary.unknown === 0) {
    return 'All charges on your bill appear to be correct based on current tariffs.';
  }

  const parts: string[] = [];

  if (summary.likelyWrong > 0) {
    parts.push(
      `Found ${summary.likelyWrong} potential issue${summary.likelyWrong > 1 ? 's' : ''}`
    );
    if (totalImpactMax > 0) {
      const minRand = (totalImpactMin / 100).toFixed(0);
      const maxRand = (totalImpactMax / 100).toFixed(0);
      parts.push(`with estimated impact of R${minRand} - R${maxRand}`);
    }
  }

  if (summary.unknown > 0) {
    parts.push(
      `${summary.unknown} item${summary.unknown > 1 ? 's' : ''} could not be verified`
    );
  }

  return parts.join('. ') + '.';
}
