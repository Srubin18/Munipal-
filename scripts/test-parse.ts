import pdf from 'pdf-parse';
import * as fs from 'fs';

async function test() {
  const buffer = fs.readFileSync('/Users/simon/Dropbox/554528356 - Magnum2.pdf');
  const data = await pdf(buffer);
  
  // Test the new regex
  const testStr = 'VAT:  15.00%17,603.93134,963.47';
  const match = testStr.match(/VAT[:\s]*[\d.]+%\s*([\d,]+\.\d{2})([\d,]+\.\d{2})/);
  console.log('Test match:', match);
  if (match) {
    console.log('VAT:', match[1], '-> parsed:', parseFloat(match[1].replace(/,/g, '')));
    console.log('Total:', match[2], '-> parsed:', parseFloat(match[2].replace(/,/g, '')));
  }
}

test().catch(console.error);
