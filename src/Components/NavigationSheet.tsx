import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';
import { formatClock, formatDistance, formatDuration } from '../Utils/format';

interface NavigationSheetProps {
  remainingDistance: number;
  remainingDuration: number;
  arrived: boolean;
  rerouting: boolean;
  voice: boolean;
  /** Guidance keeps running with the screen off */
  background: boolean;
  onToggleVoice: () => void;
  onExit: () => void;
}

/** Compact bottom sheet while navigating: what's left, voice on/off and exit */
export default function NavigationSheet({
  remainingDistance,
  remainingDuration,
  arrived,
  rerouting,
  voice,
  background,
  onToggleVoice,
  onExit,
}: NavigationSheetProps) {
  return (
    <View style={styles.card}>
      {rerouting ? (
        <View style={styles.notice}>
          <MaterialIcons name="alt-route" size={18} color={colors.accentDark} />
          <Text style={styles.noticeText}>Te has desviado. Recalculando la ruta…</Text>
        </View>
      ) : !background && !arrived ? (
        <View style={styles.notice}>
          <MaterialIcons name="smartphone" size={18} color={colors.accentDark} />
          <Text style={styles.noticeText}>Mantén la app abierta: con la pantalla bloqueada no hay avisos.</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.summary}>
          <Text style={styles.time}>{arrived ? 'Has llegado' : formatDuration(remainingDuration)}</Text>
          {arrived ? null : (
            <Text style={styles.meta}>
              {formatDistance(remainingDistance)} · llegada a las{' '}
              {formatClock(new Date(Date.now() + remainingDuration * 1000))}
            </Text>
          )}
        </View>

        <Pressable
          onPress={onToggleVoice}
          hitSlop={8}
          style={[styles.voice, !voice && styles.voiceOff]}
          accessibilityLabel={voice ? 'Silenciar indicaciones' : 'Activar indicaciones por voz'}
        >
          <MaterialIcons name={voice ? 'volume-up' : 'volume-off'} size={22} color={voice ? colors.accentDark : colors.inkSoft} />
        </Pressable>

        <Pressable onPress={onExit} style={({ pressed }) => [styles.exit, pressed && styles.exitPressed]}>
          <Text style={styles.exitText}>{arrived ? 'Finalizar' : 'Salir'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colors.surface,
    boxShadow: shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summary: {
    flex: 1,
  },
  time: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.accentDark,
  },
  meta: {
    marginTop: 1,
    fontSize: 13,
    color: colors.inkSoft,
  },
  voice: {
    width: 44,
    height: 44,
    marginRight: 10,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  voiceOff: {
    backgroundColor: colors.surfaceMuted,
  },
  exit: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: colors.destination,
  },
  exitPressed: {
    opacity: 0.8,
  },
  exitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
  },
  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentDark,
  },
});
