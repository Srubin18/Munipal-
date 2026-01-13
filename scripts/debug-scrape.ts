// Debug Firecrawl scraping
import { config } from 'dotenv';
config({ path: '.env.local' });

import FirecrawlApp from '@mendable/firecrawl-js';

async function main() {
  const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY || '',
  });

  const urls = [
    'https://www.citypower.co.za/customers/Pages/Tariffs.aspx',
    'https://www.johannesburgwater.co.za/tariffs/',
  ];

  for (const url of urls) {
    console.log(`\n=== Scraping: ${url} ===\n`);

    try {
      const result = await firecrawl.scrapeUrl(url, {
        formats: ['markdown', 'links'],
      });

      if (!result.success) {
        console.log('Failed:', result);
        continue;
      }

      console.log('Links found:', result.links?.length || 0);
      if (result.links) {
        result.links.forEach(link => {
          if (link.toLowerCase().includes('pdf') || link.toLowerCase().includes('tariff')) {
            console.log('  -', link);
          }
        });
      }

      console.log('\nMarkdown preview (first 2000 chars):');
      console.log(result.markdown?.substring(0, 2000) || 'No markdown');
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

main();
