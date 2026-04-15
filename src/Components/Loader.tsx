import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Loader() {
  return (
    <View style={styles.overlay}>
  <View style={styles.card}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
	overlay: {
	position: 'absolute',
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	backgroundColor: 'rgba(0,0,0,0.4)',
	justifyContent: 'center',
	alignItems: 'center',
  },
	card: {
	backgroundColor: 'white',
	padding: 20,
	borderRadius: 12,
	elevation: 5, // Android
	shadowColor: '#000', // iOS
	shadowOpacity: 0.2,
	shadowRadius: 10,
  }
});