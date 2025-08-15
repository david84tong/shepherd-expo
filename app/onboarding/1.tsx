import { useAssets } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  ImageBackground,
  Easing,
  Pressable,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboardingStore } from '../stores/onboardingStore';
import PrimaryButton from '../../components/PrimaryButton';
import Rive, { RiveRef, Fit, Alignment } from 'rive-react-native';
import { AccessibilityInfo } from 'react-native';

import { trackEvent } from '../../utils/analytics';
import { IS_ANDROID } from '../utils/utils';
import { appLog, RPH } from '../helper/helper';
import { hapticHeavy, hapticLight, hapticRigid } from '~/utils/haptics';

const FIRST_WELCOME_TEXT = 'Every Shepherd starts with one lost lamb...';
const SECOND_WELCOME_TEXT = "This one's yours.";
const SECOND_STAGE_PROMPT = 'Tap to wake it up';
const TYPING_SPEED = 75; // Speed for all typing effects
const ZOOM_DURATION = 3000; // Slow zoom effect (3 seconds)
const TRANSITION_DURATION = 350; // Faster transition animation duration

// A/B Test key for AsyncStorage
const AB_TEST_KEY = 'abTest';

// Function to trigger a light haptic feedback
const triggerTypeHaptic = () => {
  try {
    hapticRigid();
  } catch (error) {
    // Safely ignore haptic errors
    appLog('Haptics not available');
  }
};

