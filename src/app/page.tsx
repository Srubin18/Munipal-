import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Elegant Header */}
      <header className="border-b border-gray-100">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="text-xl tracking-tight font-semibold text-gray-900">
            munipal
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero - Da Vinci elegance: proportion, whitespace, clarity */}
      <main className="container mx-auto px-6">
        <section className="py-24 md:py-32 max-w-4xl">
          <p className="text-sm uppercase tracking-widest text-gray-400 mb-6">
            Municipal bill verification
          </p>
          <h1 className="text-4xl md:text-6xl font-light text-gray-900 leading-tight mb-8">
            Know your bill is correct.
            <br />
            <span className="text-gray-400">Or know exactly what&apos;s wrong.</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mb-10 leading-relaxed">
            Upload your municipal statement. Our AI verifies every charge against
            official tariffs and policies. If something&apos;s wrong, we tell you what
            to do about it.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all hover:shadow-lg"
            >
              Verify your bill
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/test"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Try without signing up
            </Link>
          </div>
        </section>

        {/* What we do - Clean, minimal */}
        <section className="py-20 border-t border-gray-100">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Parse your statement</h3>
              <p className="text-gray-600 leading-relaxed">
                We read your PDF and extract every charge, meter reading, and property detail.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Verify the arithmetic</h3>
              <p className="text-gray-600 leading-relaxed">
                Every calculation checked. Consumption × rate = charge. The math must add up.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Take action</h3>
              <p className="text-gray-600 leading-relaxed">
                Issues found? We draft the dispute letter, cite the law, and track your case.
              </p>
            </div>
          </div>
        </section>

        {/* What makes us different */}
        <section className="py-20 border-t border-gray-100">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-light text-gray-900 mb-8">
              Not just another chatbot.
            </h2>
            <div className="space-y-6 text-gray-600 leading-relaxed">
              <p>
                ChatGPT can&apos;t read your bill. It doesn&apos;t know current tariffs.
                It can&apos;t lodge a dispute for you or track whether the municipality responded.
              </p>
              <p>
                We can. We parse your actual PDF. We have this year&apos;s official rates.
                We know SA municipal law&mdash;MPRA, the Credit Control Bylaw, prescription limits.
                And when something&apos;s wrong, we don&apos;t just tell you. We act.
              </p>
            </div>
          </div>
        </section>

        {/* What we check */}
        <section className="py-20 border-t border-gray-100">
          <h2 className="text-2xl font-light text-gray-900 mb-10">What we verify</h2>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-8">
            <div className="flex gap-4">
              <div className="text-green-500 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Electricity charges</h3>
                <p className="text-sm text-gray-500">Stepped tariffs, service charges, network levies</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-green-500 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Property rates</h3>
                <p className="text-sm text-gray-500">Valuation, rebates, correct category</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-green-500 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Water consumption</h3>
                <p className="text-sm text-gray-500">Multi-unit billing, demand levies</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-green-500 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Meter readings</h3>
                <p className="text-sm text-gray-500">Actual vs estimated, potential corrections</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 border-t border-gray-100">
          <div className="bg-gray-900 rounded-2xl p-10 md:p-16 text-center">
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
              Stop wondering. Start knowing.
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Upload your bill and get a clear answer in minutes. No more spreadsheets. No more guessing.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer - Minimal */}
      <footer className="border-t border-gray-100 py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-400">
            Currently supporting Johannesburg municipal accounts
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
