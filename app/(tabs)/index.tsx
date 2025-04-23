import { View, Text, SafeAreaView, Platform, Image, Button, Animated, Easing, TouchableOpacity, Dimensions } from 'react-native';
import Rive, { RiveRef, RNRiveError } from 'rive-react-native';
import { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import SecondaryButton from '../../components/SecondaryButton';
import PrimaryButton from '../../components/PrimaryButton';
import PrayerComponent from '../../components/PrayerComponent';
import BiblePreviewComponent from '../../components/BiblePreviewComponent';
import JournalComponent from '../../components/JournalComponent';
import ProgressPill from '../../components/ProgressPill';
import { useHomeStore, HomeMode } from '../stores/homeStore'; // Import Zustand store

const { height: SCREEN_HEIGHT } = Dimensions.get('window'); // Get screen height
const LAMB_VIEWPORT_PERCENTAGE = 0.40; // 40%
const BASE_LAMB_SIZE = SCREEN_HEIGHT * LAMB_VIEWPORT_PERCENTAGE;

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
const gemIcon = require('../../assets/icons/redGemIcon.png');
const heartIcon = require('../../assets/icons/heartIcon.png');
const starIcon = require('../../assets/icons/starIcon.png'); // Import star icon

export default function HomeScreen() {
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState<RNRiveError | null>(null);
  const navigation = useNavigation();

  // Use Zustand store for mode management
  const mode = useHomeStore((state) => state.mode);
  const setMode = useHomeStore((state) => state.setMode);
  
  // State to manage the Rive resource name
  const [riveResourceName, setRiveResourceName] = useState('mainSheep2'); // Default resource
  // State to control background Rive animation
  const [showBgRive, setShowBgRive] = useState(false);
  // Lamb size animation
  const lambSizeAnim = useRef(new Animated.Value(256)).current; // Start with full size (256px)

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
  
  // Opacity for the main screen's Rive wrapper
  const lambOpacityAnim = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden

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
      prayerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20], extrapolate: 'clamp' }),
      reflectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40], extrapolate: 'clamp' })
    )
  );
  const lambTranslateY = Animated.add(
    previewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240], extrapolate: 'clamp' }),
    Animated.add(
      prayerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 290], extrapolate: 'clamp' }),
      reflectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200], extrapolate: 'clamp' })
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
    let lambOpacityTarget = 1; // Default to visible
    
    if (mode === 'PREVIEW') {
      modeAnim = Animated.timing(previewAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    } else if (mode === 'PRAYER') {
      modeAnim = Animated.timing(prayerAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
    } else if (mode === 'REFLECTION') {
      modeAnim = Animated.timing(reflectionAnim, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true });
      lambOpacityTarget = 0; // Hide main lamb when journal is open
    } else {
      modeAnim = Animated.timing(previewAnim, { toValue: 0, duration: 0, useNativeDriver: true });
    }

    Animated.sequence([
      Animated.parallel(resetAnims),
      Animated.parallel([
        Animated.timing(uiAnim, { toValue: targetUiAnim, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(headerDefaultOpacityAnim, { toValue: 0, duration, useNativeDriver: true }), 
        Animated.timing(targetOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
        // Animate main lamb opacity
        Animated.timing(lambOpacityAnim, { toValue: lambOpacityTarget, duration: duration / 2, useNativeDriver: true }), 
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
    
    // Ensure main lamb becomes visible again
    Animated.timing(lambOpacityAnim, { toValue: 1, duration, useNativeDriver: true }).start();
    
    Animated.parallel([
      Animated.timing(uiAnim, { toValue: 0, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(headerDefaultOpacityAnim, { toValue: 1, duration, useNativeDriver: true }), // Fade in default header
      Animated.timing(grassOpacityAnim, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(pathOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(waterOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      Animated.timing(journalOpacityAnim, { toValue: 0, duration, useNativeDriver: true }),
      ...resetAnims
    ]).start();
    
    setRiveResourceName('mainSheep2');
  };

  // --- useEffect to react to external mode changes ---
  useEffect(() => {
    if (mode === 'DEFAULT') {
      animateToDefault(); 
      // Ensure resource is reset if mode changes externally
      setRiveResourceName('mainSheep2'); 
    }
  }, [mode]); 

  // --- Event Handlers ---
   const handleReadPress = () => {
    console.log('Read Daily Bread Pressed - Setting resource to lambEat');
    setRiveResourceName('lambEat'); // Set resource for eating animation
    setMode('PREVIEW');
    animateToState(0.5, pathOpacityAnim, 500, 'PREVIEW');
  };

  const handlePrayerPress = () => {
    console.log('Daily Prayer Pressed - Setting resource to lambSheep');
    setRiveResourceName('lambSheep'); // Set resource for prayer/drinking animation
    setMode('PRAYER');
    setShowBgRive(true); // Show the green background Rive animation
    // Animate lamb size to smaller size
    Animated.timing(lambSizeAnim, {
      toValue: 128,
      duration: 500,
      useNativeDriver: false,
    }).start();
    animateToState(1, waterOpacityAnim, 600, 'PRAYER');
  };

  const handleReflectionPress = () => {
    console.log('Daily Reflection / QT Pressed - Temporarily NOT changing resource');
    // setRiveResourceName('lambWriting'); // Temporarily commented out to test crash
    setMode('REFLECTION');
    // Animate lamb size to smaller size
    Animated.timing(lambSizeAnim, {
      toValue: 128,
      duration: 500,
      useNativeDriver: false,
    }).start();
    animateToState(1, journalOpacityAnim, 600, 'REFLECTION');
  };

  // --- Handlers for Closing Overlays ---
  const handleCloseOverlay = () => {
    console.log('Closing Overlay, returning to default');
    setMode('DEFAULT');
    setShowBgRive(false); // Hide the green background Rive animation
    // Animate lamb size back to full size
    Animated.timing(lambSizeAnim, {
      toValue: 256,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  // Set initial lamb size based on mode
  useEffect(() => {
    if (mode === 'DEFAULT') {
      lambSizeAnim.setValue(256); // Reset to full size when in default mode
    }
  }, []);

  return (
    <View className="flex-1">
      {/* Background Layers */} 
      <Animated.Image source={grassBg} style={[{position: 'absolute', width: '100%', height: '100%'}, { opacity: grassOpacityAnim }]} resizeMode="cover" />
      <Animated.Image source={pathBg} style={[{position: 'absolute', width: '100%', height: '100%'}, { opacity: pathOpacityAnim }]} resizeMode="cover" />
      <Animated.Image source={journalBg} style={[{position: 'absolute', width: '100%', height: '100%'}, { opacity: journalOpacityAnim }]} resizeMode="cover" />
      {/* Prayer background Rive animation */}
      <Animated.View 
        style={[
          {position: 'absolute', width: '100%', height: '100%', zIndex: 0},
          { opacity: waterOpacityAnim }
        ]}
      >
        {showBgRive && (
          <Rive
            resourceName="bg-green"
            autoplay={true}
            style={{ width: '160%', height: '160%', top: -300, left: -128 }}
          />
        )}
      </Animated.View>

      <SafeAreaView className="flex-1">
        {/* Header: Contains logic for showing Back OR Title/Stats */} 
        <View className="flex-row justify-between items-center px-6 pt-1 pb-4 h-[50px] relative">
            {/* Animated Back Button */} 


            {/* Animated Default Header Elements (Title + Stats) */} 
            <Animated.View 
              className="absolute inset-0 flex-row items-center justify-between px-6"
              style={[{ opacity: headerDefaultOpacityAnim }]}
              pointerEvents={mode !== 'DEFAULT' ? 'none' : 'auto'}
            >
              <Text 
                className="text-h1 font-feather text-white ml-2 tracking-wide"
                style={{ textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}
              >
                Shepherd
              </Text>
              <View className="flex-1 ml-0 mr-10" />
              <View className="flex-row items-center space-x-2">
                <ProgressPill value={0} label="2" icon={flameIcon} />
                <View className="ml-2">
                  <ProgressPill value={0} label="3" icon={gemIcon} />
                </View>
              </View>
            </Animated.View>
        </View>

        {/* Top Section - Lamb Avatar */} 
         <Animated.View
          className="items-center justify-center"
          style={{
            opacity: lambOpacityAnim,
            transform: [
              { translateX: lambTranslateX },
              { translateY: lambTranslateY }
            ],
            height: BASE_LAMB_SIZE
          }}>
          <Animated.View 
            className="items-center justify-center overflow-hidden"
            style={{}}
          >
            {riveError ? (
              <Text className="text-red-500 p-4 text-center">
                Error loading animation: {riveError.message} ({riveError.type})
              </Text>
            ) : (
              <Animated.View style={{ width: lambSizeAnim, height: lambSizeAnim }}>
                <Rive
                  ref={riveRef}
                  resourceName={riveResourceName}
                  autoplay={true}
                  onError={handleRiveError}
                  style={{ width: '100%', height: '100%' }}
                />
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>

        {/* Bottom Section - Action Buttons Card */} 
        <Animated.View
          className="bg-surfaceCream rounded-t-card px-6 py-6 flex-1 justify-start gap-2 -mt-28"
          style={{
            ...Platform.select({ ios: { shadowColor: 'rgba(0,0,0,0.08)', shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, shadowOpacity: 1, }, android: { elevation: 3, shadowColor: 'rgba(0,0,0,0.08)', }, }),
            opacity: bottomCardOpacity,
            transform: [{ translateY: bottomCardTranslateY }],
          }}>
          
          <View className="flex-row items-center gap-2.5 mb-0 px-1">
          <View className="flex-1 h-4 bg-pillBorder rounded-full overflow-hidden">
              <View className="h-full w-1/4 bg-red rounded-full" />
            </View>
            <View className="flex-row items-center gap-1">
            <Text className="font-feather text-body text-description">87/100</Text>

              <Image source={heartIcon} className="w-8 h-8" />
            </View>
       
          </View>

          <SecondaryButton 
            icon={breadIcon}
            title="Daily Bread – Read"
            subtitle="Feed your soul with scripture"
            points={5}
            onPress={handleReadPress}
            disabled={mode !== 'DEFAULT'}
          />
          <SecondaryButton 
            icon={dropIcon}
            title="Living Water – Pray"
            subtitle="Refresh your spirit with prayer"
            points={5}
            onPress={handlePrayerPress}
            disabled={mode !== 'DEFAULT'}
          />
          <SecondaryButton 
            icon={quillIcon}
            title="Quiet Time – Reflect"
            subtitle="Pause and meet with God"
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