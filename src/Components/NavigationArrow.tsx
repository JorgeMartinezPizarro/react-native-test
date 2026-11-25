import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

const SIZE = 46;

/** The user while navigating in 3D: a chevron lying on the ground, pointing along the route */
export default function NavigationArrow({ x, y }: { x: number; y: number }) {
  return (
    <View pointerEvents="none" style={[styles.anchor, { left: x, top: y }]}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 46 46" style={styles.arrow}>
        <Path
          d="M23 3 L40 41 L23 32 L6 41 Z"
          fill={colors.accent}
          stroke="#fff"
          strokeWidth={3}
          strokeLinejoin="round"
        />
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
  arrow: {
    position: 'absolute',
    left: -SIZE / 2,
    top: -SIZE / 2,
  },
});
