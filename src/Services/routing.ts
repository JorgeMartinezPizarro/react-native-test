import { WALK_ROUTE_URL } from '../config';
import { LatLng } from '../Utils/geo';

export interface Maneuver {
  type: string;
  modifier?: string;
  exit?: number;
  bearing_after: number;
}

export interface RouteStep {
  instruction: string;
  /** Meters to walk after this maneuver */
  distance: number;
  maneuver: Maneuver;
}

export interface WalkingRoute {
  /** Requested start/end. The path itself starts/ends where OSRM snapped them onto a walkable way */
  from: LatLng;
  to: LatLng;
  coordinates: LatLng[];
  /** Meters */
  distance: number;
  /** Seconds */
  duration: number;
  steps: RouteStep[];
}

interface OsrmStep {
  name: string;
  distance: number;
  maneuver: Maneuver;
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: { steps: OsrmStep[] }[];
  }[];
}

export async function fetchWalkingRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<WalkingRoute> {
  const points = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const res = await fetch(`${WALK_ROUTE_URL}/${points}?overview=full&geometries=geojson&steps=true`, { signal });
  const data: OsrmResponse = await res.json();
  const route = data.routes?.[0];
  if (!res.ok || data.code !== 'Ok' || !route) throw new Error(data.message ?? `Routing failed (${res.status})`);

  return {
    from,
    to,
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    distance: route.distance,
    duration: route.duration,
    steps: route.legs
      .flatMap(leg => leg.steps)
      .map(step => ({ instruction: describe(step), distance: step.distance, maneuver: step.maneuver })),
  };
}

// ─────────────────────────────────────────────
//  Spanish instructions from OSRM maneuvers
// ─────────────────────────────────────────────

const TURNS: Record<string, string> = {
  uturn: 'Da la vuelta',
  'sharp right': 'Gira bruscamente a la derecha',
  right: 'Gira a la derecha',
  'slight right': 'Gira ligeramente a la derecha',
  straight: 'Sigue recto',
  'slight left': 'Gira ligeramente a la izquierda',
  left: 'Gira a la izquierda',
  'sharp left': 'Gira bruscamente a la izquierda',
};

const PREFIXES: Record<string, string> = {
  'end of road': 'Al final de la calle, ',
};

const CARDINALS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];

function describe({ name, maneuver }: OsrmStep) {
  const { type, modifier, exit, bearing_after } = maneuver;
  const onto = name ? ` por ${name}` : '';

  switch (type) {
    case 'depart':
      return `Camina hacia el ${CARDINALS[Math.round(bearing_after / 45) % 8]}${onto}`;
    case 'arrive':
      return 'Has llegado a tu destino';
    case 'roundabout':
    case 'rotary':
      return exit ? `En la rotonda, toma la ${exit}.ª salida${onto}` : `Cruza la rotonda${onto}`;
    case 'exit roundabout':
    case 'exit rotary':
      return `Sal de la rotonda${onto}`;
    case 'fork': {
      const side = modifier?.includes('left') ? 'izquierda' : modifier?.includes('right') ? 'derecha' : null;
      return side ? `En la bifurcación, mantente a la ${side}${onto}` : `En la bifurcación, sigue recto${onto}`;
    }
    case 'new name':
    case 'continue':
      if (!modifier || modifier === 'straight') return name ? `Continúa por ${name}` : 'Sigue recto';
  }

  const turn = TURNS[modifier ?? 'straight'] ?? TURNS.straight;
  const prefix = PREFIXES[type];
  return (prefix ? prefix + turn.charAt(0).toLowerCase() + turn.slice(1) : turn) + onto;
}
