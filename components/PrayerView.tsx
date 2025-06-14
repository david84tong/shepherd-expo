import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
  Modal,
  Switch,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrayerStore } from '~/app/stores/prayerStore';
import { useHomeStore } from '~/app/stores/homeStore';
import { useUserStore } from '~/app/stores/userStore';
import firestore from '@react-native-firebase/firestore';
import Reanimated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Layout,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import analytics from '../utils/analytics';
import CircleButton from './Shared/CircleButton';
import BluePrimaryButton from './Shared/BluePrimaryButton';
import { getLevelData } from '~/utils/levelUtils';
import SuccessMessage from './SuccessMessage';

// AsyncStorage keys for prayer settings
const PRAYER_HAPTICS_KEY = 'prayer_haptics_enabled';
const PRAYER_GUIDED_MODE_KEY = 'prayer_guided_mode_enabled';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TypingTextProps {
  text: string;
  className?: string;
  baseTextStyle: object;
  speed?: number;
  onComplete?: () => void;
  skipAnimation?: boolean;
}

const TypingText: React.FC<TypingTextProps> = ({
  text,
  className,
  baseTextStyle,
  speed = 30,
  onComplete,
  skipAnimation = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (skipAnimation) {
      setDisplayedText(text);
      onComplete && onComplete();
      return;
    }
    setDisplayedText('');
    indexRef.current = 0;
    const typeNextChar = () => {
      if (indexRef.current < text.length) {
        indexRef.current++;
        setDisplayedText(text.substring(0, indexRef.current));
        timerRef.current = setTimeout(typeNextChar, speed);
      } else {
        onComplete && onComplete();
      }
    };
    timerRef.current = setTimeout(typeNextChar, 0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed, skipAnimation, onComplete]);

  return (
    <Text style={baseTextStyle} className={className}>
      {displayedText}
    </Text>
  );
};

// Breathing Animation Component
const BreathingAnimation: React.FC<{ isActive: boolean; breathingProgress: Reanimated.SharedValue<number>; hapticsEnabled: boolean; guidedPrayerEnabled: boolean }> = ({ isActive, breathingProgress, hapticsEnabled, guidedPrayerEnabled }) => {
  const circleSize = SCREEN_WIDTH * 0.4; // 50% of screen width

  // Haptic feedback function - stabilize with empty dependency array
  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticsEnabled]);

  // Use ref to track if animation is already running to prevent restarts
  const animationStarted = useRef(false);

  useEffect(() => {
    if (isActive && !animationStarted.current) {
      animationStarted.current = true;
      // Start breathing animation - only start once
      breathingProgress.value = withRepeat(
        withSequence(
          withTiming(1, {
            duration: 4000,
            easing: Easing.inOut(Easing.ease)
          }, () => {
            runOnJS(triggerHaptic)();
          }),
          withTiming(0, {
            duration: 4000,
            easing: Easing.inOut(Easing.ease)
          }, () => {
            runOnJS(triggerHaptic)();
          })
        ),
        -1, // Infinite repeat
        false // Don't reverse
      );
    } else if (!isActive && animationStarted.current) {
      animationStarted.current = false;
      // Stop animation
      breathingProgress.value = withTiming(0, { duration: 1000 });
    }
  }, [isActive]); // Only depend on isActive to prevent unnecessary restarts

  // Center circle animation with yellow glow
  const centerCircleStyle = useAnimatedStyle(() => {
    const progress = breathingProgress.value;
    const scale = interpolate(progress, [0, 1], [0.4, 1]);
    const glowRadius = interpolate(progress, [0, 1], [20, 60]);
    const glowOpacity = interpolate(progress, [0, 1], [0.3, 0.8]);

    return {
      transform: [{ scale }],
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity,
      shadowRadius: glowRadius,
      elevation: 10,
    };
  });

  // Breathing text animation
  const breathingTextStyle = useAnimatedStyle(() => {
    const progress = breathingProgress.value;
    const opacity = interpolate(progress, [0, 0.5, 1], [0.8, 1, 0.8]);

    return {
      opacity,
    };
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 40 }}>
      {/* Yellow glow background */}
      <Reanimated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: circleSize * 1.5,
            height: circleSize * 1.5,
            borderRadius: circleSize * 0.75,
            backgroundColor: '#FFD700',
            opacity: 0.2,
          },
          useAnimatedStyle(() => {
            const progress = breathingProgress.value;
            const scale = interpolate(progress, [0, 1], [0.8, 1.3]);
            const baseOpacity = guidedPrayerEnabled ? 0.025 : 0.2; // Reduced opacity in guided mode
            const opacity = interpolate(progress, [0, 1], [baseOpacity * 0.5, baseOpacity * 1.5]);
            return {
              transform: [{ scale }],
              opacity,
            };
          })
        ]}
      />

      {/* Center circle with yellow glow */}
      <Reanimated.View style={[
        { pointerEvents: 'none' },
        {
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor: '#FFD700',
          position: 'absolute',
          opacity: guidedPrayerEnabled ? 0.1 : 1,
        },
        centerCircleStyle
      ]} />

      {/* Breathing instruction text */}
      <Reanimated.View style={[
        { position: 'absolute', pointerEvents: 'none' },
        breathingTextStyle
      ]}>
        {guidedPrayerEnabled ? (
          <TypingText
            text="Dear God, I come before you today with a grateful heart. Please guide me through this day and help me grow in faith. Amen."
            className="text-yellow-700 font-feather text-xl m-12 text-center"
            baseTextStyle={{
              color: '#B45309',
              fontSize: 20,
              fontFamily: 'Nunito-Black',
              textAlign: 'center',
              lineHeight: 28,
              margin: 48
            }}
            speed={50}
            skipAnimation={false}
          />
        ) : (
          <Text className="text-yellow-700 font-feather text-xl m-12 text-center">
            {/* Breathe deeply */}
          </Text>
        )}
      </Reanimated.View>
    </View>
  );
};

