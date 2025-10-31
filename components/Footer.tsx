import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="text-center mt-auto pt-16 pb-8 relative z-10">
      <div className="flex flex-col items-center gap-3">
        {/* Copyright Section */}
        <p className="text-xs text-gray-400">
          <a
            href="https://github.com/widnyana/tulkit"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:text-gray-500 transition-colors"
          >
            tulkit
          </a>
          {" "}© 2025 Widnyana — Solving your tiny, annoying problems so you can get back to the big ones.
        </p>

        <Separator className="w-48 h-px bg-gray-300 my-2" />

        {/* Donation Section */}
        <div className="inline-flex items-center gap-2 text-gray-400">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="text-xs">Support via EVM:</span>
          <code className="text-xs font-mono text-gray-400 hover:text-gray-500 transition-colors">
            0x0D9ef1907CE24C928b53c931D8f7E6C53B33ace1
          </code>
        </div>
      </div>
    </footer>
  );
}
