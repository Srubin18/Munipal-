/**
 * Debug script to trace verification calculation
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs';
import { parseCojBill } from '../src/lib/parsers/coj-bill';

async function debugVerification(): Promise<void> {
  const pdfPath = '/Users/simon/Dropbox/554528356 - Magnum2.pdf';
  console.log(`\nParsing: ${pdfPath}\n`);

  const pdfBuffer = fs.readFileSync(pdfPath);
  const bill = await parseCojBill(pdfBuffer);

  const elecItem = bill.lineItems.find(i => i.serviceType === 'electricity');

  if (!elecItem) {
    console.log('No electricity item found');
    return;
  }

  console.log('=== ELECTRICITY LINE ITEM ===');
  console.log(`Amount: R${(elecItem.amount / 100).toFixed(2)}`);
  console.log(`Quantity (consumption): ${elecItem.quantity}`);

  const metadata = elecItem.metadata as {
    meters?: Array<{consumption: number; type: string}>;
    charges?: Array<{step: number; kWh: number; rate: number}>;
    energyChargeTotal?: number;
    serviceCharge?: number;
    networkCharge?: number;
    networkSurcharge?: number;
    demandLevy?: number;
    vatAmount?: number;
    subtotal?: number;
  };

  console.log('\n=== METADATA ===');
  console.log('Meters:', JSON.stringify(metadata?.meters, null, 2));
  console.log('Charges:', JSON.stringify(metadata?.charges, null, 2));
  console.log('Energy Charge Total:', metadata?.energyChargeTotal);
  console.log('Service Charge:', metadata?.serviceCharge);
  console.log('Network Charge:', metadata?.networkCharge);
  console.log('Network Surcharge:', metadata?.networkSurcharge);
  console.log('Demand Levy:', metadata?.demandLevy);
  console.log('VAT Amount:', metadata?.vatAmount);
  console.log('Subtotal:', metadata?.subtotal);

  // Calculate expected total using the same logic as tariff-check
  console.log('\n=== VERIFICATION CALCULATION ===');

  const charges = metadata?.charges || [];
  let expectedEnergy = 0;

  for (const charge of charges) {
    const chargeAmount = charge.kWh * charge.rate;
    expectedEnergy += chargeAmount;
    console.log(`Energy: ${charge.kWh.toLocaleString()} kWh × R${charge.rate.toFixed(4)} = R${chargeAmount.toFixed(2)}`);
  }
  console.log(`Total Energy: R${expectedEnergy.toFixed(2)}`);

  const serviceCharge = metadata?.serviceCharge || 0;
  const networkCharge = metadata?.networkCharge || 0;
  const networkSurcharge = metadata?.networkSurcharge || 0;
  const demandLevy = metadata?.demandLevy || 0;

  console.log(`Service Charges: R${serviceCharge.toFixed(2)}`);
  console.log(`Network Charges: R${networkCharge.toFixed(2)}`);
  console.log(`Network Surcharge: R${networkSurcharge.toFixed(2)}`);
  console.log(`Demand Levy: R${demandLevy.toFixed(2)}`);

  const fixedTotal = serviceCharge + networkCharge + demandLevy;
  console.log(`Fixed Total (excl surcharge): R${fixedTotal.toFixed(2)}`);

  const subtotal = expectedEnergy + fixedTotal;
  const expectedVat = subtotal * 0.15;
  const expectedTotal = subtotal + expectedVat;

  console.log(`\nSubtotal (excl surcharge): R${subtotal.toFixed(2)}`);
  console.log(`VAT (15%): R${expectedVat.toFixed(2)}`);
  console.log(`Expected Total: R${expectedTotal.toFixed(2)}`);

  console.log(`\nActual Billed: R${(elecItem.amount / 100).toFixed(2)}`);
  console.log(`Difference: R${((elecItem.amount / 100) - expectedTotal).toFixed(2)}`);

  // Now calculate WITH network surcharge
  console.log('\n=== WITH NETWORK SURCHARGE ===');
  const subtotalWithSurcharge = expectedEnergy + fixedTotal + networkSurcharge;
  const vatWithSurcharge = subtotalWithSurcharge * 0.15;
  const totalWithSurcharge = subtotalWithSurcharge + vatWithSurcharge;

  console.log(`Subtotal (incl surcharge): R${subtotalWithSurcharge.toFixed(2)}`);
  console.log(`VAT (15%): R${vatWithSurcharge.toFixed(2)}`);
  console.log(`Expected Total: R${totalWithSurcharge.toFixed(2)}`);
  console.log(`Difference: R${((elecItem.amount / 100) - totalWithSurcharge).toFixed(2)}`);
}

debugVerification().catch(console.error);
