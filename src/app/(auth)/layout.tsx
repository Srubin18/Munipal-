export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">MUNIPAL</h1>
          <p className="text-gray-600 mt-2">Municipal Billing Consultant</p>
        </div>
        {children}
      </div>
    </div>
  );
}
