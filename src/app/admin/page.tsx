'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Database, AlertTriangle, CheckCircle, RefreshCw, Cloud, CloudOff } from 'lucide-react';

interface Stats {
  totalDocuments: number;
  verifiedDocuments: number;
  activeTariffRules: number;
  documentsByProvider: Record<string, number>;
}

interface Alert {
  id: string;
  provider: string;
  serviceType: string;
  financialYear: string;
  affectedAnalysisCount: number;
  priority: string;
}

interface SyncStatus {
  hasSync: boolean;
  financialYear: string;
  status?: string;
  providersAttempted?: number;
  providersSucceeded?: number;
  providersFailed?: number;
  documentsIngested?: number;
  rulesExtracted?: number;
  tariffsAvailable?: boolean;
  completedAt?: string;
  attempts?: Array<{
    provider: string;
    status: string;
    documentId?: string;
    rulesExtracted?: number;
    error?: string;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function fetchData() {
    try {
      const [docsRes, alertsRes, syncRes] = await Promise.all([
        fetch('/api/admin/documents?stats=true'),
        fetch('/api/admin/alerts?status=open'),
        fetch('/api/admin/sync'),
      ]);

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setStats(docsData.stats);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }

      if (syncRes.ok) {
        const syncData = await syncRes.json();
        setSyncStatus(syncData);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: 'admin' }),
      });

      if (res.ok) {
        // Refresh data after sync
        await fetchData();
      } else {
        const data = await res.json();
        alert(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      alert(`Sync error: ${error}`);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">
          Overview of the MUNIPAL knowledge base
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>
            <p className="text-xs text-gray-500">
              {stats?.verifiedDocuments || 0} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tariff Rules
            </CardTitle>
            <Database className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTariffRules || 0}</div>
            <p className="text-xs text-gray-500">Active rules</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open Alerts
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{alerts.length}</div>
            <p className="text-xs text-gray-500">Missing tariffs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Verification Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.totalDocuments
                ? Math.round((stats.verifiedDocuments / stats.totalDocuments) * 100)
                : 0}%
            </div>
            <p className="text-xs text-gray-500">Documents verified</p>
          </CardContent>
        </Card>
      </div>

      {/* Ingestion Sync Status */}
      <Card className={syncStatus?.tariffsAvailable ? 'border-green-200' : 'border-amber-200'}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {syncStatus?.tariffsAvailable ? (
                <Cloud className="h-5 w-5 text-green-600" />
              ) : (
                <CloudOff className="h-5 w-5 text-amber-600" />
              )}
              Official Tariff Ingestion
            </div>
            <Button
              onClick={handleSync}
              disabled={syncing}
              size="sm"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncStatus?.tariffsAvailable ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Tariffs available for {syncStatus.financialYear}</span>
              </div>
              {syncStatus.hasSync && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Providers</div>
                    <div className="font-medium">
                      {syncStatus.providersSucceeded}/{syncStatus.providersAttempted}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Documents</div>
                    <div className="font-medium">{syncStatus.documentsIngested}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Rules</div>
                    <div className="font-medium">{syncStatus.rulesExtracted}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Last Sync</div>
                    <div className="font-medium">
                      {syncStatus.completedAt
                        ? new Date(syncStatus.completedAt).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                </div>
              )}
              {syncStatus.attempts && syncStatus.attempts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-gray-700">Provider Status:</div>
                  {syncStatus.attempts.map((attempt) => (
                    <div
                      key={attempt.provider}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        attempt.status === 'SUCCESS'
                          ? 'bg-green-50 text-green-700'
                          : attempt.status === 'FAILED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="capitalize">{attempt.provider.replace('_', ' ')}</span>
                      <span>
                        {attempt.status === 'SUCCESS'
                          ? `${attempt.rulesExtracted} rules`
                          : attempt.error || attempt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">No tariffs ingested for {syncStatus?.financialYear || 'current year'}</span>
              </div>
              <p className="text-sm text-gray-600">
                Click &quot;Sync Now&quot; to automatically fetch official CoJ tariff documents from City Power, Johannesburg Water, Pikitup, and CoJ websites.
              </p>
              <p className="text-sm text-amber-600">
                Until tariffs are synced, bill verification will show &quot;Cannot verify&quot; for all charges.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Documents by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.documentsByProvider && Object.keys(stats.documentsByProvider).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.documentsByProvider).map(([provider, count]) => (
                <div key={provider} className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-600 capitalize">
                    {provider.replace('_', ' ')}
                  </div>
                  <div className="text-xl font-bold">{count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No documents uploaded yet</p>
              <Link
                href="/admin/documents"
                className="mt-4 inline-block text-blue-600 hover:underline"
              >
                Upload your first document
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Missing Tariffs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium capitalize">
                      {alert.provider.replace('_', ' ')}
                    </span>
                    {' - '}
                    <span className="text-gray-600">{alert.serviceType}</span>
                    {' '}
                    <span className="text-gray-400">({alert.financialYear})</span>
                  </div>
                  <div className="text-sm text-amber-600">
                    {alert.affectedAnalysisCount} affected
                  </div>
                </div>
              ))}
            </div>
            {alerts.length > 5 && (
              <Link
                href="/admin/alerts"
                className="mt-4 inline-block text-blue-600 hover:underline text-sm"
              >
                View all {alerts.length} alerts
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/documents"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-medium">Upload Document</h3>
              <p className="text-sm text-gray-500">Add a new tariff schedule or policy</p>
            </Link>
            <Link
              href="/admin/tariffs"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Database className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium">Review Tariffs</h3>
              <p className="text-sm text-gray-500">Verify extracted tariff rules</p>
            </Link>
            <Link
              href="/test"
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CheckCircle className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-medium">Test Analysis</h3>
              <p className="text-sm text-gray-500">Test bill verification</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
