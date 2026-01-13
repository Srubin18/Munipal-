// Extract tariff rules from ingested document
import { config } from 'dotenv';
config({ path: '.env.local' });

import { prisma } from '../src/lib/db';
import { extractTariffRulesFromDocument } from '../src/lib/knowledge/tariff-extraction';

async function main() {
  // Find the most recent 2025/26 document
  const document = await prisma.knowledgeDocument.findFirst({
    where: {
      financialYear: '2025/26',
      provider: 'city_power',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!document) {
    console.error('No 2025/26 document found. Run fetch-pdf-firecrawl.ts first.');
    process.exit(1);
  }

  console.log('Found document:', document.id);
  console.log('Title:', document.title);
  console.log('Source:', document.sourceUrl);
  console.log('Raw text length:', document.rawText?.length || 0);
  console.log('\nExtracting tariff rules using Claude AI...\n');

  const result = await extractTariffRulesFromDocument(document.id);

  console.log('\n=== EXTRACTION COMPLETE ===');
  console.log('Success:', result.success);
  console.log('Rules extracted:', result.rulesExtracted);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(e => console.log(`  - ${e}`));
  }

  // Show extracted rules
  const rules = await prisma.tariffRule.findMany({
    where: { knowledgeDocumentId: document.id },
    orderBy: { tariffCode: 'asc' },
  });

  console.log('\n=== EXTRACTED RULES ===\n');
  for (const rule of rules) {
    console.log(`[${rule.tariffCode}] ${rule.description}`);
    console.log(`  Category: ${rule.customerCategory}`);
    console.log(`  Service: ${rule.serviceType}`);
    console.log(`  Source: "${rule.sourceExcerpt}"`);
    console.log(`  Confidence: ${rule.extractionConfidence}%`);
    console.log(`  Pricing:`, JSON.stringify(rule.pricingStructure, null, 2));
    console.log('');
  }
}

main().catch(console.error);
