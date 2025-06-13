import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  Animated,
} from 'react-native';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { useHomeStore } from '~/app/stores/homeStore';
import { Feather, FontAwesome } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import Reanimated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import analytics from '../utils/analytics';
import { useUserStore } from '~/app/stores/userStore';
import { getLevelData } from '~/utils/levelUtils';
import PrimaryButton from './PrimaryButton';
import { RPH } from '~/app/helper/helper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DevotionalReaderProps {
  visible?: boolean;
  onClose?: () => void;
  setFinishReading: (a: boolean) => void;
}

const DevotionalReader: React.FC<DevotionalReaderProps> = ({ visible = true, onClose, setFinishReading }) => {
  const { currentDevotional, isLoading } = useDevotionalStore();
  const devotionalError = useDevotionalStore().error;
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
            setBlueButtonOpacity(1);
            setGoldButtonOpacity(1);
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
    console.log(' Processing context for devotional:', currentDevotional?.id);
    console.log('🔄 Context value:', currentDevotional?.context);
    console.log('🔄 Context type:', typeof currentDevotional?.context);

    if (currentDevotional?.context) {
      let contextText = '';

      // Handle different context formats from Firestore
      if (typeof currentDevotional.context === 'string') {
        contextText = currentDevotional.context;
      } else if (Array.isArray(currentDevotional.context)) {
        // If context is an array, join the elements
        contextText = (currentDevotional.context as string[]).join(' ');
      } else if (typeof currentDevotional.context === 'object' && currentDevotional.context !== null) {
        // If context is an object, try to extract text content
        const contextObj = currentDevotional.context as any;
        if (contextObj.text) {
          contextText = contextObj.text;
        } else if (contextObj.en) {
          // Extract English text from multi-language object
          contextText = contextObj.en;
        } else {
          // Convert object to string as fallback
          contextText = JSON.stringify(currentDevotional.context);
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
  }, [currentDevotional]);

  // Remove the devotional fetch - it's already loaded in parent component

  // Debug log when devotional changes
  useEffect(() => {
    console.log('🙏 DevotionalReader: Store state changed:', {
      currentDevotional: !!currentDevotional,
      isLoading: isLoading,
      error: devotionalError,
    });

    if (currentDevotional) {
      console.log('🙏 DevotionalReader: Current devotional:', {
        id: currentDevotional.id,
        hasVerse: !!currentDevotional.verse,
        hasContext: !!currentDevotional.context,
        contextType: typeof currentDevotional.context,
        bibleReference: currentDevotional.bibleReference,
      });
    }
  }, [currentDevotional, isLoading, devotionalError]);

  // Calculate total cards (1 for verse + context sentences)
  // Always have at least 1 card for the verse, even if no context
  const totalCards = Math.max(contextSentences.length + 1, 1);

  // Update progress bar
  useEffect(() => {
    if (totalCards > 0) {
      const newProgress = (currentIndex + 1) / totalCards;
      progressValue.value = withTiming(newProgress, { duration: 600 });
    }
  }, [currentIndex, totalCards, progressValue]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleNextCard = useCallback(() => {
    // Trigger haptic feedback
    Haptics.selectionAsync();

    // Track tap count and hide guidance after 2 taps
    if (showTapGuidance) {
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);
      if (newTapCount >= 2) {
        setShowTapGuidance(false);
      }
    }

    if (currentIndex < totalCards - 1) {
      setCurrentIndex(i => i + 1);
      setTimeout(scrollToBottom, 150);
    } else {
      // Reached the end - close the reader
      if (onClose) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
      }
    }
  }, [currentIndex, totalCards, scrollToBottom, showTapGuidance, tapCount, onClose]);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return { width: `${progressValue.value * 100}%` };
  });

  // Get store state for debugging

  if (!currentDevotional) {
    return (
      <SafeAreaView className="flex-1 bg-surfaceCream items-center justify-center px-6">
        <Text className="text-brown/90 text-lg font-feather-bold mb-2">No Devotional Available</Text>
        <Text className="text-brown/70 text-center font-din mb-4">
          We could not load today&apos;s devotional. Please check your connection and try again.
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} className="bg-brown/20 px-6 py-3 rounded-xl">
            <Text className="text-brown font-feather-bold">Go Back</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // Prepare cards to show (up to current index)
  const cardsToShow = [];
  console.log('📋 Preparing cards to show. Current index:', currentIndex);
  console.log('📋 Total context sentences:', contextSentences.length);
  console.log('📋 Context sentences:', contextSentences);
  console.log('📋 Devotional to use:', {
    hasVerse: !!currentDevotional?.verse,
    verse: currentDevotional?.verse,
    reference: currentDevotional?.bibleReference
  });

  // First card is always the Bible verse
  if (currentIndex >= 0) {
    cardsToShow.push({
      type: 'verse',
      content: currentDevotional?.verse || 'No verse available for today.',
      reference: currentDevotional?.bibleReference || '',
    });
  }

  // Add context sentences based on current index
  for (let i = 1; i <= currentIndex && i - 1 < contextSentences.length; i++) {
    cardsToShow.push({
      type: 'context',
      content: contextSentences[i - 1],
      reference: '',
    });
  }

  console.log('📋 Cards to show:', cardsToShow.length, cardsToShow);

  if (!visible) return null;

  return (
    <View style={{ flex: 1, margin: 12, marginHorizontal: 24 }}>
      {showSuccess ? (
        <View className="flex-1 items-center ">
          <View className="mb-0 mt-6">
            <Image source={require("../assets/icons/rocket.png")} style={{ width: 65, height: 65 }} />
          </View>
          <Text className="font-feather-bold text-[28px] text-center mb-6 text-orange">
            {`Level UP ${levelInfo.level}!`}
          </Text>
          <Animated.Text
            className="font-feather-bold text-[26px] text-center mb-1 text-brown/90"
            style={{ opacity: animatedTextOpacity }}
          >
            Reading Complete!
          </Animated.Text>
          <Text className="font-din text-[17px]  text-brown/90 text-center mb-4" >
            Hurray! You finished today's bible reading & fed your lamb.
          </Text>
          <Text className="font-din text-[13px] text-center mb-6 tracking-wider uppercase text-brown/80">
            READING REWARDS
          </Text>

          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Image source={require('../assets/icons/heartIcon.png')} className="w-7 h-7" />
            <View style={{ width: '92%' }}>
              <View className="h-2 bg-red/25 rounded-md overflow-hidden">
                <Animated.View
                  className="h-full bg-red rounded-full"
                  style={{
                    width: animatedHearts.interpolate({
                      inputRange: [0, MAX_HEARTS],
                      outputRange: ['1%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  }}
                />
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', }}>
            <Image source={require('../assets/icons/starIcon.png')} tintColor={'#FF8800'} className="w-7 h-7" />
            <View style={{ width: '92%' }}>
              <View className="h-2 bg-orange/25 rounded-full overflow-hidden " >
                <Animated.View
                  className="h-full bg-orange rounded-full"
                  style={{
                    width: animatedXP.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['1%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  }}
                />
              </View>
            </View>
          </View>
          <Animated.View style={{ opacity: animatedBlueOpacity, width: '100%', }}>
            <PrimaryButton
              title="Pray about this verse"
              onPress={() => { }}
              buttonType="blue"
              icon={require('../assets/icons/starIcon.png')}
              reward={"+25"}
              disabled={!buttonsEnabled}
            />
          </Animated.View>

          <Animated.View style={{ opacity: animatedGoldOpacity, width: '100%' }}>
            <TouchableOpacity
              onPress={() => {

                console.log('🔴 Finish Reading button pressed');

                // Update lastActivityDate to prevent completion states from being reset
                const now = firestore.Timestamp.now();
                const setLastActivityDate = useUserStore.getState().setLastActivityDate;
                const setLastReadingDate = useUserStore.getState().setLastReadingDate;
                console.log('🔴 Updating lastActivityDate and lastReadingDate to:', now.toDate());
                setLastActivityDate(now);
                setLastReadingDate(now);

                // Mark reading as completed
                const setReadingCompleted = useHomeStore.getState().setReadingCompleted;
                console.log('🔴 Before setting readingCompleted:', useHomeStore.getState().readingCompleted);
                setReadingCompleted(true);
                console.log('🔴 After setting readingCompleted:', useHomeStore.getState().readingCompleted);


                setShowSuccess(false);
                setIsRewarding(false);
                if (onClose) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setFinishReading(false)
                  // Show tab bar again
                  const setDevotionalReaderVisible = useHomeStore.getState().setDevotionalReaderVisible;
                  setDevotionalReaderVisible(false);
                  onClose();
                }
              }}
              className="w-full h-[52px] self-center bg-gold rounded-full mt-2 items-center justify-center"
              disabled={!buttonsEnabled}
            >
              <Text className="font-feather-bold text-brown/80 text-xl text-center">Go Home</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 0, marginBottom: 16 }}>
            <Text
              className="font-feather-bold text-textPrimary"
              style={{
                fontSize: responsiveFontSize(2.5),
                fontWeight: "400",
              }}
            >
              Daily Devotional
            </Text>

            {/* Close button */}
            {onClose && (
              <TouchableOpacity onPress={onClose} className="bg-brown/10 w-8 h-8 rounded-full items-center justify-center">
                <Feather name="x" size={18} color="#795323" />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Header */}
          <View className="flex-row items-center justify-center mb-2">
            <Text className="font-din text-textPrimary/40 text-center text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={{ height: 8, borderRadius: 4, marginBottom: 12, overflow: 'hidden' }} className='bg-brown/10'>
            <Reanimated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: '#DCB280',
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
              <View style={{ minHeight: 200 }}>
                {cardsToShow.length === 0 ? (
                  <Text className="text-brown text-center">No cards to display</Text>
                ) : (
                  <>
                    {cardsToShow.map((card, index) => {
                      console.log('🎨 Rendering card:', index, card.type, card.content.substring(0, 50));
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
                            {/* Bible reference for verse card */}
                            {card.type === 'verse' && card.reference && (
                              <Text
                                className="text-brown/50 font-feather-bold mb-2"
                                style={{ fontSize: Math.max(fontSize * 0.75, 8) }}
                              >
                                {card.reference}
                              </Text>
                            )}

                            {/* Card content */}
                            <Text className="text-[18px] leading-[25px] font-nunito-bold " >
                              <Text className="text-brown/40">{index + 1}.</Text>
                              <Text className="text-brown/70">  {card.content}</Text>
                            </Text>
                          </View>
                        </Reanimated.View>
                      );
                    })}
                  </>
                )}

                {/* Tap guidance or finish button */}
                {currentIndex < totalCards - 1 ? (
                  <View style={{ alignItems: 'center', marginTop: 12 }}>
                    {showTapGuidance && (
                      <Text style={{
                        color: '#B89B4C',
                        fontFamily: 'DIN Next Rounded LT W01 Regular',
                        fontSize: 14,
                        opacity: 0.7,
                      }}>
                        Tap for next →
                      </Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={isRewarding ? undefined : () => {
                      setIsRewarding(true);
                      setShowSuccess(true);
                      setFinishReading(true)
                      // Mark reading as completed
                      const setReadingCompleted = useHomeStore.getState().setReadingCompleted;
                      setReadingCompleted(true);

                      // Log completion analytics
                      analytics.logEvent('DevotionalReader_Completed', {
                        bibleReference: currentDevotional?.bibleReference,
                        hasContext: !!currentDevotional?.context,
                        totalCards: totalCards,
                      });

                    }}
                    activeOpacity={isRewarding ? 1 : 0.8}
                    disabled={isRewarding}
                  >
                    <View style={{
                      backgroundColor: isRewarding ? '#E5E5E5' : '#DCB280',
                      paddingVertical: 12,
                      alignItems: 'center',
                      marginTop: 16,
                      borderRadius: 12,
                    }}>
                      <Text style={{
                        color: 'white',
                        fontFamily: 'Feather Bold',
                        fontSize: 16,
                        opacity: isRewarding ? 0.5 : 1,
                      }}>
                        Finish Reading 🙏
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default DevotionalReader;
