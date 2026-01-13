// API endpoint for triggering and monitoring official tariff sync
import { NextRequest, NextResponse } from 'next/server';
import {
  syncOfficialTariffs,
  syncProvider,
  getLatestSyncStatus,
  areTariffsAvailable,
} from '@/lib/knowledge/sync-official-tariffs';
import { getCurrentFinancialYear } from '@/lib/knowledge/official-sources';

// GET /api/admin/sync - Get sync status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const financialYear = searchParams.get('financialYear') || getCurrentFinancialYear();

    const status = await getLatestSyncStatus(financialYear);
    const tariffsAvailable = await areTariffsAvailable(financialYear);

    return NextResponse.json({
      ...status,
      tariffsAvailable,
    });
  } catch (error) {
    console.error('[API] Sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

// POST /api/admin/sync - Trigger sync
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { financialYear, provider, triggeredBy = 'api' } = body;
    const targetYear = financialYear || getCurrentFinancialYear();

    // If specific provider, sync just that one
    if (provider) {
      console.log(`[API] Syncing provider: ${provider} for ${targetYear}`);
      const result = await syncProvider(provider, targetYear, triggeredBy);

      return NextResponse.json({
        success: result.success,
        provider,
        financialYear: targetYear,
        documentId: result.documentId,
        rulesExtracted: result.rulesExtracted,
        error: result.error,
      });
    }

    // Otherwise sync all providers
    console.log(`[API] Syncing all providers for ${targetYear}`);
    const result = await syncOfficialTariffs(targetYear, triggeredBy);

    return NextResponse.json({
      success: result.status !== 'FAILED',
      syncId: result.syncId,
      financialYear: result.financialYear,
      status: result.status,
      providersAttempted: result.providersAttempted,
      providersSucceeded: result.providersSucceeded,
      providersFailed: result.providersFailed,
      documentsIngested: result.documentsIngested,
      rulesExtracted: result.rulesExtracted,
      errors: result.errors,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    });
  } catch (error) {
    console.error('[API] Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
