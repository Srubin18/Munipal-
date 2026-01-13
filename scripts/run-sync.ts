// Run official tariff sync
import { config } from 'dotenv';
config({ path: '.env.local' });

import { syncOfficialTariffs } from '../src/lib/knowledge/sync-official-tariffs';

async function main() {
  console.log('Starting official tariff sync...');
  console.log('Firecrawl API Key:', process.env.FIRECRAWL_API_KEY ? 'Present' : 'Missing');

  try {
    const result = await syncOfficialTariffs('2025/26', 'script');

    console.log('\n=== SYNC COMPLETE ===');
    console.log('Status:', result.status);
    console.log('Financial Year:', result.financialYear);
    console.log('Providers Attempted:', result.providersAttempted);
    console.log('Providers Succeeded:', result.providersSucceeded);
    console.log('Providers Failed:', result.providersFailed);
    console.log('Documents Ingested:', result.documentsIngested);
    console.log('Rules Extracted:', result.rulesExtracted);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(e => console.log(`  - ${e.provider}: ${e.error}`));
    }
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
}

main();
