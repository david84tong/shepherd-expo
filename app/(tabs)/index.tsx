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
const dropIcon = require('../../assets/icons/waterIcon.png');
const quillIcon = require('../../assets/icons/journalIcon.png');
const flameIcon = require('../../assets/icons/flameIcon.png');
const heartIcon = require('../../assets/icons/heartIcon.png'); // Import heart icon
const starIcon = require('../../assets/icons/starIcon.png'); // Import star icon

export default function HomeScreen() {
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState<RNRiveError | null>(null);
  const navigation = useNavigation();

  // Use Zustand store for mode management
  const mode = useHomeStore((state) => state.mode);
  const setMode = useHomeStore((state) => state.setMode);

  // --- Animation Values --- 
  const uiAnim = useRef(new Animated.Value(0)).current; // 0: default, 0.5: preview, 1: full overlay
  const headerDefaultOpacityAnim = useRef(new Animated.Value(1)).current; // Opacity for default header elements
  
  // Background opacities
  const grassOpacityAnim = useRef(new Animated.Value(1)).current; 
  const pathOpacityAnim = useRef(new Animated.Value(0)).current;
  const waterOpacityAnim = useRef(new Animated.Value(0)).current;
  const journalOpacityAnim = useRef(new Animated.Value(0)).current;

  // Lamb position animations
  const previewAnim = useRef(new Animated.Value(0)).current;
  const prayerAnim = useRef(new Animated.Value(0)).current;
  const reflectionAnim = useRef(new Animated.Value(0)).current;

  // --- Derived Animated Values ---

  // Back button opacity (inverse of default header opacity)
  const headerBackOpacityAnim = headerDefaultOpacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // Water background effects
  const waterTranslateY = waterOpacityAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0], extrapolate: 'clamp' });
  const waterScale = waterOpacityAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05], extrapolate: 'clamp' });

  // Lamb position interpolation
  const lambTranslateX = Animated.add(
    previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0], extrapolate: 'clamp' }),
    Animated.add(
      prayerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40], extrapolate: 'clamp' }),
      reflectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 40], extrapolate: 'clamp' })
    )
  );
  const lambTranslateY = Animated.add(
    previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240], extrapolate: 'clamp' }),
    Animated.add(
      prayerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200], extrapolate: 'clamp' }),
      reflectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 140], extrapolate: 'clamp' })
    )
  );

  // Bottom card animation
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

    const resetAnims = [
      Animated.timing(previewAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.timing(prayerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.timing(reflectionAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ];
    
    let modeAnim: Animated.CompositeAnimation;
    if (mode === 'PREVIEW') {
      modeAnim = Animated.timing(previewAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    } else if (mode === 'PRAYER') {
      modeAnim = Animated.timing(prayerAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    } else if (mode === 'REFLECTION') {
      modeAnim = Animated.timing(reflectionAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    } else {
      modeAnim = Animated.timing(previewAnim, { toValue: 0, duration: 0, useNativeDriver: true });
    }

    Animated.sequence([
      Animated.parallel(resetAnims),
      Animated.parallel([
        Animated.timing(uiAnim, { toValue: targetUiAnim, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(headerDefaultOpacityAnim, { toValue: 0, duration, useNativeDriver: true }), // Fade out default header
        Animated.timing(targetOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
        ...fadeOutAnims,
        modeAnim,
      ])
    ]).start();
  };

  const animateToDefault = (duration: number = 600) => {
    const resetAnims = [
      Animated.timing(previewAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(prayerAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(reflectionAnim, { toValue: 0, duration, useNativeDriver: true }),
    ];
    
    Animated.parallel([
      Animated.timing(uiAnim, { toValue: 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(headerDefaultOpacityAnim, { toValue: 1, duration, useNativeDriver: true }), // Fade in default header
      Animated.timing(grassOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(pathOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(waterOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(journalOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      ...resetAnims
    ]).start();
  };

  // --- NEW useEffect to react to external mode changes ---
  useEffect(() => {
    // When mode changes back to DEFAULT (e.g., from BibleScreen), run the reset animation
    if (mode === 'DEFAULT') {
      // Consider adding a check if the previous state was NOT default to avoid running on initial load,
      // but this might be sufficient for now.
      animateToDefault(); 
    }
    // Note: We don't need to handle PREVIEW, PRAYER, REFLECTION here
    // because those transitions are already triggered by handleReadPress etc.
  }, [mode]); // Run this effect whenever the mode changes

  // --- Event Handlers ---
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
    // animateToDefault(); // This is now handled by the useEffect above
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
        {/* Header: Contains logic for showing Back OR Title/Stats */} 
        <View style={styles.headerContainer}>
            {/* Animated Back Button */} 
            <Animated.View style={{ opacity: headerBackOpacityAnim }} pointerEvents={mode === 'DEFAULT' ? 'none' : 'auto'}>
              <TouchableOpacity onPress={handleCloseOverlay} style={styles.headerBackButton} disabled={mode === 'DEFAULT'}>
                <Text style={styles.headerBackText}>←</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Animated Default Header Elements (Title + Stats) */} 
            <Animated.View 
              style={[styles.headerDefaultContentContainer, { opacity: headerDefaultOpacityAnim }]}
              pointerEvents={mode !== 'DEFAULT' ? 'none' : 'auto'}
            >
              <Text style={styles.headerTitle}>Shepherd</Text>
              <View style={{ flex: 1 }} />
              <View style={styles.headerRightGroup}>
                <View style={styles.streakContainer}>
                  <Text style={styles.streakNumber}>2</Text>
                  <Image source={flameIcon} style={styles.streakIcon} />
                </View>
                <View style={styles.heartContainer}>
                  <Text style={styles.heartNumber}>87/100</Text>
                  <Image source={heartIcon} style={styles.heartIcon} />
                </View>
              </View>
            </Animated.View>
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
        </Animated.View>

        {/* Bottom Section - Action Buttons Card */} 
        <Animated.View
          style={[styles.bottomCard, {
            opacity: bottomCardOpacity,
            transform: [{ translateY: bottomCardTranslateY }],
          }]}>
          
          <View style={styles.xpBarContainer}>
            <View style={styles.levelContainer}>
              <Image source={starIcon} style={styles.levelStarIcon} />
              <Text style={styles.levelText}>LVL 1</Text>
            </View>
            <View style={styles.pillOuter}>
              <View style={styles.pillInner} />
            </View>
          </View>

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


        {/* Overlays */} 
        <BiblePreviewComponent 
          visible={mode === 'PREVIEW'} 
          onClose={handleCloseOverlay}
        />
        <PrayerComponent
          visible={mode === 'PRAYER'}
          onClose={handleCloseOverlay} 
        />
        <JournalComponent
          visible={mode === 'REFLECTION'}
          onClose={handleCloseOverlay}
        />
      </SafeAreaView>
    </View>
  );
}

// Styles
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
    paddingTop: Platform.OS === 'ios' ? 4 : 16, 
    marginBottom: 16,
    // Allow positioning context for absolute positioned children
    position: 'relative', 
    height: 50, // Give header container a fixed height
  },
  headerBackButton: {
    paddingVertical: 8, 
    paddingRight: 16,
    // Position within the parent container for absolute positioning
    // Ensure it doesn't affect the layout flow of the default header
  },
  headerBackText: {
    fontSize: 28, 
    color: 'white', 
    fontFamily: 'Feather Bold' 
  },
  headerDefaultContentContainer: {
    // Takes up the full space to align items correctly
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Padding is handled by parent headerContainer
  },
  headerTitle: {
    fontFamily: 'Feather Bold',
    fontSize: 28,
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)', 
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginLeft: 20,
    // Ensure title doesn't overlap back button area
    // No extra margin needed if positioned correctly within flex container
  },
  headerRightGroup: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, 
    marginRight: 20,
    // marginRight: 0, // No extra margin needed if parent is spaced correctly
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
  streakIcon: {
    width: 32,
    height: 32,
  },
  heartContainer: { // Style for the heart container
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 99,
    paddingHorizontal: 10, // Adjusted padding
    paddingVertical: 4,
  },
  heartNumber: { // Style for the heart text
    fontFamily: 'Feather Bold',
    fontSize: 18, 
    color: 'white',
    marginRight: 6, // Adjusted spacing
  },
  heartIcon: { // Style for the heart icon
    width: 32, 
    height: 32,
  },
  riveWrapper: {
    flex: Platform.OS === 'ios' ? 0.7 : 0.6, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  riveContainer: {
    width: 220, 
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
    flex: 1, 
    backgroundColor: '#FFF4D9', 
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 16, 
    paddingBottom: 16, 
    marginTop: -80, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    justifyContent: 'flex-start', 
    gap: 8, 
  },
  xpBarContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, 
    marginBottom: 8, 
    paddingHorizontal: 4, 
  },
  levelContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, 
  },
  levelText: {
    fontFamily: 'Feather Bold',
    fontSize: 18,
    color: '#8B5E3C', 
  },
  levelStarIcon: {
    width: 32, 
    height: 32,
  },
  pillOuter: {
    flex: 1, 
    height: 14, 
    backgroundColor: '#E0D5B9', 
    borderRadius: 999, 
    borderWidth: 1,
    borderColor: '#C8BBA0', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'center', 
  },
  pillInner: {
    height: '100%', 
    width: '25%', 
    backgroundColor: '#F4C244', 
    borderRadius: 999,
  },
}); 