import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CaseTimeline } from '@/components/case-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatZAR, formatDate } from '@/lib/utils';

const statusLabels: Record<string, { label: string; color: string }> = {
  ANALYZING: { label: 'Analyzing', color: 'bg-gray-100 text-gray-700' },
  FINDINGS_READY: { label: 'Analysis Complete', color: 'bg-blue-100 text-blue-700' },
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700' },
  AWAITING_COJ: { label: 'Awaiting CoJ Response', color: 'bg-purple-100 text-purple-700' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-700' },
};

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const caseRecord = await prisma.case.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
    include: {
      property: true,
      bill: true,
      findings: {
        orderBy: { createdAt: 'asc' },
      },
      actions: {
        orderBy: { executedAt: 'desc' },
      },
    },
  });

  if (!caseRecord) {
    notFound();
  }

  const status = statusLabels[caseRecord.status] || statusLabels.ANALYZING;
  const issueCount = caseRecord.findings.filter(
    (f) => f.status === 'LIKELY_WRONG'
  ).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {caseRecord.caseNumber}
            </h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {caseRecord.property.streetAddress}, {caseRecord.property.suburb}
          </p>
        </div>

        {caseRecord.status === 'FINDINGS_READY' && issueCount > 0 && (
          <Button asChild>
            <Link href={`/dashboard/cases/${caseRecord.id}/pay`}>
              Let Us Handle This
            </Link>
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Issues Found</div>
            <div className="text-2xl font-bold">{issueCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Estimated Impact</div>
            <div className="text-2xl font-bold">
              {caseRecord.estimatedImpactMax
                ? formatZAR(caseRecord.estimatedImpactMax)
                : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Created</div>
            <div className="text-2xl font-bold">
              {formatDate(caseRecord.createdAt)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case Summary */}
      {caseRecord.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{caseRecord.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* CoJ Reference */}
      {caseRecord.cojReference && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600">CoJ Reference Number</div>
                <div className="text-xl font-bold text-blue-900">
                  {caseRecord.cojReference}
                </div>
              </div>
              {caseRecord.cojDeadline && (
                <div className="text-right">
                  <div className="text-sm text-blue-600">Response Due</div>
                  <div className="font-medium text-blue-900">
                    {formatDate(caseRecord.cojDeadline)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Case Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <CaseTimeline
            actions={caseRecord.actions.map((a) => ({
              id: a.id,
              type: a.type,
              description: a.description,
              executedAt: a.executedAt.toISOString(),
              success: a.success,
              details: a.details,
              cojReference: a.cojReference,
            }))}
          />
        </CardContent>
      </Card>

      {/* View Findings Link */}
      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/analysis/${caseRecord.id}`}>
            View Detailed Findings
          </Link>
        </Button>
      </div>
    </div>
  );
}
