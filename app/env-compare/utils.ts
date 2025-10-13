import type { EnvEntry, EnvComparisonResult, ParsedEnvFile } from "./types";

export function parseEnvFile(content: string): ParsedEnvFile {
  const lines = content.split("\n");
  const entries: EnvEntry[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      return;
    }

    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();

    if (key) {
      entries.push({
        key,
        value,
        lineNumber: index + 1,
      });
    }
  });

  const sorted = normalizeAndSort(entries);

  return {
    entries: sorted,
    raw: content,
  };
}

export function normalizeAndSort(entries: EnvEntry[]): EnvEntry[] {
  return [...entries].sort((a, b) => a.key.localeCompare(b.key));
}

export function compareEnvFiles(
  file1: ParsedEnvFile,
  file2: ParsedEnvFile,
): EnvComparisonResult {
  const map1 = new Map(file1.entries.map((e) => [e.key, e.value]));
  const map2 = new Map(file2.entries.map((e) => [e.key, e.value]));

  const allKeys = new Set([...map1.keys(), ...map2.keys()]);

  const differences: EnvComparisonResult["differences"] = [];
  const onlyInFirst: EnvEntry[] = [];
  const onlyInSecond: EnvEntry[] = [];
  const identical: EnvEntry[] = [];

  for (const key of allKeys) {
    const value1 = map1.get(key);
    const value2 = map2.get(key);

    if (value1 !== undefined && value2 !== undefined) {
      if (value1 === value2) {
        identical.push({ key, value: value1, lineNumber: 0 });
      } else {
        differences.push({ key, value1, value2 });
      }
    } else if (value1 !== undefined) {
      onlyInFirst.push({ key, value: value1, lineNumber: 0 });
    } else if (value2 !== undefined) {
      onlyInSecond.push({ key, value: value2, lineNumber: 0 });
    }
  }

  return {
    differences: differences.sort((a, b) => a.key.localeCompare(b.key)),
    onlyInFirst: onlyInFirst.sort((a, b) => a.key.localeCompare(b.key)),
    onlyInSecond: onlyInSecond.sort((a, b) => a.key.localeCompare(b.key)),
    identical: identical.sort((a, b) => a.key.localeCompare(b.key)),
    summary: {
      total: allKeys.size,
      different: differences.length,
      onlyInFirst: onlyInFirst.length,
      onlyInSecond: onlyInSecond.length,
      identical: identical.length,
    },
  };
}
