// ─────────────────────────────────────────────
//  Map servers
//  Point these at your own server (maps.ideniox.com) once it runs
//  Photon and OSRM — the app only depends on their public APIs.
// ─────────────────────────────────────────────

/** Raster XYZ tiles */
export const TILE_URL = 'https://maps.ideniox.com/tile/{z}/{x}/{y}.png';

/** Place search — Photon API (https://github.com/komoot/photon) */
export const SEARCH_URL = 'https://photon.komoot.io/api/';

/** Walking directions — OSRM route API with the "foot" profile (https://project-osrm.org) */
export const WALK_ROUTE_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

export const MAP_ATTRIBUTION = '© ideniox · © OpenStreetMap';
