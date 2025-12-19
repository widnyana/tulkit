"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { ToolCard } from "@/components/ToolCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useId } from "react";

const tools = [
  {
    href: "/env-compare",
    title: ".env Comparator",
    description:
      "Compare environment files across staging and production to identify differences and missing keys",
    category: "Development",
    color: "blue" as const,
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    usage: "1.2k",
    isNew: false,
  },
  {
    href: "/ip-planner",
    title: "NetPlan",
    description:
      "IP network planning with VLSM, collision detection, and boundary validation",
    category: "Network",
    color: "purple" as const,
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
    ),
    usage: "856",
    isNew: false,
  },
  {
    href: "/ipcalc",
    title: "IP Calculator",
    description:
      "Comprehensive IP calculator with subnet, supernet operations and CIDR deaggregation",
    category: "Network",
    color: "purple" as const,
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    usage: "2.3k",
    isNew: false,
  },
  {
    href: "/random-string",
    title: "Random String Generator",
    description:
      "Generate secure random strings with customizable length and character types",
    category: "Data",
    color: "green" as const,
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
        />
      </svg>
    ),
    usage: "3.1k",
    isNew: false,
  },
  {
    href: "/invoice",
    title: "Invoice Generator",
    description:
      "Create professional invoices with live PDF preview and multiple template support",
    category: "Productivity",
    color: "indigo" as const,
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    usage: "4.5k",
    isNew: false,
  },
  {
    href: "/qr-gen",
    title: "QR Code Generator",
    description:
      "Generate customizable QR codes with error correction and download support",
    category: "Data",
    color: "orange" as const,
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        />
      </svg>
    ),
    usage: "2.8k",
    isNew: false,
  },
  {
    href: "/json-schema",
    title: "JSON Schema Visualizer",
    description:
      "Visualize and explore JSON Schema structures with interactive tree view",
    category: "Development",
    color: "blue" as const,
    icon: (
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="w-full h-full"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    usage: "942",
    isNew: false,
  },
];

const categories = [
  { id: "all", name: "All Tools", icon: "🛠️" },
  { id: "development", name: "Development", icon: "💻" },
  { id: "network", name: "Network", icon: "🌐" },
  { id: "data", name: "Data", icon: "📊" },
  { id: "productivity", name: "Productivity", icon: "⚡" },
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const searchId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        setSearchTerm("");
        const searchInput = document.getElementById(
          searchId,
        ) as HTMLInputElement;
        searchInput?.focus();
      }
      if (e.key >= "1" && e.key <= "8") {
        const toolIndex = Number.parseInt(e.key) - 1;
        if (toolIndex < tools.length) {
          window.location.href = tools[toolIndex].href;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      tool.category.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredTools = tools.slice(0, 3);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${isDarkMode ? "dark" : ""}`}
    >
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-orange-500/15 rounded-full blur-2xl animate-pulse" />
      </div>

      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Badge variant="secondary" className="px-3 py-1">
                8 Tools
              </Badge>
              <div className="relative">
                <Input
                  id={searchId}
                  placeholder="⌘K to search tools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10"
                />
                <svg
                  className="absolute left-3 top-1/2 w-4 h-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7m0 0a7 7 0 017 14m7 0H3"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-9 h-9 p-0"
              >
                {isDarkMode ? "🌞" : "🌙"}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 text-center px-8">
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-2 text-base bg-white/10 backdrop-blur-sm"
          >
            8 Tools • 5 Categories
          </Badge>

          <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Tulkit
          </h1>

          <p className="text-xl text-gray-200 mb-8 max-w-2xl">
            because apparently, you{" "}
            <span className="font-semibold text-white">*do*</span> need another
            random tool on the internet. ¯\_(ツ)_/¯
          </p>

          <div className="flex flex-col gap-4">
            <Button
              size="lg"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            >
              <span className="mr-2">🚀</span>
              Explore All Tools
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-white/5 text-white/80 border-white/20 backdrop-blur-sm"
            >
              <span className="mr-2">📖</span>
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-16">
        {/* Category Navigation */}
        <Card className="mb-8 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  <span>{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>

            <p className="text-center text-muted-foreground text-sm">
              {selectedCategory === "all"
                ? "Showing all 8 tools"
                : `Showing ${filteredTools.length} ${filteredTools.length === 1 ? "tool" : "tools"} in ${categories.find((c) => c.id === selectedCategory)?.name?.toLowerCase() || "selected category"}`}
            </p>
          </CardContent>
        </Card>

        {/* Featured Tools */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Featured Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredTools.map((tool, index) => (
              <div
                key={tool.href}
                className="relative group"
                onMouseEnter={() => setHoveredTool(tool.href)}
                onMouseLeave={() => setHoveredTool(null)}
              >
                <ToolCard
                  href={tool.href}
                  title={tool.title}
                  description={tool.description}
                  color={tool.color}
                  icon={tool.icon}
                />
                <Badge
                  variant={tool.isNew ? "default" : "secondary"}
                  className="absolute -top-2 -right-2 z-20"
                >
                  {tool.isNew ? "New" : `${tool.usage} uses`}
                </Badge>

                {/* Hover Preview */}
                {hoveredTool === tool.href && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 backdrop-blur-sm rounded-lg p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm">
                      <h3 className="font-bold mb-2">{tool.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {tool.description}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm">Try Now</Button>
                        <Button variant="outline" size="sm">
                          Learn More
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span>All Tools</span>
              <Badge variant="outline">{filteredTools.length}</Badge>
            </CardTitle>
            <CardDescription>
              Press 1-8 to quickly jump to any tool
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.href}
                  href={tool.href}
                  title={tool.title}
                  description={tool.description}
                  color={tool.color}
                  icon={tool.icon}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts Reference */}
        <Card className="mb-8 bg-muted/30">
          <CardHeader>
            <CardTitle>⌨️ Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-semibold text-primary">Search</div>
                <div>⌘K (macOS) or Ctrl+K (Windows/Linux)</div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Quick Access</div>
                <div>Press 1-8 to jump to tools</div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Theme Toggle</div>
                <div>Click 🌞/🌙 in navigation</div>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-primary">Focus Search</div>
                <div>Type to instantly find tools</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
