// Extract commercial electricity tariffs from the official document
import { config } from 'dotenv';
config({ path: '.env.local' });

import { prisma } from '../src/lib/db';
import Anthropic from '@anthropic-ai/sdk';

async function main() {
  // Get the document
  const document = await prisma.knowledgeDocument.findFirst({
    where: { financialYear: '2025/26', provider: 'city_power' },
    orderBy: { createdAt: 'desc' },
  });

  if (!document?.rawText) {
    console.error('No document found');
    process.exit(1);
  }

  console.log('Document:', document.title);
  console.log('Raw text preview:\n', document.rawText.substring(0, 3000));
  console.log('\n\nExtracting commercial electricity tariffs...\n');

  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Extract COMMERCIAL/BUSINESS electricity tariffs from this City of Johannesburg 2025/26 tariff document.

Look for:
- Business/commercial/industrial electricity rates
- Demand charges
- Large power user rates
- Time-of-use rates (if any)

Return JSON array with this structure:
[
  {
    "tariffCode": "COM_ELEC_HIGH",
    "customerCategory": "commercial",
    "description": "Commercial Electricity High Usage",
    "pricingStructure": {
      "energyCharges": {
        "bands": [
          { "minKwh": 0, "maxKwh": 500, "ratePerKwh": 26645, "description": "Block 1" }
        ]
      },
      "fixedCharges": [
        { "name": "Service Charge", "amount": 7000, "frequency": "monthly" }
      ]
    },
    "sourceExcerpt": "exact text from document",
    "confidence": 90
  }
]

Note: Store rates in cents × 100 (e.g., 266.45 c/kWh = 26645)

DOCUMENT TEXT:
${document.rawText}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    console.error('Unexpected response');
    process.exit(1);
  }

  console.log('AI Response:\n', content.text);

  // Parse the response
  const jsonMatch = content.text.match(/```json\n?([\s\S]*?)\n?```/) ||
                    content.text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    console.log('No JSON found in response');
    process.exit(1);
  }

  const rules = JSON.parse(jsonMatch[1] || jsonMatch[0]);

  console.log(`\nExtracted ${rules.length} commercial rules\n`);

  // Save to database
  for (const rule of rules) {
    try {
      const created = await prisma.tariffRule.create({
        data: {
          knowledgeDocumentId: document.id,
          provider: 'city_power',
          serviceType: 'electricity',
          tariffCode: rule.tariffCode,
          customerCategory: rule.customerCategory,
          description: rule.description,
          pricingStructure: rule.pricingStructure,
          vatRate: 15,
          vatInclusive: false,
          effectiveDate: document.effectiveDate,
          expiryDate: document.expiryDate,
          financialYear: document.financialYear,
          sourceExcerpt: rule.sourceExcerpt,
          extractionMethod: 'AI_PARSED',
          extractionConfidence: rule.confidence,
          isVerified: false,
          isActive: true,
        },
      });
      console.log(`Created: ${created.tariffCode}`);
    } catch (err) {
      console.error(`Failed to create ${rule.tariffCode}:`, err);
    }
  }

  // Show all rules
  const allRules = await prisma.tariffRule.findMany({
    select: { tariffCode: true, serviceType: true, customerCategory: true }
  });
  console.log('\nAll rules in database:');
  allRules.forEach(r => console.log(`  ${r.tariffCode}: ${r.serviceType} (${r.customerCategory})`));
}

main().catch(console.error);
