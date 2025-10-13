"use client";

import { useState } from "react";
import type { SubnetInfo } from "../types";
import { reverseLookup } from "../utils";

export default function ReverseLookup() {
  const [ipAddress, setIPAddress] = useState("192.168.1.55");
  const [cidr, setCIDR] = useState(24);
  const [result, setResult] = useState<SubnetInfo | null>(null);
  const [error, setError] = useState<string>("");

  const handleLookup = () => {
    setError("");
    setResult(null);

    const lookupResult = reverseLookup(ipAddress.trim(), cidr);

    if (!lookupResult) {
      setError("Invalid IP address or CIDR value");
      return;
    }

    setResult(lookupResult);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Reverse IP Lookup
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Enter any IP address to instantly find its network and broadcast
          addresses
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="ipAddress"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              IP Address
            </label>
            <input
              id="ipAddress"
              type="text"
              value={ipAddress}
              onChange={(e) => setIPAddress(e.target.value)}
              placeholder="e.g., 192.168.1.55"
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="cidr"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Subnet CIDR Prefix
            </label>
            <input
              id="cidr"
              type="number"
              min="0"
              max="32"
              value={cidr}
              onChange={(e) => setCIDR(Number(e.target.value))}
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Common values: /24 (254 hosts), /25 (126 hosts), /26 (62 hosts)
            </p>
          </div>

          <button
            type="button"
            onClick={handleLookup}
            className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Lookup Subnet
          </button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Subnet Information
            </h3>
          </div>

          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">
                Complete CIDR Notation
              </p>
              <p className="text-2xl font-mono font-bold text-purple-700">
                {result.cidrNotation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Network Address</p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {result.network}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Broadcast Address</p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {result.broadcast}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Subnet Mask</p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {result.mask}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Usable Hosts</p>
                <p className="text-lg font-semibold text-gray-900">
                  {result.usableHosts.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Usable IP Range</p>
              <p className="text-lg font-mono text-green-800">
                {result.firstIP} <span className="text-gray-500">to</span>{" "}
                {result.lastIP}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
