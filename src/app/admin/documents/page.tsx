'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface Document {
  id: string;
  provider: string;
  documentType: string;
  category: string;
  financialYear: string;
  title: string;
  description: string | null;
  pageCount: number | null;
  isVerified: boolean;
  verifiedAt: string | null;
  ingestedAt: string;
  checksum: string;
}

const providers = [
  { value: 'city_power', label: 'City Power' },
  { value: 'joburg_water', label: 'Johannesburg Water' },
  { value: 'pikitup', label: 'Pikitup' },
  { value: 'coj', label: 'City of Johannesburg' },
];

const documentTypes = [
  { value: 'tariff_schedule', label: 'Tariff Schedule' },
  { value: 'by_law', label: 'By-Law' },
  { value: 'rates_policy', label: 'Rates Policy' },
  { value: 'credit_control', label: 'Credit Control Policy' },
];

const categories = [
  { value: 'TARIFF', label: 'Tariff' },
  { value: 'CREDIT_CONTROL', label: 'Credit Control' },
  { value: 'METERING_POLICY', label: 'Metering Policy' },
  { value: 'VALUATION_ROLL', label: 'Valuation Roll' },
  { value: 'BYLAW', label: 'By-Law' },
  { value: 'REVENUE_POLICY', label: 'Revenue Policy' },
  { value: 'SERVICE_STANDARD', label: 'Service Standard' },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    provider: '',
    documentType: '',
    category: 'TARIFF',
    financialYear: '2025/26',
    title: '',
    description: '',
    effectiveDate: '2025-07-01',
    expiryDate: '2026-06-30',
    sourceUrl: '',
  });

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      Object.entries(formData).forEach(([key, value]) => {
        uploadData.append(key, value);
      });

      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(`Document uploaded successfully! ID: ${data.documentId}`);
        setShowUploadForm(false);
        setFile(null);
        setFormData({
          provider: '',
          documentType: '',
          category: 'TARIFF',
          financialYear: '2025/26',
          title: '',
          description: '',
          effectiveDate: '2025-07-01',
          expiryDate: '2026-06-30',
          sourceUrl: '',
        });
        fetchDocuments();
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      alert(`Upload error: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const handleExtractTariffs = async (docId: string) => {
    setExtracting(docId);
    try {
      const res = await fetch(`/api/admin/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract' }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Extracted ${data.rulesExtracted} tariff rules!`);
      } else {
        alert(`Extraction issues: ${data.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Extraction failed: ${error}`);
    } finally {
      setExtracting(null);
    }
  };

  const handleVerify = async (docId: string) => {
    const res = await fetch(`/api/admin/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', verifiedBy: 'admin' }),
    });

    if (res.ok) {
      fetchDocuments();
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to deactivate this document?')) return;

    const res = await fetch(`/api/admin/documents/${docId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchDocuments();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-600 mt-1">
            Manage official CoJ tariff schedules and policy documents
          </p>
        </div>
        <Button onClick={() => setShowUploadForm(!showUploadForm)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Document</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PDF File
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>

              {/* Provider & Document Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="">Select provider...</option>
                    {providers.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="">Select type...</option>
                    {documentTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category & Financial Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Financial Year
                  </label>
                  <select
                    value={formData.financialYear}
                    onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  >
                    <option value="2025/26">2025/26</option>
                    <option value="2024/25">2024/25</option>
                    <option value="2023/24">2023/24</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="e.g., City Power Residential Tariff Schedule 2025/26"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={2}
                  placeholder="Brief description of the document contents"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="https://www.citypower.co.za/..."
                />
              </div>

              {/* Submit */}
              <div className="flex gap-2">
                <Button type="submit" disabled={uploading || !file}>
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-2">
                Upload official CoJ tariff schedules to enable verification
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <FileText className="h-8 w-8 text-blue-600 mt-1" />
                      <div>
                        <h3 className="font-medium text-gray-900">{doc.title}</h3>
                        <div className="text-sm text-gray-500 mt-1">
                          <span className="capitalize">{doc.provider.replace('_', ' ')}</span>
                          {' | '}
                          {doc.financialYear}
                          {' | '}
                          {doc.pageCount} pages
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {doc.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <Clock className="h-3 w-3" />
                              Pending Verification
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            Uploaded {new Date(doc.ingestedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExtractTariffs(doc.id)}
                        disabled={extracting === doc.id}
                      >
                        {extracting === doc.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          'Extract Tariffs'
                        )}
                      </Button>
                      {!doc.isVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(doc.id)}
                        >
                          Verify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
