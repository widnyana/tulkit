import type { Waypoint } from "../../app/gpx/types.ts";

export interface CsvParseResult {
  waypoints: { row: number; waypoint: Waypoint }[];
  errors: { row: number; message: string }[];
}

function col(cols: string[], index: number): string {
  return (cols[index] ?? "").trim();
}

export function parseWaypointCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/);
  const waypoints: { row: number; waypoint: Waypoint }[] = [];
  const errors: { row: number; message: string }[] = [];

  const headerCols = (lines[0] ?? "").split(",").map((c) => c.trim().toLowerCase());
  const latIndex = headerCols.indexOf("latitude");
  const lonIndex = headerCols.indexOf("longitude");
  const nameIndex = headerCols.indexOf("name");
  const descIndex = headerCols.indexOf("description");

  if (latIndex === -1 || lonIndex === -1) {
    errors.push({
      row: 1,
      message: "Header row must include Latitude and Longitude columns",
    });
    return { waypoints, errors };
  }

  const requiredCols = Math.max(latIndex, lonIndex) + 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const row = i + 1;
    if (line.trim() === "") continue;

    const cols = line.split(",");
    if (cols.length < requiredCols) {
      errors.push({ row, message: `Row ${row} has too few columns` });
      continue;
    }

    const lat = Number(col(cols, latIndex));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.push({ row, message: `Row ${row} has an invalid latitude` });
      continue;
    }

    const lon = Number(col(cols, lonIndex));
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      errors.push({ row, message: `Row ${row} has an invalid longitude` });
      continue;
    }

    const name = nameIndex === -1 ? "" : col(cols, nameIndex);
    const desc = descIndex === -1 ? "" : col(cols, descIndex);

    waypoints.push({
      row,
      waypoint: {
        lat,
        lon,
        name: name === "" ? `Waypoint ${row}` : name,
        desc: desc === "" ? undefined : desc,
      },
    });
  }

  return { waypoints, errors };
}
