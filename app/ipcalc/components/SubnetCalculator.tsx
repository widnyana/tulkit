"use client";

import { useState } from "react";
import {
  calculateBasicInfo,
  calculateSubnets,
  calculateSupernet,
} from "../utils";
import type { SubnetResult, SupernetResult } from "../types";

export default function SubnetCalculator() {
  const [baseNetwork, setBaseNetwork] = useState("");
  const [baseMask, setBaseMask] = useState("24");
  const [newMask, setNewMask] = useState("26");
  const [subnets, setSubnets] = useState<SubnetResult[] | null>(null);
  const [supernet, setSupernet] = useState<SupernetResult | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"subnet" | "supernet">("subnet");

  const handleCalculate = () => {
    setError("");
    setSubnets(null);
    setSupernet(null);

    if (!baseNetwork.trim() || !baseMask.trim() || !newMask.trim()) {
      setError("Please fill in all fields");
      return;
    }

    const baseInfo = calculateBasicInfo(baseNetwork.trim(), baseMask.trim());
    if (!baseInfo) {
      setError("Invalid base network or netmask");
      return;
    }

    const baseCIDR = baseInfo.netmaskCIDR;
    const newCIDRNum = Number(newMask);

    if (Number.isNaN(newCIDRNum) || newCIDRNum < 0 || newCIDRNum > 32) {
      setError("Invalid new netmask");
      return;
    }

    if (newCIDRNum > baseCIDR) {
      setMode("subnet");
      const results = calculateSubnets(baseInfo.network, baseCIDR, newCIDRNum);
      if (!results) {
        setError("Failed to calculate subnets");
        return;
      }
      setSubnets(results);
    } else if (newCIDRNum < baseCIDR) {
      setMode("supernet");
      const result = calculateSupernet(baseInfo.network, baseCIDR, newCIDRNum);
      if (!result) {
        setError("Failed to calculate supernet");
        return;
      }
      setSupernet(result);
    } else {
      setError("New netmask must be different from base netmask");
    }
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
          Subnet / Supernet Calculator
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Calculate subnets (larger prefix) or supernets (smaller prefix) from a
          base network
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label
              htmlFor="baseNetwork"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Base Network
            </label>
            <input
              id="baseNetwork"
              type="text"
              value={baseNetwork}
              onChange={(e) => setBaseNetwork(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 192.168.1.0"
              className="w-full text-blue-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="baseMask"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Base Netmask (CIDR)
            </label>
            <input
              id="baseMask"
              type="text"
              value={baseMask}
              onChange={(e) => setBaseMask(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="24"
              className="w-full text-blue-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="newMask"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Netmask (CIDR)
            </label>
            <input
              id="newMask"
              type="text"
              value={newMask}
              onChange={(e) => setNewMask(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="26"
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

      {mode === "supernet" && supernet && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Supernet</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CIDR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Netmask
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wildcard
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Broadcast
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hosts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {supernet.network}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                    /{supernet.cidr}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {supernet.mask}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {supernet.wildcard}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {supernet.broadcast}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {supernet.hostsNet.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Host Range:</strong> {supernet.hostMin} -{" "}
              {supernet.hostMax}
            </p>
          </div>
        </div>
      )}

      {mode === "subnet" && subnets && subnets.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Subnets ({subnets.length} total)
          </h3>
          {subnets.length >= 1000 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Showing first 1000 subnets (of many more possible)
              </p>
            </div>
          )}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CIDR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Netmask
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Broadcast
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hosts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subnets.map((subnet, index) => (
                  <tr key={subnet.network} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {subnet.network}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                      /{subnet.cidr}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {subnet.mask}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {subnet.broadcast}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {subnet.hostsNet.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Total Subnets:</strong> {subnets.length.toLocaleString()}{" "}
              | <strong>Hosts per Subnet:</strong>{" "}
              {subnets[0].hostsNet.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
