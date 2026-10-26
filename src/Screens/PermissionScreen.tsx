import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, shadows } from "../theme";

interface PermissionScreenProps {
  message: string;
  onRetry: () => void;
}

export default function PermissionScreen({ message, onRetry }: PermissionScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <MaterialIcons name="location-off" size={44} color={colors.accent} />
      </View>
      <Text style={styles.title}>Necesito tu ubicación</Text>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.body}>
        La app la usa para mostrarte en el mapa, buscar lugares cerca de ti y calcular rutas a pie.
      </Text>

      <Pressable onPress={onRetry} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
        <Text style={styles.primaryText}>Permitir ubicación</Text>
      </Pressable>
      <Pressable onPress={() => Linking.openSettings()} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
        <Text style={styles.secondaryText}>Abrir ajustes</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: colors.accentSoft,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    boxShadow: shadows.card,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
    color: colors.destination,
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    marginBottom: 32,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    textAlign: "center",
  },
  primary: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: colors.accent,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  secondary: {
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accentDark,
  },
  pressed: {
    opacity: 0.7,
  },
});
