import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              MUNIPAL
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/cases"
                className="text-gray-600 hover:text-gray-900"
              >
                My Cases
              </Link>
              <Link
                href="/dashboard/properties"
                className="text-gray-600 hover:text-gray-900"
              >
                Properties
              </Link>
              <div className="text-sm text-gray-500">
                {user.firstName} {user.lastName}
              </div>
            </div>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