export default function OnboardingWelcomeScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const insets = useSafeAreaInsets();
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const liveTimers = useRef<Set<NodeJS.Timeout>>(new Set());
  const liveIntervals = useRef<Set<NodeJS.Timeout>>(new Set());

  // Initialize analytics - removed useAnalytics hook

  // A/B Test assignment function
  const assignABTest = async () => {
    try {
      // Check if abTest already exists
      const existingAbTest = await AsyncStorage.getItem(AB_TEST_KEY);

      if (existingAbTest === null) {
        // Generate random integer 0, 1, or 2 (33% chance each)
        const abTestValue = Math.floor(Math.random() * 3);

        // Save to AsyncStorage
        await AsyncStorage.setItem(AB_TEST_KEY, abTestValue.toString());

        appLog('[OnboardingScreen1] Assigned new A/B test value:', abTestValue);

        // Log analytics event for A/B test assignment
        trackEvent('ABTest_Assigned', {
          abTestGroup: abTestValue,
          screenName: 'OnboardingWelcomeScreen',
        });
      } else {
        appLog('[OnboardingScreen1] Existing A/B test value found:', existingAbTest);
      }
    } catch (error) {
      console.error('[OnboardingScreen1] Error handling A/B test assignment:', error);
    }
  };

  // Log screen view when component mounts
  useEffect(() => {
    // Check reduce motion setting
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);

    // Initialize analytics first before logging any events
    const initializeAnalytics = async () => {
      // Analytics initialization is handled automatically in the new implementation

      // Assign A/B test after analytics is ready
      await assignABTest();

      // Now log the screen view event
      trackEvent('LambLostScreenViewed', {
        screenName: 'OnboardingWelcomeScreen',
        step: 1,
      });
    };

    const t = setTimeout(initializeAnalytics, 100);
    liveTimers.current.add(t);

    // Start entrance animation
    const startEntranceAnimation = () => {
      // Animate screen entrance
      Animated.parallel([
        Animated.timing(screenFadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(screenScaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After entrance animation, start text animation
        setTimeout(() => {
          Animated.timing(textOpacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }, 200);
      });
    };

    // Slight delay to ensure smooth transition from previous screen
    const t2 = setTimeout(startEntranceAnimation, 100);
    liveTimers.current.add(t2);
  }, []);

  // State for UI and flow
  const [displayText, setDisplayText] = useState('');
  const [secondStageActive, setSecondStageActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLambTapped, setIsLambTapped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [textPhase, setTextPhase] = useState(1); // 1 = first welcome, 2 = second welcome, 3 = tap prompt

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const textOpacityAnim = useRef(new Animated.Value(0)).current; // Start with 0 opacity
  const gradientOpacityAnim = useRef(new Animated.Value(0)).current;
  const screenFadeAnim = useRef(new Animated.Value(0)).current; // Start with 0 for entrance
  const screenScaleAnim = useRef(new Animated.Value(0.95)).current; // Start slightly scaled down

  // Reference to the Rive state machine
  const riveRef = useRef<RiveRef>(null);

  // Function to start typing the second welcome text
  const startSecondWelcomeText = () => {
    // Fade out text
    Animated.timing(textOpacityAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDisplayText(''); // Clear text
      setTextPhase(2); // Move to second text phase

      // Fade in text for second phase
      setTimeout(() => {
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 200);
    });
  };

  // Function to start the zoom and transition to second stage
  const startZoomAndTransition = () => {
    // Clear the text with animation
    Animated.timing(textOpacityAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDisplayText(''); // Clear text
      setTextPhase(3); // Move to tap prompt phase
    });

    // Fade in gradient
    Animated.timing(gradientOpacityAnim, {
      toValue: 1,
      duration: 1200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();

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
      }),
    ]).start();

    // Enable interaction much earlier (750ms) for faster response
    setTimeout(() => {
      setSecondStageActive(true);
    }, 750);
  };

  // Typewriter effect based on current text phase
  useEffect(() => {
    let textToType = '';

    // Determine which text to type based on phase
    if (textPhase === 1) {
      textToType = FIRST_WELCOME_TEXT;
    } else if (textPhase === 2) {
      textToType = SECOND_WELCOME_TEXT;
    } else if (textPhase === 3 && secondStageActive) {
      textToType = SECOND_STAGE_PROMPT;
    } else {
      return; // No text to type
    }

    let currentIndex = 0;
    let typingInterval: NodeJS.Timeout;

    // If we're in tap prompt phase, add delay before typing
    if (textPhase === 3) {
      const typingTimeout = setTimeout(() => {
        // Fade in text container
        Animated.timing(textOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Start typing after fade in
        typingInterval = setInterval(() => {
          if (currentIndex <= textToType.length) {
            setDisplayText(textToType.slice(0, currentIndex));

            // Trigger haptic feedback for each new character
            if (currentIndex > 0 && currentIndex <= textToType.length) {
              triggerTypeHaptic();
            }

            currentIndex++;
          } else {
            clearInterval(typingInterval);
          }
        }, TYPING_SPEED);
      }, 500);

      return () => {
        clearTimeout(typingTimeout);
        clearInterval(typingInterval);
        /**
         * NOTE: This screen runs multiple timers/intervals in quick succession. If users skip ahead fast,
         * leftover intervals can continue running; this cleanup prevents that and reduces leak signals on splash.
         */
      };
    } else {
      // For first and second welcome texts
      typingInterval = setInterval(() => {
        if (currentIndex <= textToType.length) {
          setDisplayText(textToType.slice(0, currentIndex));

          // Trigger haptic feedback for each new character
          if (currentIndex > 0 && currentIndex <= textToType.length) {
            triggerTypeHaptic();
          }

          currentIndex++;
        } else {
          clearInterval(typingInterval);

          // After first text finishes, automatically transition to second text after a delay
          if (textPhase === 1) {
            // Wait 1.5 seconds after first text completes before showing second text
            const transitionTimer = setTimeout(() => {
              startSecondWelcomeText();
            }, 1500);

            return () => clearTimeout(transitionTimer);
          } else if (textPhase === 2) {
            // After second text finishes, show the button
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();
          }
        }
      }, TYPING_SPEED);

      return () => clearInterval(typingInterval);
    }
  }, [textPhase, secondStageActive]);

  // Global cleanup on unmount for any stray timers/intervals on this screen
  useEffect(() => {
    return () => {
      liveTimers.current.forEach((id) => clearTimeout(id));
      liveTimers.current.clear();
      liveIntervals.current.forEach((id) => clearInterval(id));
      liveIntervals.current.clear();
    };
  }, []);
  useEffect(() => {
    return () => {
      // Cleanup Rive resources
      if (riveRef.current?.reset) {
        riveRef.current.reset();
      }
    };
  }, []);

  // Handle tapping the lamb in the second stage
  const handleLambTap = () => {
    appLog('handleLambTap2');
    // Set the tap input to true to trigger the state machine

    hapticHeavy();

    if (!secondStageActive || isLambTapped) return;

    // Log the lamb tap interaction
    trackEvent('lamb_tap', {
      step: 1,
      screenName: 'Welcome',
      stage: 'second_stage',
      action: 'Tapped Lamb',
    });

    riveRef.current?.setInputState('Baby', 'wake up', true);
    setIsAnimating(false);
    setIsLambTapped(true);

    // Make button fully visible and active after tap
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  // Handle the transition to the next screen with animation
  const handleTransitionToNextScreen = () => {
    setIsTransitioning(true);

    // If reduce motion is enabled, navigate immediately
    if (reduceMotionEnabled) {
      router.push({
        pathname: '/onboarding/2',
        params: {
          animated: true,
          animation: 'fade',
          immediate: true, // Set immediate to true for reduce motion
        },
      } as any);
      return;
    }

    // Create a smoother and faster fade out effect with scale
    Animated.parallel([
      Animated.timing(screenFadeAnim, {
        toValue: 0,
        duration: TRANSITION_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(screenScaleAnim, {
        toValue: 0.95,
        duration: TRANSITION_DURATION,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate after animation completes
      router.push({
        pathname: '/onboarding/2',
        params: {
          animated: true,
          animation: 'fade',
          immediate: false,
        },
      } as any);
    });
  };

  // Handle the main button press
  const handleButtonPress = () => {
    setIsAnimating(true);

    if (textPhase === 2) {
      // Log button press for starting journey
      trackEvent('Onboarding_Tapped_StartJourney', {
        step: 1,
        screenName: 'Welcome',
        textPhase: textPhase,
        action: 'Continue',
      });

      // Start the zoom animation sequence
      startZoomAndTransition();
    } else if (isLambTapped) {
      // Log button press for claiming lamb
      trackEvent('Onboarding_Tapped_ClaimLostLamb', {
        step: 1,
        screenName: 'Welcome',
        textPhase: textPhase,
        action: 'Claim Lost Lamb',
      });

      handleTransitionToNextScreen();
    }
  };

  // Load the Rive asset - Moved after all other hooks
  const [assets] = useAssets([require('../../assets/riveAnimations/baby_lamb_waking.riv')]);

  // Show loading indicator while assets are loading
  if (!assets) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFF4D9',
        }}>
        <ActivityIndicator size="large" color="#3C584A" />
      </View>
    );
  }

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" />
      <Animated.View
        style={{
          flex: 1,
          opacity: screenFadeAnim,
          backgroundColor: '#FFF4D9',
          transform: [{ scale: screenScaleAnim }],
        }}>
        {/* Header Text (Single element) */}
        <Animated.View
          className="px-6 absolute top-0 left-0 right-0 z-10 mx-8"
          style={{
            paddingTop: insets.top,
            opacity: textOpacityAnim,
          }}>
          <Text
            className={`${textPhase === 3 ? 'font-nunito-bold text-h1' : 'font-feather text-title'} text-center text-white mt-12`}>
            {displayText}
          </Text>
        </Animated.View>

        {/* Subtle Back Button */}
        <Animated.View
          className="absolute top-0 left-0 z-20"
          style={{
            paddingTop: insets.top + 16,
            paddingLeft: 24,
            opacity: textOpacityAnim,
          }}>
          <Pressable
            onPress={() => {
              hapticLight();
              trackEvent('Onboarding_Tapped_Back', {
                step: 1,
                screenName: 'Welcome',
                action: 'Back to Auth',
              });
              // Navigate to auth index instead of going back to prevent GO_BACK error
              router.replace('/(auth)');
            }}
            className="w-10 h-10 rounded-full bg-black/20 items-center justify-center"
            style={{
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}>
            <Text className="text-white text-lg font-bold">←</Text>
          </Pressable>
        </Animated.View>

        {/* Main content area that zooms */}
        <Animated.View
          style={{
            flex: 1,
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          }}>
          <Pressable
            onPress={handleLambTap}
            disabled={!secondStageActive || isLambTapped || isTransitioning}
            className="flex-1">
            <ImageBackground
              source={require('../../assets/backgrounds/oldBarn.png')}
              className="absolute top-0 left-0 right-0 bottom-0"
              resizeMode="cover">
              {/* Base gradient (stage 1) */}
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
                locations={[0, 0.3, 1]}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
              {/* Animated overlay gradient (stage 2) */}
              <Animated.View
                style={{
                  opacity: gradientOpacityAnim,
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0, // Added positioning
                }}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)', 'transparent']}
                  locations={[0, 0.3, 1]}
                  style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                />
              </Animated.View>
            </ImageBackground>

            {/* Inner container */}
            <View className="flex-1">
              <View style={{ marginTop: RPH(25) }} className="flex-1 items-center justify-center">
                <View className="h-[245px] w-full justify-center items-center relative">
                  {IS_ANDROID ? (
                    <Rive
                      ref={riveRef}
                      // resourceName={assets[0].uri}
                      onError={(error) => {
                        appLog('------>', error);
                      }}
                      resourceName={'baby_lamb_waking'}
                      // url="https://public.rive.app/community/runtime-files/2195-4346-avatar-pack-use-case.riv"
                      stateMachineName="Baby"
                      artboardName={'Baby-Spepherd 2'}
                      fit={Fit.Contain}
                      alignment={Alignment.Center}
                      style={{ width: RPH(25), height: RPH(25) }}
                    />
                  ) : (
                    <Rive
                      ref={riveRef}
                      onError={(error) => {
                        appLog('------>', error);
                      }}
                      resourceName="baby_lamb_waking"
                      // url="https://public.rive.app/community/runtime-files/2195-4346-avatar-pack-use-case.riv"
                      stateMachineName="Baby"
                      artboardName={'Baby-Spepherd 2'}
                      fit={Fit.Contain}
                      alignment={Alignment.Center}
                      style={{ width: RPH(25), height: RPH(25) }}
                    />
                  )}

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
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [20, 0, 0], // Slide up initially, stay put after
                }),
              },
            ],
          }}>
          <PrimaryButton
            title={textPhase === 2 ? 'Begin Journey' : 'Claim Lost Lamb'}
            onPress={handleButtonPress}
            // Only disable in specific conditions
            disabled={(secondStageActive && !isLambTapped) || isAnimating || isTransitioning}
          />
        </Animated.View>
      </Animated.View>
    </>
  );
}