// Prayer Card Component
const PrayerCard: React.FC<{
  card: { type: string; content: string };
  index: number;
  isLast: boolean;
  breathingProgress: Reanimated.SharedValue<number>;
  fontSize: number;
  skipTyping: boolean;
  onTypingComplete: () => void;
}> = ({ card, index, isLast, breathingProgress, fontSize, skipTyping, onTypingComplete }) => {
  const cardBackgroundStyle = useAnimatedStyle(() => {
    const progress = breathingProgress.value;
    // Interpolate between light blue and deeper blue based on breathing
    const r = interpolate(progress, [0, 1], [230, 59]);  // 230 -> 59
    const g = interpolate(progress, [0, 1], [243, 130]); // 243 -> 130
    const b = interpolate(progress, [0, 1], [255, 246]); // 255 -> 246
    return {
      backgroundColor: `rgb(${r}, ${g}, ${b})`,
    };
  });

  return (
    <Reanimated.View
      key={index}
      entering={FadeInUp.duration(300).delay(index * 60)}
      layout={Layout.springify()}
      style={{ marginBottom: 12 }}>
      <Reanimated.View
        className="bg-surfaceCreamLight"
        style={[{
          padding: 14,
          borderRadius: 12,
        }, cardBackgroundStyle]}>
        {/* Card content with typing animation */}
        <View>
          {isLast ? (
            <TypingText
              text={card.content}
              className='text-blue/90'
              baseTextStyle={{ color: '#0369a1', fontSize: fontSize, lineHeight: fontSize * 1.5, fontFamily: 'DIN Next Rounded LT W01 Regular' }}
              speed={20}
              skipAnimation={skipTyping}
              onComplete={onTypingComplete}
            />
          ) : (
            <Text
              className='text-blue/90 font-din'
              style={{ fontSize: fontSize, lineHeight: fontSize * 1.5 }}
            >
              {card.content}
            </Text>
          )}
        </View>
      </Reanimated.View>
    </Reanimated.View>
  );
};

interface PrayerViewProps {
  visible?: boolean;
  onClose?: ({isReflectPresses}:{isReflectPresses?:boolean}) => void;
  onSetIdle?: () => void;
  setFinishReading: (finishReading: boolean) => void;
}

