import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">MUNIPAL</div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Hero */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Independent verification for City of Johannesburg municipal accounts
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered analysis against official tariffs, by-laws, and valuation data.
            Clear findings. Documented sources.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md text-lg font-medium h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Verify My Account
            </Link>
          </div>

          {/* 3-Step Process */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-3xl font-light text-primary mb-4">1</div>
              <h3 className="font-semibold text-lg mb-2">Upload your statement</h3>
              <p className="text-gray-600">
                Submit your City of Johannesburg municipal bill in PDF format.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-3xl font-light text-primary mb-4">2</div>
              <h3 className="font-semibold text-lg mb-2">Review the analysis</h3>
              <p className="text-gray-600">
                Each charge is verified against current tariffs and policies. Sources cited.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-3xl font-light text-primary mb-4">3</div>
              <h3 className="font-semibold text-lg mb-2">Resolve discrepancies</h3>
              <p className="text-gray-600">
                If issues are identified, we can submit and track your query with the City.
              </p>
            </div>
          </div>

          {/* Trust Line */}
          <div className="mt-16 bg-gray-900 text-white p-8 rounded-lg">
            <p className="text-lg font-medium mb-2">
              Built for City of Johannesburg accounts
            </p>
            <p className="text-gray-400 text-sm">
              Based on official CoJ tariffs, by-laws, valuation rolls, and credit control policies.
              Residential, Commercial, Business, and Developer properties supported.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
