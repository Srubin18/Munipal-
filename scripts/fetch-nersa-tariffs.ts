// Fetch NERSA commercial electricity tariffs
import { config } from 'dotenv';
config({ path: '.env.local' });

import FirecrawlApp from '@mendable/firecrawl-js';
import crypto from 'crypto';
import { prisma } from '../src/lib/db';

async function main() {
  const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY || '',
  });

  // NERSA approved City Power tariffs
  const pdfUrl = 'https://www.nersa.org.za/file/7596';

  console.log('Fetching NERSA City Power tariffs:', pdfUrl);

  try {
    const result = await firecrawl.scrapeUrl(pdfUrl, {
      formats: ['markdown'],
      timeout: 180000, // 3 minute timeout
    });

    if (!result.success || !result.markdown) {
      console.log('Failed:', result);
      return;
    }

    console.log('Success! Content length:', result.markdown.length);
    console.log('\nFull content:\n', result.markdown);

    // Check for commercial tariff keywords
    const hasCommercial = result.markdown.toLowerCase().includes('commercial') ||
                          result.markdown.toLowerCase().includes('business');
    console.log('\nContains commercial tariffs:', hasCommercial);

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
        documentType: 'tariff_schedule_nersa',
        category: 'TARIFF',
        financialYear: '2025/26',
        title: 'City Power NERSA Approved Electricity Tariffs 2025/26',
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
