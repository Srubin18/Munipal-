'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, AlertCircle, CheckCircle, HelpCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeDocument {
  id: string;
  title: string;
  documentType: string;
  sourceUrl?: string;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}

interface FindingProps {
  finding: {
    title: string;
    explanation: string;
    status: 'VERIFIED' | 'LIKELY_WRONG' | 'CANNOT_VERIFY';
    confidence: number;
    impactMin?: number | null;
    impactMax?: number | null;
    checkType: string;
    hasSource: boolean;
    excerpt?: string | null;
    noSourceReason?: string | null;
    knowledgeDocument?: KnowledgeDocument | null;
  };
}

const statusConfig = {
  VERIFIED: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Verified',
  },
  LIKELY_WRONG: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Issue Found',
  },
  CANNOT_VERIFY: {
    icon: HelpCircle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: 'Cannot Verify',
  },
};

const documentTypeLabels: Record<string, string> = {
  tariff: 'Tariff Schedule',
  bylaw: 'City of Johannesburg By-law',
  credit_control: 'Credit Control Policy',
  metering: 'Metering Regulations',
  valuation: 'Valuation Roll',
  revenue: 'Revenue Policy',
  service: 'Service Delivery Standards',
};

export function FindingCard({ finding }: FindingProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[finding.status];
  const StatusIcon = config.icon;

  return (
    <div className={cn('rounded-lg border p-4', config.border, config.bg)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <StatusIcon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.color)} />
          <div>
            <h3 className="font-medium text-gray-900">{finding.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{finding.explanation}</p>

            {/* Impact badge */}
            {finding.impactMin && finding.impactMax && (
              <div className="mt-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                Potential impact: R{(finding.impactMin / 100).toFixed(0)} – R
                {(finding.impactMax / 100).toFixed(0)}
              </div>
            )}
          </div>
        </div>

        {/* Confidence badge */}
        <div className="text-right flex-shrink-0">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
              config.bg,
              config.color
            )}
          >
            {config.label}
          </span>
          <p className="mt-1 text-xs text-gray-500">{finding.confidence}% confidence</p>
        </div>
      </div>

      {/* Source toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <FileText className="h-4 w-4" />
        {finding.hasSource ? 'View source' : 'Why can\'t this be verified?'}
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* Expanded citation block */}
      {expanded && (
        <div className="mt-3 rounded-md bg-white border border-gray-200 p-4">
          {finding.hasSource && finding.knowledgeDocument ? (
            <SourceCitation
              document={finding.knowledgeDocument}
              excerpt={finding.excerpt}
            />
          ) : (
            <NoSourceCitation reason={finding.noSourceReason} />
          )}
        </div>
      )}
    </div>
  );
}

function SourceCitation({
  document,
  excerpt
}: {
  document: KnowledgeDocument;
  excerpt?: string | null;
}) {
  return (
    <div className="space-y-3">
      {/* Source header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Source
        </p>
        <p className="mt-1 font-medium text-gray-900">{document.title}</p>
        <p className="text-sm text-gray-600">
          {documentTypeLabels[document.documentType] || document.documentType}
        </p>
      </div>

      {/* Validity period */}
      {document.effectiveDate && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Valid Period
          </p>
          <p className="mt-1 text-sm text-gray-700">
            {new Date(document.effectiveDate).toLocaleDateString('en-ZA', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            {' – '}
            {document.expiryDate
              ? new Date(document.expiryDate).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Present'}
          </p>
        </div>
      )}

      {/* Excerpt */}
      {excerpt && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Relevant Excerpt
          </p>
          <blockquote className="mt-1 border-l-2 border-gray-300 pl-3 text-sm text-gray-700 italic">
            &ldquo;{excerpt}&rdquo;
          </blockquote>
        </div>
      )}

      {/* Source link */}
      {document.sourceUrl && (
        <a
          href={document.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View original document
        </a>
      )}
    </div>
  );
}

function NoSourceCitation({ reason }: { reason?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium text-gray-900">Cannot be verified</p>
        <p className="mt-1 text-sm text-gray-600">
          {reason || 'No definitive tariff or policy reference found for this item.'}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          MUNIPAL cannot verify charges without an authoritative source document.
          If you believe this charge is incorrect, you may still raise a query
          with the City of Johannesburg directly.
        </p>
      </div>
    </div>
  );
}
