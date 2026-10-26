import { useEffect, useRef, useState } from "react";
import { Place, searchPlaces } from "../Services/places";
import { LatLng } from "../Utils/geo";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;

/** Debounced place search; results are biased towards `near` */
export function usePlaceSearch(query: string, near: LatLng | null) {
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the position lazily: a new GPS fix must not trigger a new search
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        setResults(await searchPlaces(q, nearRef.current, controller.signal));
        setError(null);
      } catch {
        if (!controller.signal.aborted) setError("No se pudo buscar. Revisa tu conexión.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { results, loading, error };
}
