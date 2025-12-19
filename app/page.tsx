import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

const tools = [
  {
    href: "/env-compare",
    title: ".env Comparator",
    description:
      "Compare environment files across staging and production to identify differences and missing keys",
    category: "Development",
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    href: "/ip-planner",
    title: "NetPlan",
    description:
      "IP network planning with VLSM, collision detection, and boundary validation",
    category: "Network",
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
    ),
  },
  {
    href: "/ipcalc",
    title: "IP Calculator",
    description:
      "Comprehensive IP calculator with subnet, supernet operations and CIDR deaggregation",
    category: "Network",
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    href: "/random-string",
    title: "Random String Generator",
    description:
      "Generate secure random strings with customizable length and character types",
    category: "Data",
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
        />
      </svg>
    ),
  },
  {
    href: "/invoice",
    title: "Invoice Generator",
    description:
      "Create professional invoices with live PDF preview and multiple template support",
    category: "Productivity",
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    href: "/qr-gen",
    title: "QR Code Generator",
    description:
      "Generate customizable QR codes with error correction and download support",
    category: "Data",
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        />
      </svg>
    ),
  },
  {
    href: "/json-schema",
    title: "JSON Schema Visualizer",
    description:
      "Visualize and explore JSON Schema structures with interactive tree view",
    category: "Development",
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: "More Tools Coming",
    description:
      "Future utilities are currently trapped in the backlog. Please hold for your inevitable convenience.",
    category: "Coming Soon",
    disabled: true,
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6V4m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        />
      </svg>
    ),
  },
];

const categoryColors: Record<string, string> = {
  Development: "bg-blue-100 text-blue-700 border-blue-200",
  Network: "bg-purple-100 text-purple-700 border-purple-200",
  Data: "bg-green-100 text-green-700 border-green-200",
  Productivity: "bg-orange-100 text-orange-700 border-orange-200",
  "Coming Soon": "bg-gray-100 text-gray-500 border-gray-200",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 sm:px-8 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-16 text-center space-y-4">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            tulkit
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
because apparently, you *do* need another random tool on the internet. ¯\_(ツ)_/¯
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => {
            const CardWrapper = tool.disabled ? "div" : Link;
            const wrapperProps = tool.disabled
              ? {}
              : { href: tool.href as string };

            return (
              <CardWrapper key={tool.href || index} {...wrapperProps}>
                <Card
                  className={cn(
                    "h-full transition-all duration-200 border-slate-200/60",
                    tool.disabled
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:shadow-lg hover:-translate-y-1 cursor-pointer group"
                  )}
                >
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "p-2.5 rounded-lg border border-slate-200/50",
                          tool.disabled
                            ? "bg-gray-100"
                            : "bg-gradient-to-br from-slate-100 to-slate-50 group-hover:from-slate-200 group-hover:to-slate-100 transition-colors"
                        )}
                      >
                        {tool.icon}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          categoryColors[tool.category]
                        )}
                      >
                        {tool.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl leading-tight">
                      {tool.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-6">
                    <CardDescription className="text-sm leading-relaxed">
                      {tool.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </CardWrapper>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
