"use client";

import { Suspense } from "react";
import Link from "next/link";
import BasicCalculator from "./components/BasicCalculator";
import SubnetCalculator from "./components/SubnetCalculator";
import Deaggregator from "./components/Deaggregator";
import { useQueryState } from "./useQueryState";

type Tab = "basic" | "subnet" | "deaggregator";

export default function IPCalcPage() {
  return (
    <Suspense fallback={null}>
      <IPCalcContent />
    </Suspense>
  );
}

function IPCalcContent() {
  const [tab, setTab] = useQueryState("tab", "basic");
  const activeTab = tab as Tab;
  const setActiveTab = (t: Tab) => setTab(t);

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
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
          <h1 className="text-3xl font-bold text-foreground mb-2">
            IP Calculator
          </h1>
          <p className="text-muted-foreground mb-4">
            Comprehensive IPv4 &amp; IPv6 address calculation and subnet
            planning tool
          </p>
          <p className="sr-only">
            Full IPv4 and IPv6 support. Punch in an IP address and CIDR prefix
            (or netmask) to get the complete breakdown: network address, the
            last address of the block, first and last usable hosts, total hosts,
            and the block's RFC range type. Includes a deaggregator for
            aggregates — paste a start and end address (either address family)
            and it'll collapse the range into the minimal CIDR prefix list.
            Useful for quick network math, ACL planning, or when you need to
            verify that{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
              192.168.1.0/24
            </code>{" "}
            or{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
              2001:db8::/32
            </code>{" "}
            actually covers what you think it does. Runs entirely in your
            browser.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            IPv4 &amp; IPv6 supported · Based on ipcalc by Krischan Jodies
            (http://jodies.de/ipcalc)
          </p>
        </div>

        <div className="mb-6 border-b border-border">
          <nav className="flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "basic"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              Basic Calculator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("subnet")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "subnet"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              Subnet / Supernet
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deaggregator")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "deaggregator"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              Deaggregator
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "basic" && <BasicCalculator />}
          {activeTab === "subnet" && <SubnetCalculator />}
          {activeTab === "deaggregator" && <Deaggregator />}
        </div>

        <div className="mt-8 bg-card rounded-lg shadow p-6">
          <h3 className="text-lg text-foreground font-semibold mb-3">
            About This Tool
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Basic Calculator:</strong> Calculate network information
              for IPv4 or IPv6 addresses from a netmask or prefix. Shows
              network, the last address of the block, host range, and the
              address's RFC range type (RFC 1918 for IPv4, ULA/link-local for
              IPv6, etc.).
            </p>
            <p>
              <strong>Subnet / Supernet:</strong> Generate subnets when
              increasing the prefix (e.g., /24 to /26) or calculate the supernet
              when decreasing the prefix (e.g., /24 to /22). Works for both IPv4
              (prefix up to /32) and IPv6 (prefix up to /128).
            </p>
            <p>
              <strong>Deaggregator:</strong> Convert an IP address range — IPv4
              or IPv6 — into the optimal set of CIDR blocks. Useful for firewall
              rules and routing configurations.
            </p>
            <p className="pt-3 border-t border-border mt-3">
              <strong>Credits:</strong> This tool is based on the excellent{" "}
              <a
                href="http://jodies.de/ipcalc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                ipcalc
              </a>{" "}
              by Krischan Jodies (2000-2021).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
