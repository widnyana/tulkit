"use client";

import { useState, useId } from "react";
import { calculateBasicInfo } from "../utils";
import type { BasicCalcResult } from "../types";

export default function BasicCalculator() {
  const [address, setAddress] = useState("");
  const [netmask, setNetmask] = useState("24");
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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Basic IP Calculator
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Calculate network information for an IP address and netmask
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label
              htmlFor={addressId}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              IP Address
            </label>
            <input
              id={addressId}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 192.168.1.1"
              className="w-full text-blue-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor={netmaskId}
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Netmask (CIDR or dotted)
            </label>
            <input
              id={netmaskId}
              type="text"
              value={netmask}
              onChange={(e) => setNetmask(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="24 or 255.255.255.0"
              className="w-full text-blue-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCalculate}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Calculate
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Network Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <InfoRow label="Address" value={result.address} />
              <InfoRow
                label="Netmask"
                value={`${result.netmask} = ${result.netmaskCIDR}`}
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
              <InfoRow label="Broadcast" value={result.broadcast} />
              <InfoRow label="HostMin" value={result.hostMin} />
              <InfoRow label="HostMax" value={result.hostMax} />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Hosts/Net" value={result.hostsNet.toString()} />
              <InfoRow label="Class" value={result.networkClass} />
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
      <span className="text-sm font-medium text-gray-600">{label}:</span>
      <span
        className={`text-sm font-mono ${
          highlight ? "text-blue-600 font-semibold" : "text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
