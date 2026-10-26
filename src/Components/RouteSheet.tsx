import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Place } from '../Services/places';
import { Maneuver, RouteStep, WalkingRoute } from '../Services/routing';
import { colors, shadows } from '../theme';
import { formatClock, formatDistance, formatDuration } from '../Utils/format';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const TURN_ICONS: Record<string, IconName> = {
  uturn: 'u-turn-left',
  'sharp right': 'turn-sharp-right',
  right: 'turn-right',
  'slight right': 'turn-slight-right',
  straight: 'straight',
  'slight left': 'turn-slight-left',
  left: 'turn-left',
  'sharp left': 'turn-sharp-left',
};

function maneuverIcon({ type, modifier }: Maneuver): IconName {
  if (type === 'depart') return 'trip-origin';
  if (type === 'arrive') return 'flag';
  if (type.includes('roundabout') || type.includes('rotary')) return 'roundabout-right';
  return TURN_ICONS[modifier ?? 'straight'] ?? 'straight';
}

interface RouteSheetProps {
  place: Place;
  route: WalkingRoute | null;
  loading: boolean;
  error: string | null;
  /** Recalculating because the user walked off the route */
  rerouting: boolean;
  saved: boolean;
  stepsMaxHeight: number;
  onClose: () => void;
  onRetry: () => void;
  onToggleSave: () => void;
}

export default function RouteSheet({
  place,
  route,
  loading,
  error,
  rerouting,
  saved,
  stepsMaxHeight,
  onClose,
  onRetry,
  onToggleSave,
}: RouteSheetProps) {
  const [showSteps, setShowSteps] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.placeIcon}>
          <MaterialIcons name="place" size={22} color={colors.destination} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{place.name}</Text>
          {place.address ? <Text style={styles.subtitle} numberOfLines={1}>{place.address}</Text> : null}
        </View>
        <Pressable
          onPress={onToggleSave}
          hitSlop={8}
          style={[styles.roundBtn, styles.saveBtn]}
          accessibilityLabel={saved ? 'Quitar de guardados' : 'Guardar lugar'}
        >
          <MaterialIcons name={saved ? 'star' : 'star-border'} size={21} color={saved ? colors.favorite : colors.inkSoft} />
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8} style={styles.roundBtn} accessibilityLabel="Cerrar ruta">
          <MaterialIcons name="close" size={20} color={colors.inkSoft} />
        </Pressable>
      </View>

      {rerouting ? (
        <View style={styles.reroute}>
          <MaterialIcons name="alt-route" size={18} color={colors.accentDark} />
          <Text style={styles.rerouteText}>Te has desviado. Recalculando la ruta…</Text>
        </View>
      ) : null}

      {route ? (
        <>
          <View style={styles.summary}>
            <View style={styles.walkBadge}>
              <MaterialIcons name="directions-walk" size={24} color="#fff" />
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.duration}>{formatDuration(route.duration)}</Text>
              <Text style={styles.meta}>
                {formatDistance(route.distance)} · llegada a las {formatClock(new Date(Date.now() + route.duration * 1000))}
              </Text>
            </View>
            <Pressable onPress={onRetry} hitSlop={8} style={styles.roundBtn} accessibilityLabel="Recalcular ruta">
              {loading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <MaterialIcons name="refresh" size={20} color={colors.accent} />
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => setShowSteps(s => !s)}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
          >
            <Text style={styles.toggleText}>
              {showSteps ? 'Ocultar indicaciones' : `Ver indicaciones · ${route.steps.length} pasos`}
            </Text>
            <MaterialIcons name={showSteps ? 'expand-more' : 'expand-less'} size={22} color={colors.accentDark} />
          </Pressable>

          {showSteps ? (
            <ScrollView style={{ maxHeight: stepsMaxHeight }} contentContainerStyle={styles.steps}>
              {route.steps.map((step, i) => <StepRow key={i} step={step} />)}
            </ScrollView>
          ) : null}
        </>
      ) : error ? (
        <View style={styles.status}>
          <MaterialIcons name="error-outline" size={20} color={colors.destination} />
          <Text style={[styles.statusText, styles.errorText]}>{error}</Text>
          <Pressable onPress={onRetry} hitSlop={8}>
            <Text style={styles.link}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.statusText}>Calculando ruta a pie…</Text>
        </View>
      )}
    </View>
  );
}

function StepRow({ step }: { step: RouteStep }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}>
        <MaterialIcons name={maneuverIcon(step.maneuver)} size={20} color={colors.accentDark} />
      </View>
      <Text style={styles.stepText}>{step.instruction}</Text>
      {step.distance > 0 ? <Text style={styles.stepDistance}>{formatDistance(step.distance)}</Text> : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.destinationSoft,
  },
  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.inkSoft,
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  saveBtn: {
    marginRight: 8,
  },
  reroute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
  },
  rerouteText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentDark,
  },

  // Summary
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
  },
  walkBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  summaryText: {
    flex: 1,
    marginHorizontal: 12,
  },
  duration: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.accentDark,
  },
  meta: {
    marginTop: 1,
    fontSize: 13,
    color: colors.inkSoft,
  },

  // Steps
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  togglePressed: {
    backgroundColor: colors.surfaceMuted,
  },
  toggleText: {
    marginRight: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentDark,
  },
  steps: {
    paddingTop: 4,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  stepText: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 14,
    color: colors.ink,
  },
  stepDistance: {
    fontSize: 13,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },

  // Loading / error
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: colors.inkSoft,
  },
  errorText: {
    color: colors.destination,
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
});
