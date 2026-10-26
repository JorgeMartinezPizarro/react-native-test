import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

// Pin drawn in a 32×42 box with its tip at (16, 41)
const SCALE = 1.25;
const WIDTH = 32 * SCALE;
const HEIGHT = 42 * SCALE;
const TIP_Y = 41 * SCALE;

export default function DestinationMarker({ x, y }: { x: number; y: number }) {
  return (
    <View pointerEvents="none" style={[styles.anchor, { left: x, top: y }]}>
      <View style={styles.shadow} />
      <Svg width={WIDTH} height={HEIGHT} viewBox="0 0 32 42" style={styles.pin}>
        <Path
          d="M16 41 C16 41 2 26.5 2 16 A14 14 0 1 1 30 16 C30 26.5 16 41 16 41 Z"
          fill={colors.destination}
          stroke="#fff"
          strokeWidth={2}
        />
        <Circle cx={16} cy={16} r={5.5} fill="#fff" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  shadow: {
    position: 'absolute',
    left: -9,
    top: -3,
    width: 18,
    height: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  pin: {
    position: 'absolute',
    left: -WIDTH / 2,
    top: -TIP_Y,
  },
});
