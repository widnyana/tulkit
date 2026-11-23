export interface LatLon {
  lat: number;
  lon: number;
  ele?: number;
}

export interface Waypoint extends LatLon {
  name?: string;
  desc?: string;
}

export interface Route {
  name?: string;
  points: LatLon[];
}

export interface Track {
  name?: string;
  segments: LatLon[][];
}

export interface ParsedGpx {
  waypoints: Waypoint[];
  routes: Route[];
  tracks: Track[];
  skipped: number;
}

export interface ParseError {
  message: string;
}

export interface MapsWaypoint extends LatLon {
  name?: string;
}

export interface MapsLinkError {
  message: string;
}