const PrayerView: React.FC<PrayerViewProps> = ({ visible = true, onClose, onSetIdle, setFinishReading }) => {
  const { recentPrayers } = usePrayerStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [prayerSentences, setPrayerSentences] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(16);
  const [showBreathingAnimation, setShowBreathingAnimation] = useState(true);
  const [showControlRow, setShowControlRow] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [guidedPrayerEnabled, setGuidedPrayerEnabled] = useState(true);
  const [completePrayerDisabled, setCompletePrayerDisabled] = useState(true);
  const [buttonsEnabled, setButtonsEnabled] = useState(false);


  // Animation values
  const progressValue = useSharedValue(0);
  const breathingProgress = useSharedValue(0);
  const controlRowOpacity = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completePrayerTimerRef = useRef<NodeJS.Timeout | null>(null);


  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animatedXP = useRef(new Animated.Value(0)).current;
  const animatedHearts = useRef(new Animated.Value(0)).current;
  const animatedTextOpacity = useRef(new Animated.Value(0.4)).current;

  const lambHearts = useUserStore((state) => state?.getLambHearts?.());
  const lamb = useUserStore((state) => state.getLamb?.());

  const animatedBlueOpacity = useRef(new Animated.Value(0.3)).current;
  const animatedGoldOpacity = useRef(new Animated.Value(0.4)).current;


  const MAX_HEARTS = 100;

  const levelInfo = useMemo(() => {
    if (!lamb || lamb.xp === undefined)
      return {
        level: 1,
        xp: 0,
        xpForCurrentLevel: 0,
        xpForNextLevel: 90,
        xpProgress: 0,
        xpNeeded: 90,
        progress: 0,
      };

    return getLevelData(lamb.xp);
  }, [lamb?.xp]);




  // Generate prayer content based on recent prayers
  const generatePrayerContent = useCallback(() => {
    const latestPrayer = recentPrayers[0];
    if (!latestPrayer) {
      return "Dear God, I come before you today with a grateful heart. Please guide me through this day and help me grow in faith. Amen.";
    }

    return `Dear God, I come before you today with a humble heart. Please help me with ${latestPrayer.toLowerCase()} in my life. Guide me through this journey and give me strength. Thank you for your endless love and grace. Amen.`;
  }, [recentPrayers]);

  // Load settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedHaptics = await AsyncStorage.getItem(PRAYER_HAPTICS_KEY);
        const savedGuidedMode = await AsyncStorage.getItem(PRAYER_GUIDED_MODE_KEY);

        if (savedHaptics !== null) {
          setHapticsEnabled(savedHaptics === 'true');
        }

        if (savedGuidedMode !== null) {
          setGuidedPrayerEnabled(savedGuidedMode === 'true');
        }

        console.log('🙏 Loaded prayer settings from AsyncStorage');
      } catch (error) {
        console.error('🙏 Error loading prayer settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Split prayer into sentences when component loads
  useEffect(() => {
    console.log('🙏 Processing prayer content');

    const prayerText = generatePrayerContent();
    console.log('🙏 Generated prayer text:', prayerText);

    if (prayerText.trim().length > 0) {
      // Split by periods followed by space or end of string, keeping the period
      const sentences = prayerText
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0);
      console.log('🙏 Split into sentences:', sentences);
      setPrayerSentences(sentences);
    } else {
      console.log('🙏 No valid prayer text, setting empty array');
      setPrayerSentences([]);
    }
  }, [generatePrayerContent]);

  // Calculate total cards (always have at least 1 card)
  const totalCards = Math.max(prayerSentences.length, 1);

  // Update progress bar
  useEffect(() => {
    if (totalCards > 0) {
      const newProgress = (currentIndex + 1) / totalCards;
      progressValue.value = withTiming(newProgress, { duration: 600 });
    }
  }, [currentIndex, totalCards, progressValue]);

  // Enable Complete Prayer button after 5 seconds
  useEffect(() => {
    completePrayerTimerRef.current = setTimeout(() => {
      setCompletePrayerDisabled(false);
    }, 5000);

    return () => {
      if (completePrayerTimerRef.current) {
        clearTimeout(completePrayerTimerRef.current);
      }
    };
  }, []);

  // Debug modal visibility changes
  useEffect(() => {
    console.log('🔍 showSettingsModal changed to:', showSettingsModal);
  }, [showSettingsModal]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (completePrayerTimerRef.current) {
        clearTimeout(completePrayerTimerRef.current);
      }
    };
  }, []);

  // Show controls immediately when component loads and start auto-hide timer
  useEffect(() => {
    if (showBreathingAnimation) {
      // Set initial opacity to 1 when component loads
      controlRowOpacity.value = withTiming(1, { duration: 300 });

      // Only start auto-hide timer if settings modal is not visible
      if (!showSettingsModal) {
        hideTimeoutRef.current = setTimeout(() => {
          controlRowOpacity.value = withTiming(0, { duration: 800 }, (finished) => {
            if (finished) {
              runOnJS(setShowControlRow)(false);
            }
          });
        }, 3000);
      }
    }
  }, [showBreathingAnimation, controlRowOpacity, showSettingsModal]);

  // Delayed progress animation for success view
  useEffect(() => {
    if (showSuccess) {
      animatedXP.setValue(0);
      animatedHearts.setValue(0);
      animatedTextOpacity.setValue(0.4);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = setTimeout(() => {
        Animated.timing(animatedXP, {
          toValue: levelInfo.progress,
          duration: 1200,
          useNativeDriver: false,
        }).start();
        Animated.timing(animatedHearts, {
          toValue: lambHearts,
          duration: 1200,
          useNativeDriver: false,
        }).start();
        setTimeout(() => {
          Animated.timing(animatedTextOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }).start();
          setTimeout(() => {
            // Animate the opacity changes
            Animated.timing(animatedBlueOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();

            Animated.timing(animatedGoldOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();

            // Still update the state for disabled/enabled logic
            setButtonsEnabled(true);
            // setBlueButtonOpacity(1);
            // setGoldButtonOpacity(1);
          }, 1000);
        }, 1200);
      }, 500);
    } else {
      animatedXP.setValue(0);
      animatedHearts.setValue(0);
      animatedTextOpacity.setValue(0.4);
      // Reset to default opacity values
      animatedBlueOpacity.setValue(0.3);
      animatedGoldOpacity.setValue(0.4);
      setButtonsEnabled(false);
      // setBlueButtonOpacity(0.3);
      // setGoldButtonOpacity(0.4);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    }
    // Cleanup on unmount
    return () => {
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    };
  }, [showSuccess, levelInfo.progress, lambHearts]);

  // Handle settings modal state changes
  useEffect(() => {
    if (showSettingsModal) {
      // Clear any existing timeout when modal opens
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null; // reset ref
      }
      // Ensure controls are visible when modal is open
      if (!showControlRow) {
        setShowControlRow(true);
      }
      controlRowOpacity.value = withTiming(1, { duration: 300 });
    } else {
      // Modal closed – restart auto-hide timer so buttons disappear again
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      if (showControlRow && showBreathingAnimation) { // Only auto-hide if still in breathing animation
        hideTimeoutRef.current = setTimeout(() => {
          controlRowOpacity.value = withTiming(0, { duration: 800 }, (finished) => {
            if (finished) {
              runOnJS(setShowControlRow)(false);
            }
          });
        }, 3000);
      }
    }
  }, [showSettingsModal, controlRowOpacity, showControlRow, showBreathingAnimation]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleNextCard = useCallback(() => {
    // Trigger haptic feedback
    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }

    // Track tap count and hide guidance after 2 taps
    if (showTapGuidance) {
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);
      if (newTapCount >= 2) {
        setShowTapGuidance(false);
      }
    }

    if (!isTypingComplete) {
      setSkipTyping(true);
      return;
    }

    if (currentIndex < totalCards - 1) {
      setCurrentIndex(i => i + 1);
      setSkipTyping(false);
      setIsTypingComplete(false);
      setTimeout(scrollToBottom, 150);
    } else {
      // Reached the end - close the prayer view
      if (onSetIdle) onSetIdle();
      if (onClose) {
        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onClose({});
      }
    }
  }, [currentIndex, totalCards, isTypingComplete, scrollToBottom, showTapGuidance, tapCount, onSetIdle, onClose, hapticsEnabled]);

  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true);
  }, []);

  // Save settings to AsyncStorage
  const saveHapticsEnabled = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(PRAYER_HAPTICS_KEY, enabled.toString());
      setHapticsEnabled(enabled);
      console.log('🙏 Saved haptics setting:', enabled);
    } catch (error) {
      console.error('🙏 Error saving haptics setting:', error);
    }
  }, []);

  const saveGuidedPrayerEnabled = useCallback(async (enabled: boolean) => {
    try {
      console.log('🙏 Saving guided prayer setting:', enabled, 'Modal should stay open');
      await AsyncStorage.setItem(PRAYER_GUIDED_MODE_KEY, enabled.toString());
      setGuidedPrayerEnabled(enabled);
      console.log('🙏 Saved guided prayer setting:', enabled, 'Modal should still be open');
    } catch (error) {
      console.error('🙏 Error saving guided prayer setting:', error);
    }
  }, []);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return { width: `${progressValue.value * 100}%` };
  });

  // Animated background style that matches breathing timing
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const progress = breathingProgress.value;
    // Interpolate between the two colors
    const r = interpolate(progress, [0, 1], [254, 255]); // #FEEDC0 -> #FFE38E
    const g = interpolate(progress, [0, 1], [237, 227]); // #FEEDC0 -> #FFE38E  
    const b = interpolate(progress, [0, 1], [192, 142]); // #FEEDC0 -> #FFE38E

    return {
      backgroundColor: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
    };
  });

  // Control row opacity animation style
  const controlRowAnimatedStyle = useAnimatedStyle(() => {
    const currentOpacity = controlRowOpacity.value;
    return {
      opacity: currentOpacity,
    };
  });

  // Function to show control row with auto-hide
  const toggleControlRow = useCallback(() => {
    console.log('🎯 toggleControlRow called! showControlRow:', showControlRow);

    // Haptic feedback for every tap
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // If currently visible, hide immediately
    if (showControlRow) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      controlRowOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(setShowControlRow)(false);
        }
      });
      return;
    }

    // Otherwise show and auto-hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setShowControlRow(true);
    controlRowOpacity.value = withTiming(1, { duration: 300 });

    // Only start auto-hide timer if settings modal is not visible
    if (!showSettingsModal) {
      hideTimeoutRef.current = setTimeout(() => {
        controlRowOpacity.value = withTiming(0, { duration: 800 }, (finished) => {
          if (finished) {
            runOnJS(setShowControlRow)(false);
          }
        });
      }, 3000);
    }
  }, [showControlRow, controlRowOpacity, hapticsEnabled, showSettingsModal]);

  if (!visible) return null;

  // Prepare cards to show (up to current index)
  const cardsToShow = [];

  console.log('📋 Preparing prayer cards to show. Current index:', currentIndex);
  console.log('📋 Total prayer sentences:', prayerSentences.length);
  console.log('📋 Prayer sentences:', prayerSentences);

  // Add prayer sentences based on current index
  for (let i = 0; i <= currentIndex && i < prayerSentences.length; i++) {
    cardsToShow.push({
      type: 'prayer',
      content: prayerSentences[i],
    });
  }

  console.log('📋 Prayer cards to show:', cardsToShow.length, cardsToShow);

  // Settings Modal Component - Memoized to prevent re-renders
  const SettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => { }} // Prevent hardware back button from closing
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <View style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 24,
          width: '80%',
          maxWidth: 320,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
        }}>
          {/* Header */}
          <Text style={{
            fontSize: 20,
            fontFamily: 'Nunito-Black',
            color: '#795323',
            textAlign: 'center',
            marginBottom: 24,
          }}>
            Prayer Settings
          </Text>

          {/* Haptics Row */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E9E2C7',
          }}>
            <Text style={{
              fontSize: 16,
              fontFamily: 'DIN Next Rounded LT W01 Regular',
              color: '#795323',
            }}>
              Haptic Feedback
            </Text>
            <Switch
              value={hapticsEnabled}
              onValueChange={(enabled) => {
                saveHapticsEnabled(enabled)
                setShowSettingsModal(false);
              }}
              trackColor={{ false: '#E9E2C7', true: '#FF8800' }}
              thumbColor={hapticsEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {/* Guided Prayer Row */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 16,
          }}>
            <Text style={{
              fontSize: 16,
              fontFamily: 'DIN Next Rounded LT W01 Regular',
              color: '#795323',
            }}>
              Guided Prayer Mode
            </Text>
            <Switch
              value={guidedPrayerEnabled}
              onValueChange={(enabled) => {

                saveGuidedPrayerEnabled(enabled);
                setShowSettingsModal(false);
              }}
              trackColor={{ false: '#E9E2C7', true: '#FF8800' }}
              thumbColor={guidedPrayerEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={() => {
              console.log('✅ Done button pressed, closing modal');
              setShowSettingsModal(false);
            }}
            style={{
              backgroundColor: '#FF8800',
              paddingVertical: 12,
              borderRadius: 12,
              marginTop: 20,
            }}
          >
            <Text style={{
              color: 'white',
              fontSize: 16,
              fontFamily: 'Nunito-Black',
              textAlign: 'center',
            }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );


  return (
    <Reanimated.View style={[{ flex: 1, borderRadius: 24 }, animatedBackgroundStyle]}>
      {showSuccess ? (
       <View style={{marginHorizontal: 24,flex:1}}>
         <SuccessMessage
          title="Prayer Complete!"
          level={levelInfo.level}
          prevLevel={levelInfo.level}
          buttonsEnabled={buttonsEnabled}
          onGoHome={() => {
            // Update lastActivityDate to prevent completion states from being reset
            setFinishReading(false)
            const now = firestore.Timestamp.now();
            const setLastActivityDate = useUserStore.getState().setLastActivityDate;
            const setLastPrayerDate = useUserStore.getState().setLastPrayerDate;
            setLastActivityDate(now);
            setLastPrayerDate(now);

            // Mark prayer as completed
            const setPrayerCompleted = useHomeStore.getState().setPrayerCompleted;
            setPrayerCompleted(true);

            // Show tab bar again
            const setPrayerViewVisible = useHomeStore.getState().setPrayerViewVisible;
            setPrayerViewVisible(false);

            // Log completion analytics
            analytics.logEvent('PrayerView_Completed', {
              prayerTopic: recentPrayers[0] || 'general',
              totalCards: totalCards,
            });

            // Close the prayer view
            if (onSetIdle) onSetIdle();
            if (onClose) {
              if (hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              onClose({});
            }
          }}
          onPray={() => {
            // Update lastActivityDate to prevent completion states from being reset
            setFinishReading(false)
            const now = firestore.Timestamp.now();
            const setLastActivityDate = useUserStore.getState().setLastActivityDate;
            const setLastPrayerDate = useUserStore.getState().setLastPrayerDate;
            setLastActivityDate(now);
            setLastPrayerDate(now);

            // Mark prayer as completed
            const setPrayerCompleted = useHomeStore.getState().setPrayerCompleted;
            setPrayerCompleted(true);

            // Show tab bar again
            const setPrayerViewVisible = useHomeStore.getState().setPrayerViewVisible;
            setPrayerViewVisible(false);

            // Log completion analytics
            analytics.logEvent('PrayerView_Completed', {
              prayerTopic: recentPrayers[0] || 'general',
              totalCards: totalCards,
            });

            // Close the prayer view
            if (onSetIdle) onSetIdle();
            if (onClose) {
              if (hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              onClose({isReflectPresses: true});
            }
          }}
          prayButtonTitle="Reflect on this verse"
          rewardsTitle="PRAYER REWARDS"
        />
       </View>
      ) : (
        <>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16, marginTop: 24 }}>
            <Text
              className="font-feather-bold text-textPrimary"
              style={{
                fontSize: responsiveFontSize(2.5),
                fontWeight: "400",
              }}
            >
              {/* Prayer Time */}
            </Text>
          </View>

          {/* Date Header */}
          <View className="flex-row items-center justify-center mb-2">
            <Text className="font-din text-textPrimary/40 text-center text-xl">
              John 14:6
            </Text>
          </View>

          {/* Breathing Animation - Show initially */}
          {showBreathingAnimation && (
            <TouchableWithoutFeedback onPress={toggleControlRow}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -280 }}>
                <BreathingAnimation isActive={showBreathingAnimation} breathingProgress={breathingProgress} hapticsEnabled={hapticsEnabled} guidedPrayerEnabled={guidedPrayerEnabled} />

                {/* Control Row - appears on tap */}
                {showControlRow && (
                  <Reanimated.View
                    style={[
                      {
                        position: 'absolute',
                        top: SCREEN_WIDTH * 1.45,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        alignSelf: 'center',
                        paddingHorizontal: 32,
                        zIndex: 10,
                      },
                      controlRowAnimatedStyle
                    ]}
                    onLayout={() => console.log('🔍 Control row is being rendered!')}
                  >
                    {/* Back/Left Button */}
                    <CircleButton
                      icon="chevron-left"
                      size={50}
                      hapticsEnabled={hapticsEnabled}
                      onPress={() => {
                        if (onSetIdle) onSetIdle();
                        if (onClose) onClose();
                      }}
                    />

                    {/* Complete Prayer Button */}
                    <BluePrimaryButton
                      title="Complete Prayer"
                      width="60%"
                      onPress={() => {
                        setShowBreathingAnimation(false);
                      }}
                      hapticsEnabled={hapticsEnabled}
                      disabled={completePrayerDisabled}
                    />

                    {/* Settings/Gear Button */}
                    <CircleButton
                      icon="settings"
                      size={50}
                      hapticsEnabled={hapticsEnabled}
                      onPress={() => {
                        console.log('⚙️ Settings button pressed');
                        // Clear any hide timers when opening settings
                        if (hideTimeoutRef.current) {
                          clearTimeout(hideTimeoutRef.current);
                          hideTimeoutRef.current = null;
                        }
                        setShowSettingsModal(true);
                      }}
                    />
                  </Reanimated.View>
                )}
              </View>
            </TouchableWithoutFeedback>
          )}

          {/* Cards ScrollView - Show after breathing animation */}
          {!showBreathingAnimation && (
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 160 }}
              scrollEventThrottle={16}>
              {currentIndex < totalCards - 1 ? (
                <TouchableWithoutFeedback onPress={handleNextCard}>
                  <View style={{ minHeight: 200 }}>
                    {cardsToShow.length === 0 ? (
                      <Text className="text-brown text-center">No prayer content to display</Text>
                    ) : (
                      <>
                        {cardsToShow.map((card, index) => {
                          console.log('🎨 Rendering prayer card:', index, card.type, card.content.substring(0, 50));
                          return (
                            <PrayerCard
                              key={index}
                              card={card}
                              index={index}
                              isLast={index === cardsToShow.length - 1}
                              breathingProgress={breathingProgress}
                              fontSize={fontSize}
                              skipTyping={skipTyping}
                              onTypingComplete={handleTypingComplete}
                            />
                          );
                        })}
                      </>
                    )}

                    {/* Tap guidance or finish button */}
                    <View style={{ alignItems: 'center', marginTop: 12 }}>
                      {showTapGuidance && (
                        <Text style={{
                          color: '#0369a1',
                          fontFamily: 'DIN Next Rounded LT W01 Regular',
                          fontSize: 14,
                          opacity: 0.7,
                        }}>
                          {isTypingComplete ? 'Tap for next →' : 'Tap to show full text'}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              ) : (
                <View style={{ minHeight: 200 }}>
                  {cardsToShow.map((card, index) => (
                    <PrayerCard
                      key={index}
                      card={card}
                      index={index}
                      isLast={index === cardsToShow.length - 1}
                      breathingProgress={breathingProgress}
                      fontSize={fontSize}
                      skipTyping={skipTyping}
                      onTypingComplete={handleTypingComplete}
                    />
                  ))}
                  <TouchableOpacity
                    onPress={() => {
                      setFinishReading(true)
                      setShowSuccess(true);
                    }}
                    activeOpacity={0.8}>
                    <View style={{
                      backgroundColor: '#06B6FE',
                      paddingVertical: 12,
                      alignItems: 'center',
                      marginTop: 16,
                      borderRadius: 12,
                    }}>
                      <Text style={{
                        color: 'white',
                        fontFamily: 'Feather Bold',
                        fontSize: 16,
                      }}>
                        Amen 🙏
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Settings Modal */}
      <SettingsModal />
    </Reanimated.View>
  );
};

export default PrayerView;
