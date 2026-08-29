/**
 * IP Calculator output formatting.
 *
 * The subnet math lives in lib/ip (family-generic IPv4/IPv6, BigInt based);
 * this module re-exports the operations and renders copy-to-clipboard output.
 */

import {
  calculateBasicInfo,
  calculateSubnets,
  calculateSupernet,
  deaggregate,
  formatHosts,
} from "@/lib/ip/core";
import type {
  BasicCalcResult,
  DeaggregationResult,
  SubnetResult,
  SupernetResult,
} from "./types";

export {
  calculateBasicInfo,
  calculateSubnets,
  calculateSupernet,
  deaggregate,
  formatHosts,
};

/**
 * Output formatting for copy-to-clipboard.
 * Each formatter returns markdown and plaintext renderings of a result.
 */
export interface CopyableOutput {
  markdown: string;
  plaintext: string;
}

/** Render `[label, value]` rows as a markdown table + aligned plaintext block. */
function formatRows(rows: [string, string][]): CopyableOutput {
  const markdown = [
    "| Field | Value |",
    "| --- | --- |",
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ].join("\n");

  const width = Math.max(...rows.map(([k]) => k.length));
  const plaintext = rows
    .map(([k, v]) => `${`${k}:`.padEnd(width + 2)}${v}`)
    .join("\n");

  return { markdown, plaintext };
}

/** Render objects as a markdown table + aligned plaintext columns. */
function formatTable(headers: string[], rows: string[][]): CopyableOutput {
  const markdown = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");

  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length)),
  );
  const line = (cells: string[]) =>
    cells
      .map((c, i) => c.padEnd(widths[i]))
      .join("  ")
      .trimEnd();
  const plaintext = [line(headers), ...rows.map(line)].join("\n");

  return { markdown, plaintext };
}

/** IPv6 has no broadcast; label the block's last address accordingly. */
function lastAddressLabel(family: string): string {
  return family === "ipv6" ? "Last Address" : "Broadcast";
}

export function formatBasicOutput(r: BasicCalcResult): CopyableOutput {
  const rows: [string, string][] = [
    ["Address", r.address],
    [
      "Netmask",
      r.family === "ipv6"
        ? `/${r.netmaskCIDR}`
        : `${r.netmask} = ${r.netmaskCIDR}`,
    ],
    ["Wildcard", r.wildcard],
    ["CIDR", r.cidrNotation],
    ["Network", r.network],
    [lastAddressLabel(r.family), r.broadcast],
    ["HostMin", r.hostMin],
    ["HostMax", r.hostMax],
    ["Hosts/Net", formatHosts(r.hostsNet)],
  ];
  if (r.networkClass) rows.push(["Class", r.networkClass]);
  if (r.networkType) rows.push(["Network Type", r.networkType]);
  return formatRows(rows);
}

export function formatSubnetOutput(subnets: SubnetResult[]): CopyableOutput {
  return formatTable(
    [
      "#",
      "Network",
      "CIDR",
      "Netmask",
      lastAddressLabel(subnets[0].family),
      "Hosts",
    ],
    subnets.map((s, i) => [
      String(i + 1),
      s.network,
      `/${s.cidr}`,
      s.mask,
      s.broadcast,
      formatHosts(s.hostsNet),
    ]),
  );
}

export function formatSupernetOutput(s: SupernetResult): CopyableOutput {
  const rows: [string, string][] = [
    ["Network", s.network],
    ["CIDR", s.cidrNotation],
    ["Netmask", s.mask],
    ["Wildcard", s.wildcard],
    [lastAddressLabel(s.family), s.broadcast],
    ["Host Range", `${s.hostMin} - ${s.hostMax}`],
    ["Hosts", formatHosts(s.hostsNet)],
  ];
  return formatRows(rows);
}

export function formatDeaggregationOutput(
  r: DeaggregationResult,
  startIP: string,
  endIP: string,
): CopyableOutput {
  const summary = [
    `Range: ${startIP} - ${endIP}`,
    `Total IP Addresses: ${formatHosts(r.totalIPs)}`,
    `Number of Blocks: ${r.blockCount}`,
  ];

  const markdown = [
    ...summary.map((l) => `**${l.replace(": ", ":** ")}`),
    "",
    "```",
    ...r.cidrBlocks,
    "```",
  ].join("\n");

  const plaintext = [...summary, "", ...r.cidrBlocks].join("\n");

  return { markdown, plaintext };
}
