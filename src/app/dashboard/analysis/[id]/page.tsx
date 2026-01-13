import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FindingCard } from '@/components/finding-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatZAR } from '@/lib/utils';

export default async function AnalysisPage({
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
        include: {
          knowledgeDocument: true,
        },
      },
    },
  });

  if (!caseRecord) {
    notFound();
  }

  const issueCount = caseRecord.findings.filter(
    (f) => f.status === 'LIKELY_WRONG'
  ).length;
  const verifiedCount = caseRecord.findings.filter(
    (f) => f.status === 'VERIFIED'
  ).length;
  const unknownCount = caseRecord.findings.filter(
    (f) => f.status === 'CANNOT_VERIFY'
  ).length;

  const hasIssues = issueCount > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bill Analysis</h1>
        <p className="text-gray-600 mt-1">
          {caseRecord.property.streetAddress}, {caseRecord.property.suburb}
        </p>
      </div>

      {/* Summary Card */}
      <Card className={hasIssues ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {hasIssues ? (
              <>
                <span className="text-red-600">Issues Found</span>
                <span className="bg-red-600 text-white text-sm px-2 py-0.5 rounded-full">
                  {issueCount}
                </span>
              </>
            ) : (
              <span className="text-green-600">All Charges Verified</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">{caseRecord.summary}</p>

          {hasIssues && caseRecord.estimatedImpactMax && caseRecord.estimatedImpactMax > 0 && (
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <div className="text-sm text-gray-500">Estimated potential recovery</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatZAR(caseRecord.estimatedImpactMin || 0)} -{' '}
                {formatZAR(caseRecord.estimatedImpactMax)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{issueCount}</div>
          <div className="text-sm text-red-700">Issues Found</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{verifiedCount}</div>
          <div className="text-sm text-green-700">Verified</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{unknownCount}</div>
          <div className="text-sm text-amber-700">Cannot Verify</div>
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Detailed Findings</h2>
        {caseRecord.findings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={{
              title: finding.title,
              explanation: finding.explanation,
              status: finding.status as 'VERIFIED' | 'LIKELY_WRONG' | 'CANNOT_VERIFY',
              confidence: finding.confidence,
              impactMin: finding.impactMin,
              impactMax: finding.impactMax,
              checkType: finding.checkType,
              hasSource: finding.hasSource,
              excerpt: finding.sourceExcerpt || undefined,
              noSourceReason: finding.noSourceReason,
              knowledgeDocument: finding.knowledgeDocument ? {
                id: finding.knowledgeDocument.id,
                title: finding.knowledgeDocument.title,
                documentType: finding.knowledgeDocument.category,
                sourceUrl: finding.knowledgeDocument.sourceUrl || undefined,
                effectiveDate: finding.knowledgeDocument.effectiveDate?.toISOString(),
                expiryDate: finding.knowledgeDocument.expiryDate?.toISOString(),
              } : null,
            }}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>What would you like to do?</CardTitle>
        </CardHeader>
        <CardContent>
          {hasIssues ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium">Handle it yourself</h3>
                <p className="text-sm text-gray-500 mt-1">
                  We&apos;ll provide guidance and templates
                </p>
                <p className="text-lg font-medium mt-2">Free</p>
                <Button variant="outline" className="w-full mt-3" asChild>
                  <Link href={`/dashboard/cases/${caseRecord.id}?mode=guided`}>
                    Get Guidance
                  </Link>
                </Button>
              </div>
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                <h3 className="font-medium">Let MUNIPAL handle it</h3>
                <p className="text-sm text-gray-500 mt-1">
                  We&apos;ll draft and submit your dispute
                </p>
                <p className="text-lg font-medium mt-2">R349</p>
                <Button className="w-full mt-3" asChild>
                  <Link href={`/dashboard/cases/${caseRecord.id}/pay`}>
                    Let Us Handle This
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">
                No issues found. Your bill appears to be correct.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
