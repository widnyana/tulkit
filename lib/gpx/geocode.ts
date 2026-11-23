const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const RESULT_LIMIT = 5;

export interface PlaceResult {
  lat: number;
  lon: number;
  label: string;
}

interface NominatimEntry {
  readonly lat?: unknown;
  readonly lon?: unknown;
  readonly display_name?: unknown;
}

function toPlaceResult(entry: NominatimEntry): PlaceResult | null {
  const lat = Number(entry.lat);
  const lon = Number(entry.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const label =
    typeof entry.display_name === "string" && entry.display_name !== ""
      ? entry.display_name
      : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  return { lat, lon, label };
}

export async function searchPlace(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (trimmed === "") return [];

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", String(RESULT_LIMIT));

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return [];

    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];

    const results: PlaceResult[] = [];
    for (const entry of data) {
      if (typeof entry !== "object" || entry === null) continue;
      const result = toPlaceResult(entry as NominatimEntry);
      if (result) results.push(result);
    }
    return results;
  } catch {
    return [];
  }
}
