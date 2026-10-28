// Turn-by-turn navigation session, outside React so it keeps guiding with the phone locked.
// Like Google Maps, positions come from an Android foreground service of type location (the "Navegando a…"
// notification): no "allow all the time" permission needed, and the process stays alive in the background.
// While the app is on screen, the map's own GPS watch feeds it too. Nothing here relies on timers, which
// React Native pauses in the background.
import { PermissionsAndroid, Platform, Vibration } from 'react-native';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { colors } from '../theme';
import { LatLng, distanceToPath } from '../Utils/geo';
import { NavProgress, RouteIndex, indexRoute, nextCue, progressAlong, speakable } from '../Utils/navigation';
import { WalkingRoute, fetchWalkingRoute } from './routing';

const LOCATION_TASK = 'jorge-maps-navigation';
const KEEP_AWAKE_TAG = 'navigation';
const TURN_VIBRATION = [0, 250, 120, 250];
// Further than this from the route for this long → recalculate from where the user is (at most this often)
const OFF_ROUTE_METERS = 35;
const OFF_ROUTE_MS = 4000;
const REROUTE_COOLDOWN_MS = 15000;

type Position = LatLng & { accuracy?: number | null };

export interface NavigationState {
  route: WalkingRoute;
  destinationName: string;
  progress: NavProgress | null;
  rerouting: boolean;
  voice: boolean;
  /** Guidance keeps running with the screen off (foreground service started) */
  background: boolean;
}

interface Session {
  index: RouteIndex;
  destination: LatLng;
  destinationName: string;
  said: Set<string>;
  progress: NavProgress | null;
  rerouting: boolean;
  offRouteSince: number | null;
  lastRouteAt: number;
  background: boolean;
}

let session: Session | null = null;
let voice = true;
const listeners = new Set<(state: NavigationState | null) => void>();

// The location task must be defined when the JS bundle loads, before anything starts it
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    const fix = data?.locations?.[data.locations.length - 1];
    if (!error && fix) updatePosition(fix.coords);
  });
}

function state(): NavigationState | null {
  return session && {
    route: session.index.route,
    destinationName: session.destinationName,
    progress: session.progress,
    rerouting: session.rerouting,
    voice,
    background: session.background,
  };
}

const emit = () => listeners.forEach(listener => listener(state()));

/** Cues queue up rather than cutting each other off: close maneuvers are already merged into one sentence */
function say(text: string, now: boolean) {
  if (now) Vibration.vibrate(TURN_VIBRATION);
  if (voice) Speech.speak(text, { language: 'es-ES' });
}

function follow(s: Session, route: WalkingRoute) {
  s.index = indexRoute(route);
  s.said = new Set();
  s.progress = null;
  s.offRouteSince = null;
  s.lastRouteAt = Date.now();
  say(speakable(route.steps[0].instruction), false);
}

/** Notified now and on every change; returns the unsubscribe function */
export function subscribeNavigation(listener: (state: NavigationState | null) => void) {
  listeners.add(listener);
  listener(state());
  return () => {
    listeners.delete(listener);
  };
}

export async function startNavigation(route: WalkingRoute, destination: LatLng, destinationName: string, position: Position | null) {
  await stopNavigation();
  const s: Session = {
    index: indexRoute(route),
    destination,
    destinationName,
    said: new Set(),
    progress: null,
    rerouting: false,
    offRouteSince: null,
    lastRouteAt: 0,
    background: false,
  };
  session = s;
  follow(s, route);
  if (position) updatePosition(position);
  emit();

  activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
  s.background = await startBackgroundUpdates(destinationName);
  if (session === s) emit();
}

export async function stopNavigation() {
  const wasActive = session != null;
  session = null;
  Speech.stop();
  deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  await stopBackgroundUpdates();
  if (wasActive) emit();
}

export function setNavigationVoice(on: boolean) {
  voice = on;
  if (!on) Speech.stop();
  emit();
}

/** A GPS fix, from the location task or from the screen */
export function updatePosition(position: Position) {
  const s = session;
  // After arriving, the guidance is over: nothing more to say or recalculate
  if (!s || s.progress?.arrived) return;

  const progress = progressAlong(s.index, position);
  s.progress = progress;
  const cue = nextCue(s.index, progress, s.said);
  if (cue) {
    cue.keys.forEach(key => s.said.add(key));
    say(cue.text, cue.now);
  }

  if (progress.arrived) {
    // Done: drop the notification and the extra GPS right away, the screen shows "Has llegado"
    s.background = false;
    stopBackgroundUpdates();
    deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
  } else {
    checkOffRoute(s, position);
  }
  emit();
}

function checkOffRoute(s: Session, position: Position) {
  const { route } = s.index;
  const tolerance = Math.max(OFF_ROUTE_METERS, (position.accuracy ?? 0) * 1.5);
  if (distanceToPath(position, [route.from, ...route.coordinates, route.to]) <= tolerance) {
    s.offRouteSince = null;
    return;
  }
  const now = Date.now();
  s.offRouteSince ??= now;
  if (s.rerouting || now - s.offRouteSince < OFF_ROUTE_MS || now - s.lastRouteAt < REROUTE_COOLDOWN_MS) return;
  reroute(s, position);
}

async function reroute(s: Session, from: LatLng) {
  s.rerouting = true;
  s.lastRouteAt = Date.now();
  say('Recalculando la ruta', false);
  emit();
  try {
    const route = await fetchWalkingRoute(from, s.destination);
    if (session === s) follow(s, route);
  } catch {
    // Keep guiding along the old route; it tries again after the cooldown
  } finally {
    s.rerouting = false;
    if (session === s) emit();
  }
}

/** The foreground service: false where it can't run (web) or Android refused it; the screen's GPS still guides */
async function startBackgroundUpdates(destinationName: string) {
  if (Platform.OS === 'web') return false;
  try {
    // Android 13+: without this the service still runs, but its notification stays hidden
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 2,
      foregroundService: {
        notificationTitle: 'Jorge Maps',
        notificationBody: `Navegando a ${destinationName}`,
        notificationColor: colors.accent,
        killServiceOnDestroy: true,
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function stopBackgroundUpdates() {
  if (Platform.OS === 'web') return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    // Not running
  }
}
