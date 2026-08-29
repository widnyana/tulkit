/**
 * ipcalc result types. The family-generic result types live in lib/ip/types
 * (the shared IPv4/IPv6 core); re-exported here so components can keep
 * importing from "../types".
 */

export type {
  BasicCalcResult,
  DeaggregationResult,
  SubnetResult,
  SupernetResult,
} from "@/lib/ip/types";
