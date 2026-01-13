'use client';

import {
  FileText,
  Send,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

interface Action {
  id: string;
  type: string;
  description: string;
  executedAt: string;
  success: boolean;
  details?: string | null;
  cojReference?: string | null;
}

const actionIcons: Record<string, typeof FileText> = {
  CASE_CREATED: FileText,
  DISPUTE_DRAFTED: FileText,
  DISPUTE_SUBMITTED: Send,
  EMAIL_SENT: Mail,
  REFERENCE_OBTAINED: CheckCircle,
  FOLLOWUP_SENT: MessageSquare,
  RESPONSE_RECEIVED: MessageSquare,
  CASE_RESOLVED: CheckCircle,
};

const actionLabels: Record<string, string> = {
  CASE_CREATED: 'Case Created',
  DISPUTE_DRAFTED: 'Dispute Drafted',
  DISPUTE_SUBMITTED: 'Submitted to CoJ',
  EMAIL_SENT: 'Email Sent',
  REFERENCE_OBTAINED: 'Reference Obtained',
  FOLLOWUP_SENT: 'Follow-up Sent',
  RESPONSE_RECEIVED: 'Response Received',
  CASE_RESOLVED: 'Case Resolved',
};

export function CaseTimeline({ actions }: { actions: Action[] }) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No actions recorded yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {actions.map((action, index) => {
          const Icon = actionIcons[action.type] || Clock;
          const label = actionLabels[action.type] || action.type;
          const isFirst = index === 0;

          return (
            <div key={action.id} className="relative flex gap-4">
              {/* Icon circle */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                  action.success
                    ? isFirst
                      ? 'bg-blue-500 text-white'
                      : 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{label}</span>
                  {!action.success && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  {action.description}
                </p>
                {action.cojReference && (
                  <p className="text-sm text-blue-600 mt-1">
                    Reference: {action.cojReference}
                  </p>
                )}
                {action.details && (
                  <p className="text-sm text-gray-500 mt-1">{action.details}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(action.executedAt).toLocaleString('en-ZA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
