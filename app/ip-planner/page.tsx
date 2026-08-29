"use client";

import Link from "next/link";
import { Suspense } from "react";
import BoundaryCheck from "./components/BoundaryCheck";
import CollisionDetector from "./components/CollisionDetector";
import ReverseLookup from "./components/ReverseLookup";
import VLSMSplitter from "./components/VLSMSplitter";
import { useQueryState } from "./useQueryState";

type TabType = "vlsm" | "collision" | "boundary" | "lookup";

export default function IPPlannerPage() {
  return (
    <Suspense fallback={null}>
      <IPPlannerContent />
    </Suspense>
  );
}

function IPPlannerContent() {
  const [tab, setTab] = useQueryState("tab", "vlsm");

  const tabs = [
    { id: "vlsm" as TabType, label: "VLSM Splitter", icon: "📊" },
    { id: "collision" as TabType, label: "Collision Check", icon: "🔴" },
    { id: "boundary" as TabType, label: "Boundary Check", icon: "🟡" },
    { id: "lookup" as TabType, label: "Reverse Lookup", icon: "🔍" },
  ];

  // Guard the raw query-string value against the union; unknown values ↯ "vlsm".
  const activeTab: TabType = tabs.some((t) => t.id === tab)
    ? (tab as TabType)
    : "vlsm";
  const setActiveTab = (t: TabType) => setTab(t);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">NetPlan</h1>
          <p className="text-muted-foreground mb-4">
            Plan, validate, and prevent IP address collisions with comprehensive
            IPv4 &amp; IPv6 subnet tools.
          </p>
          <p className="sr-only">
            Full IPv4 and IPv6 support. Plan and visualize IP subnet allocations
            without fighting a calculator. Enter your network address and prefix
            length, then generate subnets with whatever sizes you need: /24 for
            offices, /29 for point-to-point links, /32 for loopbacks, or IPv6
            blocks like 2001:db8::/48. The tool shows address ranges, usable
            hosts, and CIDR notations in a clean table. Useful for network
            documentation, lab setups, or that moment when you realize you've
            backed yourself into a corner with 10.0.0.0/8.
          </p>

          <div className="mt-8 bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              💡 About IP Space Planning
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>
                <strong>VLSM Splitter:</strong> Efficiently divide large
                networks into smaller subnets
              </li>
              <li>
                <strong>Collision Check:</strong> Prevent network outages by
                detecting IP overlaps
              </li>
              <li>
                <strong>Boundary Check:</strong> Find optimal subnet masks and
                verify boundaries
              </li>
              <li>
                <strong>Reverse Lookup:</strong> Quickly identify network
                details for any IP
              </li>
            </ul>
          </div>
        </header>
        <div className="mb-6 border-b border-border">
          <nav className="flex flex-wrap gap-2" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 font-medium text-sm rounded-t-lg transition-colors
                  ${
                    activeTab === tab.id
                      ? "bg-background text-purple-700 border-b-2 border-purple-700"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }
                `}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="transition-all duration-300">
          {activeTab === "vlsm" && <VLSMSplitter />}
          {activeTab === "collision" && <CollisionDetector />}
          {activeTab === "boundary" && <BoundaryCheck />}
          {activeTab === "lookup" && <ReverseLookup />}
        </div>
      </div>
    </div>
  );
}
