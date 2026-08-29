/**
 * ip-planner UI types. The family-generic result types live in lib/ip/types
 * (the shared IPv4/IPv6 core); they are re-exported here so components can
 * keep importing from "../types". VLSMRequest is UI-only.
 */

export type {
  BoundaryCheckResult,
  CollisionCheck,
  SubnetInfo,
  VLSMResult,
} from "@/lib/ip/types";

export interface VLSMRequest {
  parentBlock: string;
  requiredSizes: number[];
}
