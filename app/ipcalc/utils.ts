/**
 * IP Calculator Utilities
 *
 * Based on ipcalc by Krischan Jodies
 * Copyright (C) 2000-2021 Krischan Jodies
 * Original: http://jodies.de/ipcalc
 *
 * TypeScript implementation for Tulkit
 */

import type {
  BasicCalcResult,
  DeaggregationResult,
  SubnetResult,
  SupernetResult,
} from "./types";

/**
 * Convert IP address string to 32-bit integer
 */
export function ipToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (
    ((parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0
  );
}

/**
 * Convert 32-bit integer to IP address string
 */
export function intToIp(int: number): string {
  return [
    (int >>> 24) & 0xff,
    (int >>> 16) & 0xff,
    (int >>> 8) & 0xff,
    int & 0xff,
  ].join(".");
}

/**
 * Convert CIDR prefix to subnet mask
 */
export function cidrToMask(cidr: number): string {
  const mask = ~((1 << (32 - cidr)) - 1);
  return intToIp(mask >>> 0);
}

/**
 * Convert subnet mask to CIDR prefix
 */
export function maskToCIDR(mask: string): number {
  const maskInt = ipToInt(mask);
  let cidr = 0;
  for (let i = 31; i >= 0; i--) {
    if ((maskInt & (1 << i)) !== 0) {
      cidr++;
    } else {
      break;
    }
  }
  return cidr;
}

/**
 * Calculate number of usable hosts for a given CIDR
 */
export function calculateUsableHosts(cidr: number): number {
  if (cidr === 32) return 1;
  if (cidr === 31) return 2;
  return 2 ** (32 - cidr) - 2;
}

/**
 * Validate IP address format
 */
export function validateIPAddress(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = Number(part);
    return !Number.isNaN(num) && num >= 0 && num <= 255;
  });
}

/**
 * Validate subnet mask
 */
export function validateSubnetMask(mask: string): boolean {
  if (!validateIPAddress(mask)) return false;

  const maskInt = ipToInt(mask);
  let sawZero = false;

  for (let i = 31; i >= 0; i--) {
    const bit = (maskInt >>> i) & 1;
    if (bit === 0) {
      sawZero = true;
    } else if (sawZero) {
      return false;
    }
  }

  return true;
}

/**
 * Determine network class based on first octet
 */
export function getNetworkClass(ip: string): string {
  const firstOctet = Number.parseInt(ip.split(".")[0], 10);

  if (firstOctet >= 1 && firstOctet <= 126) return "A";
  if (firstOctet >= 128 && firstOctet <= 191) return "B";
  if (firstOctet >= 192 && firstOctet <= 223) return "C";
  if (firstOctet >= 224 && firstOctet <= 239) return "D (Multicast)";
  if (firstOctet >= 240 && firstOctet <= 255) return "E (Reserved)";

  return "Invalid";
}

/**
 * Identify special network types (RFC 1918, loopback, etc.)
 */
export function getNetworkType(network: string, cidr: number): string | undefined {
  const networkInt = ipToInt(network);

  const specialNetworks = [
    {
      start: ipToInt("192.168.0.0"),
      end: ipToInt("192.168.255.255"),
      type: "Private Internet (RFC 1918)",
    },
    {
      start: ipToInt("172.16.0.0"),
      end: ipToInt("172.31.255.255"),
      type: "Private Internet (RFC 1918)",
    },
    {
      start: ipToInt("10.0.0.0"),
      end: ipToInt("10.255.255.255"),
      type: "Private Internet (RFC 1918)",
    },
    {
      start: ipToInt("169.254.0.0"),
      end: ipToInt("169.254.255.255"),
      type: "APIPA (RFC 3330)",
    },
    {
      start: ipToInt("127.0.0.0"),
      end: ipToInt("127.255.255.255"),
      type: "Loopback (RFC 1700)",
    },
    {
      start: ipToInt("224.0.0.0"),
      end: ipToInt("239.255.255.255"),
      type: "Multicast (RFC 3171)",
    },
  ];

  const broadcastInt = (networkInt | ((1 << (32 - cidr)) - 1)) >>> 0;

  for (const special of specialNetworks) {
    if (networkInt <= special.end && broadcastInt >= special.start) {
      return special.type;
    }
  }

  if (cidr === 31) {
    return "Point-to-Point Link (RFC 3021)";
  }

  return undefined;
}

/**
 * Calculate basic IP information
 */
