import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { MAP_ATTRIBUTION, TILE_URL } from '../config';
import { WalkingRoute } from '../Services/routing';
import { colors, shadows } from '../theme';
import { LatLng, Point, TILE_SIZE, metersPerPixel, project, projectOnPath, sampleAlong, unproject } from '../Utils/geo';
import {
  BILLBOARD_STRETCH,
  FADE_END,
  FADE_SOLID,
  PERSPECTIVE,
  PITCH_DEG,
  inGroundView,
  visibleGround,
} from '../Utils/perspective';
import UserMarker from './UserMarker';
import DestinationMarker from './DestinationMarker';
import NavigationArrow from './NavigationArrow';
import RouteLine from './RouteLine';

// ─────────────────────────────────────────────
//  Constants & helpers
// ─────────────────────────────────────────────

const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
// Street level while navigating
const NAVIGATION_ZOOM = 18;
// Room around a fitted trip: the pin sticks out ~20pt sideways and ~50pt upwards
const FIT_PADDING_X = 28;
const FIT_PADDING_Y = 56;
const TAP_SLOP = 6;
const DOUBLE_TAP_MS = 280;
// 3D navigation view: the user sits this far down the area left free by the floating UI
const USER_AT_3D = 0.75;
const TILT_MS = 600;
const TURN_MS = 500;
// Route dots: spacing in points, and connectors shorter than MIN_CONNECTOR are hidden under the markers
const DOT_SPACING = 14;
const CONNECTOR_SPACING = 11;
const MIN_CONNECTOR = 6;

