// Fetch PDF using Firecrawl
import { config } from 'dotenv';
config({ path: '.env.local' });

import FirecrawlApp from '@mendable/firecrawl-js';
import { writeFileSync, readFileSync } from 'fs';
import crypto from 'crypto';
import pdf from 'pdf-parse';
import { prisma } from '../src/lib/db';

async function main() {
  const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY || '',
  });

  const pdfUrl = 'https://joburg.org.za/documents_/Documents/Amendment%20of%20Tariff%20Charges/Consolidated-Tariffs-FY20252026.FINAL.pdf';

  console.log('Fetching PDF via Firecrawl:', pdfUrl);

  try {
    // Try scraping the PDF URL directly
    const result = await firecrawl.scrapeUrl(pdfUrl, {
      formats: ['markdown'],
      timeout: 120000, // 2 minute timeout
    });

    if (!result.success) {
      console.log('Firecrawl scrape failed:', result);

      // Alternative: try fetching from a different source
      console.log('\nTrying alternative approach - fetching 2024/25 tariffs...');
      const altUrl = 'https://joburg.org.za/documents_/Documents/Consolidated%20Tariffs%2020242025.pdf';

      const altResult = await firecrawl.scrapeUrl(altUrl, {
        formats: ['markdown'],
        timeout: 120000,
      });

      if (altResult.success && altResult.markdown) {
        console.log('Got 2024/25 tariffs!');
        console.log('Content preview:', altResult.markdown.substring(0, 2000));

        // Store in database
        const checksum = crypto.createHash('sha256').update(altResult.markdown).digest('hex');

        const doc = await prisma.knowledgeDocument.create({
          data: {
            provider: 'city_power',
            documentType: 'tariff_schedule',
            category: 'TARIFF',
            financialYear: '2024/25',
            title: 'City of Johannesburg Consolidated Tariffs 2024/25',
            sourceUrl: altUrl,
            checksum,
            rawText: altResult.markdown,
            effectiveDate: new Date('2024-07-01'),
            expiryDate: new Date('2025-06-30'),
            ingestionMethod: 'FIRECRAWL',
            isVerified: false,
          },
        });

        console.log('\nDocument stored:', doc.id);
      }
      return;
    }

    console.log('Success!');
    console.log('Content length:', result.markdown?.length);
    console.log('Content preview:', result.markdown?.substring(0, 2000));

    if (result.markdown) {
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(result.markdown).digest('hex');

      // Store in database
      const doc = await prisma.knowledgeDocument.create({
        data: {
          provider: 'city_power',
          documentType: 'tariff_schedule',
          category: 'TARIFF',
          financialYear: '2025/26',
          title: 'City of Johannesburg Consolidated Tariffs 2025/26',
          sourceUrl: pdfUrl,
          checksum,
          rawText: result.markdown,
          effectiveDate: new Date('2025-07-01'),
          expiryDate: new Date('2026-06-30'),
          ingestionMethod: 'FIRECRAWL',
          isVerified: false,
        },
      });

      console.log('\nDocument stored:', doc.id);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
