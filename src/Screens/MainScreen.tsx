import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useLocation } from "../Hooks/useLocation";

export default function LocationMap() {
  const { location, error } = useLocation();
  const [value, setValue] = useState("");

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{error}</Text>
      </View>
    );
  }

  return (<>
			<TextInput
			value={value}
			onChangeText={setValue}
			placeholder="Nombre..."
			style={{
			borderWidth: 1,
			borderColor: "#ccc",
			padding: 10,
			borderRadius: 8,
			fontSize: 40,
			}}
        />
		<Text style={styles.text}>X: {location?.longitude}</Text>
		<Text style={styles.text}>Y: {location?.latitude}</Text>
	</>);
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 40,
	padding: 10,
	borderRadius: 8,
  },
});