import { readFileSync } from 'fs';
import { parseCojBill } from '../src/lib/parsers/coj-bill';
import { verifyBill, generateSummary } from '../src/lib/verification/engine';

async function test() {
  try {
    const pdfPath = '/Users/simon/Dropbox/554528356 - Magnum2.pdf';
    console.log('Reading file...');
    const buffer = readFileSync(pdfPath);
    console.log('File size:', buffer.length);

    console.log('Parsing with CoJ parser...');
    const result = await parseCojBill(buffer);
    console.log('Account:', result.accountNumber);
    console.log('Bill Date:', result.billDate);
    console.log('Total Due:', result.totalDue);
    console.log('Property Info:', result.propertyInfo);
    console.log('Line items:', result.lineItems.length);
    result.lineItems.forEach((item, i) => {
      console.log(`  [${i}] ${item.serviceType}: ${item.description} - R${(item.amount / 100).toFixed(2)}`);
    });

    console.log('\nRunning verification...');
    const verification = await verifyBill(result);
    console.log('Findings:', verification.findings.length);
    console.log('Summary:', verification.summary);
    verification.findings.forEach((finding, i) => {
      console.log(`  [${i}] ${finding.status}: ${finding.title}`);
    });

    console.log('\n=== SUCCESS ===');
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

test();
