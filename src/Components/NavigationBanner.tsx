import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RouteStep } from '../Services/routing';
import { colors, shadows } from '../theme';
import { formatDistance } from '../Utils/format';
import ManeuverIcon from './ManeuverIcon';

interface NavigationBannerProps {
  /** Next maneuver */
  step: RouteStep;
  distance: number;
  arrived: boolean;
  destinationName: string;
}

/** Big next-maneuver banner shown on top while navigating */
export default function NavigationBanner({ step, distance, arrived, destinationName }: NavigationBannerProps) {
  const arriving = step.maneuver.type === 'arrive';
  const headline = arrived ? 'Has llegado' : distance <= 15 ? 'Ahora' : formatDistance(distance);
  const instruction = arrived || arriving ? destinationName : step.instruction;

  return (
    <View style={styles.banner}>
      <View style={styles.icon}>
        <ManeuverIcon maneuver={step.maneuver} size={40} color="#fff" />
      </View>
      <View style={styles.text}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.instruction} numberOfLines={2}>{instruction}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.accentDark,
    boxShadow: shadows.card,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  text: {
    flex: 1,
    marginLeft: 14,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  instruction: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.92)',
  },
});
