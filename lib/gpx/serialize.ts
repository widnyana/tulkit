import { BaseBuilder, buildGPX } from "gpx-builder";

export interface SerializableWaypoint {
  lat: number;
  lon: number;
  name?: string;
  desc?: string;
}

export interface RoutePlanPoint {
  lat: number;
  lon: number;
  name?: string;
}

export interface RoutePlanExport {
  name?: string;
  controlPoints: ReadonlyArray<RoutePlanPoint>;
  snappedPath?: ReadonlyArray<RoutePlanPoint> | null;
  waypoints?: ReadonlyArray<SerializableWaypoint>;
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

export function routeToGpx(plan: RoutePlanExport): string {
  const { Metadata, Point, Route, Segment, Track } = BaseBuilder.MODELS;
  const trimmedName = plan.name?.trim() ?? "";
  const toPoint = (point: RoutePlanPoint) =>
    new Point(point.lat, point.lon, { name: point.name });

  const builder = new BaseBuilder();

  if (trimmedName) {
    builder.setMetadata(new Metadata({ name: trimmedName }));
  }

  const waypoints = plan.waypoints;
  if (waypoints && waypoints.length > 0) {
    builder.setWayPoints(
      waypoints.map(
        (point) =>
          new Point(point.lat, point.lon, {
            name: point.name,
            desc: point.desc,
          }),
      ),
    );
  }

  const snappedPath = plan.snappedPath;
  if (snappedPath && snappedPath.length >= 2) {
    builder.setTracks([
      new Track([new Segment(snappedPath.map(toPoint))], {
        name: trimmedName || "Route",
      }),
    ]);
  } else {
    builder.setRoutes([
      new Route({
        name: trimmedName || "Route",
        rtept: plan.controlPoints.map(toPoint),
      }),
    ]);
  }

  const data = builder.toObject();
  data.attributes = { ...data.attributes, creator: "tulkit" };
  return buildGPX(data);
}
