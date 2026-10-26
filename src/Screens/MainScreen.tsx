import React, { useCallback, useState } from "react";
import { Keyboard, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocation } from "../Hooks/useLocation";
import { useHeading } from "../Hooks/useHeading";
import { useFavorites } from "../Hooks/useFavorites";
import { usePlaceSearch } from "../Hooks/usePlaceSearch";
import { useWalkingRoute } from "../Hooks/useWalkingRoute";
import { Place } from "../Services/places";
import WorldMap from "../Components/WorldMap";
import Loader from "../Components/Loader";
import SearchBar from "../Components/SearchBar";
import SearchResults from "../Components/SearchResults";
import LocationCard from "../Components/LocationCard";
import RouteSheet from "../Components/RouteSheet";
import PermissionScreen from "./PermissionScreen";

export default function MainScreen() {
  const { location, error, retry } = useLocation();
  const heading = useHeading(!!location);
  const saved = useFavorites();
  const safe = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState<Place | null>(null);
  // Height of the floating UI, so the map keeps its controls and routes visible
  const [topInset, setTopInset] = useState(0);
  const [bottomInset, setBottomInset] = useState(0);

  const search = usePlaceSearch(searching ? query : "", location);
  const walk = useWalkingRoute(destination?.coordinate ?? null, location);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearching(false);
  }, []);

  const selectPlace = useCallback((place: Place) => {
    Keyboard.dismiss();
    setSearching(false);
    setQuery(place.name);
    setDestination(place);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setDestination(null);
  }, []);

  if (error) return <PermissionScreen message={error} onRetry={retry} />;
  if (!location) return <Loader />;

  const showResults = searching && query.trim().length >= 3;
  // Focused search box without a query yet → offer the saved places
  const showSaved = searching && !showResults && saved.favorites.length > 0;

  return (
    <View style={styles.container}>
      <WorldMap
        user={location}
        heading={heading}
        destination={destination?.coordinate}
        route={walk.route}
        insets={{ top: topInset, bottom: bottomInset }}
        onPress={closeSearch}
      />

      <View style={[styles.top, { paddingTop: safe.top + 10 }]} pointerEvents="box-none">
        <View onLayout={(e) => setTopInset(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          <SearchBar
            value={query}
            loading={search.loading}
            onChangeText={(text) => {
              setQuery(text);
              setSearching(true);
            }}
            onFocus={() => setSearching(true)}
            onSubmit={() => search.results[0] && selectPlace(search.results[0])}
            onClear={clear}
          />
        </View>
        {showResults ? (
          <SearchResults
            query={query}
            results={search.results}
            loading={search.loading}
            error={search.error}
            origin={location}
            maxHeight={screenHeight * 0.45}
            onSelect={selectPlace}
          />
        ) : null}
        {showSaved ? (
          <SearchResults
            title="Guardados"
            results={saved.favorites}
            origin={location}
            maxHeight={screenHeight * 0.45}
            onSelect={selectPlace}
            onRemove={saved.remove}
          />
        ) : null}
      </View>

      <View
        style={[styles.bottom, { paddingBottom: safe.bottom + 12 }]}
        pointerEvents="box-none"
        onLayout={(e) => setBottomInset(e.nativeEvent.layout.height)}
      >
        {destination ? (
          <RouteSheet
            place={destination}
            route={walk.route}
            loading={walk.loading}
            error={walk.error}
            rerouting={walk.rerouting}
            saved={saved.isFavorite(destination)}
            stepsMaxHeight={screenHeight * 0.3}
            onClose={clear}
            onRetry={walk.retry}
            onToggleSave={() => saved.toggle(destination)}
          />
        ) : (
          <LocationCard location={location} favorites={saved.favorites} onSelectFavorite={selectPlace} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
});
