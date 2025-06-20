import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, LinearGradient, vec, Path, Skia } from '@shopify/react-native-skia'

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

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePrayerStore } from '~/app/stores/prayerStore';
import { useHomeStore } from '~/app/stores/homeStore';
import { useUserStore } from '~/app/stores/userStore';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import firestore from '@react-native-firebase/firestore';
import Reanimated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Layout,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import analytics from '../utils/analytics';

import { getLevelData } from '~/utils/levelUtils';
import SuccessMessage from './SuccessMessage';

// AsyncStorage keys for prayer settings
const PRAYER_HAPTICS_KEY = 'prayer_haptics_enabled';
const PRAYER_GUIDED_MODE_KEY = 'prayer_guided_mode_enabled';

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

// Water Wave Animation Component
const WaterWaveAnimation: React.FC<{
  isActive: boolean;
  waterProgress: Reanimated.SharedValue<number>;
  hapticsEnabled: boolean;
  guidedPrayerEnabled: boolean;
  currentDevotional: any;
  isHolding: boolean;
  animationTriggered: boolean;
}> = ({ isActive, waterProgress, hapticsEnabled, guidedPrayerEnabled, currentDevotional, isHolding, animationTriggered }) => {
  const [waveOffset, setWaveOffset] = useState(0);
  const [waterLevel, setWaterLevel] = useState(SCREEN_HEIGHT);
  const textOpacity = useSharedValue(1);

  useEffect(() => {
    textOpacity.value = withTiming(isHolding ? 0 : 1, { duration: 300 });
  }, [isHolding]);

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: textOpacity.value,
    };
  });

  // Haptic feedback function
  const triggerHaptic = useCallback(() => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticsEnabled]);

  // Use ref to track if animation is already running to prevent restarts
  const animationStarted = useRef(false);
  const startupTimer = useRef<NodeJS.Timeout | null>(null);
  const waveAnimationRef = useRef<number | null>(null);

  // Helper to get current progress for water level calculation
  const [skiaProgress, setSkiaProgress] = useState(0);
  useEffect(() => {
    const update = () => setSkiaProgress(waterProgress.value);
    const id = setInterval(update, 16); // ~60fps
    return () => clearInterval(id);
  }, [waterProgress]);

  useEffect(() => {
    if (isActive && !animationStarted.current) {
      animationStarted.current = true;
      // Add a small delay to allow component to settle
      startupTimer.current = setTimeout(() => {
        // Water level will be controlled by progress value
        // No need for separate timer animation
      }, 300);
    } else if (!isActive && animationStarted.current) {
      animationStarted.current = false;
      // Clear startup timer if component becomes inactive
      if (startupTimer.current) {
        clearTimeout(startupTimer.current);
        startupTimer.current = null;
      }
      if (waveAnimationRef.current) {
        cancelAnimationFrame(waveAnimationRef.current);
        waveAnimationRef.current = null;
      }
      // Reset water level to bottom
      setWaterLevel(SCREEN_HEIGHT);
    }
    // Cleanup timer on unmount
    return () => {
      if (startupTimer.current) {
        clearTimeout(startupTimer.current);
        startupTimer.current = null;
      }
      if (waveAnimationRef.current) {
        cancelAnimationFrame(waveAnimationRef.current);
        waveAnimationRef.current = null;
      }
    };
  }, [isActive]);

  // Update water level based on progress
  useEffect(() => {
    if (isActive) {
      // Calculate water level based on progress (0 = completely hidden, 1 = filled to max level)
      const maxWaterLevel = SCREEN_HEIGHT / 2.7; // Fill to this level when complete
      const minWaterLevel = SCREEN_HEIGHT + 13; // Start completely below screen (hidden)
      const newWaterLevel = minWaterLevel - (skiaProgress * (minWaterLevel - maxWaterLevel));
      setWaterLevel(newWaterLevel);
    }
  }, [skiaProgress, isActive]);

  // Wave animation effect
  useEffect(() => {
    if (isActive) {
      const animateWave = () => {
        setWaveOffset(prev => (prev + 0.02) % (Math.PI * 2));
        waveAnimationRef.current = requestAnimationFrame(animateWave);
      };
      waveAnimationRef.current = requestAnimationFrame(animateWave);
    }

    return () => {
      if (waveAnimationRef.current) {
        cancelAnimationFrame(waveAnimationRef.current);
      }
    };
  }, [isActive]);

  const createWavePath = () => {
    const frequency = 2;
    const amplitude = 15;
    const points = [];

    for (let i = 0; i < SCREEN_WIDTH; i++) {
      const angle = (i / SCREEN_WIDTH) * (Math.PI * frequency) + waveOffset;
      const y = amplitude * Math.sin(angle) + waterLevel;
      points.push([i, y]);
    }

    // Create path string manually
    let pathString = `M${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      pathString += ` L${points[i][0]},${points[i][1]}`;
    }
    // Close the path to bottom
    pathString += ` L${SCREEN_WIDTH},${SCREEN_HEIGHT} L0,${SCREEN_HEIGHT} Z`;
    return pathString;
  };

  const wavePath = createWavePath();
  const path = Skia.Path.MakeFromSVGString(wavePath) || Skia.Path.Make();

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1,
    }}>
      <Canvas style={{ flex: 1, bottom: -5 }}>
        <Path path={path} style="fill" color="#4A90E2">
          <LinearGradient
            start={vec(0, waterLevel)}
            end={vec(0, waterLevel + 500)}
            colors={['cyan', "blue"]}
          />
        </Path>
      </Canvas>

      {/* Prayer instruction text overlay */}
      <Reanimated.View
        style={[{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 2,
          alignItems: 'center',
          justifyContent: 'center',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignSelf: 'center',
        }, animatedTextStyle]}
      >
        {guidedPrayerEnabled ? (
          <TypingText
            text="Dear God, I come before you today with a grateful heart. Please guide me through this day and help me grow in faith. Amen."
            className="text-blue-700 font-feather text-xl text-center"
            baseTextStyle={{
              color: '#1E40AF',
              fontSize: 20,
              fontFamily: 'Nunito-Black',
              textAlign: 'center',
              lineHeight: 28,
            }}
            speed={50}
            skipAnimation={false}
          />
        ) : (
          <View style={{ alignItems: 'center', alignSelf: 'center' }}>
            <Text className='text-blue font-feather text-center text-3xl' style={{
              textAlign: 'center',
              marginBottom: 8,
              fontFamily: 'Nunito-Black',
            }}>
              {animationTriggered ? 'Prayer Complete!' : 'Pour out your heart'}
            </Text>
            <Text style={{
              fontFamily: 'DIN Next Rounded LT W01 Regular',
              textAlign: 'center',
              color: '#4A90E2',
              fontSize: 16,
            }}>
              {animationTriggered ? 'Your prayer has been heard' : 'Let your prayers fill your cup'}
            </Text>
            <Text className='font-feather' style={{
              textAlign: 'center',
              color: 'white',
              fontSize: 14,
              marginTop: 24,
              opacity: 0.8,
            }}>
              {animationTriggered ? 'Tap to continue' : 'Hold to begin'}
            </Text>
          </View>
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
  waterProgress: Reanimated.SharedValue<number>;
  fontSize: number;
  skipTyping: boolean;
  onTypingComplete: () => void;
}> = ({ card, index, isLast, waterProgress, fontSize, skipTyping, onTypingComplete }) => {
  const cardBackgroundStyle = useAnimatedStyle(() => {
    const progress = waterProgress.value;
    // Interpolate between light blue and deeper blue based on water filling
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
  const [guidedPrayerEnabled, setGuidedPrayerEnabled] = useState(false);
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [animationTriggered, setAnimationTriggered] = useState(false);
  const [totalHoldTime, setTotalHoldTime] = useState(0);
  const holdStartTimeRef = useRef<number | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const progressValue = useSharedValue(0);
  const waterProgress = useSharedValue(0); // Water filling progress
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
      return "Dear God, I come before you today with a grateful heart. Please guide me through this day and help me grow in faith. Amen.";
    }

    return `Dear God, I come before you today with a humble heart. Please help me with ${latestPrayer.toLowerCase()} in my life. Guide me through this journey and give me strength. Thank you for your endless love and grace. Amen.`;
  }, [currentDevotional?.prayer, recentPrayers]);

  // Smooth component fade-in on mount
  useEffect(() => {
    if (visible) {
      componentOpacity.value = withTiming(1, { duration: 400 });
      // Don't start automatic animation - wait for user hold
      waterProgress.value = 0;
    } else {
      componentOpacity.value = 0;
      waterProgress.value = 0;
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
        }

        console.log('🙏 Loaded prayer settings from AsyncStorage');
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
    console.log('🙏 Processing prayer content');
    console.log('🙏 Current devotional:', currentDevotional?.id, currentDevotional?.bibleReference);
    console.log('🙏 Devotional prayer available:', !!currentDevotional?.prayer);
    console.log('🙏 Prayer structure:', typeof currentDevotional?.prayer, currentDevotional?.prayer);

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
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
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
        }, 10000);
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
        hideTimeoutRef.current = null;
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

  // Animated background style that matches water filling timing
  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const progress = waterProgress.value;
    // Interpolate between the two colors based on water filling
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

  // Reset progress bar when breathing animation ends
  useEffect(() => {
    if (!showBreathingAnimation) {
      // Reset water progress when moving to prayer cards
      waterProgress.value = 0;
      // Reset hold state
      setIsHolding(false);
      setAnimationTriggered(false);
      setTotalHoldTime(0);
      holdStartTimeRef.current = null;
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }
  }, [showBreathingAnimation]);

  // Debug state changes
  useEffect(() => {
    console.log('🎯 State changed - isHolding:', isHolding, 'animationTriggered:', animationTriggered);
  }, [isHolding, animationTriggered]);

  // Trigger success state when water animation is complete
  useEffect(() => {
    if (animationTriggered) {
      console.log('🎯 Water animation complete, triggering success state');
      // Trigger the success state after a short delay
      setTimeout(() => {
        setShowBreathingAnimation(false);
        setFinishReading(true);
        setShowSuccess(true);
      }, 1000);
    }
  }, [animationTriggered]);

  // Handle press start for water animation
  const handlePressIn = useCallback(() => {
    console.log('🎯 handlePressIn called');

    const startTime = Date.now();
    setIsHolding(true);
    holdStartTimeRef.current = startTime;
    console.log('🎯 Started holding, water will fill continuously');

    // Start continuous water filling
    const updateWater = () => {
      if (holdStartTimeRef.current) {
        const currentHoldTime = Date.now() - holdStartTimeRef.current;
        const totalTime = totalHoldTime + currentHoldTime;
        const maxFillTime = 20000; // 20 seconds to fill completely
        const progress = Math.min(totalTime / maxFillTime, 1);

        console.log('🎯 Total hold time:', totalTime, 'ms, progress:', progress);

        // Update water progress
        waterProgress.value = progress;

        // If water reaches 100%, trigger success
        if (progress >= 1 && !animationTriggered) {
          console.log('🎯 Water filled completely! Triggering success!');
          setAnimationTriggered(true);

          // Trigger haptic feedback
          if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }

          // Stop the water updates
          if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
          }
        }
      }
    };

    // Update water every 50ms while holding
    holdTimerRef.current = setInterval(updateWater, 50);
  }, [totalHoldTime, waterProgress, hapticsEnabled, animationTriggered]);

  // Handle press end for water animation
  const handlePressOut = useCallback(() => {
    console.log('🎯 handlePressOut called');
    setIsHolding(false);

    // Calculate total hold time
    if (holdStartTimeRef.current) {
      const currentHoldTime = Date.now() - holdStartTimeRef.current;
      const newTotalHoldTime = totalHoldTime + currentHoldTime;
      setTotalHoldTime(newTotalHoldTime);
      console.log('🎯 Total hold time accumulated:', newTotalHoldTime, 'ms');
    }

    holdStartTimeRef.current = null;

    // Stop the water updates
    if (holdTimerRef.current) {
      console.log('🎯 Stopping water updates');
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    // Don't reset water - keep it at current level
    console.log('🎯 Water stays at current level');
  }, [totalHoldTime, animationTriggered]);

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
      console.log('⚙️ Settings button pressed');
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
    <Reanimated.View style={[{ flex: 1, borderRadius: 24 }, animatedBackgroundStyle, componentAnimatedStyle, { overflow: 'hidden' }]}>
      {showSuccess ? (
        <View style={{ marginHorizontal: 24, flex: 1, marginTop: 24 }}>
          <SuccessMessage
            title="Prayer Complete!"
            description="Wonderful! You spent time in prayer & strengthened your faith."
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                onClose({});
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                onClose({ isReflectPresses: true });
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
              className="font-feather text-textPrimary"
              style={{
                fontSize: responsiveFontSize(2.5),
                fontWeight: "400",
              }}
            >
              {/* Prayer Time */}
            </Text>
          </View>

          {/* Bible Reference Header */}
          {/* <View className="flex-row items-center justify-center mb-4">
            <Text className="font-feather-bold text-textPrimary/80 text-center text-2xl">
              {currentDevotional?.bibleReference || "John 14:6"}
            </Text>
          </View> */}

          {/* Water Wave Animation - Show initially */}
          {showBreathingAnimation && (
            <TouchableWithoutFeedback
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={toggleControlRow}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -SCREEN_HEIGHT * 0.46 }}>
                <WaterWaveAnimation isActive={showBreathingAnimation} waterProgress={waterProgress} hapticsEnabled={hapticsEnabled} guidedPrayerEnabled={guidedPrayerEnabled} currentDevotional={currentDevotional} isHolding={isHolding} animationTriggered={animationTriggered} />
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
                              waterProgress={waterProgress}
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
                      waterProgress={waterProgress}
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
});

PrayerView.displayName = 'PrayerView';

export default PrayerView;