const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
const toRad = (deg: number) => (deg * Math.PI) / 180;

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
  /** Turn-by-turn navigation: follow the user up close instead of showing the whole trip */
  navigating?: boolean;
  /** While navigating, direction of the route ahead: the map turns to it and tilts into a 3D view */
  bearing?: number | null;
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
  navigating = false,
  bearing = null,
  onPress,
}: WorldMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(initialZoom);
  const [following, setFollowing] = useState(true);
  const [freeCenter, setFreeCenter] = useState<LatLng>(user);
  const [gesture, setGesture] = useState<Gesture>(NO_GESTURE);

  // While following, the viewport stays centered on the user
  const center = following ? user : freeCenter;
  // Navigating and following the user: turned and tilted 3D view. Moving the map by hand goes back to 2D.
  const view3d = navigating && following && bearing != null;

  // Fresh values for callbacks that are created only once (PanResponder, fitTo)
  const latest = useRef({ center, zoom, user, route, destination, insets, size, onPress, view3d, bearing });
  latest.current = { center, zoom, user, route, destination, insets, size, onPress, view3d, bearing };

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

  // Navigation starts → follow the user at street level (no fits meanwhile: `fitted` stays false).
  // Navigation ends → back to the whole trip.
  const wasNavigating = useRef(false);
  useEffect(() => {
    if (navigating) {
      fitted.current = false;
      setFollowing(true);
      setZoom(NAVIGATION_ZOOM);
    } else if (wasNavigating.current) {
      fitToTrip();
    }
    wasNavigating.current = navigating;
  }, [navigating, fitToTrip]);

  // ── 3D view: tilt in and out, turn the map to the route ─────────────────
  const tilt = useRef(new Animated.Value(0)).current;
  const turn = useRef(new Animated.Value(0)).current;
  // Unwrapped angle last sent to `turn`, so 350° → 10° turns +20° instead of -340°
  const turnAngle = useRef(0);

  useEffect(() => {
    Animated.timing(tilt, {
      toValue: view3d ? 1 : 0,
      duration: TILT_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [view3d, tilt]);

  useEffect(() => {
    // Back to north up when leaving the 3D view
    const target = view3d && bearing != null ? bearing : 0;
    turnAngle.current += ((target - turnAngle.current) % 360 + 540) % 360 - 180;
    Animated.timing(turn, {
      toValue: turnAngle.current,
      duration: TURN_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [view3d, bearing, turn]);

  // ── Gestures: drag to pan, pinch to zoom, double tap to zoom in ──────────
  const pinch = useRef<{ startDistance: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const responder = useMemo(() => {
    const commitPan = (dx: number, dy: number) => {
      const { center, zoom, view3d, bearing } = latest.current;
      let mx = dx;
      let my = dy;
      if (view3d && bearing != null) {
        // The finger moved the turned, tilted map: undo the turn (and roughly the tilt) to move it flat
        const b = toRad(bearing);
        const py = dy / Math.cos(toRad(PITCH_DEG));
        mx = dx * Math.cos(b) - py * Math.sin(b);
        my = dx * Math.sin(b) + py * Math.cos(b);
      }
      const p = project(center, zoom);
      fitted.current = false;
      setFreeCenter(unproject({ x: p.x - mx, y: p.y - my }, zoom));
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

  // ── What is on screen ───────────────────────────────────────────────────
  const { width, height } = size;
  const origin = useMemo(() => project(center, zoom), [center.latitude, center.longitude, zoom]);

  // 3D: where the user is drawn, how far the tilt lifts it, and which part of the ground shows
  const userY = insets.top + USER_AT_3D * (height - insets.top - insets.bottom);
  const lift = userY - height / 2;
  const ground = useMemo(() => visibleGround(width, height, userY), [width, height, userY]);

  /** Is the point (dx, dy) from the view center on screen, give or take `margin`? */
  const onScreen = useCallback(
    (dx: number, dy: number, margin: number) => {
      // Flat view (also what shows while tilting in or out)
      if (Math.abs(dx) <= width / 2 + margin && Math.abs(dy) <= height / 2 + margin) return true;
      return view3d && bearing != null && inGroundView(dx, dy, bearing, ground, margin);
    },
    [width, height, view3d, bearing, ground]
  );

  const tiles = useMemo(() => {
    if (!width || !height) return [];
    // Candidate range: the flat view with a tile of margin, or everything within reach of the 3D view
    const reach = view3d ? Math.max(ground.ahead, ground.behind, ground.halfWidth) + TILE_SIZE : 0;
    const halfW = Math.max(width / 2 + TILE_SIZE, reach);
    const halfH = Math.max(height / 2 + TILE_SIZE, reach);
    const maxTile = 2 ** zoom - 1;
    const minX = Math.max(0,       Math.floor((origin.x - halfW) / TILE_SIZE));
    const maxX = Math.min(maxTile, Math.floor((origin.x + halfW) / TILE_SIZE));
    const minY = Math.max(0,       Math.floor((origin.y - halfH) / TILE_SIZE));
    const maxY = Math.min(maxTile, Math.floor((origin.y + halfH) / TILE_SIZE));

    const result: TileKey[] = [];
    for (let x = minX; x <= maxX; x++)
      for (let y = minY; y <= maxY; y++)
        if (onScreen((x + 0.5) * TILE_SIZE - origin.x, (y + 0.5) * TILE_SIZE - origin.y, TILE_SIZE))
          result.push({ z: zoom, x, y });
    return result;
  }, [origin, zoom, width, height, view3d, ground, onScreen]);

  // Route dots in world pixels: sampled once per route and zoom, then only the visible ones are drawn
  const routeDots = useMemo(() => {
    if (!route?.coordinates.length) return null;
    const path = route.coordinates.map(p => project(p, zoom));
    const along = [0];
    for (let i = 1; i < path.length; i++) along.push(along[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
    const connector = (a: Point, b: Point) =>
      Math.hypot(a.x - b.x, a.y - b.y) > MIN_CONNECTOR ? sampleAlong([a, b], CONNECTOR_SPACING) : [];
    return {
      dots: sampleAlong(path, DOT_SPACING),
      along,
      start: connector(project(route.from, zoom), path[0]),
      end: connector(path[path.length - 1], project(route.to, zoom)),
    };
  }, [route, zoom]);

  // While navigating, only what is left of the route is drawn: drop the dots already walked past
  // (the dots stay where they are on the ground, they don't crawl along with the user)
  let routeAhead: { dots: Point[]; connectors: Point[] } | null = null;
  if (routeDots && route) {
    if (navigating) {
      const { index, t } = projectOnPath(user, route.coordinates);
      const { along } = routeDots;
      const walked = along[index] + t * ((along[index + 1] ?? along[index]) - along[index]);
      routeAhead = { dots: routeDots.dots.slice(Math.ceil(walked / DOT_SPACING)), connectors: routeDots.end };
    } else {
      routeAhead = { dots: routeDots.dots, connectors: [...routeDots.start, ...routeDots.end] };
    }
  }

  const toLayer = (q: Point): Point => ({ x: q.x - origin.x + width / 2, y: q.y - origin.y + height / 2 });
  const toScreen = (p: LatLng): Point => toLayer(project(p, zoom));
  const visible = (points: Point[]) =>
    points.map(toLayer).filter(p => onScreen(p.x - width / 2, p.y - height / 2, DOT_SPACING));

  const userPoint = toScreen(user);
  const accuracyRadius = user.accuracy ? user.accuracy / metersPerPixel(user.latitude, zoom) : 0;
  const destinationPoint = destination ? toScreen(destination) : null;

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <View style={styles.container} onLayout={onLayout}>

      {/* Gesture surface — everything inside moves together while dragging/pinching */}
      <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
        {/* Tilt: perspective around the user, who is lifted to the lower part of the screen */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateX: gesture.dx },
                { translateY: gesture.dy },
                { scale: gesture.scale },
                { translateY: tilt.interpolate({ inputRange: [0, 1], outputRange: [0, lift] }) },
                { perspective: PERSPECTIVE },
                { rotateX: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${PITCH_DEG}deg`] }) },
              ],
            },
          ]}
        >
          {/* Map plane, turned so the route ahead points up */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ rotate: turn.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '-360deg'] }) }] },
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

            {width && routeAhead ? (
              <RouteLine dots={visible(routeAhead.dots)} connectors={visible(routeAhead.connectors)} />
            ) : null}

            {/* The pin stands upright: undo the turn, and stretch it as much as the tilt squashes it */}
            {destinationPoint ? (
              <Animated.View
                style={[
                  styles.anchor,
                  {
                    left: destinationPoint.x,
                    top: destinationPoint.y,
                    transform: [
                      { rotate: turn.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
                      { scaleY: tilt.interpolate({ inputRange: [0, 1], outputRange: [1, BILLBOARD_STRETCH] }) },
                    ],
                  },
                ]}
              >
                <DestinationMarker x={0} y={0} />
              </Animated.View>
            ) : null}

            {view3d ? null : (
              <UserMarker x={userPoint.x} y={userPoint.y} accuracyRadius={accuracyRadius} heading={heading} />
            )}
          </Animated.View>

          {/* 3D: the user is a chevron on the ground, pointing along the route (always up on screen) */}
          {view3d ? <NavigationArrow x={width / 2} y={height / 2} /> : null}
        </Animated.View>
      </View>

      {/* Horizon fade over the far part of the tilted map */}
      {width ? (
        <Animated.View pointerEvents="none" style={[styles.fade, { height: FADE_END * height, opacity: tilt }]}>
          <Svg width={width} height={FADE_END * height}>
            <Defs>
              <LinearGradient id="horizon" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.map} stopOpacity={1} />
                <Stop offset={FADE_SOLID / FADE_END} stopColor={colors.map} stopOpacity={1} />
                <Stop offset="1" stopColor={colors.map} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={width} height={FADE_END * height} fill="url(#horizon)" />
          </Svg>
        </Animated.View>
      ) : null}

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
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  fade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
