export interface SubnetInfo {
  network: string;
  broadcast: string;
  mask: string;
  cidr: number;
  usableHosts: number | string;
  firstIP: string;
  lastIP: string;
  cidrNotation: string;
}

export interface VLSMRequest {
  parentBlock: string;
  requiredSizes: number[];
}

export interface VLSMResult {
  network: string;
  cidr: number;
  mask: string;
  usableHosts: number | string;
  firstIP: string;
  lastIP: string;
  cidrNotation: string;
}

export interface CollisionCheck {
  hasCollision: boolean;
  overlappingSubnets: string[];
  message: string;
}

export interface BoundaryCheckResult {
  suggestedMask: number;
  network: string;
  broadcast: string;
  isValid: boolean;
  warning?: string;
}
