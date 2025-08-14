import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrayerStore } from '~/app/stores/prayerStore';
import { useHomeStore, SuccessAnimationType } from '~/app/stores/homeStore';
import { useUserStore } from '~/app/stores/userStore';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { router } from 'expo-router';
import firestore from '@react-native-firebase/firestore';
import Reanimated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  Layout,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import analytics from '../utils/analytics';
import { useStatsigExperiment } from '~/app/hooks/useStatsig';
import { shouldShowStreakWithExperiment } from '~/app/stores/homeStore';
import i18n from '../app/utils/i18n';

import { getLevelData } from '~/utils/levelUtils';
import SuccessMessage from './SuccessMessage';
import { hapticLight, hapticMedium } from '~/utils/haptics';
import { appLog } from '~/app/helper/helper';

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

// Breathe Text Component
const BreatheText: React.FC<{ breathingProgress: Reanimated.SharedValue<number> }> = ({ breathingProgress }) => {
  const words = ['Breathe', 'Listen', 'Be Still'];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const lastProgressValue = useRef(0);
  const hasReachedPeak = useRef(false);
  const cycleCount = useRef(0);
  const textOpacity = useSharedValue(1);

  const cycleToNextWord = useCallback(() => {
    appLog('Cycling to next word');
    setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
  }, [words.length]);

  // Separate effect to handle subtle fade animation when word changes
  useEffect(() => {
    // Gentle fade to 0.3 opacity, then back to 1 for a subtle transition
    textOpacity.value = withTiming(0.3, {
      duration: 600,
      easing: Easing.inOut(Easing.ease)
    }, () => {
      textOpacity.value = withTiming(1, {
        duration: 600,
        easing: Easing.inOut(Easing.ease)
      });
    });
  }, [currentWordIndex, textOpacity]);

  const breatheTextStyle = useAnimatedStyle(() => {
    const progress = breathingProgress.value;
    const fontSize = interpolate(progress, [0, 1], [24, 36]);
    const scale = interpolate(progress, [0, 1], [0.8, 1.4]);

    // Track animation direction and detect full cycles
    const lastValue = lastProgressValue.current;

    // Detect when we reach the peak (inhale complete)
    if (progress > 0.95 && !hasReachedPeak.current) {
      hasReachedPeak.current = true;
      appLog('Reached peak - inhale complete');
    }

    // Detect when we return to the bottom after reaching peak (full cycle complete)
    if (hasReachedPeak.current && progress < 0.05 && lastValue > 0.05) {
      hasReachedPeak.current = false;
      cycleCount.current += 1;
      appLog('Full cycle completed, count:', cycleCount.current);
      runOnJS(cycleToNextWord)();
    }

    lastProgressValue.current = progress;

    return {
      fontSize: fontSize,
      opacity: textOpacity.value,
      transform: [{ scale }],
    };
  });

  return (
    <Reanimated.View style={breatheTextStyle}>
      <Text
        style={{
          fontFamily: 'Nunito-Black',
          textAlign: 'center',
          color: '#B45309',
        }}
      >
        {words[currentWordIndex]}
      </Text>
    </Reanimated.View>
  );
};

