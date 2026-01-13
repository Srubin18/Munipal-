import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatZAR, formatDate } from '@/lib/utils';

const statusLabels: Record<string, { label: string; color: string }> = {
  ANALYZING: { label: 'Analyzing', color: 'bg-gray-100 text-gray-700' },
  FINDINGS_READY: { label: 'Analysis Complete', color: 'bg-blue-100 text-blue-700' },
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700' },
  AWAITING_COJ: { label: 'Awaiting CoJ', color: 'bg-purple-100 text-purple-700' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-700' },
};

export default async function CasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const cases = await prisma.case.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      property: true,
      findings: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
        <p className="text-gray-600 mt-1">
          Track your bill analyses and disputes
        </p>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No cases yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Upload a bill to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cases.map((caseItem) => {
            const status = statusLabels[caseItem.status] || statusLabels.ANALYZING;
            const issueCount = caseItem.findings.filter(
              (f) => f.status === 'LIKELY_WRONG'
            ).length;

            return (
              <Link
                key={caseItem.id}
                href={`/dashboard/cases/${caseItem.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">
                            {caseItem.caseNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {caseItem.property.streetAddress},{' '}
                          {caseItem.property.suburb}
                        </p>
                      </div>

                      <div className="text-right">
                        {issueCount > 0 && (
                          <div className="text-sm">
                            <span className="text-red-600 font-medium">
                              {issueCount} issue{issueCount > 1 ? 's' : ''}
                            </span>
                            {caseItem.estimatedImpactMax && (
                              <span className="text-gray-500 ml-2">
                                {formatZAR(caseItem.estimatedImpactMax)}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(caseItem.createdAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
