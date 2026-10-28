// Turn-by-turn guidance: where the user is along the route, which maneuver comes next and what to say about it.
import { WalkingRoute } from '../Services/routing';
import { LatLng, distanceMeters, projectOnPath } from './geo';

// A maneuver is announced twice: a heads-up at PREPARE meters, then "now" at NOW meters
const PREPARE_METERS = 50;
const NOW_METERS = 15;
// The heads-up is skipped when the stretch before the maneuver is too short to be worth two messages
const MIN_STRETCH_FOR_PREPARE = 80;
// A maneuver this close after another one is said in the same sentence: "…, y luego gira a la izquierda"
const THEN_METERS = 25;

export interface RouteIndex {
  route: WalkingRoute;
  /** Meters along the route of every coordinate */
  along: number[];
  /** Meters along the route of every step's maneuver */
  stepAlong: number[];
}

export interface NavProgress {
  /** Index in route.steps of the next maneuver */
  next: number;
  distanceToNext: number;
  remainingDistance: number;
  /** Seconds, at the route's own pace */
  remainingDuration: number;
  arrived: boolean;
}

export interface Cue {
  /** Step and kind of everything this cue covers, to say each one once */
  keys: string[];
  text: string;
  /** "Now" cues: worth a vibration and cutting off whatever is being said */
  now: boolean;
}

export function indexRoute(route: WalkingRoute): RouteIndex {
  const coords = route.coordinates;
  const along = [0];
  for (let i = 1; i < coords.length; i++) along.push(along[i - 1] + distanceMeters(coords[i - 1], coords[i]));

  // Maneuvers are vertices of the route geometry: find each one, never going back along the route
  let from = 0;
  const stepAlong = route.steps.map(step => {
    let best = from;
    let bestDistance = Infinity;
    for (let i = from; i < coords.length && bestDistance > 0; i++) {
      const d = distanceMeters(coords[i], step.location);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    from = best;
    return along[best];
  });

  return { route, along, stepAlong };
}

export function progressAlong({ route, along, stepAlong }: RouteIndex, position: LatLng): NavProgress {
  const coords = route.coordinates;
  const { index, t } = projectOnPath(position, coords);
  const done = along[index] + t * ((along[index + 1] ?? along[index]) - along[index]);
  const total = along[along.length - 1];
  const last = route.steps.length - 1;

  // The next maneuver is the first one still ahead (a meter of slack so standing on it doesn't count as passed)
  let next = stepAlong.findIndex((a, i) => i > 0 && a > done + 1);
  if (next < 0) next = last;

  const distanceToNext = Math.max(0, stepAlong[next] - done);
  const remainingDistance = Math.max(0, total - done);
  return {
    next,
    distanceToNext,
    remainingDistance,
    remainingDuration: total > 0 ? (remainingDistance * route.duration) / total : 0,
    arrived: next === last && distanceToNext <= NOW_METERS,
  };
}

/** What to say now, if anything: each maneuver gets a heads-up and a "now", once */
export function nextCue({ route, stepAlong }: RouteIndex, progress: NavProgress, said: Set<string>): Cue | null {
  const i = progress.next;
  const step = route.steps[i];
  const arrive = step.maneuver.type === 'arrive';

  if (progress.distanceToNext <= NOW_METERS) {
    if (said.has(`${i}:now`)) return null;
    const keys = [`${i}:now`];
    let text = speakable(step.instruction);

    // The arrival is always said on its own
    const then = route.steps[i + 1];
    if (then && then.maneuver.type !== 'arrive' && stepAlong[i + 1] - stepAlong[i] <= THEN_METERS) {
      keys.push(`${i + 1}:now`, `${i + 1}:prepare`);
      const thenText = speakable(then.instruction);
      if (thenText !== text) text += `, y luego ${lowerFirst(thenText)}`;
    }
    return { keys, text, now: true };
  }

  const stretch = stepAlong[i] - stepAlong[i - 1];
  const key = `${i}:prepare`;
  if (progress.distanceToNext <= PREPARE_METERS && stretch >= MIN_STRETCH_FOR_PREPARE && !said.has(key)) {
    const meters = Math.max(10, Math.round(progress.distanceToNext / 10) * 10);
    const text = arrive
      ? `En ${meters} metros llegarás a tu destino`
      : `En ${meters} metros, ${lowerFirst(speakable(step.instruction))}`;
    return { keys: [key], text, now: false };
  }
  return null;
}

const ORDINALS = ['', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava'];

/** Instruction as it should sound: "toma la 2.ª salida" → "toma la segunda salida" */
export function speakable(text: string) {
  return text.replace(/(\d+)\.ª/g, (match, n: string) => ORDINALS[Number(n)] ?? match);
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
