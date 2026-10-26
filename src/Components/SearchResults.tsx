import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Place } from '../Services/places';
import { colors, shadows } from '../theme';
import { formatDistance } from '../Utils/format';
import { LatLng, distanceMeters } from '../Utils/geo';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const CATEGORY_ICONS: Record<string, IconName> = {
  restaurant: 'restaurant', fast_food: 'restaurant', food_court: 'restaurant',
  cafe: 'local-cafe', bar: 'local-cafe', pub: 'local-cafe',
  museum: 'museum', gallery: 'museum',
  park: 'park', garden: 'park',
  station: 'train', subway_entrance: 'train', tram_stop: 'train', halt: 'train',
  bus_stop: 'directions-bus', bus_station: 'directions-bus',
  hospital: 'local-hospital', clinic: 'local-hospital', pharmacy: 'local-hospital',
  school: 'school', university: 'school', college: 'school',
  parking: 'local-parking',
  city: 'location-city', town: 'location-city', village: 'location-city',
  suburb: 'location-city', neighbourhood: 'location-city',
  house: 'home', residential: 'home',
};

function placeIcon(place: Place): IconName {
  if (CATEGORY_ICONS[place.category]) return CATEGORY_ICONS[place.category];
  if (place.kind === 'shop') return 'store';
  if (place.kind === 'building') return 'apartment';
  return 'place';
}

interface SearchResultsProps {
  query?: string;
  results: Place[];
  loading?: boolean;
  error?: string | null;
  origin: LatLng;
  maxHeight: number;
  /** Header shown above the list, e.g. "Guardados" */
  title?: string;
  onSelect: (place: Place) => void;
  /** When given, each row gets a button to remove it */
  onRemove?: (place: Place) => void;
}

export default function SearchResults({
  query = '',
  results,
  loading = false,
  error = null,
  origin,
  maxHeight,
  title,
  onSelect,
  onRemove,
}: SearchResultsProps) {
  if (error || !results.length) {
    return (
      <View style={styles.card}>
        <View style={styles.message}>
          <MaterialIcons
            name={error ? 'cloud-off' : 'search-off'}
            size={20}
            color={error ? colors.destination : colors.inkFaint}
          />
          <Text style={styles.messageText}>
            {error ?? (loading ? 'Buscando…' : `Sin resultados para «${query.trim()}»`)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { maxHeight }]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <ScrollView keyboardShouldPersistTaps="handled">
        {results.map((place, i) => (
          <Pressable
            key={`${place.id}-${i}`}
            onPress={() => onSelect(place)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.icon}>
              <MaterialIcons name={placeIcon(place)} size={20} color={colors.accentDark} />
            </View>
            <View style={[styles.text, i > 0 && styles.separator]}>
              <View style={styles.textInner}>
                <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
                {place.address ? <Text style={styles.address} numberOfLines={1}>{place.address}</Text> : null}
              </View>
              <Text style={styles.distance}>{formatDistance(distanceMeters(origin, place.coordinate))}</Text>
              {onRemove ? (
                <Pressable
                  onPress={() => onRemove(place)}
                  hitSlop={8}
                  style={styles.remove}
                  accessibilityLabel="Quitar de guardados"
                >
                  <MaterialIcons name="close" size={16} color={colors.inkFaint} />
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: 22,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    boxShadow: shadows.card,
  },
  title: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkFaint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
  },
  remove: {
    width: 28,
    height: 28,
    marginLeft: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  text: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    paddingRight: 16,
    paddingVertical: 12,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  textInner: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  address: {
    marginTop: 2,
    fontSize: 13,
    color: colors.inkSoft,
  },
  distance: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  messageText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: colors.inkSoft,
  },
});
