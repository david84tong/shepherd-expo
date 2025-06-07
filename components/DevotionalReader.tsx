import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
  const { currentDevotional, isLoading } = useDevotionalStore();
  const devotionalError = useDevotionalStore().error;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [contextSentences, setContextSentences] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(16);

  // Animation values
  const progressValue = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Split context into sentences when devotional loads
  useEffect(() => {
    console.log('🔄 Processing context for devotional:', currentDevotional?.id);
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
        contentContainerStyle={{ paddingBottom: 160 }}
        scrollEventThrottle={16}>
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
                      entering={FadeInUp.duration(300).delay(index * 60)}
                      layout={Layout.springify()}
                      style={{ marginBottom: 12 }}>
                      <View className="bg-surfaceCreamLight" style={{
                        padding: 14,
                        borderRadius: 12,
                        backgroundColor: card.type === 'verse' ? "#fff1c9" : "#ffe8b3",
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
                        
                        {/* Card content with typing animation */}
                        <View>
                          {index === cardsToShow.length - 1 ? (
                            <TypingText
                              text={card.content}
                              className='text-brown/90'
                              baseTextStyle={{ color: '#795323', fontSize: fontSize, lineHeight: fontSize * 1.5, fontFamily: 'DIN Next Rounded LT W01 Regular' }}
                              speed={20}
                              skipAnimation={skipTyping}
                              onComplete={handleTypingComplete}
                            />
                          ) : (
                            <Text 
                              className='text-brown/90 font-din'
                              style={{ fontSize: fontSize, lineHeight: fontSize * 1.5 }}
                            >
                              {card.content}
                            </Text>
                          )}
                        </View>
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
                  
                  // Show tab bar again
                  const setDevotionalReaderVisible = useHomeStore.getState().setDevotionalReaderVisible;
                  setDevotionalReaderVisible(false);
                  
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
                  backgroundColor: '#DCB280',
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
                    Finish Reading 🙏
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
};

export default DevotionalReader;