export function calculateBasicInfo(
  address: string,
  netmask: string,
): BasicCalcResult | null {
  if (!validateIPAddress(address)) return null;

  let cidr: number;
  let maskStr: string;

  if (netmask.includes(".")) {
    if (!validateSubnetMask(netmask)) return null;
    cidr = maskToCIDR(netmask);
    maskStr = netmask;
  } else {
    cidr = Number(netmask);
    if (Number.isNaN(cidr) || cidr < 0 || cidr > 32) return null;
    maskStr = cidrToMask(cidr);
  }

  const addressInt = ipToInt(address);
  const maskInt = ipToInt(maskStr);
  const networkInt = (addressInt & maskInt) >>> 0;
  const wildcardInt = (~maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;

  const network = intToIp(networkInt);
  const broadcast = intToIp(broadcastInt);
  const wildcard = intToIp(wildcardInt);

  const hostsNet = calculateUsableHosts(cidr);
  const hostMinInt = cidr === 32 ? networkInt : networkInt + 1;
  const hostMaxInt = cidr === 32 ? networkInt : broadcastInt - 1;

  const hostMin = intToIp(hostMinInt);
  const hostMax = intToIp(hostMaxInt);

  const networkClass = getNetworkClass(address);
  const networkType = getNetworkType(network, cidr);

  return {
    address,
    netmask: maskStr,
    netmaskCIDR: cidr,
    wildcard,
    network,
    broadcast,
    hostMin,
    hostMax,
    hostsNet,
    networkClass,
    networkType,
    cidrNotation: `${network}/${cidr}`,
  };
}

/**
 * Calculate subnets when moving to a larger prefix (smaller network)
 */
export function calculateSubnets(
  baseNetwork: string,
  baseCIDR: number,
  newCIDR: number,
): SubnetResult[] | null {
  if (newCIDR <= baseCIDR || newCIDR > 32) return null;

  const baseNetworkInt = ipToInt(baseNetwork);
  const subnetCount = 2 ** (newCIDR - baseCIDR);
  const subnetSize = 2 ** (32 - newCIDR);

  const results: SubnetResult[] = [];

  for (let i = 0; i < subnetCount && i < 1000; i++) {
    const networkInt = baseNetworkInt + i * subnetSize;
    const broadcastInt = (networkInt + subnetSize - 1) >>> 0;
    const hostsNet = calculateUsableHosts(newCIDR);

    const hostMinInt = newCIDR === 32 ? networkInt : networkInt + 1;
    const hostMaxInt = newCIDR === 32 ? networkInt : broadcastInt - 1;

    results.push({
      network: intToIp(networkInt),
      cidr: newCIDR,
      mask: cidrToMask(newCIDR),
      broadcast: intToIp(broadcastInt),
      hostMin: intToIp(hostMinInt),
      hostMax: intToIp(hostMaxInt),
      hostsNet,
      cidrNotation: `${intToIp(networkInt)}/${newCIDR}`,
    });
  }

  return results;
}

/**
 * Calculate supernet when moving to a smaller prefix (larger network)
 */
export function calculateSupernet(
  baseNetwork: string,
  baseCIDR: number,
  newCIDR: number,
): SupernetResult | null {
  if (newCIDR >= baseCIDR || newCIDR < 0) return null;

  const baseNetworkInt = ipToInt(baseNetwork);
  const maskInt = ~((1 << (32 - newCIDR)) - 1) >>> 0;
  const supernetInt = (baseNetworkInt & maskInt) >>> 0;
  const wildcardInt = (~maskInt) >>> 0;
  const broadcastInt = (supernetInt | wildcardInt) >>> 0;

  const hostsNet = calculateUsableHosts(newCIDR);
  const hostMinInt = newCIDR === 32 ? supernetInt : supernetInt + 1;
  const hostMaxInt = newCIDR === 32 ? supernetInt : broadcastInt - 1;

  return {
    network: intToIp(supernetInt),
    cidr: newCIDR,
    mask: cidrToMask(newCIDR),
    wildcard: intToIp(wildcardInt),
    broadcast: intToIp(broadcastInt),
    hostMin: intToIp(hostMinInt),
    hostMax: intToIp(hostMaxInt),
    hostsNet,
    cidrNotation: `${intToIp(supernetInt)}/${newCIDR}`,
  };
}

/**
 * Deaggregate IP address range into CIDR blocks
 * Converts a range (e.g., 192.168.1.10 - 192.168.1.100) into optimal CIDR blocks
 */
export function deaggregate(
  startIP: string,
  endIP: string,
): DeaggregationResult | null {
  if (!validateIPAddress(startIP) || !validateIPAddress(endIP)) return null;

  let start = ipToInt(startIP);
  const end = ipToInt(endIP);

  if (start > end) return null;

  const cidrBlocks: string[] = [];
  let totalIPs = 0;

  while (start <= end) {
    let step = 0;

    while ((start | (1 << step)) === start) {
      const mask = (1 << (step + 1)) - 1;
      if ((start | mask) > end) break;
      step++;
    }

    const cidr = 32 - step;
    cidrBlocks.push(`${intToIp(start)}/${cidr}`);
    totalIPs += 1 << step;
    start += 1 << step;
  }

  return {
    cidrBlocks,
    totalIPs,
    blockCount: cidrBlocks.length,
  };
}
