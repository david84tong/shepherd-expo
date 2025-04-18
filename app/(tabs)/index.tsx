import { View, Text, SafeAreaView, Platform, Image, Button, Animated, StyleSheet, Easing, TouchableOpacity } from 'react-native';
import Rive, { RiveRef, RNRiveError } from 'rive-react-native';
import { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import SecondaryButton from '../../components/SecondaryButton';
import PrimaryButton from '../../components/PrimaryButton';
import PrayerComponent from '../../components/PrayerComponent';
import BiblePreviewComponent from '../../components/BiblePreviewComponent';
import JournalComponent from '../../components/JournalComponent';
import { useHomeStore, HomeMode } from '../../store/homeStore'; // Import Zustand store

// Backgrounds
const grassBg = require('../../assets/backgrounds/defaultBackground.png');
const waterBg = require('../../assets/backgrounds/waterBackground.png');
const pathBg = require('../../assets/backgrounds/path1Background.png');
const journalBg = require('../../assets/backgrounds/mainBackground.png'); // Add a background for reflection

// Icons
const breadIcon = require('../../assets/icons/breadIcon.png');
const dropIcon = require('../../assets/icons/breadIcon.png');
const quillIcon = require('../../assets/icons/breadIcon.png');

export default function HomeScreen() {
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState<RNRiveError | null>(null);
  const navigation = useNavigation();

  // Use Zustand store for mode management
  const mode = useHomeStore((state) => state.mode);
  const setMode = useHomeStore((state) => state.setMode);

  // Animation value for UI elements (lamb position, card visibility)
  // 0: default, 0.5: preview, 1: prayer/reflection
  const uiAnim = useRef(new Animated.Value(0)).current;

  // Separate Animated values for background opacities
  const grassOpacityAnim = useRef(new Animated.Value(1)).current; // Start with grass visible
  const pathOpacityAnim = useRef(new Animated.Value(0)).current;
  const waterOpacityAnim = useRef(new Animated.Value(0)).current;
  const journalOpacityAnim = useRef(new Animated.Value(0)).current;

  // Separate animation values for different modes
  const previewAnim = useRef(new Animated.Value(0)).current;
  const prayerAnim = useRef(new Animated.Value(0)).current;
  const reflectionAnim = useRef(new Animated.Value(0)).current;

  // --- Animation Definitions ---

  // Water background effects tied to its opacity
  const waterTranslateY = waterOpacityAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0], extrapolate: 'clamp' });
  const waterScale = waterOpacityAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05], extrapolate: 'clamp' });

  // Interpolate lamb position with separate animations for each mode
  const lambTranslateX = Animated.add(
    // Preview: no horizontal movement
    previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0], extrapolate: 'clamp' }),
    Animated.add(
      // Prayer: diagonal movement (left)
      prayerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40], extrapolate: 'clamp' }),
      // Reflection: rightward movement
      reflectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 40], extrapolate: 'clamp' })
    )
  );

  const lambTranslateY = Animated.add(
    // Preview: moves down slightly
    previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240], extrapolate: 'clamp' }),
    Animated.add(
      // Prayer: moves down further
      prayerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200], extrapolate: 'clamp' }),
      // Reflection: moves down same as prayer
      reflectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200], extrapolate: 'clamp' })
    )
  );

  // Bottom Action Card animation
  const bottomCardOpacity = uiAnim.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const bottomCardTranslateY = uiAnim.interpolate({ inputRange: [0, 0.5], outputRange: [0, 300], extrapolate: 'clamp' });

  // --- Rive Handlers ---
  const handleOutOfFrame = () => {
    try {
      riveRef.current?.setInputState('MAIN', 'Out of Frame', true);
    } catch (error) {
      console.error("Error setting Rive input state:", error);
    }
  };
  const handleRiveError = (error: RNRiveError) => {
    console.error("Rive Error:", error.message, error.type);
    setRiveError(error);
  };

  // --- Animation Helpers ---
  const animateToState = (targetUiAnim: number, targetOpacityAnim: Animated.Value, duration: number = 600, mode: HomeMode) => {
    const fadeOutAnims = [grassOpacityAnim, pathOpacityAnim, waterOpacityAnim, journalOpacityAnim]
      .filter(anim => anim !== targetOpacityAnim)
      .map(anim => Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }));

    // Reset all mode animations first
    const resetAnims = [
      Animated.timing(previewAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.timing(prayerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.timing(reflectionAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ];
    
    // Determine which mode animation to activate
    let modeAnim: Animated.CompositeAnimation;
    if (mode === 'PREVIEW') {
      modeAnim = Animated.timing(previewAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    } else if (mode === 'PRAYER') {
      modeAnim = Animated.timing(prayerAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    } else if (mode === 'REFLECTION') {
      modeAnim = Animated.timing(reflectionAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    } else {
      // Default case - should never happen but needed for type safety
      modeAnim = Animated.timing(previewAnim, { toValue: 0, duration: 0, useNativeDriver: true });
    }

    Animated.sequence([
      Animated.parallel(resetAnims),
      Animated.parallel([
        Animated.timing(uiAnim, { toValue: targetUiAnim, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(targetOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
        ...fadeOutAnims,
        modeAnim,
      ])
    ]).start();
  };

  const animateToDefault = (duration: number = 600) => {
    // Reset all position animations
    const resetAnims = [
      Animated.timing(previewAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(prayerAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(reflectionAnim, { toValue: 0, duration, useNativeDriver: true }),
    ];
    
    Animated.parallel([
      Animated.timing(uiAnim, { toValue: 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(grassOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(pathOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(waterOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(journalOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      ...resetAnims
    ]).start();
  };

  // --- Event Handlers for Buttons ---
  const handleReadPress = () => {
    console.log('Read Daily Bread Pressed');
    setMode('PREVIEW');
    animateToState(0.5, pathOpacityAnim, 500, 'PREVIEW'); // Faster transition
  };

  const handlePrayerPress = () => {
    console.log('Daily Prayer Pressed');
    setMode('PRAYER');
    animateToState(1, waterOpacityAnim, 600, 'PRAYER');
  };

  const handleReflectionPress = () => {
    console.log('Daily Reflection / QT Pressed');
    setMode('REFLECTION');
    animateToState(1, journalOpacityAnim, 600, 'REFLECTION');
  };

  // --- Handlers for Closing Overlays ---
  const handleCloseOverlay = () => {
    console.log('Closing Overlay, returning to default');
    animateToDefault();
    // Set mode back to default AFTER animation starts (or finishes)
    // Setting it immediately triggers the useEffect for tab bar correctly
    setMode('DEFAULT'); 
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Background Layers */}
      <Animated.Image source={grassBg} style={[styles.backgroundImage, { opacity: grassOpacityAnim }]} resizeMode="cover" />
      <Animated.Image source={pathBg} style={[styles.backgroundImage, { opacity: pathOpacityAnim }]} resizeMode="cover" />
      <Animated.Image source={journalBg} style={[styles.backgroundImage, { opacity: journalOpacityAnim }]} resizeMode="cover" />
      <Animated.Image
        source={waterBg}
        style={[
          styles.backgroundImage,
          { 
            opacity: waterOpacityAnim, 
            transform: [{ translateY: waterTranslateY }, { scale: waterScale }] 
          }
        ]}
        resizeMode="cover"
      />

      <SafeAreaView className="flex-1">
        {/* Header: Shows Back Button or Title/Streak */} 
        <View style={styles.headerContainer}>
          {mode !== 'DEFAULT' ? (
            <TouchableOpacity onPress={handleCloseOverlay} style={styles.headerBackButton}>
              <Text style={styles.headerBackText}>←</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.headerTitle}>Shepherd</Text>
              <View style={styles.streakContainer}>
                <Text style={styles.streakNumber}>2</Text>
                <Text style={styles.streakEmoji}>🔥</Text>
              </View>
            </>
          )}
        </View>

        {/* Top Section - Lamb Avatar */} 
        <Animated.View
          style={[styles.riveWrapper, {
            transform: [
              { translateX: lambTranslateX },
              { translateY: lambTranslateY }
            ]
          }]}>
          <View style={styles.riveContainer}>
            {riveError ? (
              <Text style={styles.errorText}>
                Error loading animation: {riveError.message} ({riveError.type})
              </Text>
            ) : (
              <Rive
                ref={riveRef}
                resourceName="idleLamb"
                autoplay={true}
                onError={handleRiveError}
                style={{ width: '100%', height: '100%' }} // Fill container
              />
            )}
          </View>
          {!riveError && <Button title="Trigger Out of Frame" onPress={handleOutOfFrame} />} 
        </Animated.View>

        {/* Bottom Section - Action Buttons Card */} 
        <Animated.View
          style={[styles.bottomCard, {
            opacity: bottomCardOpacity,
            transform: [{ translateY: bottomCardTranslateY }],
          }]}>
          {/* Buttons are disabled if not in DEFAULT mode */}
          <SecondaryButton 
            icon={breadIcon}
            title="Read Daily Bread"
            subtitle="Feed your soul with scripture"
            points={5}
            onPress={handleReadPress}
            disabled={mode !== 'DEFAULT'}
          />
          <SecondaryButton 
            icon={dropIcon}
            title="Daily Prayer"
            subtitle="Feed your soul with scripture"
            points={5}
            onPress={handlePrayerPress}
            disabled={mode !== 'DEFAULT'}
          />
          <SecondaryButton 
            icon={quillIcon}
            title="Daily Reflection / QT"
            subtitle="Feed your soul with scripture"
            points={5}
            onPress={handleReflectionPress}
            disabled={mode !== 'DEFAULT'}
          />
        </Animated.View>

        {/* Overlays - Rendered based on mode */} 
        <BiblePreviewComponent 
          visible={mode === 'PREVIEW'} 
          onClose={handleCloseOverlay}
        />
        <PrayerComponent
          visible={mode === 'PRAYER'}
          onClose={handleCloseOverlay} // Use generic close handler
          // Removed buttonStyle, handle spacing within PrayerComponent if needed
        />
        <JournalComponent
          visible={mode === 'REFLECTION'}
          onClose={handleCloseOverlay}
        />
      </SafeAreaView>
    </View>
  );
}

// Add specific styles for clarity
const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 4 : 16, // Adjust for notch/status bar
    marginBottom: 16,
  },
  headerBackButton: {
     paddingVertical: 8, 
     paddingRight: 16
  },
  headerBackText: {
    fontSize: 28, 
    color: 'white', // Make back button white for better contrast on bg
    fontFamily: 'Feather Bold' 
  },
  headerTitle: {
    fontFamily: 'Feather Bold',
    fontSize: 30,
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)', // Subtle shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  streakNumber: {
    fontFamily: 'Feather Bold',
    fontSize: 18,
    color: 'white',
    marginRight: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  riveWrapper: {
    // Use flex for positioning instead of hardcoded values if possible
    flex: Platform.OS === 'ios' ? 0.7 : 0.6, // Adjust flex ratio
    alignItems: 'center',
    justifyContent: 'center',
    // Removed margin top, rely on flex and header margin
  },
  riveContainer: {
    width: 220, // Slightly larger container
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  errorText: {
    color: 'red',
    padding: 16,
    textAlign: 'center',
  },
  bottomCard: {
    flex: 1, // Allow card to take remaining space
    backgroundColor: '#FFF4D9', // Use a theme color if available
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16, // Add some bottom padding
    marginTop: -120, // Adjust overlap as needed
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    justifyContent: 'flex-start', // Align buttons to top
    gap: 16, // Use gap for spacing between buttons
  },
}); 