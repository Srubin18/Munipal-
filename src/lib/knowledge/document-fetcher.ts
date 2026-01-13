// Firecrawl-based document fetcher for official CoJ sources
// PDF-first approach: try direct download, fallback to page scraping

import crypto from 'crypto';
import { OfficialSource } from './official-sources';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT_MS = 30000; // 30s

export interface FetchResult {
  success: boolean;
  pdfBuffer?: Buffer;
  pdfUrl?: string;
  checksum?: string;
  pageCount?: number;
  extractedText?: string;
  error?: string;
  source: 'direct_pdf' | 'firecrawl_extracted' | 'failed';
  fetchedAt: Date;
}

// Dynamic import for Firecrawl to avoid build issues
let firecrawlClient: any = null;
async function getFirecrawl() {
  if (!firecrawlClient) {
    const FirecrawlModule = await import('@mendable/firecrawl-js');
    const FirecrawlApp = FirecrawlModule.default;
    firecrawlClient = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY || '',
    });
  }
  return firecrawlClient;
}

// Check if URL points directly to a PDF
function isPdfUrl(url: string): boolean {
  const lowered = url.toLowerCase();
  return lowered.endsWith('.pdf') || lowered.includes('.pdf?') || lowered.includes('/pdf/');
}

// Fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// Try to download PDF directly
async function tryDirectPdfDownload(url: string): Promise<FetchResult> {
  try {
    console.log(`[DocumentFetcher] Attempting direct PDF download: ${url}`);

    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'MUNIPAL/1.0 (Municipal Bill Verification Service)',
        Accept: 'application/pdf,*/*',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        source: 'failed',
        fetchedAt: new Date(),
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    // Check if it's actually a PDF
    if (!contentType.includes('pdf') && !isPdfUrl(url)) {
      return {
        success: false,
        error: `Not a PDF: content-type is ${contentType}`,
        source: 'failed',
        fetchedAt: new Date(),
      };
    }

    // Check size limit
    if (contentLength > MAX_SIZE_BYTES) {
      return {
        success: false,
        error: `PDF too large: ${(contentLength / 1024 / 1024).toFixed(1)}MB exceeds 10MB limit`,
        source: 'failed',
        fetchedAt: new Date(),
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Verify it's actually a PDF by checking magic bytes
    if (pdfBuffer.length < 5 || pdfBuffer.toString('utf8', 0, 5) !== '%PDF-') {
      return {
        success: false,
        error: 'Downloaded file is not a valid PDF',
        source: 'failed',
        fetchedAt: new Date(),
      };
    }

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Extract text using pdf-parse
    let extractedText = '';
    let pageCount = 0;
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(pdfBuffer);
      extractedText = pdfData.text;
      pageCount = pdfData.numpages;
    } catch (parseError) {
      console.warn(`[DocumentFetcher] PDF parse warning: ${parseError}`);
      // Continue even if text extraction fails
    }

    console.log(`[DocumentFetcher] Successfully downloaded PDF: ${pageCount} pages, ${(pdfBuffer.length / 1024).toFixed(1)}KB`);

    return {
      success: true,
      pdfBuffer,
      pdfUrl: url,
      checksum,
      pageCount,
      extractedText,
      source: 'direct_pdf',
      fetchedAt: new Date(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[DocumentFetcher] Direct download failed: ${message}`);
    return {
      success: false,
      error: message,
      source: 'failed',
      fetchedAt: new Date(),
    };
  }
}

// Extract PDF links from HTML page using Firecrawl
async function extractPdfLinksFromPage(url: string): Promise<string[]> {
  try {
    console.log(`[DocumentFetcher] Scraping page for PDF links: ${url}`);

    const firecrawl = await getFirecrawl();
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['links', 'markdown'],
    });

    if (!result.success) {
      console.warn(`[DocumentFetcher] Firecrawl scrape failed: ${result.error}`);
      return [];
    }

    // Extract PDF links
    const pdfLinks: string[] = [];
    const links = result.links || [];

    for (const link of links) {
      if (isPdfUrl(link)) {
        // Make absolute URL if relative
        try {
          const absoluteUrl = new URL(link, url).href;
          pdfLinks.push(absoluteUrl);
        } catch {
          // Invalid URL, skip
        }
      }
    }

    // Also search markdown content for PDF URLs
    const markdown = result.markdown || '';
    const urlRegex = /https?:\/\/[^\s\)\"\']+\.pdf[^\s\)\"\']*?/gi;
    const matches = markdown.match(urlRegex) || [];
    for (const match of matches) {
      if (!pdfLinks.includes(match)) {
        pdfLinks.push(match);
      }
    }

    console.log(`[DocumentFetcher] Found ${pdfLinks.length} PDF links on page`);
    return pdfLinks;
  } catch (error) {
    console.error(`[DocumentFetcher] Page scrape error: ${error}`);
    return [];
  }
}

// Score PDF URL relevance based on financial year and keywords
function scorePdfRelevance(url: string, source: OfficialSource): number {
  const lowered = url.toLowerCase();
  let score = 0;

  // Financial year in URL
  const yearPatterns = [
    source.financialYear.replace('/', '-'),
    source.financialYear.replace('/', '_'),
    source.financialYear,
    source.financialYear.split('/')[0],
  ];
  for (const pattern of yearPatterns) {
    if (lowered.includes(pattern.toLowerCase())) {
      score += 50;
      break;
    }
  }

  // Service type keywords
  for (const serviceType of source.serviceTypes) {
    if (lowered.includes(serviceType)) {
      score += 20;
    }
  }

  // Tariff-related keywords
  const tariffKeywords = ['tariff', 'rate', 'schedule', 'charge', 'price'];
  for (const keyword of tariffKeywords) {
    if (lowered.includes(keyword)) {
      score += 10;
    }
  }

  // Penalty for obviously wrong documents
  const negativeKeywords = ['annual-report', 'newsletter', 'tender', 'vacancy', 'careers'];
  for (const keyword of negativeKeywords) {
    if (lowered.includes(keyword)) {
      score -= 30;
    }
  }

  return score;
}

// Main fetch function for an official source
export async function fetchOfficialDocument(source: OfficialSource): Promise<FetchResult> {
  console.log(`[DocumentFetcher] Fetching ${source.providerLabel} ${source.financialYear}`);

  const allUrls = [source.primaryUrl, ...source.fallbackUrls];
  const pdfCandidates: { url: string; score: number }[] = [];

  for (const url of allUrls) {
    // If URL is directly a PDF, try to download it
    if (isPdfUrl(url)) {
      const result = await tryDirectPdfDownload(url);
      if (result.success) {
        return result;
      }
      console.log(`[DocumentFetcher] Direct PDF download failed for ${url}, trying next...`);
      continue;
    }

    // Otherwise, scrape the page for PDF links
    const pdfLinks = await extractPdfLinksFromPage(url);

    for (const pdfLink of pdfLinks) {
      const score = scorePdfRelevance(pdfLink, source);
      pdfCandidates.push({ url: pdfLink, score });
    }
  }

  // Sort candidates by relevance score
  pdfCandidates.sort((a, b) => b.score - a.score);

  // Try top candidates
  for (const candidate of pdfCandidates.slice(0, 5)) {
    console.log(`[DocumentFetcher] Trying PDF candidate (score ${candidate.score}): ${candidate.url}`);
    const result = await tryDirectPdfDownload(candidate.url);
    if (result.success) {
      return result;
    }
  }

  // All attempts failed
  return {
    success: false,
    error: `Failed to fetch document from ${allUrls.length} URLs and ${pdfCandidates.length} PDF candidates`,
    source: 'failed',
    fetchedAt: new Date(),
  };
}

// Fetch multiple sources in sequence (not parallel to be respectful)
export async function fetchAllOfficialDocuments(
  sources: OfficialSource[]
): Promise<Map<string, FetchResult>> {
  const results = new Map<string, FetchResult>();

  for (const source of sources) {
    const result = await fetchOfficialDocument(source);
    results.set(source.provider, result);

    // Small delay between requests to be respectful
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
