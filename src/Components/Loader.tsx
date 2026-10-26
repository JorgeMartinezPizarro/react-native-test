import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

interface LoaderProps {
  title?: string;
  subtitle?: string;
}

export default function Loader({
  title = 'Buscando tu ubicación…',
  subtitle = 'Activa el GPS para una mayor precisión',
}: LoaderProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ring = (scale: number, opacity: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [opacity, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) }],
  });

  return (
    <View style={styles.container}>
      <View style={styles.beacon}>
        <Animated.View style={[styles.ring, ring(2.6, 0.35)]} />
        <Animated.View style={[styles.ring, ring(1.7, 0.5)]} />
        <View style={styles.core}>
          <MaterialIcons name="near-me" size={40} color="#fff" />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const CORE = 96;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.accentSoft,
  },
  beacon: {
    width: CORE,
    height: CORE,
    marginBottom: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: colors.accent,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    boxShadow: shadows.card,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
