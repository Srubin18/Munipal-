/**
 * Meter Verification Checks for MUNIPAL
 *
 * RULES:
 * - Do NOT apply residential consumption comparisons to commercial properties
 * - Only flag estimated readings (actual issue regardless of category)
 * - Commercial properties can have very high usage - this is normal
 */

import { ParsedBill } from '../../parsers/types';
import { Finding } from '../types';
import { inferCustomerCategory } from '../../knowledge/tariffs';

// Categories that should NOT be compared against residential consumption averages
const COMMERCIAL_CATEGORIES = ['commercial', 'business', 'industrial'];

/**
 * Run meter checks against parsed bill
 *
 * Only checks that apply regardless of customer category:
 * - Estimated readings
 *
 * Residential-only checks (disabled for commercial):
 * - Abnormal consumption spikes
 */
export function runMeterChecks(bill: ParsedBill): Finding[] {
  const findings: Finding[] = [];

  // Determine customer category
  const units = bill.propertyInfo?.units || 1;
  const propertyType = bill.propertyInfo?.propertyType || undefined;
  const customerCategory = inferCustomerCategory(
    bill.accountNumber || '',
    propertyType,
    units
  );
  const isCommercial = COMMERCIAL_CATEGORIES.includes(customerCategory);

  // Check for estimated readings - applies to ALL categories
  const estimatedItems = bill.lineItems.filter((i) => i.isEstimated);

  if (estimatedItems.length > 0) {
    for (const item of estimatedItems) {
      findings.push({
        checkType: 'meter',
        checkName: 'estimated_reading',
        status: 'LIKELY_WRONG',
        confidence: 75,
        title: `${capitalize(item.serviceType)} reading is estimated`,
        explanation: `Your ${item.serviceType} charge is based on an estimated reading, not an actual meter reading. Estimated readings can lead to over or under-billing. You should request an actual meter reading.`,
        impactMin: Math.round(item.amount * 0.1), // Assume 10-30% potential error
        impactMax: Math.round(item.amount * 0.3),
        citation: {
          hasSource: false,
          noSourceReason:
            'Per CoJ Meter Reading Policy, customers are entitled to request actual readings and adjustments when estimated readings are issued.',
        },
      });
    }
  }

  // ONLY check consumption for RESIDENTIAL properties
  // Commercial properties can have very high usage - this is normal
  if (!isCommercial) {
    // Check for abnormal residential electricity consumption
    const electricityItem = bill.lineItems.find((i) => i.serviceType === 'electricity');
    if (electricityItem && electricityItem.quantity) {
      // Average household uses 500-900 kWh/month
      const usage = electricityItem.quantity;
      if (usage > 1500) {
        findings.push({
          checkType: 'meter',
          checkName: 'abnormal_electricity_consumption',
          status: 'LIKELY_WRONG',
          confidence: 65,
          title: 'Unusually high electricity consumption',
          explanation: `Your electricity usage of ${usage.toLocaleString()} kWh is significantly higher than the average residential consumption (500-900 kWh). This could indicate a faulty meter, incorrect reading, or unauthorized usage.`,
          impactMin: Math.round((usage - 900) * 210), // Excess at ~R2.10/kWh
          impactMax: Math.round((usage - 500) * 210),
          citation: {
            hasSource: false,
            noSourceReason:
              'Per CoJ Electricity Supply By-laws, customers may request meter testing if consumption readings appear inaccurate.',
          },
        });
      }
    }

    // Check for abnormal residential water consumption
    const waterItem = bill.lineItems.find((i) => i.serviceType === 'water');
    if (waterItem && waterItem.quantity) {
      // Average household uses 15-25 kl/month
      const usage = waterItem.quantity;
      if (usage > 50) {
        findings.push({
          checkType: 'meter',
          checkName: 'abnormal_water_consumption',
          status: 'LIKELY_WRONG',
          confidence: 70,
          title: 'Unusually high water consumption',
          explanation: `Your water usage of ${usage.toLocaleString()} kL is significantly higher than the average residential consumption (15-25 kL). This could indicate a leak, faulty meter, or incorrect reading.`,
          impactMin: Math.round((usage - 25) * 3550), // Excess at highest block rate
          impactMax: Math.round((usage - 15) * 3550),
          citation: {
            hasSource: false,
            noSourceReason:
              'Per Johannesburg Water By-laws, estimated readings resulting in high consumption may be disputed.',
          },
        });
      }
    }
  }

  return findings;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
