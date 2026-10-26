import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UserLocation } from '../Hooks/useLocation';
import { colors, shadows } from '../theme';
import { formatCoordinate } from '../Utils/format';

export default function LocationCard({ location }: { location: UserLocation }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <MaterialIcons name="near-me" size={22} color={colors.accent} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Tu ubicación</Text>
          <Text style={styles.coords}>
            {formatCoordinate(location.latitude, 'N', 'S')}  ·  {formatCoordinate(location.longitude, 'E', 'O')}
          </Text>
        </View>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>En vivo</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <MaterialIcons name="directions-walk" size={16} color={colors.inkFaint} />
        <Text style={styles.hint}>Busca un lugar para ir andando</Text>
        {location.accuracy != null ? (
          <Text style={styles.accuracy}>± {Math.round(location.accuracy)} m</Text>
        ) : null}
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
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  text: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  coords: {
    marginTop: 2,
    fontSize: 13,
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E9F9EF',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
    backgroundColor: colors.live,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  hint: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: colors.inkSoft,
  },
  accuracy: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentDark,
    fontVariant: ['tabular-nums'],
  },
});
