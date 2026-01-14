'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, HelpCircle, BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [propertyValue, setPropertyValue] = useState<string>('');
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setFile(file);
      setError('');
      setResult(null);
    } else {
      setError('Please upload a PDF file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleAnalyze = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (propertyValue) {
        formData.append('propertyValue', propertyValue.replace(/[^\d]/g, ''));
      }

      const res = await fetch('/api/test/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatRands = (rands: number) => {
    return `R${rands.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MUNIPAL Test Mode</h1>
            <p className="text-gray-600">Upload a CoJ bill to test analysis (no login required)</p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Admin Panel
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Bill</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
            )}

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : file
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-4 font-medium">Drop your CoJ statement here</p>
                  <p className="text-sm text-gray-500 mt-1">or click to browse (PDF only)</p>
                </>
              )}
            </div>

            {file && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property Valuation (optional - from CoJ GVR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                    <input
                      type="text"
                      value={propertyValue}
                      onChange={(e) => setPropertyValue(e.target.value)}
                      placeholder="e.g. 1,500,000"
                      className="w-full pl-8 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your property market value to verify rates calculation
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleAnalyze} disabled={uploading} className="flex-1">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Analyze Bill'
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => { setFile(null); setResult(null); setPropertyValue(''); }}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {result && result.success && (
          <>
            {/* Account Summary Card */}
            <Card className="border-2 border-primary">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Bill Parsed Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Account & Property Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Account:</span>{' '}
                    <span className="font-medium">{result.parsedBill.accountNumber || 'Not found'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Due Date:</span>{' '}
                    <span className="font-medium">{result.parsedBill.dueDate ? new Date(result.parsedBill.dueDate).toLocaleDateString() : 'Not found'}</span>
                  </div>
                  {result.parsedBill.propertyInfo?.address && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Property:</span>{' '}
                      <span className="font-medium">{result.parsedBill.propertyInfo.address}</span>
                    </div>
                  )}
                  {result.parsedBill.propertyInfo?.propertyType && (
                    <div>
                      <span className="text-gray-500">Type:</span>{' '}
                      <span className="font-medium capitalize">{result.parsedBill.propertyInfo.propertyType}</span>
                    </div>
                  )}
                  {result.parsedBill.propertyInfo?.units && result.parsedBill.propertyInfo.units > 1 && (
                    <div>
                      <span className="text-gray-500">Units:</span>{' '}
                      <span className="font-medium">{result.parsedBill.propertyInfo.units} living units</span>
                    </div>
                  )}
                  {result.parsedBill.totalDue && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Total Due:</span>{' '}
                      <span className="font-bold text-lg">{formatCurrency(result.parsedBill.totalDue)}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center border-t pt-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {result.parsedBill.lineItems?.length || 0}
                    </div>
                    <div className="text-sm text-gray-500">Line Items</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {result.verification?.stats?.verified || 0}
                    </div>
                    <div className="text-sm text-gray-500">Verified</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {result.verification?.stats?.likelyWrong || 0}
                    </div>
                    <div className="text-sm text-gray-500">Issues</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">
                      {result.verification?.stats?.unknown || result.verification?.stats?.cannotVerify || 0}
                    </div>
                    <div className="text-sm text-gray-500">Cannot Verify</div>
                  </div>
                </div>

                {/* Warning if issues found */}
                {(result.verification?.stats?.likelyWrong > 0) && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-red-800">Issues found that require attention</p>
                        <p className="text-red-700 mt-1">
                          Review the findings below and take the recommended actions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Info if items noted but not verified */}
                {(result.verification?.stats?.noted > 0 && result.verification?.stats?.likelyWrong === 0) && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800">Some charges noted but not arithmetically verified</p>
                        <p className="text-blue-700 mt-1">
                          Water and refuse charges are recorded. Electricity and rates were verified against FY 2025/26 tariffs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Extracted Charges */}
            <Card>
              <CardHeader>
                <CardTitle>Extracted Charges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.parsedBill.lineItems?.map((item: any, idx: number) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            item.amount > 0 ? 'bg-primary' : 'bg-gray-300'
                          }`} />
                          <div>
                            <div className="font-medium">{item.description || item.serviceType}</div>
                            <div className="text-sm text-gray-500">
                              {item.serviceType === 'electricity' && item.quantity && (
                                <>{item.quantity.toLocaleString()} kWh total</>
                              )}
                              {item.serviceType === 'water' && item.quantity !== null && (
                                <>{item.quantity.toLocaleString()} kL consumption</>
                              )}
                              {item.serviceType === 'sewerage' && item.quantity && (
                                <>{item.quantity} units @ R{(item.unitPrice / 100).toFixed(2)}/unit</>
                              )}
                              {!['electricity', 'water', 'sewerage'].includes(item.serviceType) && item.quantity && (
                                <>{item.quantity.toLocaleString()} units</>
                              )}
                              {!item.quantity && item.amount > 0 && 'Fixed charge'}
                              {item.isEstimated && <span className="ml-2 text-amber-600">(Estimated)</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(item.amount)}
                          </div>
                        </div>
                      </div>
                      {/* Show detailed breakdown for electricity with multiple meters */}
                      {item.metadata?.chargeDetails && (
                        <div className="mt-2 pl-6 text-xs text-gray-500 border-l-2 border-gray-200 ml-1">
                          <div className="font-medium text-gray-600 mb-1">Breakdown:</div>
                          {item.metadata.meterDetails && <div>{item.metadata.meterDetails}</div>}
                          {item.metadata.chargeDetails && <div>{item.metadata.chargeDetails}</div>}
                          {item.metadata.serviceCharges > 0 && <div>Service charges: R{item.metadata.serviceCharges.toFixed(2)}</div>}
                          {item.metadata.networkCharges > 0 && <div>Network charges: R{item.metadata.networkCharges.toFixed(2)}</div>}
                        </div>
                      )}
                      {/* Show water breakdown for multi-unit */}
                      {item.serviceType === 'water' && item.metadata?.demandLevy > 0 && (
                        <div className="mt-2 pl-6 text-xs text-gray-500 border-l-2 border-gray-200 ml-1">
                          <div>Water Demand Levy: {item.metadata.units} units × R{item.metadata.demandLevyPerUnit?.toFixed(2)} = R{item.metadata.demandLevy.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {(!result.parsedBill.lineItems || result.parsedBill.lineItems.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No line items extracted from this bill
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Verification Findings */}
            {result.verification?.findings && result.verification.findings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Verification Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.verification.findings.map((finding: any, idx: number) => (
                      <div key={idx} className={`rounded-lg border-l-4 overflow-hidden ${
                        finding.status === 'VERIFIED'
                          ? 'bg-green-50 border-green-500'
                          : finding.status === 'LIKELY_WRONG'
                          ? 'bg-red-50 border-red-500'
                          : 'bg-amber-50 border-amber-500'
                      }`}>
                        {/* Finding Header - Clickable */}
                        <div
                          className="p-4 cursor-pointer hover:bg-black/5"
                          onClick={() => setExpandedFinding(expandedFinding === idx ? null : idx)}
                        >
                          <div className="flex items-start gap-3">
                            {finding.status === 'VERIFIED' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                            {finding.status === 'LIKELY_WRONG' && <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />}
                            {finding.status === 'CANNOT_VERIFY' && <HelpCircle className="h-5 w-5 text-amber-600 mt-0.5" />}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{finding.title}</div>
                                {(finding.citation?.hasSource || finding.calculationBreakdown) && (
                                  expandedFinding === idx
                                    ? <ChevronUp className="h-4 w-4 text-gray-400" />
                                    : <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{finding.explanation}</div>
                              {finding.impactMax && finding.impactMax > 0 && (
                                <div className="text-sm font-medium mt-2 text-red-700">
                                  Potential overcharge: {formatCurrency(finding.impactMin || 0)} - {formatCurrency(finding.impactMax)}
                                </div>
                              )}

                              {/* Citation indicator */}
                              {finding.citation?.hasSource && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                                  <BookOpen className="h-3 w-3" />
                                  <span>Source verified from official document</span>
                                </div>
                              )}
                              {finding.citation && !finding.citation.hasSource && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                                  <HelpCircle className="h-3 w-3" />
                                  <span>{finding.citation.noSourceReason || 'No official tariff source available'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedFinding === idx && (
                          <div className="px-4 pb-4 border-t border-black/10">
                            {/* Calculation Breakdown */}
                            {finding.calculationBreakdown && (
                              <div className="mt-4">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">Calculation Breakdown</h5>
                                <div className="bg-white rounded-lg border p-3 space-y-3">
                                  {/* Consumption */}
                                  {finding.calculationBreakdown.consumption && (
                                    <div className="text-sm">
                                      <span className="font-medium">Consumption:</span>{' '}
                                      {finding.calculationBreakdown.consumption.value.toLocaleString()}{' '}
                                      {finding.calculationBreakdown.consumption.unit}
                                    </div>
                                  )}

                                  {/* Band breakdown */}
                                  {finding.calculationBreakdown.bands && finding.calculationBreakdown.bands.length > 0 && (
                                    <div>
                                      <div className="text-xs font-medium text-gray-500 mb-1">Tiered Charges:</div>
                                      <table className="w-full text-xs">
                                        <thead className="text-gray-500">
                                          <tr>
                                            <th className="text-left py-1">Band</th>
                                            <th className="text-right py-1">Usage</th>
                                            <th className="text-right py-1">Rate</th>
                                            <th className="text-right py-1">Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {finding.calculationBreakdown.bands.map((band: any, i: number) => (
                                            <tr key={i} className="border-t border-gray-100">
                                              <td className="py-1">{band.range}</td>
                                              <td className="text-right py-1">{band.usage.toLocaleString()}</td>
                                              <td className="text-right py-1">{(band.rate / 100).toFixed(2)} c/unit</td>
                                              <td className="text-right py-1 font-medium">{formatCurrency(band.amount)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* Fixed charges */}
                                  {finding.calculationBreakdown.fixedCharges && finding.calculationBreakdown.fixedCharges.length > 0 && (
                                    <div>
                                      <div className="text-xs font-medium text-gray-500 mb-1">Fixed Charges:</div>
                                      {finding.calculationBreakdown.fixedCharges.map((charge: any, i: number) => (
                                        <div key={i} className="flex justify-between text-xs">
                                          <span>{charge.name}</span>
                                          <span className="font-medium">{formatCurrency(charge.amount)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Totals */}
                                  <div className="border-t pt-2 space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span>Subtotal</span>
                                      <span>{formatCurrency(finding.calculationBreakdown.subtotal)}</span>
                                    </div>
                                    {finding.calculationBreakdown.vat && (
                                      <div className="flex justify-between text-xs">
                                        <span>VAT ({finding.calculationBreakdown.vat.rate}%)</span>
                                        <span>{formatCurrency(finding.calculationBreakdown.vat.amount)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-sm font-bold">
                                      <span>Expected Total</span>
                                      <span>{formatCurrency(finding.calculationBreakdown.total)}</span>
                                    </div>
                                  </div>

                                  {/* Metadata */}
                                  <div className="text-xs text-gray-400 pt-2 border-t">
                                    Financial Year: {finding.calculationBreakdown.financialYear} |
                                    Category: {finding.calculationBreakdown.customerCategory}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Citation Details */}
                            {finding.citation?.hasSource && (
                              <div className="mt-4">
                                <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  Source Citation
                                </h5>
                                <div className="bg-white rounded-lg border p-3 text-sm">
                                  {finding.citation.sourcePageNumber && (
                                    <div className="text-gray-600">
                                      <span className="font-medium">Page:</span> {finding.citation.sourcePageNumber}
                                    </div>
                                  )}
                                  {finding.citation.excerpt && (
                                    <blockquote className="mt-2 text-gray-600 italic border-l-2 border-blue-300 pl-3 text-xs">
                                      &ldquo;{finding.citation.excerpt}&rdquo;
                                    </blockquote>
                                  )}
                                  {finding.citation.knowledgeDocumentId && (
                                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                                      <ExternalLink className="h-3 w-3" />
                                      <Link href={`/admin/documents`} className="hover:underline">
                                        View source document
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card className="bg-gray-900 text-white">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-lg font-medium mb-2">Analysis Summary</div>
                  <div className="text-gray-300">{result.verification?.summary}</div>
                  {result.verification?.totalImpactMax > 0 && (
                    <div className="mt-4 text-2xl font-bold text-primary">
                      Potential Recovery: {formatCurrency(result.verification.totalImpactMin)} - {formatCurrency(result.verification.totalImpactMax)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Plans - What to do next */}
            {result.actionPlans && result.actionPlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.actionPlans.map((plan: any, idx: number) => (
                      <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                        plan.priority === 'immediate' ? 'bg-red-50 border-red-500' :
                        plan.priority === 'soon' ? 'bg-amber-50 border-amber-500' :
                        'bg-blue-50 border-blue-500'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{plan.title}</div>
                            <div className="text-sm text-gray-600 capitalize mt-1">
                              Priority: {plan.priority.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        {plan.steps && plan.steps.length > 0 && (
                          <ol className="mt-3 space-y-1 text-sm text-gray-700">
                            {plan.steps.map((step: any, sIdx: number) => (
                              <li key={sIdx} className="flex gap-2">
                                <span className="text-gray-400">{step.order}.</span>
                                <span>{step.action}{step.detail && <span className="text-gray-500"> - {step.detail}</span>}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {plan.contacts && plan.contacts.length > 0 && (
                          <div className="mt-3 text-xs text-gray-600 flex flex-wrap gap-3">
                            {plan.contacts.map((c: any, cIdx: number) => (
                              <span key={cIdx}>
                                {c.name}: {c.phone}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sources - CRITICAL: "without the sources we do not exist" */}
            {result.sources && (
              <Card className="border-2 border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <BookOpen className="h-5 w-5" />
                    Verification Sources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-blue-800">Tariff Year</div>
                    <div className="text-sm text-blue-700">{result.sources.tariffYear}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-800">Legal Framework</div>
                    <ul className="text-sm text-blue-700 list-disc list-inside">
                      {result.sources.legalFramework?.map((law: string, idx: number) => (
                        <li key={idx}>{law}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-800">Official Contacts</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700 mt-1">
                      {result.sources.contacts && Object.entries(result.sources.contacts).map(([key, contact]: [string, any]) => (
                        <div key={key} className="flex flex-col">
                          <span className="font-medium">{contact.name}</span>
                          <span>{contact.phone}</span>
                          <span className="text-xs">{contact.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Raw Data Toggle */}
            <details className="bg-white rounded-lg border p-4">
              <summary className="cursor-pointer font-medium text-gray-700">View Raw JSON</summary>
              <pre className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs max-h-[400px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
