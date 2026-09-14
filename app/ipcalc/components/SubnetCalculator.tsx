"use client";

import { useState, useId } from "react";
import {
  calculateBasicInfo,
  calculateSubnets,
  calculateSupernet,
  formatHosts,
  formatSubnetOutput,
  formatSupernetOutput,
} from "../utils";
import type { SubnetResult, SupernetResult } from "../types";
import { useQueryState } from "../useQueryState";
import CopyableOutput from "./CopyableOutput";

export default function SubnetCalculator() {
  const [baseNetwork, setBaseNetwork] = useQueryState("ip");
  const [baseMask, setBaseMask] = useQueryState("mask", "24");
  const [newMask, setNewMask] = useQueryState("newMask", "26");
  const [subnets, setSubnets] = useState<SubnetResult[] | null>(null);
  const [supernet, setSupernet] = useState<SupernetResult | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"subnet" | "supernet">("subnet");

  const baseNetworkId = useId();
  const baseMaskId = useId();
  const newMaskId = useId();

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
    const maxPrefix = baseInfo.family === "ipv6" ? 128 : 32;

    if (Number.isNaN(newCIDRNum) || newCIDRNum < 0 || newCIDRNum > maxPrefix) {
      setError(
        `Invalid new prefix (0-${maxPrefix} for ${baseInfo.family === "ipv6" ? "IPv6" : "IPv4"})`,
      );
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
      <div className="bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Subnet / Supernet Calculator
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Calculate subnets (larger prefix) or supernets (smaller prefix) from a
          base network
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label
              htmlFor={baseNetworkId}
              className="block text-sm font-medium text-foreground mb-2"
            >
              Base Network
            </label>
            <input
              id={baseNetworkId}
              type="text"
              value={baseNetwork}
              onChange={(e) => setBaseNetwork(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 192.168.1.0 or 2001:db8::"
              className="w-full text-foreground px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor={baseMaskId}
              className="block text-sm font-medium text-foreground mb-2"
            >
              Base Netmask (CIDR)
            </label>
            <input
              id={baseMaskId}
              type="text"
              value={baseMask}
              onChange={(e) => setBaseMask(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="24 or /64"
              className="w-full text-foreground px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor={newMaskId}
              className="block text-sm font-medium text-foreground mb-2"
            >
              New Netmask (CIDR)
            </label>
            <input
              id={newMaskId}
              type="text"
              value={newMask}
              onChange={(e) => setNewMask(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="26 or /80"
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

      {mode === "supernet" && supernet && (
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Supernet</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    CIDR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Netmask
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Wildcard
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {supernet.family === "ipv6" ? "Last Address" : "Broadcast"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Hosts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                <tr className="hover:bg-muted">
                  <td className="px-4 py-3 text-sm font-mono text-foreground">
                    {supernet.network}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-ring font-semibold">
                    /{supernet.cidr}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground">
                    {supernet.mask}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground">
                    {supernet.wildcard}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground">
                    {supernet.broadcast}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground">
                    {formatHosts(supernet.hostsNet)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-900">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Host Range:</strong> {supernet.hostMin} -{" "}
              {supernet.hostMax}
            </p>
          </div>
          <div className="mt-6">
            <CopyableOutput {...formatSupernetOutput(supernet)} />
          </div>
        </div>
      )}

      {mode === "subnet" && subnets && subnets.length > 0 && (
        <div className="bg-card rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Subnets ({subnets.length} total)
          </h3>
          {subnets.length >= 1000 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950 dark:border-yellow-900">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Showing first 1000 subnets (of many more possible)
              </p>
            </div>
          )}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    CIDR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Netmask
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {subnets[0].family === "ipv6"
                      ? "Last Address"
                      : "Broadcast"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Hosts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {subnets.map((subnet, index) => (
                  <tr key={subnet.network} className="hover:bg-muted">
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground">
                      {subnet.network}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-ring font-semibold">
                      /{subnet.cidr}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground">
                      {subnet.mask}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground">
                      {subnet.broadcast}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-foreground">
                      {formatHosts(subnet.hostsNet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-900">
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>Total Subnets:</strong> {subnets.length.toLocaleString()}{" "}
              | <strong>Hosts per Subnet:</strong>{" "}
              {formatHosts(subnets[0].hostsNet)}
            </p>
          </div>
          <div className="mt-6">
            <CopyableOutput {...formatSubnetOutput(subnets)} />
          </div>
        </div>
      )}
    </div>
  );
}
