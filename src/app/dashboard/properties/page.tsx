import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PropertyForm } from '@/components/property-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PropertiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: {
          bills: true,
          cases: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
        <p className="text-gray-600 mt-1">
          Manage your City of Johannesburg accounts
        </p>
      </div>

      {properties.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map((property) => (
            <Card key={property.id}>
              <CardContent className="py-4">
                <div className="font-medium text-gray-900">
                  {property.streetAddress}
                </div>
                <div className="text-sm text-gray-500">
                  {property.suburb}
                  {property.postalCode && `, ${property.postalCode}`}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Account: {property.accountNumber}
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-gray-500">
                    {property._count.bills} bill
                    {property._count.bills !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-500">
                    {property._count.cases} case
                    {property._count.cases !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add Another Property</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertyForm />
        </CardContent>
      </Card>
    </div>
  );
}
