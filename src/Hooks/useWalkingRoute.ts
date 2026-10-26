import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWalkingRoute, WalkingRoute } from "../Services/routing";
import { LatLng } from "../Utils/geo";

type State = {
  target: LatLng | null;
  route: WalkingRoute | null;
  loading: boolean;
  error: string | null;
};

/** Walking route from the current position to `destination` */
export function useWalkingRoute(destination: LatLng | null, origin: LatLng | null) {
  const [state, setState] = useState<State>({ target: null, route: null, loading: false, error: null });
  const [attempt, setAttempt] = useState(0);

  // The route starts where the user is when it's requested, it doesn't follow every GPS fix
  const originRef = useRef(origin);
  originRef.current = origin;

  useEffect(() => {
    const from = originRef.current;
    if (!destination || !from) return;

    const controller = new AbortController();
    // Keep the previous route on screen while recalculating to the same place
    setState((s) => ({
      target: destination,
      route: s.target === destination ? s.route : null,
      loading: true,
      error: null,
    }));

    fetchWalkingRoute(from, destination, controller.signal)
      .then((route) => setState({ target: destination, route, loading: false, error: null }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setState((s) => ({ ...s, loading: false, error: "No se pudo calcular la ruta a pie." }));
        }
      });

    return () => controller.abort();
  }, [destination, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const current = destination && state.target === destination ? state : null;
  return {
    route: current?.route ?? null,
    loading: current ? current.loading : !!destination,
    error: current?.error ?? null,
    retry,
  };
}
