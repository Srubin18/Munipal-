/**
 * MUNIPAL CORE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Clean public API for bill analysis and dispute handling.
 *
 * Usage:
 *   import { analyzeBill, generateActionPlan } from '@/lib/core';
 *
 *   const analysis = analyzeBill(parsedBill);
 *   const actions = generateActionPlan(analysis);
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

export { analyzeBill, SA_MUNICIPAL_LAW, TARIFFS } from './analyze';
export type { BillAnalysis, Finding, ServiceAnalysis, Severity, ActionType } from './analyze';

export { generateActionPlan } from './dispute';
export type { ActionPlan, ActionStep, DisputeLetter, Contact } from './dispute';
