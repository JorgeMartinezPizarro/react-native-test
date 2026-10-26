import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWalkingRoute, WalkingRoute } from "../Services/routing";
import { LatLng, distanceToPath } from "../Utils/geo";

// Off-route detection: how far, for how many consecutive GPS fixes, and how often we may recalculate
const OFF_ROUTE_METERS = 35;
const OFF_ROUTE_FIXES = 3;
const REROUTE_COOLDOWN_MS = 15000;

type Origin = LatLng & { accuracy?: number | null };

type State = {
  target: LatLng | null;
  route: WalkingRoute | null;
  loading: boolean;
  rerouting: boolean;
  error: string | null;
};

/** Walking route from the current position to `destination`, recalculated when the user walks off it */
export function useWalkingRoute(destination: LatLng | null, origin: Origin | null) {
  const [state, setState] = useState<State>({ target: null, route: null, loading: false, rerouting: false, error: null });
  const [attempt, setAttempt] = useState(0);

  // The route starts where the user is when it's requested, it doesn't follow every GPS fix
  const originRef = useRef(origin);
  originRef.current = origin;
  const stateRef = useRef(state);
  stateRef.current = state;

  const lastRequest = useRef(0);
  const rerouteRequested = useRef(false);
  const offRouteFixes = useRef(0);

  useEffect(() => {
    const from = originRef.current;
    if (!destination || !from) return;

    const controller = new AbortController();
    const rerouting = rerouteRequested.current;
    rerouteRequested.current = false;
    lastRequest.current = Date.now();

    // Keep the previous route on screen while recalculating to the same place
    setState((s) => ({
      target: destination,
      route: s.target === destination ? s.route : null,
      loading: true,
      rerouting,
      error: null,
    }));

    fetchWalkingRoute(from, destination, controller.signal)
      .then((route) => setState({ target: destination, route, loading: false, rerouting: false, error: null }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState((s) => ({ ...s, loading: false, rerouting: false, error: "No se pudo calcular la ruta a pie." }));
        }
      });

    return () => controller.abort();
  }, [destination, attempt]);

  // Every GPS fix: walked away from the route? Recalculate from here.
  useEffect(() => {
    const { route, loading, target } = stateRef.current;
    if (!origin || !route || loading || target !== destination) {
      offRouteFixes.current = 0;
      return;
    }

    const tolerance = Math.max(OFF_ROUTE_METERS, (origin.accuracy ?? 0) * 1.5);
    const offRoute = distanceToPath(origin, [route.from, ...route.coordinates, route.to]) > tolerance;
    offRouteFixes.current = offRoute ? offRouteFixes.current + 1 : 0;

    if (offRouteFixes.current >= OFF_ROUTE_FIXES && Date.now() - lastRequest.current > REROUTE_COOLDOWN_MS) {
      offRouteFixes.current = 0;
      rerouteRequested.current = true;
      setAttempt((a) => a + 1);
    }
  }, [origin, destination]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const current = destination && state.target === destination ? state : null;
  return {
    route: current?.route ?? null,
    loading: current ? current.loading : !!destination,
    rerouting: current?.rerouting ?? false,
    error: current?.error ?? null,
    retry,
  };
}
