import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { LatLng } from "../Utils/geo";

export type UserLocation = LatLng & {
  /** Radius of uncertainty in meters */
  accuracy: number | null;
};

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          if (!cancelled) setError("Permiso de localización denegado");
          return;
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 100,
            distanceInterval: 1,
          },
          (pos) => {
            setLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            });
          }
        );

        if (cancelled) sub.remove();
        else subscription = sub;
      } catch {
        if (!cancelled) setError("No se pudo obtener tu ubicación. ¿Está el GPS activado?");
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  return { location, error, retry };
}
