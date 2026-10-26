import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors } from '../theme';
import { Point } from '../Utils/geo';

// Gaps smaller than this (in screen points) are hidden under the markers anyway
const MIN_GAP = 6;

interface RouteLineProps {
  /** Requested start/end — may be off the walkable network the route was snapped to */
  from: Point;
  to: Point;
  points: Point[];
  width: number;
  height: number;
}

const toSvg = (points: Point[]) => points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** Dotted walking route, drawn in screen coordinates, plus grey dots bridging the gaps to the real start/end */
export default function RouteLine({ from, to, points, width, height }: RouteLineProps) {
  // Skip points closer than ~2px to the previous one, they add nothing visible
  const kept: Point[] = [];
  for (const p of points) {
    const last = kept[kept.length - 1];
    if (!last || Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > 2) kept.push(p);
  }
  const path = toSvg(kept);

  const connectors = [
    [from, points[0]],
    [points[points.length - 1], to],
  ].filter(([a, b]) => Math.hypot(a.x - b.x, a.y - b.y) > MIN_GAP);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        {connectors.map((segment, i) => (
          <React.Fragment key={i}>
            <Polyline
              points={toSvg(segment)}
              fill="none"
              stroke="#fff"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray="1 10"
            />
            <Polyline
              points={toSvg(segment)}
              fill="none"
              stroke={colors.inkFaint}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray="1 10"
            />
          </React.Fragment>
        ))}
        <Polyline
          points={path}
          fill="none"
          stroke="#fff"
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 13"
        />
        <Polyline
          points={path}
          fill="none"
          stroke={colors.accent}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 13"
        />
      </Svg>
    </View>
  );
}
