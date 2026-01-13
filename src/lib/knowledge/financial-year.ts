/**
 * Financial Year Utilities for MUNIPAL
 *
 * City of Johannesburg operates on a July-June financial year:
 * - FY 2024/25 runs from 1 July 2024 to 30 June 2025
 * - Any date in July 2024 onwards belongs to FY 2024/25
 * - Any date in January-June 2025 also belongs to FY 2024/25
 *
 * This is the SINGLE SOURCE OF TRUTH for financial year calculations.
 */

/**
 * Determine the CoJ financial year for a given date.
 *
 * @param date - The date to check (defaults to today)
 * @returns Financial year string in format "YYYY/YY" (e.g., "2024/25")
 *
 * @example
 * // July 2024 onwards
 * getCurrentFinancialYear(new Date('2024-07-15')) // => "2024/25"
 * getCurrentFinancialYear(new Date('2024-12-25')) // => "2024/25"
 *
 * // January-June belongs to previous FY start
 * getCurrentFinancialYear(new Date('2025-03-15')) // => "2024/25"
 * getCurrentFinancialYear(new Date('2025-06-30')) // => "2024/25"
 *
 * // July 2025 starts new FY
 * getCurrentFinancialYear(new Date('2025-07-01')) // => "2025/26"
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed: January=0, July=6
  const year = date.getFullYear();

  // July (month 6) onwards belongs to current/next FY
  if (month >= 6) {
    return `${year}/${(year + 1).toString().slice(-2)}`;
  }

  // January-June belongs to previous/current FY
  return `${year - 1}/${year.toString().slice(-2)}`;
}

/**
 * Get the previous financial year relative to a given date.
 *
 * @param date - The reference date
 * @returns Previous financial year string
 */
export function getPreviousFinancialYearFromDate(date: Date = new Date()): string {
  const current = getCurrentFinancialYear(date);
  const startYear = parseInt(current.split('/')[0]);
  return `${startYear - 1}/${startYear.toString().slice(-2)}`;
}

/**
 * Get the previous financial year given a financial year string.
 *
 * @param fy - Financial year string (e.g., "2024/25")
 * @returns Previous financial year string (e.g., "2023/24")
 */
export function getPreviousFinancialYear(fy: string): string {
  const match = fy.match(/(\d{4})\/(\d{2})/);
  if (!match) return '2024/25'; // Fallback to a reasonable default

  const startYear = parseInt(match[1]) - 1;
  return `${startYear}/${(startYear + 1).toString().slice(-2)}`;
}

/**
 * Parse a financial year string into start and end dates.
 *
 * @param fy - Financial year string (e.g., "2024/25")
 * @returns Object with start and end Date objects
 */
export function parseFinancialYear(fy: string): { start: Date; end: Date } {
  const [startYear] = fy.split('/').map(Number);
  return {
    start: new Date(startYear, 6, 1), // July 1
    end: new Date(startYear + 1, 5, 30), // June 30
  };
}
