import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useLocation } from "../Hooks/useLocation";
import WorldMap from "../Components/WorldMap";
import Loader from "../Components/Loader"

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
		{location && <WorldMap
			height={400}
			latitude={location?.latitude}
			longitude={location?.longitude}
			initialZoom={18}
			name={value}
		/>}
		{!location && <Loader />}
	</>);
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
	verticalAlign: "middle"
  },
  text: {
    fontSize: 40,
	padding: 10,
	borderRadius: 8,
  },
});