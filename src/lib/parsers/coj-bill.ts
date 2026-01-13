import pdf from 'pdf-parse';
import { ParsedBill, ParsedLineItem } from './types';

/**
 * Parse a City of Johannesburg municipal bill PDF
 * Handles both residential and commercial/multi-unit properties
 */
export async function parseCojBill(buffer: Buffer): Promise<ParsedBill> {
  const data = await pdf(buffer);
  const text = data.text;

  // Extract account number (format: 554528356)
  const accountMatch = text.match(/Account\s*Number[:\s]*(\d{9,12})/i);
  const accountNumber = accountMatch ? accountMatch[1] : null;

  // Extract dates (format: 2025/12/04 or 2025/12/19)
  const billDateMatch = text.match(/Date\s+(\d{4}\/\d{2}\/\d{2})/);
  const dueDateMatch = text.match(/Due\s*Date[:\s]*(\d{4}\/\d{2}\/\d{2})/i);

  const billDate = billDateMatch ? parseCoJDate(billDateMatch[1]) : null;
  const dueDate = dueDateMatch ? parseCoJDate(dueDateMatch[1]) : null;

  // Extract total due (format: 159,412.34)
  const totalDueMatch = text.match(/Total\s+Due[:\s]*R?\s*([\d,]+\.\d{2})/i);
  const totalDue = totalDueMatch ? parseRandAmount(totalDueMatch[1]) : null;

  // Extract previous balance
  const prevBalMatch = text.match(/Previous\s+Account\s+Balance[:\s]*([\d,]+\.\d{2})/i);
  const previousBalance = prevBalMatch ? parseRandAmount(prevBalMatch[1]) : null;

  // Extract current charges
  const currentMatch = text.match(/Current\s+Charges\s*\(Excl\.\s*VAT\)[:\s]*([\d,]+\.\d{2})/i);
  const currentCharges = currentMatch ? parseRandAmount(currentMatch[1]) : null;

  // Extract VAT
  const vatMatch = text.match(/VAT\s*@\s*15%[:\s]*([\d,]+\.\d{2})/i);
  const vatAmount = vatMatch ? parseRandAmount(vatMatch[1]) : null;

  // Extract property info
  const propertyInfo = extractPropertyInfo(text);

  // Extract line items from each section
  const lineItems = extractLineItems(text, propertyInfo);

  return {
    billDate,
    dueDate,
    periodStart: null,
    periodEnd: null,
    totalDue,
    previousBalance,
    currentCharges,
    vatAmount,
    accountNumber,
    lineItems,
    rawText: text,
    propertyInfo,
  };
}

interface PropertyInfo {
  address: string | null;
  standSize: number | null;
  units: number | null;
  propertyType: string | null;
  municipalValuation: number | null;
}

function extractPropertyInfo(text: string): PropertyInfo {
  // Extract address
  const addressMatch = text.match(/Physical\s+Address[:\s]+([^\n]+)/i);

  // Extract stand size (e.g., "497 m2")
  const standMatch = text.match(/(\d+)\s*m2/);

  // Extract number of units (e.g., "47 living Unit(s)")
  const unitsMatch = text.match(/(\d+)\s*living\s*[Uu]nit/i);

  // Extract property type (e.g., "Multipurpose", "Residential")
  const typeMatch = text.match(/Category\s+of\s+Property[:\s]+Property\s+Rates[:\s]+(\w+)/i);

  // Extract municipal valuation
  const valMatch = text.match(/Market\s+Value\s+R\s*([\d,]+(?:\.\d{2})?)/i);

  return {
    address: addressMatch ? addressMatch[1].trim() : null,
    standSize: standMatch ? parseInt(standMatch[1]) : null,
    units: unitsMatch ? parseInt(unitsMatch[1]) : null,
    propertyType: typeMatch ? typeMatch[1] : null,
    municipalValuation: valMatch ? parseRandAmount(valMatch[1]) : null,
  };
}

