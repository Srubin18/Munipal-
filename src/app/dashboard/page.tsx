import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PropertyForm } from '@/components/property-form';
import { BillUpload } from '@/components/bill-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Get user's properties
  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      bills: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      cases: {
        where: { status: { not: 'CLOSED' } },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  });

  // Get recent cases
  const recentCases = await prisma.case.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      property: true,
    },
  });

  const hasProperty = properties.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}
        </h1>
        <p className="text-gray-600 mt-1">
          {hasProperty
            ? 'Upload a bill to check for issues'
            : 'Add your property to get started'}
        </p>
      </div>

      {!hasProperty ? (
        <Card>
          <CardHeader>
            <CardTitle>Add your property</CardTitle>
            <CardDescription>
              Enter your City of Johannesburg account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PropertyForm />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Properties */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Your Properties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="font-medium">{property.streetAddress}</div>
                    <div className="text-sm text-gray-500">
                      {property.suburb}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Account: {property.accountNumber}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Bill Upload */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Check your bill</CardTitle>
                <CardDescription>
                  Upload your City of Johannesburg statement (PDF)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BillUpload propertyId={properties[0].id} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Recent Cases */}
      {recentCases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/dashboard/cases/${caseItem.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{caseItem.caseNumber}</div>
                      <div className="text-sm text-gray-500">
                        {caseItem.property.streetAddress}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          caseItem.status === 'RESOLVED'
                            ? 'bg-green-100 text-green-700'
                            : caseItem.status === 'ACTIVE' ||
                              caseItem.status === 'AWAITING_COJ'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {caseItem.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
