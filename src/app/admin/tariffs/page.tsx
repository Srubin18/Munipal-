'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Database,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TariffRule {
  id: string;
  provider: string;
  serviceType: string;
  tariffCode: string;
  customerCategory: string;
  description: string;
  pricingStructure: any;
  financialYear: string;
  sourcePageNumber: number | null;
  sourceExcerpt: string;
  sourceTableReference: string | null;
  extractionMethod: string;
  extractionConfidence: number | null;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  knowledgeDocument?: {
    id: string;
    title: string;
    provider: string;
    financialYear: string;
  };
}

interface Stats {
  total: number;
  verified: number;
  byProvider: Record<string, number>;
  byServiceType: Record<string, number>;
}

export default function TariffsPage() {
  const [rules, setRules] = useState<TariffRule[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ verified: 'all', provider: '', serviceType: '' });
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.verified === 'verified') params.append('verified', 'true');
      if (filter.verified === 'unverified') params.append('unverified', 'true');
      if (filter.provider) params.append('provider', filter.provider);
      if (filter.serviceType) params.append('serviceType', filter.serviceType);

      const res = await fetch(`/api/admin/tariffs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch tariff rules:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleVerify = async (ruleId: string) => {
    const res = await fetch(`/api/admin/tariffs/${ruleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', verifiedBy: 'admin' }),
    });

    if (res.ok) {
      fetchRules();
    }
  };

  const formatPricingStructure = (pricing: any, serviceType: string) => {
    if (!pricing) return 'No pricing data';

    try {
      if (serviceType === 'electricity' && pricing.energyCharges?.bands) {
        return (
          <div className="space-y-2">
            <div className="font-medium">Energy Charges:</div>
            {pricing.energyCharges.bands.map((band: any, i: number) => (
              <div key={i} className="ml-4 text-sm">
                {band.description}: {band.minKwh} - {band.maxKwh || '+'} kWh @{' '}
                {(band.ratePerKwh / 100).toFixed(2)} c/kWh
              </div>
            ))}
            {pricing.fixedCharges?.length > 0 && (
              <>
                <div className="font-medium mt-2">Fixed Charges:</div>
                {pricing.fixedCharges.map((charge: any, i: number) => (
                  <div key={i} className="ml-4 text-sm">
                    {charge.name}: R{(charge.amount / 100).toFixed(2)}/{charge.frequency}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      }

      if (serviceType === 'water' && pricing.consumptionCharges?.bands) {
        return (
          <div className="space-y-2">
            <div className="font-medium">Consumption Charges:</div>
            {pricing.consumptionCharges.bands.map((band: any, i: number) => (
              <div key={i} className="ml-4 text-sm">
                {band.description}: {band.minKl} - {band.maxKl || '+'} kL @{' '}
                R{(band.ratePerKl / 100).toFixed(2)}/kL
              </div>
            ))}
            {pricing.fixedCharges?.length > 0 && (
              <>
                <div className="font-medium mt-2">Fixed Charges:</div>
                {pricing.fixedCharges.map((charge: any, i: number) => (
                  <div key={i} className="ml-4 text-sm">
                    {charge.name}: R{(charge.amount / 100).toFixed(2)}/{charge.frequency}
                  </div>
                ))}
              </>
            )}
          </div>
        );
      }

      if (serviceType === 'rates' && pricing.rateInRand) {
        return (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Rate-in-Rand:</span> {pricing.rateInRand}
            </div>
            {pricing.rebates?.length > 0 && (
              <>
                <div className="font-medium">Rebates:</div>
                {pricing.rebates.map((rebate: any, i: number) => (
                  <div key={i} className="ml-4 text-sm">
                    {rebate.name}: R{rebate.amount?.toLocaleString()} ({rebate.type})
                  </div>
                ))}
              </>
            )}
            {pricing.formula && (
              <div className="text-sm text-gray-600 italic">{pricing.formula}</div>
            )}
          </div>
        );
      }

      return (
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(pricing, null, 2)}
        </pre>
      );
    } catch {
      return <pre className="text-xs">{JSON.stringify(pricing, null, 2)}</pre>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tariff Rules</h2>
        <p className="text-gray-600 mt-1">
          Manage extracted tariff rules from official documents
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Rules</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
              <div className="text-sm text-gray-500">Verified</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">
                {stats.total - stats.verified}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {stats.total > 0
                  ? Math.round((stats.verified / stats.total) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-gray-500">Verification Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filter.verified}
                onChange={(e) => setFilter({ ...filter, verified: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="all">All</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <select
                value={filter.provider}
                onChange={(e) => setFilter({ ...filter, provider: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">All Providers</option>
                <option value="city_power">City Power</option>
                <option value="joburg_water">Johannesburg Water</option>
                <option value="pikitup">Pikitup</option>
                <option value="coj">City of Johannesburg</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <select
                value={filter.serviceType}
                onChange={(e) => setFilter({ ...filter, serviceType: e.target.value })}
                className="rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">All Services</option>
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="sanitation">Sanitation</option>
                <option value="refuse">Refuse</option>
                <option value="rates">Rates</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tariff Rules ({rules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No tariff rules found</p>
              <p className="text-sm mt-2">
                Upload documents and extract tariffs to populate this list
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Rule Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Database className="h-6 w-6 text-blue-600 mt-1" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">
                              {rule.tariffCode}
                            </h3>
                            {rule.isVerified ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{rule.description}</p>
                          <div className="text-xs text-gray-400 mt-1">
                            <span className="capitalize">{rule.provider.replace('_', ' ')}</span>
                            {' | '}
                            {rule.serviceType}
                            {' | '}
                            {rule.customerCategory}
                            {' | '}
                            {rule.financialYear}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rule.extractionConfidence && (
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              rule.extractionConfidence >= 80
                                ? 'bg-green-100 text-green-700'
                                : rule.extractionConfidence >= 60
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {rule.extractionConfidence}% confidence
                          </span>
                        )}
                        {expandedRule === rule.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRule === rule.id && (
                    <div className="px-4 pb-4 pt-0 border-t bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Pricing Structure */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Pricing Structure
                          </h4>
                          <div className="bg-white p-3 rounded border">
                            {formatPricingStructure(rule.pricingStructure, rule.serviceType)}
                          </div>
                        </div>

                        {/* Source Citation */}
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">
                            Source Citation
                          </h4>
                          <div className="bg-white p-3 rounded border space-y-2">
                            {rule.knowledgeDocument && (
                              <div className="text-sm">
                                <span className="font-medium">Document:</span>{' '}
                                {rule.knowledgeDocument.title}
                              </div>
                            )}
                            {rule.sourcePageNumber && (
                              <div className="text-sm">
                                <span className="font-medium">Page:</span>{' '}
                                {rule.sourcePageNumber}
                              </div>
                            )}
                            {rule.sourceTableReference && (
                              <div className="text-sm">
                                <span className="font-medium">Reference:</span>{' '}
                                {rule.sourceTableReference}
                              </div>
                            )}
                            <div className="mt-2">
                              <span className="font-medium text-sm">Excerpt:</span>
                              <blockquote className="mt-1 text-sm text-gray-600 italic border-l-2 border-gray-300 pl-2">
                                &ldquo;{rule.sourceExcerpt}&rdquo;
                              </blockquote>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex gap-2">
                            {!rule.isVerified && (
                              <Button
                                size="sm"
                                onClick={() => handleVerify(rule.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Verify Rule
                              </Button>
                            )}
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
