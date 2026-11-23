import { BaseBuilder, buildGPX } from "gpx-builder";

interface SerializableWaypoint {
  lat: number;
  lon: number;
  name?: string;
  desc?: string;
}

export function waypointsToGpx(points: SerializableWaypoint[]): string {
  const { Point } = BaseBuilder.MODELS;
  const builder = new BaseBuilder().setWayPoints(
    points.map(
      (point) =>
        new Point(point.lat, point.lon, {
          name: point.name,
          desc: point.desc,
        }),
    ),
  );
  const data = builder.toObject();
  data.attributes = { ...data.attributes, creator: "tulkit" };
  return buildGPX(data);
}
