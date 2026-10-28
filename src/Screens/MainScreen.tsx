import React, { useCallback, useEffect, useState } from "react";
import { Keyboard, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocation } from "../Hooks/useLocation";
import { useHeading } from "../Hooks/useHeading";
import { useFavorites } from "../Hooks/useFavorites";
import { usePlaceSearch } from "../Hooks/usePlaceSearch";
import { useWalkingRoute } from "../Hooks/useWalkingRoute";
import { useNavigation } from "../Hooks/useNavigation";
import { Place } from "../Services/places";
import { setNavigationVoice, startNavigation, stopNavigation, updatePosition } from "../Services/navigationSession";
import WorldMap from "../Components/WorldMap";
import Loader from "../Components/Loader";
import SearchBar from "../Components/SearchBar";
import SearchResults from "../Components/SearchResults";
import LocationCard from "../Components/LocationCard";
import RouteSheet from "../Components/RouteSheet";
import NavigationBanner from "../Components/NavigationBanner";
import NavigationSheet from "../Components/NavigationSheet";
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

  const nav = useNavigation();
  const search = usePlaceSearch(searching ? query : "", location);
  // While navigating, the navigation session recalculates the route itself
  const walk = useWalkingRoute(destination?.coordinate ?? null, location, !nav);

  // While the app is on screen its GPS watch feeds the navigation too (with the screen off, the foreground service does)
  useEffect(() => {
    if (location) updatePosition(location);
  }, [location]);

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
    stopNavigation();
    setQuery("");
    setDestination(null);
  }, []);

  const start = useCallback(() => {
    if (!destination || !walk.route) return;
    closeSearch();
    startNavigation(walk.route, destination.coordinate, destination.name, location);
  }, [destination, walk.route, location, closeSearch]);

  // Arrived → done with this destination. Left halfway → back to the route, recalculated from here.
  const exit = useCallback(() => {
    const arrived = !!nav?.progress?.arrived;
    stopNavigation();
    if (arrived) clear();
    else walk.retry();
  }, [nav, clear, walk.retry]);

  if (error) return <PermissionScreen message={error} onRetry={retry} />;
  if (!location) return <Loader />;

  const showResults = searching && query.trim().length >= 3;
  // Focused search box without a query yet → offer the saved places
  const showSaved = searching && !showResults && saved.favorites.length > 0;
  // Turn-by-turn mode: maneuver banner on top, compact sheet below
  const guiding = nav?.progress ? { ...nav, progress: nav.progress } : null;

  return (
    <View style={styles.container}>
      <WorldMap
        user={location}
        heading={heading}
        destination={destination?.coordinate}
        route={nav ? nav.route : walk.route}
        insets={{ top: topInset, bottom: bottomInset }}
        navigating={!!nav}
        onPress={closeSearch}
      />

      <View style={[styles.top, { paddingTop: safe.top + 10 }]} pointerEvents="box-none">
        <View onLayout={(e) => setTopInset(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
          {guiding ? (
            <NavigationBanner
              step={guiding.route.steps[guiding.progress.next]}
              distance={guiding.progress.distanceToNext}
              arrived={guiding.progress.arrived}
              destinationName={guiding.destinationName}
            />
          ) : (
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
          )}
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
        {guiding ? (
          <NavigationSheet
            remainingDistance={guiding.progress.remainingDistance}
            remainingDuration={guiding.progress.remainingDuration}
            arrived={guiding.progress.arrived}
            rerouting={guiding.rerouting}
            voice={guiding.voice}
            background={guiding.background}
            onToggleVoice={() => setNavigationVoice(!guiding.voice)}
            onExit={exit}
          />
        ) : destination ? (
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
            onStart={start}
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
