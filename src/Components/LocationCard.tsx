import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UserLocation } from '../Hooks/useLocation';
import { Place } from '../Services/places';
import { colors, shadows } from '../theme';
import { formatCoordinate } from '../Utils/format';

interface LocationCardProps {
  location: UserLocation;
  favorites: Place[];
  onSelectFavorite: (place: Place) => void;
}

export default function LocationCard({ location, favorites, onSelectFavorite }: LocationCardProps) {
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
        {favorites.length ? (
          // Saved places as one-tap shortcuts
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.chips}
          >
            {favorites.map(place => (
              <Pressable
                key={place.id}
                onPress={() => onSelectFavorite(place)}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              >
                <MaterialIcons name="star" size={15} color={colors.favorite} />
                <Text style={styles.chipText} numberOfLines={1}>{place.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <>
            <MaterialIcons name="directions-walk" size={16} color={colors.inkFaint} />
            <Text style={styles.hint}>Busca un lugar para ir andando</Text>
          </>
        )}
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
  chips: {
    flex: 1,
    marginRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 170,
    marginRight: 8,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  chipPressed: {
    backgroundColor: colors.line,
  },
  chipText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  accuracy: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentDark,
    fontVariant: ['tabular-nums'],
  },
});
