export interface EnvEntry {
  key: string;
  value: string;
  lineNumber: number;
}

export interface EnvDifference {
  key: string;
  value1: string;
  value2: string;
}

export interface EnvComparisonResult {
  differences: EnvDifference[];
  onlyInFirst: EnvEntry[];
  onlyInSecond: EnvEntry[];
  identical: EnvEntry[];
  summary: {
    total: number;
    different: number;
    onlyInFirst: number;
    onlyInSecond: number;
    identical: number;
  };
}

export interface ParsedEnvFile {
  entries: EnvEntry[];
  raw: string;
}
