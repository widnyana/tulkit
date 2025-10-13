"use client";

import Link from "next/link";
import { useState } from "react";
import BoundaryCheck from "./components/BoundaryCheck";
import CollisionDetector from "./components/CollisionDetector";
import ReverseLookup from "./components/ReverseLookup";
import VLSMSplitter from "./components/VLSMSplitter";

type TabType = "vlsm" | "collision" | "boundary" | "lookup";

export default function IPPlannerPage() {
  const [activeTab, setActiveTab] = useState<TabType>("vlsm");

  const tabs = [
    { id: "vlsm" as TabType, label: "VLSM Splitter", icon: "📊" },
    { id: "collision" as TabType, label: "Collision Check", icon: "🔴" },
    { id: "boundary" as TabType, label: "Boundary Check", icon: "🟡" },
    { id: "lookup" as TabType, label: "Reverse Lookup", icon: "🔍" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NetPlan</h1>
          <p className="text-gray-600">
            Plan, validate, and prevent IP address collisions with comprehensive
            subnet tools.
          </p>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              💡 About IP Space Planning
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
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
        <div className="mb-6 border-b border-gray-200">
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
                      ? "bg-white text-purple-700 border-b-2 border-purple-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
