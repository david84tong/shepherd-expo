import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { useHomeStore } from '~/app/stores/homeStore';
import { Feather } from '@expo/vector-icons';
import Reanimated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Layout,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import analytics from '../utils/analytics';

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

interface DevotionalReaderProps {
  visible?: boolean;
  onClose?: () => void;
}

const DevotionalReader: React.FC<DevotionalReaderProps> = ({ visible = true, onClose }) => {
  const { currentDevotional, isLoading, fetchTodaysDevotional } = useDevotionalStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [contextSentences, setContextSentences] = useState<string[]>([]);

  // Animation values
  const progressValue = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Split context into sentences when devotional loads
  useEffect(() => {
    if (currentDevotional?.context && typeof currentDevotional.context === 'string') {
      // Split by periods followed by space or end of string, keeping the period
      const sentences = currentDevotional.context
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0);
      setContextSentences(sentences);
    } else {
      // If no context or context is not a string, set empty array
      setContextSentences([]);
    }
  }, [currentDevotional]);

  // Load devotional on mount
  useEffect(() => {
    console.log('🙏 DevotionalReader: Fetching today\'s devotional');
    fetchTodaysDevotional();
  }, [fetchTodaysDevotional]);

  // Debug log when devotional changes
  useEffect(() => {
    if (currentDevotional) {
      console.log('🙏 DevotionalReader: Current devotional:', {
        id: currentDevotional.id,
        hasVerse: !!currentDevotional.verse,
        hasContext: !!currentDevotional.context,
        contextType: typeof currentDevotional.context,
        bibleReference: currentDevotional.bibleReference,
      });
    }
  }, [currentDevotional]);

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
      // Reached the end - close the reader
      if (onClose) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
      }
    }
  }, [currentIndex, totalCards, isTypingComplete, scrollToBottom, showTapGuidance, tapCount, onClose]);

  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true);
  }, []);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return { width: `${progressValue.value * 100}%` };
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surfaceCream items-center justify-center">
        <ActivityIndicator size="large" color="#DCB280" />
        <Text className="text-brown/70 mt-4 font-din">Loading today&apos;s devotional...</Text>
      </SafeAreaView>
    );
  }

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
  
  // First card is always the Bible verse
  if (currentIndex >= 0) {
    cardsToShow.push({
      type: 'verse',
      content: currentDevotional.verse || 'No verse available for today.',
      reference: currentDevotional.bibleReference || '',
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

    if (!visible) return null;

  return (
    <Reanimated.View 
      entering={SlideInRight.duration(400)}
      exiting={SlideOutRight.duration(300)}
      className="flex-1">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
            <View className="bg-surfaceCream rounded-t-card" style={{ width: "100%", height: "90%", position: 'absolute', bottom: 0 }}>
            
            {/* Header */}
            <Text
              className="font-feather-bold text-white"
              style={{
                fontSize: responsiveFontSize(3),
                fontWeight: "400",
                position: 'absolute',
                left: 20,
                top: -50
              }}
            >
              Daily Devotional
            </Text>

            {/* Close button */}
            {onClose && (
              <View style={{ position: "absolute", right: 10, top: -50 }}>
                <TouchableOpacity onPress={onClose} className="bg-white/80 w-10 h-10 rounded-full items-center justify-center">
                  <Feather name="x" size={22} color="#795323" style={{ opacity: 0.4 }} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flex: 1, paddingBottom: 24, paddingHorizontal: 16, paddingTop: 16 }}>
              {/* Date Header */}
              <View className="flex-row items-center justify-center mb-3 px-[4px] py-[10px]">
                <Text className="font-feather-bold text-textPrimary/30 text-center" style={{ fontSize: responsiveFontSize(2), fontWeight: "600" }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={{ height: 12, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }} className='bg-brown/5'>
                <Reanimated.View
                  style={[
                    {
                      height: '100%',
                      backgroundColor: '#DCB280',
                      borderRadius: 2,
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
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                scrollEventThrottle={16}>
                <TouchableWithoutFeedback onPress={handleNextCard}>
                  <View style={{ minHeight: '100%' }}>
                    {cardsToShow.map((card, index) => (
                      <Reanimated.View
                        key={index}
                        entering={FadeInUp.duration(300).delay(index * 60)}
                        layout={Layout.springify()}
                        style={{ marginBottom: 16 }}>
                        <View className="bg-surfaceCreamLight" style={{
                          padding: 16,
                          borderRadius: 16,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 2,
                          elevation: 1,
                          backgroundColor: card.type === 'verse' ? "#fff1c9" : "#ffe8b3",
                        }}>
                          {/* Bible reference for verse card */}
                          {card.type === 'verse' && card.reference && (
                            <Text className="text-brown/50 text-sm font-feather-bold mb-2">
                              {card.reference}
                            </Text>
                          )}
                          
                          {/* Card content with typing animation */}
                          <View>
                            {index === cardsToShow.length - 1 ? (
                              <TypingText
                                text={card.content}
                                className='text-brown/90 text-[17px] leading-[25px]'
                                baseTextStyle={{ color: '#795323', fontSize: 17, lineHeight: 25 }}
                                speed={20}
                                skipAnimation={skipTyping}
                                onComplete={handleTypingComplete}
                              />
                            ) : (
                              <Text className='text-brown/90 text-[17px] leading-[25px]'>
                                {card.content}
                              </Text>
                            )}
                          </View>
                        </View>
                      </Reanimated.View>
                    ))}

                    {/* Tap guidance or finish button */}
                    {currentIndex < totalCards - 1 ? (
                      <View style={{ alignItems: 'center', marginTop: 16 }}>
                        {showTapGuidance && (
                          <Text style={{
                            color: '#B89B4C',
                            fontFamily: 'DIN Next Rounded LT W01 Regular',
                            fontSize: 16,
                            opacity: 0.7,
                          }}>
                            {isTypingComplete ? 'Tap for next →' : 'Tap to show full text'}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          // Mark reading as completed
                          const setReadingCompleted = useHomeStore.getState().setReadingCompleted;
                          setReadingCompleted(true);
                          
                          // Log completion analytics
                          analytics.logEvent('DevotionalReader_Completed', {
                            bibleReference: currentDevotional?.bibleReference,
                            hasContext: !!currentDevotional?.context,
                            totalCards: totalCards,
                          });
                          
                          // Close the reader
                          if (onClose) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onClose();
                          }
                        }}
                        activeOpacity={0.8}>
                        <View style={{
                          backgroundColor: 'rgba(220, 178, 128, 0.2)',
                          paddingVertical: 12,
                          alignItems: 'center',
                          marginTop: 24,
                          borderRadius: 12,
                        }}>
                          <Text style={{
                            color: '#B89B4C',
                            fontFamily: 'Feather Bold',
                            fontSize: 16,
                          }}>
                            Finish Reading 🙏
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}

                    {/* Invisible spacer */}
                    <View style={{ height: 80 }} />
                  </View>
                </TouchableWithoutFeedback>
              </ScrollView>
            </View>
        </View>
      </SafeAreaView>
    </Reanimated.View>
  );
};

export default DevotionalReader;
