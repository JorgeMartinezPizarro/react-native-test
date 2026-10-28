import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { createHeadingFilter } from "../Utils/heading";

// Ignore changes smaller than this (degrees): the compass fires constantly, fewer re-renders
const MIN_CHANGE = 2;

/** Smoothed compass heading in degrees clockwise from north, or null while it oscillates or is missing */
export function useHeading(enabled: boolean) {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const filter = createHeadingFilter();
    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
      const degrees = trueHeading >= 0 ? trueHeading : magHeading;
      if (degrees < 0) return;
      const smoothed = filter(degrees, Date.now());
      setHeading((prev) => {
        if (smoothed == null || prev == null) return smoothed;
        const delta = Math.abs(((smoothed - prev + 540) % 360) - 180);
        return delta < MIN_CHANGE ? prev : smoothed;
      });
    })
      .then((sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      })
      .catch(() => setHeading(null));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return heading;
}
