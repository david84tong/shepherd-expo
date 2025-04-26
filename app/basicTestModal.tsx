import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useUIStore } from './stores/uiStore'; // Import the store

export enum PopUpModalType {
  HEART_PENALTY = 'HEART_PENALTY',
  WIDGET_REMINDER = 'PRAYER_REMINDER',
  ANNOUNCEMENT = 'READING_REMINDER',
}


export default function BasicTestModalScreen() {
  const router = useRouter();
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);

  // Set/unset dim state on mount/unmount with delay for activation
  useEffect(() => {
    console.log("[basicTestModal] Mounting, scheduling dim activation...");
    // Delay setting dim active slightly
    const timer = setTimeout(() => {
      console.log("[basicTestModal] Timer fired, setting dim active");
      setIsModalDimActive(true);
    }, 500); // 100ms delay - adjust if needed

    return () => {
      // This cleanup runs when the component unmounts (modal is dismissed)
      console.log("[basicTestModal] Unmounting, clearing timer and setting dim inactive");
      clearTimeout(timer); // Clear the timer if unmounting before it fires
      setIsModalDimActive(false); // Set inactive immediately on unmount
    };
  }, [setIsModalDimActive]);

  return (
    // Container MUST be transparent to see the overlay behind it
    <View style={styles.container}>
      {/* Pressable overlay for background taps */}
      <Pressable 
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()} 
      />
      {/* Modal content sheet */}
      <View style={styles.modalContent}>
        <Text style={styles.title}>Basic Test Modal Screen</Text>
        <Text style={styles.message}>Presented via Expo Router</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end', 
    backgroundColor: 'transparent', // Fully transparent container
  },
  modalContent: {
    backgroundColor: '#FFF4D9',
    padding: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1, // Keep content above potential elements in container (though container is transparent)
  },
  title: {
    color: '#333333',
    fontSize: 22,
    marginBottom: 10,
    fontWeight: 'bold',
    fontFamily: 'Feather Bold',
  },
  message: {
      color: '#555555',
      fontSize: 16,
      marginBottom: 25,
      fontFamily: 'DIN Next Rounded LT W01 Regular',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#4A7C59',
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
  },
}); 