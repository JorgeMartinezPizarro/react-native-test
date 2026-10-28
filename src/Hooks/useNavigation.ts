import { useEffect, useState } from "react";
import { NavigationState, subscribeNavigation } from "../Services/navigationSession";

/** The running navigation session (null when not navigating), kept up to date for the screen */
export function useNavigation() {
  const [state, setState] = useState<NavigationState | null>(null);
  useEffect(() => subscribeNavigation(setState), []);
  return state;
}
