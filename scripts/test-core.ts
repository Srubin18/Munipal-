/**
 * TEST MUNIPAL CORE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Test the new elegant core analysis engine against 10 real COJ bills.
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseCojBill } from '../src/lib/parsers/coj-bill';
import { analyzeBill, generateActionPlan } from '../src/lib/core';

const DATA_DIR = join(__dirname, '../data');

async function testCore() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('                    MUNIPAL CORE TEST                                   ');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Testing ${files.length} bills...\n`);

  let allCorrect = 0;
  let actionNeeded = 0;
  let reviewRecommended = 0;
  const allFindings: Array<{ account: string; finding: string; action: string }> = [];

  for (const file of files) {
    try {
      const buffer = readFileSync(join(DATA_DIR, file));
      const parsed = await parseCojBill(buffer);
      const analysis = analyzeBill(parsed);
      const actions = generateActionPlan(analysis);

      // Count verdicts
      if (analysis.verdict === 'all_correct') allCorrect++;
      else if (analysis.verdict === 'action_needed') actionNeeded++;
      else reviewRecommended++;

      // Collect findings
      for (const finding of analysis.findings) {
        allFindings.push({
          account: analysis.account,
          finding: finding.title,
          action: finding.action,
        });
      }

      // Display result
      const icon = analysis.verdict === 'all_correct' ? '✓' :
                   analysis.verdict === 'action_needed' ? '🚨' : '⚠️';

      console.log(`${icon} ${analysis.account.padEnd(12)} ${analysis.verdict.toUpperCase()}`);

      // Show services
      for (const service of analysis.services) {
        const sIcon = service.status === 'verified' ? '  ✓' :
                      service.status === 'issue' ? '  ✗' : '  ·';
        const amount = `R${service.billed.toFixed(2)}`.padStart(12);
        console.log(`${sIcon} ${service.name.padEnd(12)} ${amount}  ${service.note || ''}`);
      }

      // Show findings
      if (analysis.findings.length > 0) {
        console.log('  Findings:');
        for (const finding of analysis.findings) {
          const fIcon = finding.severity === 'critical' ? '  🚨' :
                        finding.severity === 'warning' ? '  ⚠️' : '  ℹ️';
          console.log(`${fIcon} ${finding.title}`);
        }
      }

      // Show action plans
      if (actions.length > 0) {
        console.log('  Actions:');
        for (const action of actions) {
          console.log(`     → ${action.title} (${action.priority})`);
        }
      }

      console.log('');

    } catch (error) {
      console.log(`❌ ${file}: ${error}`);
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('                           SUMMARY                                      ');
  console.log('═══════════════════════════════════════════════════════════════════════');

  console.log(`\n  Total bills:        ${files.length}`);
  console.log(`  ✓ All correct:      ${allCorrect}`);
  console.log(`  🚨 Action needed:    ${actionNeeded}`);
  console.log(`  ⚠️  Review:          ${reviewRecommended}`);

  // Unique findings
  console.log('\n  UNIQUE FINDINGS ACROSS ALL BILLS:');
  const uniqueFindings = Array.from(new Set(allFindings.map(f => f.finding)));
  for (const finding of uniqueFindings) {
    const count = allFindings.filter(f => f.finding === finding).length;
    console.log(`    • ${finding} (${count} bill${count > 1 ? 's' : ''})`);
  }

  // What ChatGPT can't do
  console.log('\n  WHAT CHATGPT CAN\'T DO:');
  console.log('    ✓ Parse actual PDF bills');
  console.log('    ✓ Know current FY 2025/26 tariffs');
  console.log('    ✓ Detect R0 valuations');
  console.log('    ✓ Generate legally-sound dispute letters');
  console.log('    ✓ Cite SA municipal law (MPRA, Credit Control Bylaw)');

  console.log('\n═══════════════════════════════════════════════════════════════════════\n');
}

testCore().catch(console.error);
