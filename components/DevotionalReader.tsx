import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { useHomeStore } from '~/app/stores/homeStore';
import firestore from '@react-native-firebase/firestore';
import Reanimated, {
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Layout,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useUserStore } from '~/app/stores/userStore';
import { getLevelData } from '~/utils/levelUtils';
import { RPH } from '~/app/helper/helper';
import SuccessMessage from './SuccessMessage';
import DailyVerseCard from './Shared/DailyVerseCard';
import analytics from '~/utils/analytics';
import i18n from '../app/utils/i18n';
import { useSoundStore } from '~/app/stores/soundStore';
import { hapticLight, hapticMedium } from '~/utils/haptics';
import { Devotional } from '~/app/models/Devotional';
import { useLanguageStore } from '~/app/stores/languageStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DevotionalCard {
  type: string;
  content: string;
  reference?: string;
}

interface DevotionalReaderProps {
  visible?: boolean;
  onClose?: ({ isPrayPresses }: { isPrayPresses?: boolean }) => void;
  setFinishReading: (a: boolean) => void;
  setDevotionalReadedFully: (value: boolean) => void;
  setCurrentVerseReference: (reference: string) => void;
}

export interface DevotionalReaderRef {
  handleNextCard: () => void;
  currentIndex: number;
  totalCards: number;
  isRewarding: boolean;
  handleClose: () => void;
  onFinishPress: () => void;
  isLastCard: boolean;
  showSuccess: boolean;
}

