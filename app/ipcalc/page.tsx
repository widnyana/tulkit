"use client";

import { useState } from "react";
import Link from "next/link";
import BasicCalculator from "./components/BasicCalculator";
import SubnetCalculator from "./components/SubnetCalculator";
import Deaggregator from "./components/Deaggregator";

type Tab = "basic" | "subnet" | "deaggregator";

export default function IPCalcPage() {
  const [activeTab, setActiveTab] = useState<Tab>("basic");

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            IP Calculator
          </h1>
          <p className="text-gray-600">
            Comprehensive IP address calculation and subnet planning tool
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Based on ipcalc by Krischan Jodies (http://jodies.de/ipcalc)
          </p>
        </div>

        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "basic"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg text-gray-900 font-semibold mb-3">
            About This Tool
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Basic Calculator:</strong> Calculate network information
              from an IP address and netmask. Shows network, broadcast, host
              range, and special network types.
            </p>
            <p>
              <strong>Subnet / Supernet:</strong> Generate subnets when
              increasing the prefix (e.g., /24 to /26) or calculate the supernet
              when decreasing the prefix (e.g., /24 to /22).
            </p>
            <p>
              <strong>Deaggregator:</strong> Convert an IP address range into
              the optimal set of CIDR blocks. Useful for firewall rules and
              routing configurations.
            </p>
            <p className="pt-3 border-t border-gray-200 mt-3">
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
