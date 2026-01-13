// syncOfficialTariffs - Automatic ingestion of official CoJ documents
// This is the primary ingestion path, NOT manual PDF upload

import { prisma } from '@/lib/db';
import { getOfficialSources, getCurrentFinancialYear, OfficialSource } from './official-sources';
import { fetchOfficialDocument, FetchResult } from './document-fetcher';
import { extractTariffRulesFromDocument } from './tariff-extraction';

export interface SyncResult {
  syncId: string;
  financialYear: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  providersAttempted: number;
  providersSucceeded: number;
  providersFailed: number;
  documentsIngested: number;
  rulesExtracted: number;
  errors: Array<{ provider: string; error: string }>;
  startedAt: Date;
  completedAt: Date;
}

// Main sync function
export async function syncOfficialTariffs(
  financialYear?: string,
  triggeredBy: string = 'system'
): Promise<SyncResult> {
  const targetYear = financialYear || getCurrentFinancialYear();
  const sources = getOfficialSources(targetYear);
  const startedAt = new Date();
  const errors: Array<{ provider: string; error: string }> = [];

  console.log(`[SyncOfficialTariffs] Starting sync for ${targetYear}, ${sources.length} providers`);

  // Create sync record
  const sync = await prisma.ingestionSync.create({
    data: {
      financialYear: targetYear,
      status: 'IN_PROGRESS',
      startedAt,
      triggeredBy,
      providersAttempted: sources.length,
    },
  });

  let providersSucceeded = 0;
  let providersFailed = 0;
  let totalDocumentsIngested = 0;
  let totalRulesExtracted = 0;

  for (const source of sources) {
    console.log(`[SyncOfficialTariffs] Processing ${source.providerLabel}...`);

    // Create attempt record
    const attempt = await prisma.ingestionAttempt.create({
      data: {
        syncId: sync.id,
        provider: source.provider,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        sourceUrl: source.primaryUrl,
      },
    });

    try {
      // Fetch the document
      const fetchResult = await fetchOfficialDocument(source);

      if (!fetchResult.success || !fetchResult.pdfBuffer) {
        throw new Error(fetchResult.error || 'Failed to fetch document');
      }

      // Check for duplicates
      const existingDoc = await prisma.knowledgeDocument.findFirst({
        where: {
          checksum: fetchResult.checksum,
          isActive: true,
        },
      });

      if (existingDoc) {
        console.log(`[SyncOfficialTariffs] Document already exists: ${existingDoc.id}`);
        await prisma.ingestionAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'SUCCESS',
            completedAt: new Date(),
            documentId: existingDoc.id,
            checksum: fetchResult.checksum,
            pageCount: fetchResult.pageCount,
          },
        });
        providersSucceeded++;
        continue;
      }

      // Create knowledge document
      const document = await prisma.knowledgeDocument.create({
        data: {
          provider: source.provider,
          documentType: source.documentType,
          category: source.category,
          financialYear: source.financialYear,
          title: source.expectedTitle,
          sourceUrl: fetchResult.pdfUrl,
          sourceFileName: `${source.provider}_${source.financialYear.replace('/', '-')}.pdf`,
          checksum: fetchResult.checksum!,
          rawText: fetchResult.extractedText,
          rawPdfBase64: fetchResult.pdfBuffer.toString('base64'),
          pageCount: fetchResult.pageCount,
          effectiveDate: new Date(source.effectiveDate),
          expiryDate: new Date(source.expiryDate),
          ingestionMethod: 'FIRECRAWL',
          isVerified: false,
        },
      });

      console.log(`[SyncOfficialTariffs] Created document: ${document.id}`);
      totalDocumentsIngested++;

      // Extract tariff rules
      let rulesExtracted = 0;
      try {
        const extractionResult = await extractTariffRulesFromDocument(document.id);
        rulesExtracted = extractionResult.rulesExtracted;
        totalRulesExtracted += rulesExtracted;
        console.log(`[SyncOfficialTariffs] Extracted ${rulesExtracted} rules`);
      } catch (extractError) {
        console.error(`[SyncOfficialTariffs] Rule extraction failed:`, extractError);
        // Continue - document is still ingested
      }

      // Update attempt as success
      await prisma.ingestionAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          documentId: document.id,
          pdfUrl: fetchResult.pdfUrl,
          checksum: fetchResult.checksum,
          pageCount: fetchResult.pageCount,
          rulesExtracted,
        },
      });

      // Resolve any missing tariff alerts for this provider
      await prisma.missingTariffAlert.updateMany({
        where: {
          provider: source.provider,
          financialYear: source.financialYear,
          status: { not: 'resolved' },
        },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: 'auto_sync',
        },
      });

      providersSucceeded++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SyncOfficialTariffs] Failed for ${source.provider}:`, errorMessage);

      // Update attempt as failed
      await prisma.ingestionAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage,
        },
      });

      // Create/update missing tariff alert
      await prisma.missingTariffAlert.upsert({
        where: {
          provider_serviceType_financialYear: {
            provider: source.provider,
            serviceType: source.serviceTypes[0],
            financialYear: source.financialYear,
          },
        },
        create: {
          provider: source.provider,
          serviceType: source.serviceTypes[0],
          financialYear: source.financialYear,
          priority: 'high',
          status: 'open',
          suggestedUrls: [source.primaryUrl, ...source.fallbackUrls],
          lastAttemptedAt: new Date(),
          lastAttemptError: errorMessage,
        },
        update: {
          lastAttemptedAt: new Date(),
          lastAttemptError: errorMessage,
          status: 'open',
        },
      });

      errors.push({ provider: source.provider, error: errorMessage });
      providersFailed++;
    }
  }

  const completedAt = new Date();
  const overallStatus =
    providersFailed === 0
      ? 'SUCCESS'
      : providersSucceeded === 0
      ? 'FAILED'
      : 'PARTIAL';

  // Update sync record
  await prisma.ingestionSync.update({
    where: { id: sync.id },
    data: {
      status: overallStatus,
      completedAt,
      providersSucceeded,
      providersFailed,
      documentsIngested: totalDocumentsIngested,
      rulesExtracted: totalRulesExtracted,
    },
  });

  console.log(
    `[SyncOfficialTariffs] Completed: ${providersSucceeded}/${sources.length} providers, ${totalDocumentsIngested} docs, ${totalRulesExtracted} rules`
  );

  return {
    syncId: sync.id,
    financialYear: targetYear,
    status: overallStatus,
    providersAttempted: sources.length,
    providersSucceeded,
    providersFailed,
    documentsIngested: totalDocumentsIngested,
    rulesExtracted: totalRulesExtracted,
    errors,
    startedAt,
    completedAt,
  };
}

// Sync a single provider
export async function syncProvider(
  provider: string,
  financialYear?: string,
  triggeredBy: string = 'admin'
): Promise<{ success: boolean; documentId?: string; rulesExtracted?: number; error?: string }> {
  const targetYear = financialYear || getCurrentFinancialYear();
  const sources = getOfficialSources(targetYear);
  const source = sources.find((s) => s.provider === provider);

  if (!source) {
    return { success: false, error: `Unknown provider: ${provider}` };
  }

  console.log(`[SyncProvider] Syncing ${source.providerLabel} for ${targetYear}`);

  try {
    const fetchResult = await fetchOfficialDocument(source);

    if (!fetchResult.success || !fetchResult.pdfBuffer) {
      return { success: false, error: fetchResult.error || 'Failed to fetch document' };
    }

    // Check for duplicates
    const existingDoc = await prisma.knowledgeDocument.findFirst({
      where: {
        checksum: fetchResult.checksum,
        isActive: true,
      },
    });

    if (existingDoc) {
      return { success: true, documentId: existingDoc.id, rulesExtracted: 0 };
    }

    // Create knowledge document
    const document = await prisma.knowledgeDocument.create({
      data: {
        provider: source.provider,
        documentType: source.documentType,
        category: source.category,
        financialYear: source.financialYear,
        title: source.expectedTitle,
        sourceUrl: fetchResult.pdfUrl,
        sourceFileName: `${source.provider}_${source.financialYear.replace('/', '-')}.pdf`,
        checksum: fetchResult.checksum!,
        rawText: fetchResult.extractedText,
        rawPdfBase64: fetchResult.pdfBuffer.toString('base64'),
        pageCount: fetchResult.pageCount,
        effectiveDate: new Date(source.effectiveDate),
        expiryDate: new Date(source.expiryDate),
        ingestionMethod: 'FIRECRAWL',
        isVerified: false,
      },
    });

    // Extract tariff rules
    let rulesExtracted = 0;
    try {
      const extractionResult = await extractTariffRulesFromDocument(document.id);
      rulesExtracted = extractionResult.rulesExtracted;
    } catch (extractError) {
      console.error(`[SyncProvider] Rule extraction failed:`, extractError);
    }

    return { success: true, documentId: document.id, rulesExtracted };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// Get latest sync status
export async function getLatestSyncStatus(financialYear?: string) {
  const targetYear = financialYear || getCurrentFinancialYear();

  const latestSync = await prisma.ingestionSync.findFirst({
    where: { financialYear: targetYear },
    orderBy: { createdAt: 'desc' },
    include: {
      attempts: true,
    },
  });

  if (!latestSync) {
    return { hasSync: false, financialYear: targetYear };
  }

  return {
    hasSync: true,
    financialYear: targetYear,
    syncId: latestSync.id,
    status: latestSync.status,
    startedAt: latestSync.startedAt,
    completedAt: latestSync.completedAt,
    providersAttempted: latestSync.providersAttempted,
    providersSucceeded: latestSync.providersSucceeded,
    providersFailed: latestSync.providersFailed,
    documentsIngested: latestSync.documentsIngested,
    rulesExtracted: latestSync.rulesExtracted,
    attempts: latestSync.attempts.map((a) => ({
      provider: a.provider,
      status: a.status,
      documentId: a.documentId,
      rulesExtracted: a.rulesExtracted,
      error: a.errorMessage,
    })),
  };
}

// Check if tariffs are available (for verification engine)
export async function areTariffsAvailable(financialYear?: string): Promise<boolean> {
  const targetYear = financialYear || getCurrentFinancialYear();

  const count = await prisma.tariffRule.count({
    where: {
      financialYear: targetYear,
      isActive: true,
    },
  });

  return count > 0;
}
