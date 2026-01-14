/**
 * REAL Parser Test - Tests actual Munipal parser against 10 COJ PDFs
 *
 * This is the HONEST test - running real PDFs through real code.
 * Not hardcoded data.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseCojBill } from '../src/lib/parsers/coj-bill';

const DATA_DIR = join(__dirname, '../data');

async function testRealParser() {
  console.log('\n' + '='.repeat(80));
  console.log('REAL PARSER TEST - Running actual PDFs through actual code');
  console.log('='.repeat(80) + '\n');

  // Find all PDFs
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files\n`);

  const results: Array<{
    file: string;
    success: boolean;
    accountNumber: string | null;
    valuation: number | null;
    electricity: { consumption: number | null; amount: number };
    water: { consumption: number | null; amount: number };
    rates: number;
    refuse: number;
    totalLineItems: number;
    errors: string[];
  }> = [];

  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`FILE: ${file}`);
    console.log(`${'─'.repeat(80)}`);

    try {
      const buffer = readFileSync(filePath);
      const parsed = await parseCojBill(buffer);

      // Extract key fields
      const elecItem = parsed.lineItems.find(i => i.serviceType === 'electricity');
      const waterItem = parsed.lineItems.find(i => i.serviceType === 'water');
      const ratesItem = parsed.lineItems.find(i => i.serviceType === 'rates');
      const refuseItem = parsed.lineItems.find(i => i.serviceType === 'refuse');

      const errors: string[] = [];

      // Check for parsing issues
      if (!parsed.accountNumber) errors.push('Account number not extracted');
      if (!parsed.propertyInfo?.municipalValuation && parsed.propertyInfo?.municipalValuation !== 0) {
        errors.push('Municipal valuation not extracted');
      }
      if (!parsed.billDate) errors.push('Bill date not extracted');
      if (!parsed.totalDue) errors.push('Total due not extracted');

      // Check electricity
      if (elecItem && elecItem.quantity && elecItem.quantity > 0) {
        if (!elecItem.metadata) errors.push('Electricity metadata missing');
      }

      // Check water
      if (waterItem && waterItem.quantity && waterItem.quantity > 0) {
        if (!waterItem.metadata) errors.push('Water metadata missing');
      }

      // Note: amounts are stored in CENTS, so divide by 100 for Rands
      const valuationRands = parsed.propertyInfo?.municipalValuation
        ? (parsed.propertyInfo.municipalValuation / 100).toLocaleString()
        : 'NOT FOUND';

      console.log(`\n  Account: ${parsed.accountNumber || 'NOT FOUND'}`);
      console.log(`  Bill Date: ${parsed.billDate?.toISOString().split('T')[0] || 'NOT FOUND'}`);
      console.log(`  Valuation: R${valuationRands}`);
      console.log(`  Property Type: ${parsed.propertyInfo?.propertyType || 'NOT FOUND'}`);
      console.log(`  Units: ${parsed.propertyInfo?.units || 1}`);
      console.log(`  Stand Size: ${parsed.propertyInfo?.standSize || 'NOT FOUND'} m²`);

      console.log(`\n  LINE ITEMS EXTRACTED: ${parsed.lineItems.length}`);
      for (const item of parsed.lineItems) {
        const qty = item.quantity ? `${item.quantity.toFixed(2)} ${item.serviceType === 'electricity' ? 'kWh' : 'kL'}` : 'N/A';
        console.log(`    - ${item.serviceType.toUpperCase()}: R${(item.amount / 100).toFixed(2)} (qty: ${qty})`);

        // Show metadata if present
        if (item.metadata) {
          const meta = item.metadata as Record<string, unknown>;
          if (meta.meters) {
            console.log(`      Meters: ${(meta.meters as Array<unknown>).length}`);
          }
          if (meta.charges) {
            console.log(`      Charge steps: ${(meta.charges as Array<unknown>).length}`);
          }
        }
      }

      if (errors.length > 0) {
        console.log(`\n  ⚠️  PARSING ISSUES:`);
        errors.forEach(e => console.log(`    - ${e}`));
      }

      results.push({
        file,
        success: errors.length === 0,
        accountNumber: parsed.accountNumber,
        valuation: parsed.propertyInfo?.municipalValuation ?? null,
        electricity: {
          consumption: elecItem?.quantity ?? null,
          amount: elecItem?.amount ?? 0,
        },
        water: {
          consumption: waterItem?.quantity ?? null,
          amount: waterItem?.amount ?? 0,
        },
        rates: ratesItem?.amount ?? 0,
        refuse: refuseItem?.amount ?? 0,
        totalLineItems: parsed.lineItems.length,
        errors,
      });

    } catch (error) {
      console.log(`\n  ❌ PARSE ERROR: ${error}`);
      results.push({
        file,
        success: false,
        accountNumber: null,
        valuation: null,
        electricity: { consumption: null, amount: 0 },
        water: { consumption: null, amount: 0 },
        rates: 0,
        refuse: 0,
        totalLineItems: 0,
        errors: [`Parse failed: ${error}`],
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('PARSER TEST SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n  Total PDFs tested: ${results.length}`);
  console.log(`  ✓ Parsed successfully: ${successful}`);
  console.log(`  ✗ Parse issues: ${failed}`);

  // Show issues
  const withIssues = results.filter(r => r.errors.length > 0);
  if (withIssues.length > 0) {
    console.log('\n  ISSUES BY FILE:');
    for (const r of withIssues) {
      console.log(`\n    ${r.file}:`);
      r.errors.forEach(e => console.log(`      - ${e}`));
    }
  }

  // Extraction rate
  console.log('\n  EXTRACTION RATES:');
  const withAccount = results.filter(r => r.accountNumber).length;
  const withValuation = results.filter(r => r.valuation !== null).length;
  const withElec = results.filter(r => r.electricity.amount > 0 || r.electricity.consumption !== null).length;
  const withWater = results.filter(r => r.water.amount > 0 || r.water.consumption !== null).length;
  const withRates = results.filter(r => r.rates > 0).length;
  const withRefuse = results.filter(r => r.refuse > 0).length;

  console.log(`    Account numbers: ${withAccount}/${results.length} (${Math.round(withAccount/results.length*100)}%)`);
  console.log(`    Valuations: ${withValuation}/${results.length} (${Math.round(withValuation/results.length*100)}%)`);
  console.log(`    Electricity: ${withElec}/${results.length}`);
  console.log(`    Water: ${withWater}/${results.length}`);
  console.log(`    Rates: ${withRates}/${results.length}`);
  console.log(`    Refuse: ${withRefuse}/${results.length}`);

  console.log('\n');
}

testRealParser().catch(console.error);
