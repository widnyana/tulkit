import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-cover bg-center">
      <div className="absolute inset-0 bg-dark/10 backdrop-blur-sm"></div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">Tulkit</h1>
          <p className="text-xl text-black font-medium">
            because apparently, you *do* need another random tool on the
            internet. ¯\_(ツ)_/¯
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/env-compare"
            className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-blue-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <svg
                  className="w-6 h-6 text-blue-600 group-hover:text-black transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-blue-500 group-hover:text-blue-700 transition-colors">
                →
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              .env Comparator
            </h2>
            <p className="text-gray-600 text-sm">
              Compare environment files across different environments to
              identify differences and missing keys
            </p>
          </Link>

          <Link
            href="/ip-planner"
            className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-purple-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                <svg
                  className="w-6 h-6 text-purple-600 group-hover:text-black transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <span className="text-purple-500 group-hover:text-purple-700 transition-colors">
                →
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              NetPlan
            </h2>
            <p className="text-gray-600 text-sm">
              Simple IP planning and conflict detection for all your Networks.
            </p>
          </Link>

          <Link
            href="/ipcalc"
            className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-orange-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-500 transition-colors">
                <svg
                  className="w-6 h-6 text-orange-600 group-hover:text-black transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-orange-500 group-hover:text-orange-700 transition-colors">
                →
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              IP Calculator
            </h2>
            <p className="text-gray-600 text-sm">
              Comprehensive IP calculator with subnet/supernet operations and
              CIDR deaggregation
            </p>
          </Link>

          <Link
            href="/random-string"
            className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-green-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                <svg
                  className="w-6 h-6 text-green-600 group-hover:text-black transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              </div>
              <span className="text-green-500 group-hover:text-green-700 transition-colors">
                →
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Random String Generator
            </h2>
            <p className="text-gray-600 text-sm">
              Generate secure random strings with customizable length and
              character types
            </p>
          </Link>

          <Link
            href="/invoice"
            className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-indigo-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                <svg
                  className="w-6 h-6 text-indigo-600 group-hover:text-black transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-indigo-500 group-hover:text-indigo-700 transition-colors">
                →
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Invoice Generator
            </h2>
            <p className="text-gray-600 text-sm">
              Create professional invoices with live PDF preview. Supports
              multiple templates and currencies
            </p>
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 opacity-60 cursor-not-allowed">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <span className="text-gray-400">Soon</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              More Tools Coming
            </h2>
            <p className="text-gray-600 text-sm">
              Future utilities are currently trapped in the backlog. Please hold
              for your inevitable convenience.
            </p>
          </div>
        </div>
        <footer className="text-center mt-12 text-gray-800 text-sm font-medium relative z-10">
          <p>
            <span className="font-bold">
              <a
                target="_blank"
                href="https://github.com/widnyana/tulkit"
                rel="noopener noreferrer"
              >
                tulkit
              </a>
            </span>{" "}
            — © 2025 Widnyana. Solving your tiny, annoying problems so you can
            get back to the big ones.
          </p>
        </footer>
      </div>
    </div>
  );
}
