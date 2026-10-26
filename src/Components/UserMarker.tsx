import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

const DOT = 20;

// Heading beam: a 60° wedge pointing north, rotated to the compass heading
const BEAM = 112;
const BEAM_LENGTH = 54;
const C = BEAM / 2;
const HALF = (30 * Math.PI) / 180;
const BEAM_PATH =
  `M${C} ${C} ` +
  `L${C - BEAM_LENGTH * Math.sin(HALF)} ${C - BEAM_LENGTH * Math.cos(HALF)} ` +
  `A${BEAM_LENGTH} ${BEAM_LENGTH} 0 0 1 ${C + BEAM_LENGTH * Math.sin(HALF)} ${C - BEAM_LENGTH * Math.cos(HALF)} Z`;

interface UserMarkerProps {
  x: number;
  y: number;
  /** GPS accuracy circle radius, in screen points */
  accuracyRadius?: number;
  /** Compass heading in degrees clockwise from north */
  heading?: number | null;
}

export default function UserMarker({ x, y, accuracyRadius = 0, heading }: UserMarkerProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ring = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 3.4] }) }],
  };
  const radius = Math.min(accuracyRadius, 600);

  return (
    <View pointerEvents="none" style={[styles.anchor, { left: x, top: y }]}>
      {radius > DOT ? (
        <View
          style={[
            styles.accuracy,
            { width: radius * 2, height: radius * 2, borderRadius: radius, left: -radius, top: -radius },
          ]}
        />
      ) : null}
      {heading != null ? (
        <View style={[styles.beam, { transform: [{ rotate: `${heading}deg` }] }]}>
          <Svg width={BEAM} height={BEAM}>
            <Defs>
              <RadialGradient id="beam" cx={C} cy={C} r={BEAM_LENGTH} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0.6} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Path d={BEAM_PATH} fill="url(#beam)" />
          </Svg>
        </View>
      ) : null}
      <Animated.View style={[styles.ring, ring]} />
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  accuracy: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 139, 141, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(15, 139, 141, 0.35)',
  },
  beam: {
    position: 'absolute',
    left: -C,
    top: -C,
    width: BEAM,
    height: BEAM,
  },
  ring: {
    position: 'absolute',
    left: -DOT / 2,
    top: -DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.accent,
  },
  dot: {
    position: 'absolute',
    left: -DOT / 2,
    top: -DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#fff',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.35)',
  },
});
