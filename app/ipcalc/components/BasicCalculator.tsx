"use client";

import { useState, useId } from "react";
import { calculateBasicInfo, formatBasicOutput, formatHosts } from "../utils";
import type { BasicCalcResult } from "../types";
import { useQueryState } from "../useQueryState";
import CopyableOutput from "./CopyableOutput";

export default function BasicCalculator() {
  const [address, setAddress] = useQueryState("ip");
  const [netmask, setNetmask] = useQueryState("mask", "24");
  const [result, setResult] = useState<BasicCalcResult | null>(null);
  const [error, setError] = useState("");

  const addressId = useId();
  const netmaskId = useId();

  const handleCalculate = () => {
    setError("");
    setResult(null);

    if (!address.trim()) {
      setError("Please enter an IP address");
      return;
    }

    if (!netmask.trim()) {
      setError("Please enter a netmask");
      return;
    }

    const calcResult = calculateBasicInfo(address.trim(), netmask.trim());

    if (!calcResult) {
      setError("Invalid IP address or netmask");
      return;
    }

    setResult(calcResult);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCalculate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Basic IP Calculator
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Calculate network information for an IP address and netmask
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label
              htmlFor={addressId}
              className="block text-sm font-medium text-foreground mb-2"
            >
              IP Address
            </label>
            <input
              id={addressId}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 192.168.1.1 or 2001:db8::1"
              className="w-full text-foreground px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor={netmaskId}
              className="block text-sm font-medium text-foreground mb-2"
            >
              Netmask (CIDR or dotted)
            </label>
            <input
              id={netmaskId}
              type="text"
              value={netmask}
              onChange={(e) => setNetmask(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="24, 255.255.255.0, or /64"
              className="w-full text-foreground px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          className="w-full md:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Calculate
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:border-red-900">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Network Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <InfoRow label="Address" value={result.address} />
              <InfoRow
                label="Netmask"
                value={
                  result.family === "ipv6"
                    ? `/${result.netmaskCIDR}`
                    : `${result.netmask} = ${result.netmaskCIDR}`
                }
              />
              <InfoRow label="Wildcard" value={result.wildcard} />
              <InfoRow
                label="CIDR Notation"
                value={result.cidrNotation}
                highlight
              />
            </div>

            <div className="space-y-3">
              <InfoRow label="Network" value={result.network} />
              <InfoRow
                label={result.family === "ipv6" ? "Last Address" : "Broadcast"}
                value={result.broadcast}
              />
              <InfoRow label="HostMin" value={result.hostMin} />
              <InfoRow label="HostMax" value={result.hostMax} />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Hosts/Net" value={formatHosts(result.hostsNet)} />
              {result.networkClass && (
                <InfoRow label="Class" value={result.networkClass} />
              )}
              {result.networkType && (
                <div className="md:col-span-2">
                  <InfoRow
                    label="Network Type"
                    value={result.networkType}
                    highlight
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {result && <CopyableOutput {...formatBasicOutput(result)} />}
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm font-medium text-muted-foreground">
        {label}:
      </span>
      <span
        className={`text-sm font-mono ${
          highlight ? "text-ring font-semibold" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
