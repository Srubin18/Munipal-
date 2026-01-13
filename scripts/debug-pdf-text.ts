/**
 * Debug script to extract and display raw PDF text for pattern debugging
 */

import fs from 'fs';
import pdf from 'pdf-parse';

async function extractText(pdfPath: string): Promise<void> {
  console.log(`\nExtracting text from: ${pdfPath}\n`);

  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdf(pdfBuffer);
  const fullText = pdfData.text;

  // Find electricity section
  const elecMatch = fullText.match(/City\s*Power\s*\nElectricity[\s\S]*?(?=Johannesburg\s*Water|$)/i);

  if (elecMatch) {
    console.log('=== ELECTRICITY SECTION ===\n');
    console.log(elecMatch[0]);
    console.log('\n=== END ELECTRICITY SECTION ===\n');

    // Try different meter patterns
    console.log('\n=== TESTING METER PATTERNS ===\n');

    const elecText = elecMatch[0];

    // Pattern 1: Current pattern with semicolons
    const pattern1 = /Meter[:\s]*(\d+)[;\s].*?Consumption[:\s]*([\d,]+\.\d+)[;\s].*?Type[:\s]*(\w+)/gi;
    let match1;
    console.log('Pattern 1 (semicolon separated):');
    while ((match1 = pattern1.exec(elecText)) !== null) {
      console.log(`  Meter ${match1[1]}: ${match1[2]} kWh (${match1[3]})`);
    }

    // Pattern 2: Without strict semicolons
    const pattern2 = /Meter[:\s]*(\d+)[\s\S]*?Consumption[:\s]*([\d,]+\.\d+)[\s\S]*?Type[:\s]*(\w+)/gi;
    let match2;
    console.log('\nPattern 2 (relaxed separators):');
    while ((match2 = pattern2.exec(elecText)) !== null) {
      console.log(`  Meter ${match2[1]}: ${match2[2]} kWh (${match2[3]})`);
    }

    // Pattern 3: Just find Meter numbers
    const pattern3 = /Meter[:\s]*(\d{5,})/gi;
    let match3;
    console.log('\nPattern 3 (just meter numbers):');
    while ((match3 = pattern3.exec(elecText)) !== null) {
      console.log(`  Meter: ${match3[1]}`);
    }

    // Pattern 4: Find consumption values
    const pattern4 = /Consumption[:\s]*([\d,]+\.\d+)/gi;
    let match4;
    console.log('\nPattern 4 (consumption values):');
    while ((match4 = pattern4.exec(elecText)) !== null) {
      console.log(`  Consumption: ${match4[1]}`);
    }

    // Pattern 5: Find kWh @ rate patterns
    const pattern5 = /([\d,]+(?:\.\d+)?)\s*kWh\s*@\s*R\s*([\d.]+)/gi;
    let match5;
    console.log('\nPattern 5 (kWh @ rate):');
    while ((match5 = pattern5.exec(elecText)) !== null) {
      console.log(`  ${match5[1]} kWh @ R${match5[2]}`);
    }

    // Pattern 6: Step charges
    const pattern6 = /Step\s*(\d+)\s*([\d,]+\.\d+)\s*kWh\s*@\s*R\s*([\d.]+)/gi;
    let match6;
    console.log('\nPattern 6 (Step charges):');
    while ((match6 = pattern6.exec(elecText)) !== null) {
      console.log(`  Step ${match6[1]}: ${match6[2]} kWh @ R${match6[3]}`);
    }

  } else {
    console.log('Electricity section not found');
  }
}

const pdfPath = process.argv[2] || '/Users/simon/Dropbox/554528356 - Magnum2.pdf';
extractText(pdfPath).catch(console.error);
