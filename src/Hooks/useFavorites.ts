import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Place } from "../Services/places";

const STORAGE_KEY = "favorites.v1";

/** Places saved by the user, persisted on the device */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Place[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setFavorites(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  // Write back on every change (but not the initial empty list, it would wipe what's stored)
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(() => {});
  }, [favorites]);

  const isFavorite = useCallback((place: Place) => favorites.some((p) => p.id === place.id), [favorites]);

  const toggle = useCallback((place: Place) => {
    setFavorites((list) =>
      list.some((p) => p.id === place.id) ? list.filter((p) => p.id !== place.id) : [place, ...list]
    );
  }, []);

  const remove = useCallback((place: Place) => {
    setFavorites((list) => list.filter((p) => p.id !== place.id));
  }, []);

  return { favorites, isFavorite, toggle, remove };
}
