import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors } from '../theme';
import { Point } from '../Utils/geo';

interface RouteLineProps {
  points: Point[];
  width: number;
  height: number;
}

/** Dotted walking route, drawn in screen coordinates */
export default function RouteLine({ points, width, height }: RouteLineProps) {
  // Skip points closer than ~2px to the previous one, they add nothing visible
  const kept: Point[] = [];
  for (const p of points) {
    const last = kept[kept.length - 1];
    if (!last || Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > 2) kept.push(p);
  }
  const path = kept.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
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
