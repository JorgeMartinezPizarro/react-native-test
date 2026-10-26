import { useEffect, useState } from "react";
import * as Location from "expo-location";

// Round to this many degrees: the compass fires constantly, coarser values mean far fewer re-renders
const STEP = 5;

/** Compass heading in degrees clockwise from north, or null when the device has no compass */
export function useHeading(enabled: boolean) {
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
      const degrees = trueHeading >= 0 ? trueHeading : magHeading;
      if (degrees >= 0) setHeading((Math.round(degrees / STEP) * STEP) % 360);
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
