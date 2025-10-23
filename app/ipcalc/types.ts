/**
 * Type definitions for IP Calculator
 *
 * Based on ipcalc by Krischan Jodies
 * Copyright (C) 2000-2021 Krischan Jodies
 * Original: http://jodies.de/ipcalc
 *
 * TypeScript implementation for Tulkit
 */

export interface BasicCalcResult {
  address: string;
  netmask: string;
  netmaskCIDR: number;
  wildcard: string;
  network: string;
  broadcast: string;
  hostMin: string;
  hostMax: string;
  hostsNet: number;
  networkClass: string;
  networkType?: string;
  cidrNotation: string;
}

export interface SubnetResult {
  network: string;
  cidr: number;
  mask: string;
  broadcast: string;
  hostMin: string;
  hostMax: string;
  hostsNet: number;
  cidrNotation: string;
}

export interface SupernetResult {
  network: string;
  cidr: number;
  mask: string;
  wildcard: string;
  broadcast: string;
  hostMin: string;
  hostMax: string;
  hostsNet: number;
  cidrNotation: string;
}

export interface DeaggregationResult {
  cidrBlocks: string[];
  totalIPs: number;
  blockCount: number;
}
