import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import PrimaryButton from './PrimaryButton';

interface JournalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Placeholder component for the Daily Reflection/Journaling feature.
 */
const JournalComponent: React.FC<JournalProps> = ({ visible, onClose }) => {
  // Basic entry animation (similar to BiblePreview)
  const cardAnim = React.useRef(new Animated.Value(-100)).current;
  const cardOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(cardAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
    } else {
      cardAnim.setValue(-100);
      cardOpacity.setValue(0);
    }
  }, [visible, cardAnim, cardOpacity]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      {/* Animated Card Content */}
      <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardAnim }] }]}>
        <Text style={styles.title}>Daily Reflection</Text>
        <Text style={styles.subtitle}>Journaling placeholder...</Text>
        {/* Add journaling elements here */}
      </Animated.View>

      {/* Optional bottom button if needed */}
      <View style={styles.bottomButton}>
        <PrimaryButton title="Save Entry" onPress={onClose} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 244, 217, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 24,
    color: '#3C584A',
    fontFamily: 'Inter-Bold',
  },
  card: {
    width: '90%',
    marginTop: 80, // Position below header
    backgroundColor: '#E6F2FF', // Different background for journal
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: '#A8C0E0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Feather Bold',
    color: '#4A6C8C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6A8CB0',
    marginBottom: 20,
  },
   bottomButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
});

export default JournalComponent;
