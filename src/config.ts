// ─────────────────────────────────────────────
//  Map servers — all on maps.ideniox.com (ideniox, stack maps)
//  Public fallbacks with the same APIs: https://photon.komoot.io/api/ and
//  https://routing.openstreetmap.de/routed-foot/route/v1/foot
// ─────────────────────────────────────────────

/** Raster XYZ tiles */
export const TILE_URL = 'https://maps.ideniox.com/tile/{z}/{x}/{y}.png';

/** Place search — Photon API (https://github.com/komoot/photon) */
export const SEARCH_URL = 'https://maps.ideniox.com/photon/api';

/** Walking directions — OSRM route API with the "foot" profile (https://project-osrm.org) */
export const WALK_ROUTE_URL = 'https://maps.ideniox.com/osrm/route/v1/foot';

export const MAP_ATTRIBUTION = '© ideniox · © OpenStreetMap';
