export type ConnectionProfile = {
  effectiveType: string;
  saveData: boolean;
  slow: boolean;
};

export type ConnectionSource = {
  effectiveType?: string;
  saveData?: boolean;
};

const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g", "3g"]);

type NetworkInformation = ConnectionSource & {
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

function connectionApi(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
}

export function profileFromConnection(
  source: ConnectionSource | null | undefined,
): ConnectionProfile {
  const effectiveType = source?.effectiveType ?? "unknown";
  const saveData = source?.saveData === true;
  return {
    effectiveType,
    saveData,
    slow: saveData || SLOW_EFFECTIVE_TYPES.has(effectiveType),
  };
}

export function readConnectionProfile(): ConnectionProfile {
  return profileFromConnection(connectionApi());
}
