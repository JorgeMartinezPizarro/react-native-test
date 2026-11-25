import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Point } from '../Utils/geo';

const DOT = 11;
const CONNECTOR_DOT = 8;

interface RouteLineProps {
  /** Dots of the walking route, in map-layer coordinates */
  dots: Point[];
  /** Grey dots bridging the gaps to the real start/end (off the walkable network) */
  connectors: Point[];
}

/**
 * Dotted walking route. Plain views lying on the map plane rather than an SVG: they turn and tilt with the
 * 3D navigation view, and only the visible ones exist (an SVG big enough for the 3D view would be huge).
 */
export default function RouteLine({ dots, connectors }: RouteLineProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {connectors.map((p, i) => (
        <View key={`c${i}`} style={[styles.connector, { left: p.x - CONNECTOR_DOT / 2, top: p.y - CONNECTOR_DOT / 2 }]} />
      ))}
      {dots.map((p, i) => (
        <View key={i} style={[styles.dot, { left: p.x - DOT / 2, top: p.y - DOT / 2 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: colors.accent,
  },
  connector: {
    position: 'absolute',
    width: CONNECTOR_DOT,
    height: CONNECTOR_DOT,
    borderRadius: CONNECTOR_DOT / 2,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: colors.inkFaint,
  },
});