function extractLineItems(text: string, propertyInfo: PropertyInfo): ParsedLineItem[] {
  const items: ParsedLineItem[] = [];

  // === ELECTRICITY ===
  // Look for City Power Electricity section - starts with "City Power" followed by "Electricity"
  // Be careful to get the actual charges section, not the header
  const electricitySection = text.match(/City\s*Power\s*\nElectricity[\s\S]*?(?=Johannesburg\s*Water\s*\nWater|PIKITUP|City\s*of\s*Johannesburg\s*\nSundry|$)/i);

  if (electricitySection) {
    const elecText = electricitySection[0];

    // Extract consumption from meter readings
    // Pattern: "Consumption: 19,616.000;" - specifically the meter consumption, NOT daily average
    // The pattern requires a semicolon after to distinguish from "daily average consumption X.XXX kWh"
    const meters: Array<{consumption: number, type: string}> = [];

    // Match meter blocks: "Meter: XXXXX; ... Consumption: XXX.XXX; ... Type: Actual/Estimated"
    // Use [\s\S]*? instead of .*? to match across newlines
    const meterBlockPattern = /Meter[:\s]*(\d+)[;\s][\s\S]*?Consumption[:\s]*([\d,]+\.\d+)[;\s][\s\S]*?Type[:\s]*(\w+)/gi;
    let meterBlockMatch;

    while ((meterBlockMatch = meterBlockPattern.exec(elecText)) !== null) {
      const consumption = parseFloat(meterBlockMatch[2].replace(/,/g, ''));
      const type = meterBlockMatch[3];
      meters.push({ consumption, type });
    }

    // Extract all electricity step charges with rates
    // Pattern: "Step 1 509.240 kWh @ R 2.6444" or with amounts
    const chargePattern = /Step\s*(\d+)\s*([\d,]+\.\d+)\s*kWh\s*@\s*R\s*([\d.]+)/gi;
    const charges: Array<{step: number, kWh: number, rate: number}> = [];
    let chargeMatch;

    while ((chargeMatch = chargePattern.exec(elecText)) !== null) {
      charges.push({
        step: parseInt(chargeMatch[1]),
        kWh: parseFloat(chargeMatch[2].replace(/,/g, '')),
        rate: parseFloat(chargeMatch[3]),
      });
    }

    // Extract the total energy charge (combines all steps)
    // Look for the line like "Step 1 509.240 kWh @ R 2.6444 ( Billing Period 2026/01 ) Step 2 487.690 kWh @ R 3.0348 2,826.67"
    const energyTotalMatch = elecText.match(/Step\s*\d+[\s\S]*?@\s*R\s*[\d.]+[\s\S]*?([\d,]+\.\d{2})\s*\n/);
    const energyChargeTotal = energyTotalMatch ? parseFloat(energyTotalMatch[1].replace(/,/g, '')) : 0;

    // Extract ALL service charges (multiple meters = multiple service charges)
    let serviceCharge = 0;
    const servicePattern = /Service\s+charge[^)]*\)[:\s]*([\d,]+\.\d+)/gi;
    let serviceMatch;
    while ((serviceMatch = servicePattern.exec(elecText)) !== null) {
      serviceCharge += parseFloat(serviceMatch[1].replace(/,/g, ''));
    }

    // Extract ALL network charges
    let networkCharge = 0;
    const networkPattern = /Network\s+charge[^)]*\)[:\s]*([\d,]+\.\d+)/gi;
    let networkMatch;
    while ((networkMatch = networkPattern.exec(elecText)) !== null) {
      networkCharge += parseFloat(networkMatch[1].replace(/,/g, ''));
    }

    // Extract network surcharge (kWh based)
    // Pattern: "Network Surcharge kWh1,137.36" - no separator before amount
    // Use [^:\d]*? (non-greedy, stops at digits) to match optional text like "kWh"
    const surchargeMatch = elecText.match(/Network\s+Surcharge[^:\d]*?([\d,]+\.\d+)/i);
    const networkSurcharge = surchargeMatch ? parseFloat(surchargeMatch[1].replace(/,/g, '')) : 0;

    // Extract demand side management levy
    const demandMatch = elecText.match(/Demand\s+side\s+management\s+levy[:\s]*([\d,]+\.\d+)/i);
    const demandLevy = demandMatch ? parseFloat(demandMatch[1].replace(/,/g, '')) : 0;

    // Extract total electricity (with VAT) - format can be:
    // "VAT: 15.00% 17,603.93 134,963.47" (with spaces) or
    // "VAT:  15.00%17,603.93134,963.47" (no spaces - numbers run together!)
    // Key insight: VAT amount always has exactly 2 decimal places, so look for .XX pattern
    const elecTotalMatch = elecText.match(/VAT[:\s]*[\d.]+%\s*([\d,]+\.\d{2})([\d,]+\.\d{2})/);
    let vatAmount = 0;
    let electricityTotal = 0;

    if (elecTotalMatch) {
      vatAmount = parseFloat(elecTotalMatch[1].replace(/,/g, ''));
      electricityTotal = parseFloat(elecTotalMatch[2].replace(/,/g, ''));
    } else {
      // Try with space separator
      const altMatch = elecText.match(/VAT[:\s]*[\d.]+%\s*([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
      if (altMatch) {
        vatAmount = parseFloat(altMatch[1].replace(/,/g, ''));
        electricityTotal = parseFloat(altMatch[2].replace(/,/g, ''));
      }
    }

    // Calculate total consumption from all meters
    const totalConsumption = meters.reduce((sum, m) => sum + m.consumption, 0);
    const isEstimated = meters.some(m => m.type.toLowerCase().includes('estimated'));

    if (electricityTotal > 0 || totalConsumption > 0) {
      // Create detailed description
      let description = 'Electricity consumption';
      if (meters.length > 1) {
        description = `Electricity (${meters.length} meters)`;
      }

      // Store meter details in metadata
      const chargeDetails = charges.map(c => `Step ${c.step}: ${c.kWh.toLocaleString()} kWh @ R${c.rate}`).join('; ');

      items.push({
        serviceType: 'electricity',
        description,
        quantity: totalConsumption,
        unitPrice: null,
        amount: Math.round(electricityTotal * 100),
        tariffCode: null,
        isEstimated,
        metadata: {
          meters,
          charges,
          energyChargeTotal,
          serviceCharge,
          networkCharge: networkCharge + networkSurcharge,
          demandLevy,
          vatAmount,
          chargeDetails,
        },
      });
    }
  }

  // === WATER & SANITATION ===
  // Look for "Johannesburg Water" followed by "Water & Sanitation"
  const waterSection = text.match(/Johannesburg\s*Water\s*\nWater\s*&\s*Sanitation[\s\S]*?(?=PIKITUP|City\s*of\s*Johannesburg\s*\nSundry|Current\s*Charges\s*\(Including|$)/i);

  if (waterSection) {
    const waterText = waterSection[0];

    // Extract water consumption - look for "Consumption: X.XXX;" pattern (before Units: KL)
    const waterConsMatch = waterText.match(/Consumption[:\s]*([\d,]+\.\d+)[;\s]/i);
    const waterConsumption = waterConsMatch ? parseFloat(waterConsMatch[1].replace(/,/g, '')) : 0;

    // Extract water step charges
    const waterStepPattern = /Step\s*(\d+)\s*([\d,]+\.\d+)\s*KL\s*@\s*R\s*([\d.]+)/gi;
    const waterSteps: Array<{step: number, kl: number, rate: number}> = [];
    let stepMatch;
    while ((stepMatch = waterStepPattern.exec(waterText)) !== null) {
      waterSteps.push({
        step: parseInt(stepMatch[1]),
        kl: parseFloat(stepMatch[2].replace(/,/g, '')),
        rate: parseFloat(stepMatch[3]),
      });
    }

    // Extract the water charges amount - look for the last amount before "Extended Social Package"
    const waterChargesMatch = waterText.match(/Step\s*\d+[\s\S]*?@\s*R\s*[\d.]+[\s\S]*?([\d,]+\.\d{2})\s*\n/);
    const waterCharges = waterChargesMatch ? parseFloat(waterChargesMatch[1].replace(/,/g, '')) : 0;

    // Extract water demand levy (for multi-unit or single residential)
    const demandLevyMultiMatch = waterText.match(/Water\s+Demand\s+Levy\s+per\s+(\d+)\s+living\s+[Uu]nit[^@]*@\s*R\s*([\d.]+)[^)]*\)[:\s]*([\d,]+\.\d+)/i);
    const demandLevySingleMatch = waterText.match(/Demand\s+Management\s+Levy[^)]*\)[:\s]*([\d,]+\.\d+)/i);

    let demandLevyAmount = 0;
    let demandLevyUnits = null;
    let demandLevyPerUnit = null;

    if (demandLevyMultiMatch) {
      demandLevyUnits = parseInt(demandLevyMultiMatch[1]);
      demandLevyPerUnit = parseFloat(demandLevyMultiMatch[2]);
      demandLevyAmount = parseFloat(demandLevyMultiMatch[3].replace(/,/g, ''));
    } else if (demandLevySingleMatch) {
      demandLevyAmount = parseFloat(demandLevySingleMatch[1].replace(/,/g, ''));
    }

    // Extract sewer charge (for multi-unit)
    const sewerMatch = waterText.match(/Sewer\s+charge\s+per\s+(\d+)\s+living\s+unit[^)]*\)[:\s]*([\d,]+\.\d+)/i);
    let sewerAmount = 0;
    let sewerUnits = null;
    if (sewerMatch) {
      sewerUnits = parseInt(sewerMatch[1]);
      sewerAmount = parseFloat(sewerMatch[2].replace(/,/g, ''));
    }

    // Extract total water & sanitation (with VAT) - same format issue as electricity
    // Numbers may run together without spaces
    const waterTotalMatch = waterText.match(/VAT[:\s]*[\d.]+%\s*([\d,]+\.\d{2})([\d,]+\.\d{2})/);
    let waterVat = 0;
    let waterSanitationTotal = 0;

    if (waterTotalMatch) {
      waterVat = parseFloat(waterTotalMatch[1].replace(/,/g, ''));
      waterSanitationTotal = parseFloat(waterTotalMatch[2].replace(/,/g, ''));
    } else {
      // Try with space separator
      const altMatch = waterText.match(/VAT[:\s]*[\d.]+%\s*([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
      if (altMatch) {
        waterVat = parseFloat(altMatch[1].replace(/,/g, ''));
        waterSanitationTotal = parseFloat(altMatch[2].replace(/,/g, ''));
      }
    }

    // Calculate water amount (excluding sewer for multi-unit)
    const waterOnlyTotal = sewerAmount > 0
      ? waterSanitationTotal - sewerAmount - (waterVat * sewerAmount / (waterCharges + demandLevyAmount + sewerAmount))
      : waterSanitationTotal;

    // Add water item
    if (waterConsumption > 0 || demandLevyAmount > 0 || waterCharges > 0 || waterSanitationTotal > 0) {
      const units = propertyInfo.units || demandLevyUnits;
      const stepDetails = waterSteps.map(s => `Step ${s.step}: ${s.kl} KL @ R${s.rate}`).join('; ');

      items.push({
        serviceType: 'water',
        description: units && units > 1 ? `Water (${units} units)` : 'Water consumption',
        quantity: waterConsumption,
        unitPrice: null,
        amount: sewerAmount > 0 ? Math.round(waterOnlyTotal * 100) : Math.round(waterSanitationTotal * 100),
        tariffCode: null,
        isEstimated: false,
        metadata: {
          units,
          waterCharges,
          demandLevy: demandLevyAmount,
          demandLevyPerUnit,
          stepDetails,
          vatAmount: waterVat,
        },
      });
    }

    // Add sewerage item for multi-unit
    if (sewerAmount > 0 && sewerUnits) {
      const perUnit = sewerAmount / sewerUnits;

      items.push({
        serviceType: 'sewerage',
        description: `Sewerage (${sewerUnits} units)`,
        quantity: sewerUnits,
        unitPrice: Math.round(perUnit * 100),
        amount: Math.round(sewerAmount * 100),
        tariffCode: null,
        isEstimated: false,
        metadata: {
          units: sewerUnits,
          perUnit,
        },
      });
    }
  }

  // === REFUSE (PIKITUP) ===
  // Must match "PIKITUP\nRefuse" pattern to avoid matching VAT header
  const refuseSection = text.match(/PIKITUP\s*\n\s*Refuse[\s\S]*?(?=City\s*of\s*Johannesburg\s*\n?Sundry|Current\s*Charges\s*\(Including|Where\s*can|$)/i);

  if (refuseSection) {
    const refuseText = refuseSection[0];

    // Extract refuse total - handle numbers running together
    // Pattern: "VAT:  15.00%1,021.007,827.64" (VAT amount and total run together)
    let refuseTotal = 0;
    let refuseVat = 0;

    // Pattern 1: Numbers run together after VAT %
    // "VAT:  15.00%1,021.007,827.64" -> VAT=1021.00, Total=7827.64
    const runTogetherMatch = refuseText.match(/VAT[:\s]*[\d.]+\s*%\s*([\d,]+\.\d{2})([\d,]+\.\d{2})/);
    if (runTogetherMatch) {
      refuseVat = parseFloat(runTogetherMatch[1].replace(/,/g, ''));
      refuseTotal = parseFloat(runTogetherMatch[2].replace(/,/g, ''));
    }

    // Pattern 2: Numbers with space separator
    if (refuseTotal === 0) {
      const spacedMatch = refuseText.match(/VAT[:\s]*[\d.]+\s*%\s*([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
      if (spacedMatch) {
        refuseVat = parseFloat(spacedMatch[1].replace(/,/g, ''));
        refuseTotal = parseFloat(spacedMatch[2].replace(/,/g, ''));
      }
    }

    // Extract individual refuse line items
    const refuseLines: Array<{description: string, amount: number}> = [];

    // Refuse removal pattern: "Refuse removal: 2-bin @ R 495.97  X 6 ( Billing Period 2025/12 )5,951.64"
    const removalMatch = refuseText.match(/Refuse\s+removal[^)]*\)([\d,]+\.\d+)/i);
    if (removalMatch) {
      refuseLines.push({ description: 'Refuse removal', amount: parseFloat(removalMatch[1].replace(/,/g, '')) });
    }

    // City cleaning levy
    const cleaningMatch = refuseText.match(/City\s+cleaning\s+levy[^)]*\)([\d,]+\.\d+)/i);
    if (cleaningMatch) {
      refuseLines.push({ description: 'City cleaning levy', amount: parseFloat(cleaningMatch[1].replace(/,/g, '')) });
    }

    // Refuse Residential
    const residentialMatch = refuseText.match(/Refuse\s+Residential[^)]*\)([\d,]+\.\d+)/i);
    if (residentialMatch) {
      refuseLines.push({ description: 'Refuse Residential', amount: parseFloat(residentialMatch[1].replace(/,/g, '')) });
    }

    // Calculate from lines if VAT pattern failed
    if (refuseTotal === 0 && refuseLines.length > 0) {
      const subtotal = refuseLines.reduce((sum, line) => sum + line.amount, 0);
      refuseVat = subtotal * 0.15;
      refuseTotal = subtotal + refuseVat;
    }

    if (refuseTotal > 0) {
      items.push({
        serviceType: 'refuse',
        description: 'Refuse collection',
        quantity: null,
        unitPrice: null,
        amount: Math.round(refuseTotal * 100),
        tariffCode: null,
        isEstimated: false,
        metadata: {
          lines: refuseLines,
          vatAmount: refuseVat,
          subtotal: refuseTotal - refuseVat,
        },
      });
    }
  }

  // === PROPERTY RATES ===
  // Look for City of Johannesburg Property Rates section
  // Can appear as "City of Johannesburg\nProperty Rates" or just "Property Rates"
  const ratesSection = text.match(/(?:City\s*of\s*Johannesburg\s*\n)?Property\s*Rates[\s\S]*?(?=Johannesburg\s*Water|City\s*Power|PIKITUP|Current\s*Charges\s*\(Including|$)/i);

  if (ratesSection) {
    const ratesText = ratesSection[0];

    // Extract rates total - handle various formats:
    // "VAT: 0 %0.0022,446.10" (0% VAT, numbers run together)
    // "VAT: 15.00%1,234.567,890.12" (15% VAT, numbers run together)
    // Also handle spaces: "VAT: 0 % 0.00 22,446.10"
    let ratesTotal = 0;

    // Try multiple patterns for the total
    // Pattern 1: If VAT 0%, look for pattern like "VAT: 0 %0.00<amount>"
    // The "0.00" is the VAT amount, followed immediately by the total
    const zeroVatMatch = ratesText.match(/VAT[:\s]*0\s*%\s*0\.00([\d,]+\.\d{2})/i);
    if (zeroVatMatch) {
      ratesTotal = parseFloat(zeroVatMatch[1].replace(/,/g, ''));
    }

    // Pattern 2: Standard VAT pattern with numbers running together
    // "VAT: 15.00%1,234.567,890.12" -> VAT=1234.56, Total=7890.12
    if (ratesTotal === 0) {
      const runTogetherMatch = ratesText.match(/VAT[:\s]*[\d.]+\s*%\s*([\d,]+\.\d{2})([\d,]+\.\d{2})/);
      if (runTogetherMatch) {
        ratesTotal = parseFloat(runTogetherMatch[2].replace(/,/g, ''));
      }
    }

    // Pattern 3: Standard VAT pattern with space
    if (ratesTotal === 0) {
      const stdMatch = ratesText.match(/VAT[:\s]*[\d.]+\s*%\s*([\d,]+\.\d+)\s+([\d,]+\.\d+)/);
      if (stdMatch) {
        ratesTotal = parseFloat(stdMatch[2].replace(/,/g, ''));
      }
    }

    // Extract individual rate calculations
    const rateLines: Array<{value: number, rate: number, amount: number, category: string}> = [];

    // Pattern: "R 22,320,000.00 X R 0.0095447 / 12 ( Billing Period 2025/12 )17,753.24"
    const rateCalcPattern = /R\s*([\d,]+\.\d+)\s*X\s*R\s*([\d.]+)\s*\/\s*12[^)]*\)([\d,]+\.\d+)/gi;
    let calcMatch;
    while ((calcMatch = rateCalcPattern.exec(ratesText)) !== null) {
      rateLines.push({
        value: parseFloat(calcMatch[1].replace(/,/g, '')),
        rate: parseFloat(calcMatch[2]),
        amount: parseFloat(calcMatch[3].replace(/,/g, '')),
        category: 'calculated',
      });
    }

    // Look for rebate/credit: "Less rates on first R300 000.00 of market value- 238.62"
    const rebateMatch = ratesText.match(/Less\s+rates[^-]*-\s*([\d,]+\.\d+)/i);
    if (rebateMatch) {
      rateLines.push({
        value: 300000, // Standard first R300k rebate
        rate: 0,
        amount: -parseFloat(rebateMatch[1].replace(/,/g, '')),
        category: 'rebate',
      });
    }

    // Calculate total from individual lines if we didn't get it from VAT line
    if (ratesTotal === 0 && rateLines.length > 0) {
      ratesTotal = rateLines.reduce((sum, line) => sum + line.amount, 0);
    }

    // Extract property categories mentioned
    const categoryMatches = Array.from(ratesText.matchAll(/Category\s+of\s+Property[:\s]+Property\s+Rates[:\s]+(\w+)/gi));
    const categories = categoryMatches.map(m => m[1]);
    const propertyTypes = Array.from(new Set(categories)).join(' & ');

    if (ratesTotal !== 0 || rateLines.length > 0) {
      items.push({
        serviceType: 'rates',
        description: propertyTypes ? `Property rates (${propertyTypes})` : (propertyInfo.propertyType ? `Property rates (${propertyInfo.propertyType})` : 'Property rates'),
        quantity: null,
        unitPrice: null,
        amount: Math.round(ratesTotal * 100),
        tariffCode: null,
        isEstimated: false,
        metadata: {
          propertyType: propertyTypes || propertyInfo.propertyType,
          municipalValuation: propertyInfo.municipalValuation,
          rateLines,
          calculatedTotal: rateLines.reduce((sum, line) => sum + line.amount, 0),
        },
      });
    }
  }

  // === SUNDRY CHARGES ===
  const sundrySection = text.match(/Sundry[\s\S]*?(?=Current\s*Charges|Where\s*can|$)/i);

  if (sundrySection) {
    const sundryText = sundrySection[0];

    // Extract surcharge on business services base amount
    const surchargeMatch = sundryText.match(/Surcharge\s+on\s+business\s+services[^:\d]*([\d,]+\.\d+)/i);
    const baseAmount = surchargeMatch ? parseFloat(surchargeMatch[1].replace(/,/g, '')) : 0;

    // Try to extract total (VAT line: "VAT: 15.00% [vat_amount] [total]")
    // Handle multiple formats:
    // 1. "VAT: 15.00% 203.31 1,558.70" (space separated)
    // 2. "VAT: 15.00%203.311,558.70" (no spaces - numbers run together)
    let sundryTotal = 0;
    let vatAmount = 0;

    // Try space-separated format first
    const spacedMatch = sundryText.match(/VAT[:\s]*[\d.]+%\s*([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/);
    if (spacedMatch) {
      vatAmount = parseFloat(spacedMatch[1].replace(/,/g, ''));
      sundryTotal = parseFloat(spacedMatch[2].replace(/,/g, ''));
    } else {
      // Try non-spaced format
      const nonSpacedMatch = sundryText.match(/VAT[:\s]*[\d.]+%\s*([\d,]+\.\d{2})([\d,]+\.\d{2})/);
      if (nonSpacedMatch) {
        vatAmount = parseFloat(nonSpacedMatch[1].replace(/,/g, ''));
        sundryTotal = parseFloat(nonSpacedMatch[2].replace(/,/g, ''));
      } else if (baseAmount > 0) {
        // Calculate from base if we have it
        vatAmount = baseAmount * 0.15;
        sundryTotal = baseAmount + vatAmount;
      }
    }

    if (sundryTotal > 0) {
      items.push({
        serviceType: 'sundry',
        description: 'Business services surcharge',
        quantity: null,
        unitPrice: null,
        amount: Math.round(sundryTotal * 100),
        tariffCode: null,
        isEstimated: false,
        metadata: {
          baseAmount,
          vatAmount,
        },
      });
    }
  }

  return items;
}

function parseCoJDate(dateStr: string): Date | null {
  try {
    // Format: 2025/12/04
    const [year, month, day] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  } catch {
    return null;
  }
}

function parseRandAmount(amountStr: string): number {
  // Remove commas and spaces, convert to cents
  const cleaned = amountStr.replace(/[,\s]/g, '');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.round(amount * 100);
}
