"use client";

import { useState, useId } from "react";
import { deaggregate, formatDeaggregationOutput, formatHosts } from "../utils";
import type { DeaggregationResult } from "../types";
import { useQueryState } from "../useQueryState";
import CopyableOutput from "./CopyableOutput";

export default function Deaggregator() {
  const [startIP, setStartIP] = useQueryState("ip");
  const [endIP, setEndIP] = useQueryState("end");
  const [result, setResult] = useState<DeaggregationResult | null>(null);
  const [error, setError] = useState("");

  const startIPId = useId();
  const endIPId = useId();

  const handleCalculate = () => {
    setError("");
    setResult(null);

    if (!startIP.trim() || !endIP.trim()) {
      setError("Please enter both start and end IP addresses");
      return;
    }

    const deaggResult = deaggregate(startIP.trim(), endIP.trim());

    if (!deaggResult) {
      setError("Invalid IP addresses or invalid range");
      return;
    }

    setResult(deaggResult);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCalculate();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCopyAll = () => {
    if (result) {
      const text = result.cidrBlocks.join("\n");
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Deaggregator (IP Range to CIDR)
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Convert an IP address range into optimal CIDR blocks
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor={startIPId}
              className="block text-sm font-medium text-foreground mb-2"
            >
              Start IP Address
            </label>
            <input
              id={startIPId}
              type="text"
              value={startIP}
              onChange={(e) => setStartIP(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 192.168.1.10 or 2001:db8::1"
              className="w-full text-foreground px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor={endIPId}
              className="block text-sm font-medium text-foreground mb-2"
            >
              End IP Address
            </label>
            <input
              id={endIPId}
              type="text"
              value={endIP}
              onChange={(e) => setEndIP(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 192.168.1.100 or 2001:db8::ff"
              className="w-full px-4 text-foreground py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          className="w-full md:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Calculate CIDR Blocks
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-900">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-card rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">CIDR Blocks</h3>
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Copy All
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-900">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-300">
                  Total IP Addresses:
                </span>
                <span className="ml-2 text-blue-900 font-mono dark:text-blue-300">
                  {formatHosts(result.totalIPs)}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-300">
                  Number of Blocks:
                </span>
                <span className="ml-2 text-blue-900 font-mono dark:text-blue-300">
                  {result.blockCount}
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800 dark:text-blue-300">
                  Range:
                </span>
                <span className="ml-2 text-blue-900 font-mono dark:text-blue-300">
                  {startIP} - {endIP}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.cidrBlocks.map((block, index) => (
              <div
                key={block}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground font-medium w-12">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-mono font-semibold text-foreground">
                    {block}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(block)}
                  className="px-3 py-1 text-xs bg-background text-muted-foreground rounded border border-border hover:bg-muted transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-900">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Info:</strong> These CIDR blocks optimally cover the
              specified IP range. You can use them for routing, firewall rules,
              or network configuration.
            </p>
          </div>

          <div className="mt-6">
            <CopyableOutput
              {...formatDeaggregationOutput(result, startIP, endIP)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
