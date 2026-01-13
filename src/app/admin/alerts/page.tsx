'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

interface Alert {
  id: string;
  provider: string;
  serviceType: string;
  financialYear: string;
  affectedAnalysisCount: number;
  suggestedUrls: string[] | null;
  priority: string;
  status: string;
  createdAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`/api/admin/alerts${params}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleResolve = async (alertId: string) => {
    const res = await fetch('/api/admin/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, status: 'resolved', resolvedBy: 'admin' }),
    });

    if (res.ok) {
      fetchAlerts();
    }
  };

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-amber-100 text-amber-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Missing Tariff Alerts</h2>
        <p className="text-gray-600 mt-1">
          Alerts for missing tariff rules that affect bill verification
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['open', 'in_progress', 'resolved', 'all'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
              <p>No {filter !== 'all' ? filter : ''} alerts</p>
              <p className="text-sm mt-2">
                All tariffs appear to be available
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${
                    alert.status === 'resolved' ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 capitalize">
                          {alert.provider.replace('_', ' ')} - {alert.serviceType}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            priorityColors[alert.priority] || priorityColors.medium
                          }`}
                        >
                          {alert.priority}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            alert.status === 'open'
                              ? 'bg-red-100 text-red-800'
                              : alert.status === 'resolved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Financial Year: {alert.financialYear}
                      </p>
                      <p className="text-sm text-amber-600 mt-1">
                        {alert.affectedAnalysisCount} analyses affected
                      </p>

                      {/* Suggested URLs */}
                      {alert.suggestedUrls && alert.suggestedUrls.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500">
                            Suggested sources:
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {alert.suggestedUrls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {new URL(url).hostname}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {alert.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(alert.id)}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card>
        <CardContent className="pt-4">
          <h3 className="font-medium text-gray-900">How to resolve alerts</h3>
          <ol className="mt-2 text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Download the official tariff document from the suggested URL</li>
            <li>Go to Documents and upload the PDF</li>
            <li>Click "Extract Tariffs" to parse the rules</li>
            <li>Review and verify the extracted rules in Tariff Rules</li>
            <li>The alert will automatically resolve when tariffs are available</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
