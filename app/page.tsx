import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Tulkit</h1>
          <p className="text-xl text-gray-600">
            Stuff you didn’t know you needed, but now can’t live without
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
                  className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors"
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
              Env Var Comparator
            </h2>
            <p className="text-gray-600 text-sm">
              Compare environment files across different environments to
              identify differences and missing keys
            </p>
          </Link>

          <Link
            href="/random-string"
            className="group bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-green-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                <svg
                  className="w-6 h-6 text-green-600 group-hover:text-white transition-colors"
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
              Additional developer utilities will be added here
            </p>
          </div>
        </div>
        <footer className="text-center mt-12 text-gray-600 text-sm">
          <p>
            <span className="font-bold">tulkit</span> — because apparently, you
            *do* need another random tool on the internet.
          </p>
        </footer>
      </div>
    </div>
  );
}