const DevotionalReader = forwardRef<DevotionalReaderRef, DevotionalReaderProps>(({ visible = true, onClose, setFinishReading, setDevotionalReadedFully, setCurrentVerseReference }, ref) => {
  const { currentDevotional, isLoading, customDevotional } = useDevotionalStore();
  const devotionalError = useDevotionalStore().error;

  // Use customDevotional if it exists (AI-generated), otherwise use currentDevotional
  const activeDevotional: Devotional | null = customDevotional || currentDevotional;

  const { language } = useLanguageStore();
  
  // Debug logging for devotional data
  useEffect(() => {
    console.log('🔍 [DevotionalReader] Active devotional:', {
      id: activeDevotional?.id,
      title: activeDevotional?.title,
      imageURL: activeDevotional?.imageURL,
      hasCustom: !!customDevotional,
      hasCurrent: !!currentDevotional,
      customImageURL: customDevotional?.imageURL,
      currentImageURL: currentDevotional?.imageURL
    });
  }, [activeDevotional, customDevotional, currentDevotional]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [contextSentences, setContextSentences] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(16);
  const [isRewarding, setIsRewarding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [blueButtonOpacity, setBlueButtonOpacity] = useState(0.3);
  const [goldButtonOpacity, setGoldButtonOpacity] = useState(0.4);
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animatedXP = useRef(new Animated.Value(0)).current;
  const animatedHearts = useRef(new Animated.Value(0)).current;
  const animatedTextOpacity = useRef(new Animated.Value(0.4)).current;

  const lambHearts = useUserStore((state) => state?.getLambHearts?.());
  const lamb = useUserStore((state) => state.getLamb?.());

  const MAX_HEARTS = 100;

  // Animation values
  const progressValue = useSharedValue(0);
  const successViewOpacity = useSharedValue(0);
  const successViewScale = useSharedValue(0.8);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const animatedBlueOpacity = useRef(new Animated.Value(0.3)).current;
  const animatedGoldOpacity = useRef(new Animated.Value(0.4)).current;

  // Success view animated style
  const successViewAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: successViewOpacity.value,
      transform: [{ scale: successViewScale.value }],
    };
  });

  // Track previous level to detect level up
  const prevLevelRef = useRef(levelInfo.level);
  const [savedPrevLevel, setSavedPrevLevel] = useState(levelInfo.level);

  // Update previous level tracking when level changes
  useEffect(() => {
    if (levelInfo.level > prevLevelRef.current) {
      // Save the actual previous level before updating the ref
      setSavedPrevLevel(prevLevelRef.current);
      prevLevelRef.current = levelInfo.level;
    } else if (levelInfo.level !== prevLevelRef.current) {
      // Level changed but didn't increase (shouldn't happen normally)
      prevLevelRef.current = levelInfo.level;
      setSavedPrevLevel(levelInfo.level);
    }
  }, [levelInfo.level]);

  const didLevelUp = useMemo(() => {
    return levelInfo.level > savedPrevLevel;
  }, [levelInfo.level, savedPrevLevel]);

  // Cleaner success view animation
  useEffect(() => {
    if (showSuccess) {
      // Animate success view in with spring effect (slower)
      successViewOpacity.value = withTiming(1, { duration: 900 });
      successViewScale.value = withSpring(1, { damping: 20, stiffness: 80 });

      // Reset and animate progress bars
      animatedXP.setValue(0);
      animatedHearts.setValue(0);
      animatedTextOpacity.setValue(0.4);

      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = setTimeout(() => {
        // Animate progress bars (slower)
        Animated.parallel([
          Animated.timing(animatedXP, {
            toValue: levelInfo.progress,
            duration: 1400,
            useNativeDriver: false,
          }),
          Animated.timing(animatedHearts, {
            toValue: lambHearts,
            duration: 1400,
            useNativeDriver: false,
          }),
          Animated.timing(animatedTextOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
        ]).start(() => {
          // Enable buttons after progress animation
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(animatedBlueOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(animatedGoldOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
            ]).start();

            setButtonsEnabled(true);
            setBlueButtonOpacity(1);
            setGoldButtonOpacity(1);
          }, 300);
        });
      }, 500);
    } else {
      // Animate success view out
      successViewOpacity.value = withTiming(0, { duration: 300 });
      successViewScale.value = withTiming(0.8, { duration: 300 });

      // Reset values
      animatedXP.setValue(0);
      animatedHearts.setValue(0);
      animatedTextOpacity.setValue(0.4);
      animatedBlueOpacity.setValue(0.3);
      animatedGoldOpacity.setValue(0.4);
      setButtonsEnabled(false);
      setBlueButtonOpacity(0.3);
      setGoldButtonOpacity(0.4);
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);
    };
  }, [showSuccess, levelInfo.progress, lambHearts]);

  // Split context into sentences when devotional loads
  useEffect(() => {
    console.log(' Processing context for devotional:', activeDevotional?.id);
    console.log('🔄 Context value:', activeDevotional?.context);
    console.log('🔄 Context type:', typeof activeDevotional?.context);

    if (activeDevotional?.context) {
      let contextText = '';

      // Handle different context formats from Firestore
      if (typeof activeDevotional.context === 'string') {
        contextText = activeDevotional.context;
      } else if (Array.isArray(activeDevotional.context)) {
        // If context is an array, join the elements
        contextText = (activeDevotional.context as string[]).join(' ');
      } else if (typeof activeDevotional.context === 'object' && activeDevotional.context !== null) {
        // If context is an object, try to extract text content
        const contextObj = activeDevotional.context as any;
        if (contextObj.text) {
          contextText = contextObj.text;
        } else {
          
          // Get current language from i18n
          const currentLang = language;
          console.log('🔄 Current language:', currentLang);
          
          // Try to get text in current language, fallback to English if not available
          if (contextObj[currentLang]) {
            contextText = contextObj[currentLang];
          } else if (contextObj.en) {
            // Fallback to English if current language not available
            contextText = contextObj.en;
          } else {
            // If no matching language found, use first available language
            const availableLangs = Object.keys(contextObj);
            if (availableLangs.length > 0) {
              contextText = contextObj[availableLangs[0]];
            } else {
              // Last resort: stringify the object
              contextText = JSON.stringify(activeDevotional.context);
            }
          }
        }
      }

      console.log('🔄 Processed context text:', contextText);

      if (contextText.trim().length > 0) {
        // Split by periods followed by space or end of string, keeping the period
        const sentences = contextText
          .split(/(?<=[.!?])\s+/)
          .filter(s => s.trim().length > 0);
        console.log('🔄 Split into sentences:', sentences);
        setContextSentences(sentences);
      } else {
        console.log('🔄 No valid context text, setting empty array');
        setContextSentences([]);
      }
    } else {
      console.log('🔄 No context available, setting empty array');
      setContextSentences([]);
    }
  }, [activeDevotional]);

  // Remove the devotional fetch - it's already loaded in parent component

  // Debug log when devotional changes
  useEffect(() => {
    console.log('🙏 DevotionalReader: Store state changed:', {
      activeDevotional: !!activeDevotional,
      isLoading: isLoading,
      error: devotionalError,
    });

    if (activeDevotional) {
      console.log('🙏 DevotionalReader: Active devotional:', {
        id: activeDevotional.id,
        hasVerse: !!activeDevotional.verse,
        hasContext: !!activeDevotional.context,
        contextType: typeof activeDevotional.context,
        bibleReference: activeDevotional.bibleReference,
      });
    }
  }, [activeDevotional, isLoading, devotionalError]);

  // Calculate total cards (1 for verse + context sentences)
  // Always have at least 1 card for the verse, even if no context
  const totalCards = Math.max(contextSentences.length + 1, 1);

  // Update progress bar – skip animation only on the first render
  const isFirstProgressRender = useRef(true);

  useEffect(() => {
    const showGlobalButtons = useHomeStore.getState().showGlobalButtons;
    const setShowGlobalButtons = useHomeStore.getState().setShowGlobalButtons;
    if (!showGlobalButtons) {
      setShowGlobalButtons(true);
    }
    if (totalCards > 0) {
      const newProgress = (currentIndex + 1) / totalCards;

      if (isFirstProgressRender.current) {
        // Set initial progress to 0 on first render
        progressValue.value = 0;
        isFirstProgressRender.current = false;
      } else {
        // Animate smoothly from current progress to new progress
        // Animate smoothly on subsequent updates (when changing cards)
        progressValue.value = withTiming(newProgress, { duration: 600 });
      }
    }
  }, [currentIndex, totalCards, progressValue]);

  // Remove auto-setting of showGlobalButtons - this should be controlled by parent component


  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleNextCard = useCallback(() => {
    // Trigger haptic feedback
    Haptics.selectionAsync();

    // Track tap count and hide guidance after 1 tap
    if (showTapGuidance) {
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);
      if (newTapCount >= 1) {
        setShowTapGuidance(false);
      }
    }

    if (currentIndex < totalCards - 1) {
      setCurrentIndex(i => i + 1);
      setTimeout(scrollToBottom, 150);
    }

    // Set devotionalReadedFully to true when reaching the last card
    if (currentIndex === totalCards - 2) { // -2 because we're about to increment to the last card
      setDevotionalReadedFully(true);
    }
  }, [currentIndex, totalCards, scrollToBottom, showTapGuidance, tapCount, setDevotionalReadedFully]);

  const handleClose = useCallback(() => {
    console.log('[DevotionalReader] handleClose called');
    useHomeStore.getState().setShowGlobalButtons(false);
    if (onClose) {
      console.log('[DevotionalReader] Calling onClose callback');
      hapticMedium();
      onClose({ isPrayPresses: false });
    } else {
      console.log('[DevotionalReader] No onClose callback provided');
    }
  }, [onClose]);

  const isLastCard = useMemo(() => {
    return currentIndex === totalCards - 1;
  }, [currentIndex, totalCards]);

  useImperativeHandle(ref, () => ({
    handleNextCard,
    currentIndex,
    totalCards,
    isRewarding,
    handleClose,
    isLastCard,
    onFinishPress,
    showSuccess
  }));

  function onFinishPress() {
    setIsRewarding(true);
    setShowSuccess(true);
    setFinishReading(true)

    // Apply rewards (3 hearts + 25 XP for reading)
    const heartReward = 3;
    const xpReward = 25;
    const MAX_HEARTS = 100;

    const currentHearts = useUserStore.getState().getLambHearts();
    const currentXp = useUserStore.getState().getLambXp();
    const setLambHearts = useUserStore.getState().setLambHearts;
    const addXp = useUserStore.getState().addXp;
    const setLambMood = useUserStore.getState().setLambMood;
    const addCompletedReading = useUserStore.getState().addCompletedReading;

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

    // Save completed reading to userStore
    const now = firestore.Timestamp.now();
    const setLastReadingDate = useUserStore.getState().setLastReadingDate;

    // Extract book and chapter info from bible reference
    let book = '';
    let chapters: string[] = [];

    if (activeDevotional?.bibleReference) {
      // Parse reference like "John 3:16" or "Matthew 5:1-10"
      const refParts = activeDevotional.bibleReference.split(' ');
      if (refParts.length >= 2) {
        book = refParts[0];
        const chapterVerse = refParts[1].split(':');
        if (chapterVerse.length > 0) {
          chapters = [chapterVerse[0]];
        }
      }
    }

    addCompletedReading({
      date: now,
      book: book || 'Devotional',
      chapters: chapters.length > 0 ? chapters as [string] : ['1'],
      isUnit: false,
    });

    // Update last reading date
    setLastReadingDate(now);

    // Mark reading as completed
    const setReadingCompleted = useHomeStore.getState().setReadingCompleted;
    const setShowGlobalButtons = useHomeStore.getState().setShowGlobalButtons;
    setReadingCompleted(true);
    setShowGlobalButtons(false);

    // Log completion analytics
    analytics.logEvent('DevotionalReader_Completed', {
      bibleReference: activeDevotional?.bibleReference,
      hasContext: !!activeDevotional?.context,
      totalCards: totalCards,
      heartsAwarded: heartsToAdd,
      xpAwarded: xpReward,
    });
  }
  const animatedProgressStyle = useAnimatedStyle(() => {
    return { width: `${progressValue.value ? progressValue.value * 100 : 0}%` };
  });

  // Prepare cards to show (up to current index) - moved before early return
  const cardsToShow: DevotionalCard[] = useMemo(() => {
    if (!activeDevotional) return [];

    const cards: DevotionalCard[] = [];
    console.log('📋 Preparing cards to show. Current index:', currentIndex);
    console.log('📋 Total context sentences:', contextSentences.length);
    console.log('📋 Context sentences:', contextSentences);
    console.log('📋 Devotional to use:', {
      hasVerse: !!activeDevotional?.verse,
      verse: activeDevotional?.verse,
      reference: activeDevotional?.bibleReference
    });

    // First card is always the Bible verse
    if (currentIndex >= 0) {
      cards.push({
        type: 'verse',
        content: activeDevotional?.verse || 'No verse available for today.',
        reference: activeDevotional?.bibleReference || '',
      });
    }

    // Add context sentences based on current index
    for (let i = 1; i <= currentIndex && i - 1 < contextSentences.length; i++) {
      cards.push({
        type: 'context',
        content: contextSentences[i - 1],
        reference: '',
      });
    }

    console.log('📋 Cards to show:', cards.length, cards);
    return cards;
  }, [currentIndex, contextSentences, activeDevotional]);

  // Update verse reference when devotional data changes
  useEffect(() => {
    if (cardsToShow[0]?.reference) {
      setCurrentVerseReference(cardsToShow[0].reference);
    }
  }, [cardsToShow, setCurrentVerseReference]);


  // Get store state for debugging

  if (!activeDevotional) {
    return (
      <SafeAreaView className="flex-1 bg-surfaceCream items-center justify-center px-6">
        <Text className="text-brown/90 text-lg font-feather mb-2">{i18n.t('no_devotional_available')}</Text>
        <Text className="text-brown/70 text-center font-din mb-4">
          {i18n.t('devotional_load_error')}
        </Text>
        {onClose && (
          <TouchableOpacity onPress={handleClose} className="bg-brown/20 px-6 py-3 rounded-xl">
            <Text className="text-brown font-feather">{i18n.t('go_back')}</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  if (!visible) return null;

  return (
    <View style={{ flex: 1, margin: RPH(1), marginHorizontal: 24 }}>
      {showSuccess ? (
        <SuccessMessage
          onLoad={() => {
            useSoundStore.getState().playBreadEatingSound();
          }}
          key={`success-${levelInfo.level}-${savedPrevLevel}`}
          title={i18n.t('reading_complete')}
          description={i18n.t('reading_complete_desc')}
          level={levelInfo.level}
          prevLevel={savedPrevLevel}
          buttonsEnabled={buttonsEnabled}
          onGoHome={() => {
            useSoundStore.getState().stopBreadEatingSound();
            const now = firestore.Timestamp.now();
            const setLastActivityDate = useUserStore.getState().setLastActivityDate;
            const setLastReadingDate = useUserStore.getState().setLastReadingDate;
            setLastActivityDate(now);
            setLastReadingDate(now);
            const setReadingCompleted = useHomeStore.getState().setReadingCompleted;
            setReadingCompleted(true);
            setIsRewarding(false);
            if (onClose) {
              hapticMedium();
              const setDevotionalReaderVisible = useHomeStore.getState().setDevotionalReaderVisible;
              setDevotionalReaderVisible(false);
              onClose({ isPrayPresses: false });
              setTimeout(() => {
                setFinishReading(false);
                setShowSuccess(false); // Reset success state after dismissal
              }, 500);
            }
          }}
          onPray={() => {
            useSoundStore.getState().stopBreadEatingSound();
            const now = firestore.Timestamp.now();
            const setLastActivityDate = useUserStore.getState().setLastActivityDate;
            const setLastReadingDate = useUserStore.getState().setLastReadingDate;
            setLastActivityDate(now);
            setLastReadingDate(now);
            const setReadingCompleted = useHomeStore.getState().setReadingCompleted;
            setReadingCompleted(true);
            setIsRewarding(false);
            if (onClose) {
              hapticMedium();
              const setDevotionalReaderVisible = useHomeStore.getState().setDevotionalReaderVisible;
              setDevotionalReaderVisible(false);
              onClose({ isPrayPresses: true });
              setTimeout(() => {
                setFinishReading(false);
                setShowSuccess(false); // Reset success state after dismissal
              }, 500);
            }
          }}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0, marginBottom: 16 }}>
            <Text
              className="font-feather text-textPrimary"
              style={{
                fontSize: responsiveFontSize(2.5),
                fontWeight: "400",
              }}
            >
              {activeDevotional?.title || "Daily Devotional"}
            </Text>

            {onClose && (
              <TouchableOpacity
                onPress={() => {
                  console.log('[DevotionalReader] X button pressed');
                  hapticLight();
                  onClose({ isPrayPresses: false });
                }}
                className="bg-brown/10 w-8 h-8 rounded-full items-center justify-center">
                <Feather name="x" size={18} color="#795323" />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Header */}
          {/* <View className="flex-row items-center justify-center mb-2">
            <Text className="font-din text-textPrimary/40 text-center text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View> */}

          {/* Progress bar */}
          <View style={{ height: RPH(1.5), borderRadius: 50, marginBottom: 12, overflow: 'hidden' }} className='bg-brown/10'>
            <Reanimated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: '#FC8A02',
                  borderRadius: 4,
                },
                animatedProgressStyle,
              ]}
            />
          </View>

          {/* Cards ScrollView */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: RPH(35),
              flexGrow: 1,
              justifyContent: 'flex-start',
              minHeight: '100%'
            }}
            scrollEventThrottle={16}
            bounces={true}
            alwaysBounceVertical={true}
            automaticallyAdjustContentInsets={true}>
            <TouchableWithoutFeedback onPress={handleNextCard}>
              <View style={{ minHeight: 200, paddingBottom: RPH(12) }}>
                {cardsToShow.length === 0 ? (
                  <Text className="text-brown text-center">{i18n.t('no_cards_to_display')}</Text>
                ) : (
                  <>
                    {cardsToShow.map((card, index) => {
                      console.log('🎨 Rendering card:', index, card.type, card.content.substring(0, 50));

                      // Use DailyVerseCard for the first verse card
                      if (card.type === 'verse' && index === 0) {
                        return (
                          <Reanimated.View
                            key={index}
                            entering={SlideInDown.duration(1000).delay(index * 60).withInitialValues({ opacity: 0 })}
                            layout={Layout.springify()}>
                            <DailyVerseCard
                              devotional={activeDevotional}
                              showShareButton={false}
                              showExpandButton={false}
                              share={false}
                              onPress={handleNextCard}
                            />
                          </Reanimated.View>
                        );
                      }

                      // Use regular card for context cards
                      return (
                        <Reanimated.View
                          key={index}
                          entering={SlideInDown.duration(1000).delay(index * 60).withInitialValues({ opacity: 0 })}
                          layout={Layout.springify()}
                          style={{ marginBottom: 12 }}>
                          <View className="bg-surfaceCreamLight" style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                            padding: 14,
                            borderRadius: 20,
                            borderWidth: 2,
                            borderColor: 'rgba(121, 83, 35, 0.1)',

                          }}>
                            {/* Card content */}
                            <Text className="text-[18px] leading-[25px] font-nunito-bold text-textPrimary">
                              {card.content}
                            </Text>
                          </View>
                        </Reanimated.View>
                      );
                    })}
                    {/* Tap for next guidance */}
                    {showTapGuidance && (
                      <Text className="text-[#B89B4C] font-din text-[14px] text-center mt-3 opacity-70">{i18n.t('tap_for_next')}</Text>
                    )}
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>
      )}
    </View>
  );
});

DevotionalReader.displayName = 'DevotionalReader';

export default DevotionalReader;