// Breathing Animation Component
const BreathingAnimation: React.FC<{ 
  isActive: boolean; 
  breathingProgress: Reanimated.SharedValue<number>; 
  hapticsEnabled: boolean; 
  guidedPrayerEnabled: boolean; 
  currentDevotional: any;
  showGuidedPrayer: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}> = ({ isActive, breathingProgress, hapticsEnabled, guidedPrayerEnabled, currentDevotional, showGuidedPrayer, onPressIn, onPressOut }) => {
  const circleSize = SCREEN_WIDTH * 0.4; // 50% of screen width

  // Haptic feedback function - stabilize with empty dependency array
  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled) {
      hapticLight();
    }
  }, [hapticsEnabled]);

  // Use ref to track if animation is already running to prevent restarts
  const animationStarted = useRef(false);
  const startupTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && !animationStarted.current) {
      animationStarted.current = true;

      // Add a small delay to allow component to settle and reduce lag
      startupTimer.current = setTimeout(() => {
        // Begin a smooth inhale ↔ exhale cycle (autoreverse produces a natural loop)
        breathingProgress.value = withRepeat(
          withTiming(1, {
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
          }, () => {
            // Haptic feedback at the peak of each inhale / exhale
            runOnJS(triggerHaptic)();
          }),
          -1,   // infinite
          true  // autoreverse (1 → 0 uses the same curve)
        );
      }, 300); // 300ms delay to allow smooth transition
    } else if (!isActive && animationStarted.current) {
      animationStarted.current = false;
      // Clear startup timer if component becomes inactive
      if (startupTimer.current) {
        clearTimeout(startupTimer.current);
        startupTimer.current = null;
      }
      // Stop animation smoothly
      breathingProgress.value = withTiming(0, { duration: 600 });
    }

    // Cleanup timer on unmount
    return () => {
      if (startupTimer.current) {
        clearTimeout(startupTimer.current);
        startupTimer.current = null;
      }
    };
  }, [isActive]); // Only depend on isActive to prevent unnecessary restarts

  // Center circle animation with yellow glow - optimized for performance
  const centerCircleStyle = useAnimatedStyle(() => {
    const progress = breathingProgress.value;
    const scale = interpolate(progress, [0, 1], [0.4, 1]);
    const glowRadius = interpolate(progress, [0, 1], [15, 45]); // Reduced glow radius for better performance
    const glowOpacity = interpolate(progress, [0, 1], [0.2, 0.6]); // Reduced opacity for smoother animation

    return {
      transform: [{ scale }],
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity,
      shadowRadius: glowRadius,
      elevation: 8, // Reduced elevation for better performance
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
            const scale = interpolate(progress, [0, 1], [0.9, 1.2]); // Reduced scale range for smoother animation
            const baseOpacity = guidedPrayerEnabled ? 0.02 : 0.15; // Further reduced opacity for better performance
            const opacity = interpolate(progress, [0, 1], [baseOpacity * 0.6, baseOpacity * 1.2]); // Smaller opacity range
            return {
              transform: [{ scale }],
              opacity,
            };
          })
        ]}
      />

      {/* Center circle with yellow glow */}
      {guidedPrayerEnabled ? (
        <TouchableWithoutFeedback
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <Reanimated.View style={[
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              backgroundColor: '#FFD700',
              position: 'absolute',
              opacity: 0.1,
            },
            centerCircleStyle
          ]} />
        </TouchableWithoutFeedback>
      ) : (
        <Reanimated.View style={[
          { pointerEvents: 'none' },
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: '#FFD700',
            position: 'absolute',
            opacity: 1,
          },
          centerCircleStyle
        ]} />
      )}

      {/* Breathing instruction text */}
      <Reanimated.View
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 2,
          maxWidth: SCREEN_WIDTH * 0.8,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {guidedPrayerEnabled ? (
          showGuidedPrayer ? (
            <TypingText
              text={i18n.t('dear_god_default_prayer')}
              className="text-yellow-700 font-feather text-xl text-center"
              baseTextStyle={{
                color: '#B45309',
                fontSize: 20,
                fontFamily: 'Nunito-Black',
                textAlign: 'center',
                lineHeight: 28,
              }}
              speed={50}
              skipAnimation={false}
            />
          ) : (
            <Text
              style={{
                color: '#B45309',
                fontSize: 20,
                fontFamily: 'Nunito-Black',
                textAlign: 'center',
                lineHeight: 28,
              }}
            >
              {i18n.t('press_and_hold_to_pray') || 'Press and hold to pray'}
            </Text>
          )
        ) : (
          <BreatheText breathingProgress={breathingProgress} />
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
  onClose?: ({ isReflectPresses }: { isReflectPresses?: boolean }) => void;
  onSetIdle?: () => void;
  setFinishReading: (finishReading: boolean) => void;
  setShowControlRow: (showControlRow: boolean) => void;
  showControlRow: boolean;
  setIsCompletePrayerDisabled: (disabled: boolean) => void;
}

export interface PrayerViewRef {
  handleBack: () => void;
  handleCompletePrayer: () => void;
  handleSettings: () => void;
}

const PrayerView = forwardRef<PrayerViewRef, PrayerViewProps>(({
  visible = true,
  onClose,
  onSetIdle,
  setFinishReading,
  setShowControlRow,
  showControlRow,
  setIsCompletePrayerDisabled
}, ref) => {
  const { recentPrayers } = usePrayerStore();
  const { currentDevotional } = useDevotionalStore();
  
  // Get experiment data for streak timing
  const { experiment: streakExperiment } = useStatsigExperiment('exp_streak_after_daily_reading');
  const streakAfterReadingFlag = streakExperiment?.get?.('streak_after_reading_flag', false) ?? false;
  const streakAfterAllTasks = !streakAfterReadingFlag;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [prayerSentences, setPrayerSentences] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(16);
  const [showBreathingAnimation, setShowBreathingAnimation] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [guidedPrayerEnabled, setGuidedPrayerEnabled] = useState(true);
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [isPressHeld, setIsPressHeld] = useState(false);
  const [showGuidedPrayer, setShowGuidedPrayer] = useState(false);
  const pressHoldTimer = useRef<NodeJS.Timeout | null>(null);


  // Animation values
  const progressValue = useSharedValue(0);
  const prayerProgressValue = useSharedValue(0); // New progress bar for 20-second timer
  const breathingProgress = useSharedValue(0);
  const controlRowOpacity = useSharedValue(0);
  const componentOpacity = useSharedValue(0); // For smooth component fade-in
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




  // Generate prayer content based on devotional or recent prayers
  const generatePrayerContent = useCallback(() => {
    // First try to use the devotional prayer (handle both string and object structures)
    let devotionalPrayer: string | undefined;
    if (currentDevotional?.prayer) {
      if (typeof currentDevotional.prayer === 'string') {
        devotionalPrayer = currentDevotional.prayer;
      } else if (typeof currentDevotional.prayer === 'object' && (currentDevotional.prayer as any).en) {
        devotionalPrayer = (currentDevotional.prayer as any).en;
      }
    }

    if (devotionalPrayer && devotionalPrayer.trim().length > 0) {
      return devotionalPrayer;
    }

    // Fallback to recent prayers
    const latestPrayer = recentPrayers[0];
    if (!latestPrayer) {
      return i18n.t('dear_god_default_prayer');
    }

    return `Dear God, I come before you today with a humble heart. Please help me with ${latestPrayer.toLowerCase()} in my life. Guide me through this journey and give me strength. Thank you for your endless love and grace. Amen.`;
  }, [currentDevotional?.prayer, recentPrayers]);

  // Smooth component fade-in on mount
  useEffect(() => {
    if (visible) {
      componentOpacity.value = withTiming(1, { duration: 400 });
      // Start 20-second progress bar animation
      prayerProgressValue.value = 0;
      prayerProgressValue.value = withTiming(1, { duration: 20000 }); // 20 seconds
    } else {
      componentOpacity.value = 0;
      prayerProgressValue.value = 0;
    }
  }, [visible]);

  // Load settings from AsyncStorage
  useEffect(() => {
    const setShowGlobalButtons = useHomeStore.getState().setShowGlobalButtons;
    setShowGlobalButtons(true);

    const loadSettings = async () => {
      try {
        const savedHaptics = await AsyncStorage.getItem(PRAYER_HAPTICS_KEY);
        const savedGuidedMode = await AsyncStorage.getItem(PRAYER_GUIDED_MODE_KEY);

        if (savedHaptics !== null) {
          setHapticsEnabled(savedHaptics === 'true');
        }

        if (savedGuidedMode !== null) {
          setGuidedPrayerEnabled(savedGuidedMode === 'true');
        } else {
          // Default to true if no saved setting
          setGuidedPrayerEnabled(true);
        }

        appLog('🙏 Loaded prayer settings from AsyncStorage');
      } catch (error) {
        console.error('🙏 Error loading prayer settings:', error);
      }
    };

    loadSettings();
    return () => {
      setShowGlobalButtons(false);
    }
  }, []);

  // Split prayer into sentences when component loads
  useEffect(() => {
    appLog('🙏 Processing prayer content');
    appLog('🙏 Current devotional:', currentDevotional?.id, currentDevotional?.bibleReference);
    appLog('🙏 Devotional prayer available:', !!currentDevotional?.prayer);
    appLog('🙏 Prayer structure:', typeof currentDevotional?.prayer, currentDevotional?.prayer);

    const prayerText = generatePrayerContent();
    appLog('🙏 Generated prayer text:', prayerText);

    if (prayerText.trim().length > 0) {
      // Split by periods followed by space or end of string, keeping the period
      const sentences = prayerText
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0);
      appLog('🙏 Split into sentences:', sentences);
      setPrayerSentences(sentences);
    } else {
      appLog('🙏 No valid prayer text, setting empty array');
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
      setIsCompletePrayerDisabled(false);
    }, 5000);

    return () => {
      if (completePrayerTimerRef.current) {
        clearTimeout(completePrayerTimerRef.current);
      }
    };
  }, []);

  // Debug modal visibility changes
  useEffect(() => {
    appLog('🔍 showSettingsModal changed to:', showSettingsModal);
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
      if (pressHoldTimer.current) {
        clearTimeout(pressHoldTimer.current);
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
          hapticMedium();
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
      appLog('🙏 Saved haptics setting:', enabled);
    } catch (error) {
      console.error('🙏 Error saving haptics setting:', error);
    }
  }, []);

  const saveGuidedPrayerEnabled = useCallback(async (enabled: boolean) => {
    try {
      appLog('🙏 Saving guided prayer setting:', enabled, 'Modal should stay open');
      await AsyncStorage.setItem(PRAYER_GUIDED_MODE_KEY, enabled.toString());
      setGuidedPrayerEnabled(enabled);
      appLog('🙏 Saved guided prayer setting:', enabled, 'Modal should still be open');
    } catch (error) {
      console.error('🙏 Error saving guided prayer setting:', error);
    }
  }, []);

  // Press and hold handlers
  const handlePressIn = useCallback(() => {
    if (!guidedPrayerEnabled) return;
    
    setIsPressHeld(true);
    if (hapticsEnabled) {
      hapticLight();
    }
    
    // Start 1-second timer before showing guided prayer
    pressHoldTimer.current = setTimeout(() => {
      setShowGuidedPrayer(true);
    }, 1000);
  }, [guidedPrayerEnabled, hapticsEnabled]);

  const handlePressOut = useCallback(() => {
    if (!guidedPrayerEnabled) return;
    
    setIsPressHeld(false);
    
    // Clear timer if user releases before 1 second
    if (pressHoldTimer.current) {
      clearTimeout(pressHoldTimer.current);
      pressHoldTimer.current = null;
    }
  }, [guidedPrayerEnabled]);

  // Ensure guided prayer does not start typing until user has held for 1s
  // Reset any prior guided state when view becomes visible or when guided mode is toggled on
  useEffect(() => {
    if (visible && guidedPrayerEnabled) {
      // Clear any pending timers and require a fresh 1s hold
      if (pressHoldTimer.current) {
        clearTimeout(pressHoldTimer.current);
        pressHoldTimer.current = null;
      }
      setShowGuidedPrayer(false);
    }
  }, [visible, guidedPrayerEnabled]);

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

  // Component fade-in animation style
  const componentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: componentOpacity.value,
    };
  });

  // Prayer progress bar animation style
  const prayerProgressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${prayerProgressValue.value * 100}%`
    };
  });

  // Function to show control row with auto-hide
  const toggleControlRow = useCallback(() => {
    appLog('🎯 toggleControlRow called! showControlRow:', showControlRow);

    // Haptic feedback for every tap
    if (hapticsEnabled) {
      hapticLight();
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

  // Reset progress bar when breathing animation ends
  useEffect(() => {
    if (!showBreathingAnimation) {
      // Reset the prayer progress bar when moving to prayer cards
      prayerProgressValue.value = 0;
    }
  }, [showBreathingAnimation]);

  // Expose functions through ref
  useImperativeHandle(ref, () => ({
    handleBack: () => {
      useHomeStore.getState().setShowGlobalButtons(false);
      if (onSetIdle) onSetIdle();
      if (onClose) onClose({});
    },
    handleCompletePrayer: () => {
      setShowBreathingAnimation(false);
      useHomeStore.getState().setShowGlobalButtons(false);
      setFinishReading(true);
      setShowSuccess(true);

      // Apply rewards (2 hearts + 25 XP for prayer)
      const heartReward = 2;
      const xpReward = 25;
      const MAX_HEARTS = 100;

      const currentHearts = useUserStore.getState().getLambHearts();
      const setLambHearts = useUserStore.getState().setLambHearts;
      const addXp = useUserStore.getState().addXp;
      const setLambMood = useUserStore.getState().setLambMood;

      // Calculate actual heart reward (don't exceed MAX_HEARTS)
      const heartsToAdd = Math.min(heartReward, MAX_HEARTS - currentHearts);

      // Apply rewards
      if (heartsToAdd > 0) {
        setLambHearts(currentHearts + heartsToAdd);
        // Update mood based on new heart count
        const newHeartCount = currentHearts + heartsToAdd;
        if (newHeartCount >= 80) {
          setLambMood('lamb-idle');
        } else if (newHeartCount >= 50) {
          setLambMood('lamb-idle');
        } else if (newHeartCount >= 30) {
          setLambMood('lamb-sleepy');
        } else if (newHeartCount >= 20) {
          setLambMood('lamb-angry');
        }
      }

      // Always add XP
      addXp(xpReward);

      // Mark prayer as completed
      const setPrayerCompleted = useHomeStore.getState().setPrayerCompleted;
      setPrayerCompleted(true);

      // Update timestamps
      const now = firestore.Timestamp.now();
      const setLastActivityDate = useUserStore.getState().setLastActivityDate;
      const setLastPrayerDate = useUserStore.getState().setLastPrayerDate;
      setLastActivityDate(now);
      setLastPrayerDate(now);
    },
    handleSettings: () => {
      appLog('⚙️ Settings button pressed');
      // Clear any hide timers when opening settings
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setShowSettingsModal(true);
    }
  }));

  if (!visible) return null;

  // Prepare cards to show (up to current index)
  const cardsToShow = [];

  appLog('📋 Preparing prayer cards to show. Current index:', currentIndex);
  appLog('📋 Total prayer sentences:', prayerSentences.length);
  appLog('📋 Prayer sentences:', prayerSentences);

  // Add prayer sentences based on current index
  for (let i = 0; i <= currentIndex && i < prayerSentences.length; i++) {
    cardsToShow.push({
      type: 'prayer',
      content: prayerSentences[i],
    });
  }

  appLog('📋 Prayer cards to show:', cardsToShow.length, cardsToShow);

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
            {i18n.t('prayer_settings')}
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
              {i18n.t('haptic_feedback')}
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
              {i18n.t('guided_prayer_mode')}
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
              appLog('✅ Done button pressed, closing modal');
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
              {i18n.t('done_button')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );


  return (
    <Reanimated.View style={[{ flex: 1, borderRadius: 24 }, animatedBackgroundStyle, componentAnimatedStyle]}>
      {showSuccess ? (
        <View style={{ marginHorizontal: 24, flex: 1, marginTop: 24 }}>
          <SuccessMessage
            screenType="prayer"
            title={i18n.t('prayer_complete')}
            description={i18n.t('prayer_complete_desc')}
            level={levelInfo.level}
            prevLevel={levelInfo.level}
            buttonsEnabled={buttonsEnabled}
            onGoHome={() => {
              // Update lastActivityDate to prevent completion states from being reset
              setTimeout(() => {
                setFinishReading(false)
              }, 2000);
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
                devotionalId: currentDevotional?.id || null,
                bibleReference: currentDevotional?.bibleReference || null,
              });

              // Close the prayer view
              if (onSetIdle) onSetIdle();
              if (onClose) {
                if (hapticsEnabled) {
                  hapticMedium();
                }
                onClose({});
              }
              // Check streak trigger conditions when user presses "Go Home" from prayer success
              const homeStore = useHomeStore.getState();
              const { readingCompleted, prayerCompleted, reflectionCompleted, sawStreakToday } = homeStore;

              // Check if we should show streak based on experiment
              if (shouldShowStreakWithExperiment(homeStore, streakAfterAllTasks)) {
                // Mark that we've shown the streak screen today
                homeStore.setSawStreakToday(true);

                // Navigate to streak screen
                router.push('/streak');

                analytics.logEvent('PrayerView_StreakTriggered_FromGoHome', {
                  experimentVariant: streakAfterAllTasks ? 'test' : 'control',
                  readingCompleted,
                  prayerCompleted,
                  reflectionCompleted,
                  sawStreakToday: false,
                  timestamp: new Date().toISOString()
                });

                return; // Exit early to prevent further processing
              }

            }}
            onPray={() => {
              // Update lastActivityDate to prevent completion states from being reset
              setTimeout(() => {
                setFinishReading(false)
              }, 2000);
              const now = firestore.Timestamp.now();
              const setLastActivityDate = useUserStore.getState().setLastActivityDate;
              const setLastPrayerDate = useUserStore.getState().setLastPrayerDate;
              setLastActivityDate(now);
              setLastPrayerDate(now);

              // Mark prayer as completed
              const setPrayerCompleted = useHomeStore.getState().setPrayerCompleted;
              setPrayerCompleted(true);

              // Check if we should show bonus collection
              const readingCompleted = useHomeStore.getState().readingCompleted;
              const reflectionCompleted = useHomeStore.getState().reflectionCompleted;
              const sawDailyBonus = useHomeStore.getState().sawDailyBonus;
              const sawStreakToday = useHomeStore.getState().sawStreakToday;
              const isFirstReadingOfDay = !sawStreakToday;
              const isBonusAvailable = readingCompleted && reflectionCompleted && isFirstReadingOfDay && !sawDailyBonus;

              if (isBonusAvailable) {
                // Show bonus collection screen
                const setSuccessType = useHomeStore.getState().setSuccessType;
                setSuccessType(SuccessAnimationType.BONUS);

                // Show tab bar again
                setTimeout(() => {
                  const setPrayerViewVisible = useHomeStore.getState().setPrayerViewVisible;
                  setPrayerViewVisible(false);
                }, 2000);

                // Navigate to bonus screen
                router.push({
                  pathname: '/success'
                });

                // Reset Rive animation to appropriate state after navigation
                setTimeout(() => {
                  const homeStore = useHomeStore.getState();
                  const riveRef = homeStore.riveRef;
                  if (riveRef?.current?.setInputState) {
                    try {
                      const currentMood = useUserStore.getState()?.getLambMood?.();
                      const moodToStateInput: Record<string, number> = {
                        'lamb-idle': 0,
                        'lamb-sleepy': 4,
                        'lamb-angry': 5,
                        'lamb-chubby dying': 6,
                        'lamb-skinny dying': 7,
                        'smoking': 8,
                        'lamb-full': 3,
                      };
                      const targetStateInput = moodToStateInput[currentMood] || 0;
                      riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
                      appLog(`Reset Rive animation to mood state: ${targetStateInput} (${currentMood}) after navigation delay`);
                    } catch (error) {
                      appLog('Could not reset Rive state after navigation:', error);
                    }
                  }
                }, 1000);
              } else {
                // Normal reflection flow
                // Show tab bar again
                const setPrayerViewVisible = useHomeStore.getState().setPrayerViewVisible;
                setTimeout(() => {
                  setPrayerViewVisible(false);
                }, 2000);

                // Log completion analytics
                analytics.logEvent('PrayerView_Completed', {
                  prayerTopic: recentPrayers[0] || 'general',
                  totalCards: totalCards,
                  devotionalId: currentDevotional?.id || null,
                  bibleReference: currentDevotional?.bibleReference || null,
                });

                // Close the prayer view
                if (onSetIdle) onSetIdle();
                if (onClose) {
                  if (hapticsEnabled) {
                    hapticMedium();
                  }
                  onClose({ isReflectPresses: true });
                }
              }
            }}
            prayButtonTitle={i18n.t('reflect_on_this_verse')}
            rewardsTitle={i18n.t('prayer_rewards')}
          />
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16, marginTop: 24 }}>
            <Text
              className="font-feather text-textPrimary"
              style={{
                fontSize: responsiveFontSize(2.5),
                fontWeight: "400",
              }}
            >
              {/* Prayer Time */}
            </Text>
          </View>

          {/* Prayer Progress Bar */}
          <View style={{
            height: 8,
            borderRadius: 50,
            marginBottom: 56,
            marginHorizontal: 24,
            overflow: 'hidden',
            marginTop: -32,
            backgroundColor: 'rgba(255, 215, 0, 0.2)' // Light yellow background
          }}>
            <Reanimated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: '#FFD700', // Yellow color
                  borderRadius: 4,
                },
                prayerProgressAnimatedStyle,
              ]}
            />
          </View>

          {/* Bible Reference Header */}
          {/* <View className="flex-row items-center justify-center mb-4">
            <Text className="font-feather-bold text-textPrimary/80 text-center text-2xl">
              {currentDevotional?.bibleReference || "John 14:6"}
            </Text>
          </View> */}

          {/* Breathing Animation - Show initially */}
          {showBreathingAnimation && (
            <TouchableWithoutFeedback onPress={toggleControlRow}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -SCREEN_HEIGHT * 0.5 }}>
                <BreathingAnimation 
                  isActive={showBreathingAnimation} 
                  breathingProgress={breathingProgress} 
                  hapticsEnabled={hapticsEnabled} 
                  guidedPrayerEnabled={guidedPrayerEnabled} 
                  currentDevotional={currentDevotional}
                  showGuidedPrayer={showGuidedPrayer}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                />
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
                      <Text className="text-brown text-center">{i18n.t('no_prayer_content')}</Text>
                    ) : (
                      <>
                        {cardsToShow.map((card, index) => {
                          appLog('🎨 Rendering prayer card:', index, card.type, card.content.substring(0, 50));
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
                          {isTypingComplete ? i18n.t('tap_for_next') : i18n.t('tap_to_show_full_text')}
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
                      // Show success UI within the component
                      setFinishReading(true);
                      setShowSuccess(true);

                      // Apply rewards (2 hearts + 25 XP for prayer)
                      const heartReward = 2;
                      const xpReward = 25;
                      const MAX_HEARTS = 100;

                      const currentHearts = useUserStore.getState().getLambHearts();
                      const setLambHearts = useUserStore.getState().setLambHearts;
                      const addXp = useUserStore.getState().addXp;
                      const setLambMood = useUserStore.getState().setLambMood;

                      // Calculate actual heart reward (don't exceed MAX_HEARTS)
                      const heartsToAdd = Math.min(heartReward, MAX_HEARTS - currentHearts);

                      // Apply rewards
                      if (heartsToAdd > 0) {
                        setLambHearts(currentHearts + heartsToAdd);
                        // Update mood based on new heart count
                        const newHeartCount = currentHearts + heartsToAdd;
                        if (newHeartCount >= 80) {
                          setLambMood('lamb-idle');
                        } else if (newHeartCount >= 50) {
                          setLambMood('lamb-idle');
                        } else if (newHeartCount >= 30) {
                          setLambMood('lamb-sleepy');
                        } else if (newHeartCount >= 20) {
                          setLambMood('lamb-angry');
                        }
                      }

                      // Always add XP
                      addXp(xpReward);

                      // Mark prayer as completed
                      const setPrayerCompleted = useHomeStore.getState().setPrayerCompleted;
                      setPrayerCompleted(true);

                      // Update timestamps
                      const now = firestore.Timestamp.now();
                      const setLastActivityDate = useUserStore.getState().setLastActivityDate;
                      const setLastPrayerDate = useUserStore.getState().setLastPrayerDate;
                      setLastActivityDate(now);
                      setLastPrayerDate(now);
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
                        fontFamily: 'Nunito-Black',
                        fontSize: 16,
                      }}>
                        {i18n.t('amen_button')}
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
});

PrayerView.displayName = 'PrayerView';

export default PrayerView;
