/**
 * Debug parser - shows raw text extraction
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pdf from 'pdf-parse';

async function debug() {
  const filePath = join(__dirname, '../data/555854948 - Anewe House 24 Edward Street.pdf');
  const buffer = readFileSync(filePath);
  const data = await pdf(buffer);
  const text = data.text;

  console.log('=== RAW TEXT (first 2000 chars) ===\n');
  console.log(text.substring(0, 2000));

  console.log('\n\n=== DATE PATTERN SEARCH ===');
  const dateMatch = text.match(/Date\s+(\d{4}\/\d{2}\/\d{2})/);
  console.log('Pattern: /Date\\s+(\\d{4}\\/\\d{2}\\/\\d{2})/');
  console.log('Match:', dateMatch);

  // Try alternative patterns
  const alt1 = text.match(/Date\s*(\d{4}\/\d{2}\/\d{2})/);
  console.log('\nAlt1 /Date\\s*(\\d{4}\\/\\d{2}\\/\\d{2})/', alt1);

  const alt2 = text.match(/(\d{4}\/\d{2}\/\d{2})/g);
  console.log('\nAll dates found:', alt2);

  console.log('\n\n=== VALUATION PATTERN SEARCH ===');
  const valMatch = text.match(/Market\s+Value\s+R\s*([\d,]+(?:\.\d{2})?)/i);
  console.log('Match:', valMatch);

  // Check what's around "Market Value"
  const mvIdx = text.indexOf('Market Value');
  if (mvIdx >= 0) {
    console.log('\nContext around "Market Value":');
    console.log(text.substring(mvIdx, mvIdx + 100));
  }
}

debug().catch(console.error);
