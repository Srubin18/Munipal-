// Fetch the FULL 259-page CoJ tariff document with commercial rates
import { config } from 'dotenv';
config({ path: '.env.local' });

import FirecrawlApp from '@mendable/firecrawl-js';
import crypto from 'crypto';
import { prisma } from '../src/lib/db';

async function main() {
  const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY || '',
  });

  // Full 259-page tariff document with commercial rates
  const pdfUrl = 'https://www.jra.org.za/wp-content/uploads/2025/07/approved_traffis_2526.pdf';

  console.log('Fetching FULL tariff schedule (259 pages):', pdfUrl);

  try {
    const result = await firecrawl.scrapeUrl(pdfUrl, {
      formats: ['markdown'],
      timeout: 300000, // 5 minute timeout for large PDF
    });

    if (!result.success || !result.markdown) {
      console.log('Failed:', result);
      return;
    }

    console.log('Success! Content length:', result.markdown.length);
    console.log('\nPreview (first 5000 chars):\n', result.markdown.substring(0, 5000));

    // Check if document exists
    const checksum = crypto.createHash('sha256').update(result.markdown).digest('hex');

    const existing = await prisma.knowledgeDocument.findFirst({
      where: { checksum },
    });

    if (existing) {
      console.log('\nDocument already exists:', existing.id);
      return;
    }

    // Store in database
    const doc = await prisma.knowledgeDocument.create({
      data: {
        provider: 'city_power',
        documentType: 'tariff_schedule_full',
        category: 'TARIFF',
        financialYear: '2025/26',
        title: 'City of Johannesburg Full Approved Tariffs 2025/26 (259 pages)',
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
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
