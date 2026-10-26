export type LatLng = { latitude: number; longitude: number };
export type Point = { x: number; y: number };

export const TILE_SIZE = 256;

const MAX_LATITUDE = 85.05112878;
const EARTH_RADIUS = 6371008.8;
const EQUATOR_LENGTH = 2 * Math.PI * 6378137;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Longitude/Latitude → world pixels (Web Mercator / XYZ) at the given zoom */
export function project({ latitude, longitude }: LatLng, zoom: number): Point {
  const scale = TILE_SIZE * 2 ** zoom;
  const lat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const sin = Math.sin(toRad(lat));
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

/** World pixels → Longitude/Latitude at the given zoom */
export function unproject({ x, y }: Point, zoom: number): LatLng {
  const scale = TILE_SIZE * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return {
    latitude: (180 / Math.PI) * Math.atan(Math.sinh(n)),
    longitude: (x / scale) * 360 - 180,
  };
}

/** Ground meters covered by one screen point */
export function metersPerPixel(latitude: number, zoom: number) {
  return (EQUATOR_LENGTH * Math.cos(toRad(latitude))) / (TILE_SIZE * 2 ** zoom);
}

/** Great-circle distance in meters (haversine) */
export function distanceMeters(a: LatLng, b: LatLng) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}
