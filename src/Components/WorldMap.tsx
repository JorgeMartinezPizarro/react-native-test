import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MAP_ATTRIBUTION, TILE_URL } from '../config';
import { WalkingRoute } from '../Services/routing';
import { colors, shadows } from '../theme';
import { LatLng, Point, TILE_SIZE, metersPerPixel, project, unproject } from '../Utils/geo';
import UserMarker from './UserMarker';
import DestinationMarker from './DestinationMarker';
import RouteLine from './RouteLine';

// ─────────────────────────────────────────────
//  Constants & helpers
// ─────────────────────────────────────────────

const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
// Room around a fitted trip: the pin sticks out ~20pt sideways and ~50pt upwards
const FIT_PADDING_X = 28;
const FIT_PADDING_Y = 56;
const TAP_SLOP = 6;
const DOUBLE_TAP_MS = 280;

const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

function tileUrl(z: number, x: number, y: number) {
  return TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

/** Pixel bounding box of some points at the given zoom */
function bounds(points: LatLng[], zoom: number) {
  const px = points.map(p => project(p, zoom));
  const xs = px.map(p => p.x);
  const ys = px.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

interface TileKey { z: number; x: number; y: number }
interface Gesture { dx: number; dy: number; scale: number }
interface Insets { top: number; bottom: number }

interface WorldMapProps {
  user: LatLng & { accuracy?: number | null };
  /** Compass direction the phone points to, degrees clockwise from north */
  heading?: number | null;
  destination?: LatLng | null;
  route?: Pick<WalkingRoute, 'from' | 'to' | 'coordinates'> | null;
  /** Space covered by floating UI (search bar on top, sheet at the bottom) */
  insets?: Insets;
  initialZoom?: number;
  onPress?: () => void;
}

const NO_GESTURE: Gesture = { dx: 0, dy: 0, scale: 1 };
const NO_INSETS: Insets = { top: 0, bottom: 0 };

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

export default function WorldMap({
  user,
  heading,
  destination,
  route,
  insets = NO_INSETS,
  initialZoom = 17,
  onPress,
}: WorldMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(initialZoom);
  const [following, setFollowing] = useState(true);
  const [freeCenter, setFreeCenter] = useState<LatLng>(user);
  const [gesture, setGesture] = useState<Gesture>(NO_GESTURE);

  // While following, the viewport stays centered on the user
  const center = following ? user : freeCenter;

  // Fresh values for callbacks that are created only once (PanResponder, fitTo)
  const latest = useRef({ center, zoom, user, route, destination, insets, size, onPress });
  latest.current = { center, zoom, user, route, destination, insets, size, onPress };

  // True while the camera still shows the last automatic fit (no user interaction since)
  const fitted = useRef(false);

  const zoomBy = useCallback((delta: number) => {
    fitted.current = false;
    setZoom(z => clampZoom(z + delta));
  }, []);

  const recenter = useCallback(() => {
    fitted.current = false;
    setFollowing(true);
    setZoom(z => Math.max(z, 16));
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  // ── Fit the camera to some points, inside the area not covered by the UI ─
  const fitTo = useCallback((points: LatLng[]) => {
    const { size, insets } = latest.current;
    if (!size.width || !size.height) return;

    const availW = size.width - FIT_PADDING_X * 2;
    const availH = Math.max(80, size.height - insets.top - insets.bottom - FIT_PADDING_Y * 2);

    let z = MAX_ZOOM;
    let box = bounds(points, z);
    while (z > MIN_ZOOM && (box.maxX - box.minX > availW || box.maxY - box.minY > availH)) {
      z--;
      box = bounds(points, z);
    }

    const visibleMidY = (insets.top + size.height - insets.bottom) / 2;
    const x = (box.minX + box.maxX) / 2;
    const y = (box.minY + box.maxY) / 2 + size.height / 2 - visibleMidY;

    fitted.current = true;
    setZoom(z);
    setFreeCenter(unproject({ x, y }, z));
    setFollowing(false);
  }, []);

  const fitToTrip = useCallback(() => {
    const { user, route, destination } = latest.current;
    if (route?.coordinates.length) fitTo([user, route.from, ...route.coordinates, route.to]);
    else if (destination) fitTo([user, destination]);
  }, [fitTo]);

  // New destination → show the whole trip. Same destination with a new route (recalculated
  // while walking) → only reframe if nobody moved the map since. Cleared → follow the user again.
  const shownDestination = useRef<LatLng | null | undefined>(null);
  useEffect(() => {
    const sameTrip = !!destination && destination === shownDestination.current;
    shownDestination.current = destination;

    if (route?.coordinates.length || destination) {
      if (!sameTrip || fitted.current) fitToTrip();
    } else {
      fitted.current = false;
      setFollowing(true);
      setZoom(initialZoom);
    }
  }, [route, destination, fitToTrip, initialZoom]);

  // The visible area changed (layout, sheet expanded…) → refit if nobody moved the map
  useEffect(() => {
    if (fitted.current) fitToTrip();
  }, [size.width, size.height, insets.top, insets.bottom, fitToTrip]);

  // ── Gestures: drag to pan, pinch to zoom, double tap to zoom in ──────────
  const pinch = useRef<{ startDistance: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const responder = useMemo(() => {
    const commitPan = (dx: number, dy: number) => {
      const { center, zoom } = latest.current;
      const p = project(center, zoom);
      fitted.current = false;
      setFreeCenter(unproject({ x: p.x - dx, y: p.y - dy }, zoom));
      setFollowing(false);
    };

    const end = (g: PanResponderGestureState) => {
      if (pinch.current) {
        const steps = Math.round(Math.log2(pinch.current.scale));
        if (steps) zoomBy(steps);
      } else if (Math.abs(g.dx) + Math.abs(g.dy) > TAP_SLOP) {
        commitPan(g.dx, g.dy);
      } else if (Date.now() - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        zoomBy(1);
      } else {
        lastTap.current = Date.now();
        latest.current.onPress?.();
      }
      pinch.current = null;
      setGesture(NO_GESTURE);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          const distance = Math.max(
            1,
            Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY)
          );
          if (!pinch.current) {
            // Switching from drag to pinch: keep what was dragged so far
            if (g.dx || g.dy) commitPan(g.dx, g.dy);
            pinch.current = { startDistance: distance, scale: 1 };
          }
          pinch.current.scale = Math.max(0.25, Math.min(4, distance / pinch.current.startDistance));
          setGesture({ dx: 0, dy: 0, scale: pinch.current.scale });
        } else if (!pinch.current) {
          setGesture({ dx: g.dx, dy: g.dy, scale: 1 });
        }
      },
      onPanResponderRelease: (_, g) => end(g),
      onPanResponderTerminate: (_, g) => end(g),
    });
  }, [zoomBy]);

  // ── Visible tiles around the (committed) camera center ──────────────────
  const { width, height } = size;
  const origin = useMemo(() => project(center, zoom), [center.latitude, center.longitude, zoom]);

  const tiles = useMemo(() => {
    if (!width || !height) return [];
    // 1-tile margin so dragging doesn't reveal empty space right away
    const margin = TILE_SIZE;
    const maxTile = 2 ** zoom - 1;
    const minX = Math.max(0,       Math.floor((origin.x - width  / 2 - margin) / TILE_SIZE));
    const maxX = Math.min(maxTile, Math.floor((origin.x + width  / 2 + margin) / TILE_SIZE));
    const minY = Math.max(0,       Math.floor((origin.y - height / 2 - margin) / TILE_SIZE));
    const maxY = Math.min(maxTile, Math.floor((origin.y + height / 2 + margin) / TILE_SIZE));

    const result: TileKey[] = [];
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++)
        result.push({ z: zoom, x, y });
    return result;
  }, [origin, zoom, width, height]);

  const toScreen = (p: LatLng): Point => {
    const q = project(p, zoom);
    return { x: q.x - origin.x + width / 2, y: q.y - origin.y + height / 2 };
  };

  const userPoint = toScreen(user);
  const accuracyRadius = user.accuracy ? user.accuracy / metersPerPixel(user.latitude, zoom) : 0;

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <View style={styles.container} onLayout={onLayout}>

      {/* Gesture surface — everything inside moves together while dragging/pinching */}
      <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ translateX: gesture.dx }, { translateY: gesture.dy }, { scale: gesture.scale }] },
          ]}
        >
          {tiles.map(({ z, x, y }) => (
            <Image
              key={`${z}/${x}/${y}`}
              source={{ uri: tileUrl(z, x, y) }}
              style={[styles.tile, {
                left: x * TILE_SIZE - origin.x + width / 2,
                top:  y * TILE_SIZE - origin.y + height / 2,
              }]}
              fadeDuration={150}
            />
          ))}

          {width && route?.coordinates.length ? (
            <RouteLine
              from={toScreen(route.from)}
              to={toScreen(route.to)}
              points={route.coordinates.map(toScreen)}
              width={width}
              height={height}
            />
          ) : null}

          {destination ? <DestinationMarker {...toScreen(destination)} /> : null}

          <UserMarker x={userPoint.x} y={userPoint.y} accuracyRadius={accuracyRadius} heading={heading} />
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <View style={styles.zoomGroup}>
          <Pressable
            onPress={() => zoomBy(1)}
            style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            accessibilityLabel="Acercar"
          >
            <MaterialIcons name="add" size={24} color={colors.ink} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            onPress={() => zoomBy(-1)}
            style={({ pressed }) => [styles.controlBtn, pressed && styles.pressed]}
            accessibilityLabel="Alejar"
          >
            <MaterialIcons name="remove" size={24} color={colors.ink} />
          </Pressable>
        </View>

        <Pressable
          onPress={recenter}
          style={({ pressed }) => [
            styles.locateBtn,
            following && styles.locateActive,
            pressed && styles.pressed,
          ]}
          accessibilityLabel="Centrar en mi ubicación"
        >
          <MaterialIcons
            name={following ? 'my-location' : 'location-searching'}
            size={22}
            color={following ? '#fff' : colors.accent}
          />
        </Pressable>
      </View>

      {/* Attribution */}
      <View pointerEvents="none" style={[styles.attribution, { bottom: insets.bottom + 6 }]}>
        <Text style={styles.attributionText}>{MAP_ATTRIBUTION}</Text>
      </View>

    </View>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const CTRL = 46;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: colors.map,
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },

  // Controls
  controls: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
  },
  zoomGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    boxShadow: shadows.control,
  },
  controlBtn: {
    width: CTRL,
    height: CTRL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: 10,
  },
  locateBtn: {
    width: CTRL,
    height: CTRL,
    marginTop: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    boxShadow: shadows.control,
  },
  locateActive: {
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },

  // Attribution
  attribution: {
    position: 'absolute',
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attributionText: {
    fontSize: 10,
    color: colors.inkSoft,
  },
});
