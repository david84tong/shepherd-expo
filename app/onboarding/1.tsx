import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, ImageBackground, Easing, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboardingStore } from '../stores/onboardingStore';
import PrimaryButton from '../../components/PrimaryButton';
import Rive, { RiveRef, Fit, Alignment } from 'rive-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const WELCOME_TEXT = "Welcome to Shepherd3";
const SECOND_STAGE_PROMPT = "Tap on the lost lamb to wake it up";
const FIRST_STAGE_TYPING_SPEED = 100; // Slower for welcome text
const SECOND_STAGE_TYPING_SPEED = 50; // Keep original speed for second stage
const ZOOM_DURATION = 5000; // 5 seconds for a very slow zoom
const TRANSITION_DURATION = 350; // Faster transition animation duration

// Function to trigger a light haptic feedback
const triggerTypeHaptic = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {
      // Silently fail if haptics don't work
      console.log('Haptics not available');
    });
  } catch (error) {
    // Safely ignore haptic errors
    console.log('Haptics not available');
  }
};

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const insets = useSafeAreaInsets();
  
  // State for UI and flow
  const [displayText, setDisplayText] = useState('');
  const [secondStageActive, setSecondStageActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLambTapped, setIsLambTapped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(1)).current;
  const gradientOpacityAnim = useRef(new Animated.Value(0)).current;
  const screenFadeAnim = useRef(new Animated.Value(1)).current; // New animation for screen transition

  // Reference to the Rive state machine
  const riveRef = useRef<RiveRef>(null);

  // Function to start the zoom and transition to second stage
  const startZoomAndTransition = () => {
    // Clear the text immediately
    setDisplayText('');
    
    // Fade out text only
    Animated.parallel([
      Animated.timing(textOpacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(gradientOpacityAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false
      })
    ]).start();
    
    // Start zoom animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.7,
        duration: ZOOM_DURATION,
        easing: Easing.bezier(0.1, 0, 0, 1),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -150,
        duration: ZOOM_DURATION,
        easing: Easing.bezier(0.1, 0, 0, 1),
        useNativeDriver: true,
      })
    ]).start(() => {
      // Animation complete: Activate the second stage
      setSecondStageActive(true);
    });
  };

  // Combined typewriter effect
  useEffect(() => {
    let currentIndex = 0;
    const textToType = secondStageActive ? SECOND_STAGE_PROMPT : WELCOME_TEXT;
    const typingSpeed = secondStageActive ? SECOND_STAGE_TYPING_SPEED : FIRST_STAGE_TYPING_SPEED;
    
    if (secondStageActive) {
      // Start typing after delay
      const typingTimeout = setTimeout(() => {
        const interval = setInterval(() => {
          if (currentIndex <= textToType.length) {
            setDisplayText(textToType.slice(0, currentIndex));
            
            // Trigger haptic feedback for each new character
            if (currentIndex > 0 && currentIndex <= textToType.length) {
              triggerTypeHaptic();
            }
            
            currentIndex++;
          } else {
            clearInterval(interval);
          }
        }, typingSpeed);
        return () => clearInterval(interval);
      }, 1000);

      // Fade in text after delay
      const fadeTimeout = setTimeout(() => {
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();
      }, 700);

      return () => {
        clearTimeout(typingTimeout);
        clearTimeout(fadeTimeout);
      };
    } else {
      // First stage typing
      textOpacityAnim.setValue(1);
      const interval = setInterval(() => {
        if (currentIndex <= textToType.length) {
          setDisplayText(textToType.slice(0, currentIndex));
          
          // Trigger haptic feedback for each new character
          if (currentIndex > 0 && currentIndex <= textToType.length) {
            triggerTypeHaptic();
          }
          
          currentIndex++;
        } else {
          clearInterval(interval);
          // Fade in button after text finishes typing
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }
      }, typingSpeed);
      return () => clearInterval(interval);
    }
  }, [secondStageActive]);

  // Handle tapping the lamb in the second stage
  const handleLambTap = () => {
    console.log('handleLambTap2');
    // Set the tap input to true to trigger the state machine

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
      console.log('Haptics not available');
    });
    
    if (!secondStageActive || isLambTapped) return;
    riveRef.current?.fireState('State Machine 1', 'tap');
    setIsAnimating(false);
    setIsLambTapped(true);
    
    // Make button fully visible and active after tap
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  // Handle the transition to the next screen with animation
  const handleTransitionToNextScreen = () => {
    setIsTransitioning(true);
    
    // Create a smoother and faster fade out effect
    Animated.timing(screenFadeAnim, {
      toValue: 0,
      duration: TRANSITION_DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Navigate after animation completes
      router.push({
        pathname: '/onboarding/2',
        params: { 
          animated: true,
          animation: 'fade', 
          immediate: true
        }
      } as any);
    });
  };

  // Handle the main button press
  const handleButtonPress = () => {
    setIsAnimating(true);
    if (!secondStageActive) {
      // First stage: Start the zoom
      startZoomAndTransition();
    } else if (isLambTapped) {
      // Second stage & lamb tapped: Navigate with animation
      handleTransitionToNextScreen();
    }
    // Do nothing if in second stage but lamb hasn't been tapped
  };

  const interpolatedMiddleColor = gradientOpacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']
  });

  return (
    <Animated.View style={{ flex: 1, opacity: screenFadeAnim, backgroundColor: '#FFF4D9' }}>
      {/* Header Text (Single element) */}
      <Animated.View 
        className="px-6 absolute top-0 left-0 right-0 z-10 mx-8" 
        style={{ 
          paddingTop: insets.top,
          opacity: textOpacityAnim
        }}
      > 
        <Text className="font-feather text-title text-center text-white mt-12">
          {displayText}
        </Text>
      </Animated.View>

      {/* Main content area that zooms */}
      <Animated.View 
        style={{
          flex: 1,
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim }
          ]
        }}
      >
        <Pressable 
          onPress={handleLambTap}
          disabled={!secondStageActive || isLambTapped || isTransitioning}
          className="flex-1"
        >
          <ImageBackground 
            source={require('../../assets/backgrounds/oldBarn.png')}
            className="absolute top-0 left-0 right-0 bottom-0"
            resizeMode="cover"
          >
            {/* Base gradient (stage 1) */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
              locations={[0, 0.3, 1]}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            {/* Animated overlay gradient (stage 2) */}
            <Animated.View style={{ opacity: gradientOpacityAnim }}>
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            </Animated.View>
          </ImageBackground>
          
          {/* Inner container */}
          <View className="flex-1">
            {/* Lamb Animation */}
            <View className="flex-1 items-center justify-center mt-72">
              <View className="w-[225px] h-[225px] w-full justify-center items-center relative">
                <Rive
                  ref={riveRef}
                  resourceName="homeLamb"
                  artboardName="lamb-wakingup-click"
                  stateMachineName="State Machine 1"
                  fit={Fit.Contain}
                  alignment={Alignment.Center}
                  onStateChanged={(stateMachineName: string) => {
                    console.log('State changed:', stateMachineName);
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
                {/* Transparent overlay for tap detection */}
                <Pressable 
                  onPress={handleLambTap}
                  disabled={!secondStageActive || isLambTapped || isTransitioning}
                  className="absolute top-0 left-0 right-0 bottom-0 bg-black/[0.01] h-full w-full"
                />
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* Fixed Button at Bottom */}
      <Animated.View 
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: Math.max(insets.bottom + 20, 32),
          opacity: fadeAnim,
          // Keep button translateY animation simple
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [20, 0, 0], // Slide up initially, stay put after
            })
          }]
        }}
      >
        <PrimaryButton
          title={isLambTapped ? "Claim Lost Lamb" : "Begin Journey"}
          onPress={handleButtonPress}
          // Active unless in stage 2 AND lamb hasn't been tapped or is transitioning
          disabled={(secondStageActive && !isLambTapped) || isAnimating || isTransitioning}
        />
      </Animated.View>
    </Animated.View>
  );
}
