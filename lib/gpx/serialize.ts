interface SerializableWaypoint {
  lat: number;
  lon: number;
  name?: string;
  desc?: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function waypointsToGpx(points: SerializableWaypoint[]): string {
  const wpts = points
    .map((p) => {
      const children = [
        p.name !== undefined ? `<name>${escapeXml(p.name)}</name>` : "",
        p.desc !== undefined ? `<desc>${escapeXml(p.desc)}</desc>` : "",
      ].join("");
      return `  <wpt lat="${p.lat}" lon="${p.lon}">${children}</wpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="tulkit" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
</gpx>
`;
}
