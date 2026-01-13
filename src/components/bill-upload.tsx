'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BillUploadProps {
  propertyId: string;
}

export function BillUpload({ propertyId }: BillUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setFile(file);
      setError('');
    } else {
      setError('Please upload a PDF file');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('propertyId', propertyId);

      // Upload bill
      const uploadRes = await fetch('/api/bills/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      setUploading(false);
      setAnalyzing(true);

      // Analyze bill
      const analyzeRes = await fetch(`/api/bills/${uploadData.billId}/analyze`, {
        method: 'POST',
      });

      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        throw new Error(analyzeData.error || 'Analysis failed');
      }

      // Redirect to analysis results
      router.push(`/dashboard/analysis/${analyzeData.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setUploading(false);
      setAnalyzing(false);
    }
  };

  if (analyzing) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
        <h3 className="mt-4 font-medium text-lg">Analyzing your bill...</h3>
        <p className="text-gray-500 mt-2">
          Checking tariffs, meter readings, and arithmetic
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
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
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <p className="mt-4 font-medium">
              {isDragActive ? 'Drop your bill here' : 'Drag & drop your CoJ statement'}
            </p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 mt-2">PDF only, max 10MB</p>
          </>
        )}
      </div>

      {file && (
        <div className="flex gap-3">
          <Button onClick={handleUpload} disabled={uploading} className="flex-1">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Check My Bill - Free'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setFile(null)}
            disabled={uploading}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
