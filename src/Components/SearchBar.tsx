import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

interface SearchBarProps {
  value: string;
  loading?: boolean;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onSubmit?: () => void;
  onClear: () => void;
}

export default function SearchBar({ value, loading, onChangeText, onFocus, onSubmit, onClear }: SearchBarProps) {
  return (
    <View style={styles.bar}>
      <MaterialIcons name="search" size={22} color={colors.inkSoft} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmit}
        placeholder="Buscar un lugar"
        placeholderTextColor={colors.inkFaint}
        returnKeyType="search"
        autoCorrect={false}
        selectionColor={colors.accent}
        style={styles.input}
      />
      <View style={styles.trailing}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : value ? (
          <Pressable onPress={onClear} hitSlop={10} style={styles.clear} accessibilityLabel="Borrar búsqueda">
            <MaterialIcons name="close" size={18} color={colors.inkSoft} />
          </Pressable>
        ) : (
          <View style={styles.badge}>
            <MaterialIcons name="directions-walk" size={18} color="#fff" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 54,
    borderRadius: 27,
    paddingLeft: 18,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    boxShadow: shadows.card,
  },
  input: {
    flex: 1,
    height: '100%',
    marginHorizontal: 10,
    paddingVertical: 0,
    fontSize: 16,
    color: colors.ink,
  },
  trailing: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
