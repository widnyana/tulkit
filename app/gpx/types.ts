export interface LatLon {
  lat: number;
  lon: number;
  ele?: number;
}

export interface Waypoint extends LatLon {
  name?: string;
  desc?: string;
  sym?: string;
}

export interface Route {
  name?: string;
  points: LatLon[];
}

export interface Track {
  name?: string;
  segments: LatLon[][];
}

export interface GpxBounds {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export interface GpxLink {
  href?: string;
  text?: string;
  type?: string;
}

export interface GpxMetadata {
  name?: string;
  desc?: string;
  author?: string;
  email?: string;
  link?: GpxLink;
  time?: string;
  keywords?: string[];
  bounds?: GpxBounds;
}

export interface ParsedGpx {
  waypoints: Waypoint[];
  routes: Route[];
  tracks: Track[];
  skipped: number;
  metadata?: GpxMetadata;
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
