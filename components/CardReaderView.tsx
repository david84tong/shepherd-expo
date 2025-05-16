import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, TouchableWithoutFeedback, SafeAreaView, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { fetchChapter, Verse, ChapterResponse } from '~/app/api/bible';
import { usePathStore } from '~/app/stores/pathStore';
import { Feather } from '@expo/vector-icons';
import Reanimated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Animated as RNAnimated, Easing as RNEasing } from 'react-native';
import { BIBLE_CHAPTER_COUNTS, BIBLE_BOOK_IDS } from '~/app/models/Path';
import Toast from 'react-native-toast-message';
import Clipboard from '@react-native-clipboard/clipboard';

// Constants moved to separate file so they can be shared
export const FONT_SIZE_KEY = 'userNewBibleFontSize';
export const DEFAULT_FONT_SIZE = 20;
export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 30;

export const LINE_HEIGHT_KEY = 'userNewBibleLineHeight';
export const LINE_HEIGHT_PRESETS = {
  COMPACT: 20,
  REGULAR: 24,
  RELAXED: 32,
} as const;
export type LineHeightPreset = keyof typeof LINE_HEIGHT_PRESETS;

export const TAP_GUIDANCE_KEY = 'userHideTapGuidance';
export const READER_PREFERENCE_KEY = 'userDefaultReaderPreference';

export const THEME_COLORS = {
  white: {
    background: '#FFFFFF',
    modalBackground: '#FFFFFF',
    text: '#3C584A',
    border: '#E5E5E5',
    verseHighlight: 'rgba(220, 178, 128, 0.2)',
    sliderTrack: '#E5E5E5',
    bubbleBackground: '#FFFFFF',
    bubbleBorder: '#E0E0E0',
    verseNumberText: '#B89B4C',
    verseNumberBackground: 'rgba(220, 178, 128, 0.15)',
    iconColor: '#B89B4C',
    headerText: '#B89B4C',
    progressBarBackground: 'rgba(220, 178, 128, 0.2)',
    progressBarFill: '#DCB280',
  },
  light: { 
    background: '#FFF9E6',
    modalBackground: '#FFF4D9',
    text: '#4A3B25',
    border: '#FFE4A8',
    verseHighlight: 'rgba(220, 178, 128, 0.2)',
    sliderTrack: '#E5E5E5',
    bubbleBackground: '#FFF4D9',
    bubbleBorder: '#F7B500',
    verseNumberText: '#000000',
    verseNumberBackground: 'rgba(247, 181, 0, 0.15)',
    iconColor: '#D4A04C',
    headerText: '#F7B500',
    progressBarBackground: 'rgba(247, 181, 0, 0.2)',
    progressBarFill: '#F7B500',
  },
  dark: {
    background: '#2C2C2C',
    modalBackground: '#3C3C3C',
    text: '#E0E0E0',
    border: '#4A4A4A',
    verseHighlight: 'rgba(107, 107, 107, 0.34)',
    sliderTrack: '#5A5A5A',
    bubbleBackground: '#3A3A3A',
    bubbleBorder: '#5A5A5A',
    verseNumberText: '#B0B0B0',
    verseNumberBackground: 'rgba(107, 107, 107, 0.2)',
    iconColor: '#A0A0AF',
    headerText: '#B0B0B0',
    progressBarBackground: 'rgba(107, 107, 107, 0.2)',
    progressBarFill: '#8A8A8A',
  },
} as const;
export type ThemeType = keyof typeof THEME_COLORS;

interface CardReaderViewProps {
  bookId: number;
  chapter: number;
  translation?: string;
  onNavigateBackToDefaultReader?: () => void;
}

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
  skipAnimation = false
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

  return <Text style={baseTextStyle} className={className}>{displayedText}</Text>;
};

// Add toast config near the top of the file
const toastConfig = {
  success: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <View style={{ 
      backgroundColor: '#FFF4D9', 
      borderRadius: 12, 
      paddingVertical: 12, 
      paddingHorizontal: 16, 
      marginHorizontal: 16, 
      marginBottom: 16, 
      borderLeftWidth: 4, 
      borderLeftColor: '#F7B500',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    }}>
      <Text style={{ fontFamily: 'Feather Bold', fontSize: 16, color: '#3C584A' }}>{text1}</Text>
      {text2 && <Text style={{ fontFamily: 'DIN Next Rounded LT W01 Regular', fontSize: 14, color: '#7C927E', marginTop: 4 }}>{text2}</Text>}
    </View>
  ),
};

const CardReaderView: React.FC<CardReaderViewProps> = ({ 
  bookId, 
  chapter, 
  translation = 'ESV',
  onNavigateBackToDefaultReader 
}) => {
  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  const [showBackButton, setShowBackButton] = useState(false);
  const [previousChapterInfo, setPreviousChapterInfo] = useState<{bookId: number, chapter: number} | null>(null);
  
  const progressValue = useSharedValue(0);
  const pathInProgress = usePathStore((s) => s.pathInProgress);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reference for the header container
  const headerContainerRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Add state to track scrolling
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [lineHeightPreset, setLineHeightPreset] = useState<LineHeightPreset>('REGULAR');
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('light');
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const slideAnim = useRef(new RNAnimated.Value(0)).current;

  const theme = THEME_COLORS[currentTheme];
  const verseTextStyle = { fontSize: fontSize, lineHeight: LINE_HEIGHT_PRESETS[lineHeightPreset], color: theme.text };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSize = await AsyncStorage.getItem(FONT_SIZE_KEY);
        if (savedSize !== null) setFontSize(parseInt(savedSize, 10));

        const savedLineHeightValue = await AsyncStorage.getItem(LINE_HEIGHT_KEY);
        if (savedLineHeightValue !== null) {
            const preset = Object.keys(LINE_HEIGHT_PRESETS).find(
                key => LINE_HEIGHT_PRESETS[key as LineHeightPreset] === parseInt(savedLineHeightValue)
            ) as LineHeightPreset | undefined;
            if (preset) setLineHeightPreset(preset);
        }
        
        // Load tap guidance preference
        const hideTapGuidance = await AsyncStorage.getItem(TAP_GUIDANCE_KEY);
        if (hideTapGuidance === 'true') {
          setShowTapGuidance(false);
        }
      } catch (e) {
        console.error("Failed to load settings from AsyncStorage", e);
      }
    };
    loadSettings();
  }, []);

  // Helper function to load a chapter
  const loadChapter = useCallback(async (bookId: number, chapter: number) => {
    setLoading(true);
    setCurrentIndex(0); // Reset to first verse when loading a new chapter
    setIsTypingComplete(false);
    setSkipTyping(false);
    progressValue.value = withTiming(0, { duration: 0 });
    
    try {
      const res = await fetchChapter(translation, bookId, chapter);
      if ('error' in res) {
        console.error(res.message);
        setLoading(false);
        return false;
      } else {
        setChapterData(res);
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
      setLoading(false);
      return false;
    }
  }, [translation, progressValue]);

  // Function to navigate to the next chapter
  const navigateToNextChapter = useCallback(() => {
    // Add haptic feedback for navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Store current chapter info for back button
    setPreviousChapterInfo({ bookId, chapter });
    setShowBackButton(true);
    
    const chaptersInCurrentBook = BIBLE_CHAPTER_COUNTS[bookId];
    
    if (chapter >= chaptersInCurrentBook) {
      // At the last chapter of current book, go to next book
      const nextBookId = bookId + 1;
      
      if (nextBookId <= 66) { // 66 books in the Bible
        const nextBookName = BIBLE_BOOK_IDS[nextBookId] || 'Next Book';
        console.log(`End of ${chapterData?.book} reached. Navigating to ${nextBookName} 1`);
        loadChapter(nextBookId, 1);
      } else {
        // Reached the end of the Bible
        console.log('Reached the end of the Bible');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("End of the Bible", "You've reached Revelation 22, the last chapter of the Bible.");
      }
    } else {
      // Go to next chapter in current book
      loadChapter(bookId, chapter + 1);
    }
  }, [bookId, chapter, chapterData, loadChapter]);

  // Function to navigate back to the previous chapter
  const navigateToPreviousChapter = useCallback(() => {
    if (!previousChapterInfo) return;
    
    // Add haptic feedback for navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const { bookId: prevBookId, chapter: prevChapter } = previousChapterInfo;
    
    // Load the previous chapter
    loadChapter(prevBookId, prevChapter).then(success => {
      if (success && chapterData) {
        // Show all verses at once when returning to previous chapter
        setTimeout(() => {
          setCurrentIndex(chapterData.verses.length - 1);
          setIsTypingComplete(true);
          setShowBackButton(false);
          setPreviousChapterInfo(null);
        }, 300); // Small delay to ensure chapter data is loaded
      }
    });
  }, [previousChapterInfo, loadChapter, chapterData]);

  useEffect(() => {
    // Reset back button state when chapter props change directly
    setShowBackButton(false);
    setPreviousChapterInfo(null);
    
    // Initial chapter load
    loadChapter(bookId, chapter);
  }, [bookId, chapter, loadChapter]);

  useEffect(() => {
    if (chapterData?.verses?.length) {
      const newProgress = (currentIndex + 1) / chapterData.verses.length;
      progressValue.value = withTiming(newProgress, { duration: 600 });
    }
  }, [currentIndex, chapterData, progressValue]);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    
    // Clear any existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
    
    // Set a timeout to mark scrolling as finished after 300ms of no scroll events
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 300);
  }, []);

  const scrollToBottom = useCallback(() => {
    // Small delay to ensure rendering is complete
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleNextVerse = useCallback(() => {
    if (!chapterData || isScrolling) return;
    
    // Trigger haptic feedback for every tap
    Haptics.selectionAsync();
    
    // Track tap count and hide guidance after 2 taps
    if (showTapGuidance) {
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);
      
      if (newTapCount >= 2) {
        setShowTapGuidance(false);
        // Save preference to AsyncStorage
        AsyncStorage.setItem(TAP_GUIDANCE_KEY, 'true').catch(e => 
          console.error("Failed to save tap guidance setting", e)
        );
      }
    }
    
    if (!isTypingComplete) {
      setSkipTyping(true); 
      return;
    }
    
    if (currentIndex < chapterData.verses.length - 1) {
      // Still have verses to show in current chapter
      setCurrentIndex((i) => i + 1);
      setSkipTyping(false);
      setIsTypingComplete(false);
      // Schedule auto-scroll after the next verse is added
      setTimeout(scrollToBottom, 150);
    } else {
      // Reached the end of the chapter, navigate to next chapter
      navigateToNextChapter();
    }
  }, [currentIndex, chapterData, isTypingComplete, scrollToBottom, showTapGuidance, tapCount, isScrolling, navigateToNextChapter]);

  const handleTypingComplete = useCallback(() => {
    setIsTypingComplete(true);
  }, []);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return { width: `${progressValue.value * 100}%` };
  });

  const handlePresentSettingsModal = useCallback(() => {
    setIsSettingsModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    RNAnimated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: RNEasing.out(RNEasing.cubic),
    }).start();
  }, [slideAnim]);

  const handleCloseSettingsModal = useCallback(() => {
    RNAnimated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: RNEasing.in(RNEasing.cubic),
    }).start(() => {
      setIsSettingsModalVisible(false);
    });
  }, [slideAnim]);

  const updateFontSize = async (newSize: number) => {
    if (newSize >= MIN_FONT_SIZE && newSize <= MAX_FONT_SIZE) {
      setFontSize(newSize);
      try {
        await AsyncStorage.setItem(FONT_SIZE_KEY, newSize.toString());
      } catch (e) { console.error("Failed to save font size", e); }
    }
  };
  
  const handleFontSizeChange = useCallback((value: number) => {
    updateFontSize(Math.round(value));
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    setCurrentTheme(newTheme);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLineHeightChange = useCallback(async (preset: LineHeightPreset) => {
    setLineHeightPreset(preset);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await AsyncStorage.setItem(LINE_HEIGHT_KEY, LINE_HEIGHT_PRESETS[preset].toString());
    } catch (e) { console.error("Failed to save line height", e); }
  }, []);

  const handleDefaultReaderToggle = useCallback(() => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Close modal and call back to parent to switch to default reader
    handleCloseSettingsModal();
    setTimeout(() => {
      if (onNavigateBackToDefaultReader) {
        onNavigateBackToDefaultReader();
      }
    }, 300);
  }, [handleCloseSettingsModal, onNavigateBackToDefaultReader]);

  // New function to handle book/chapter selection
  const handleOpenSelector = useCallback(() => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Alert for now, in a real app you would connect this to a book/chapter selector
    Alert.alert(
      "Book and Chapter Selection",
      `Currently viewing ${chapterData?.book} ${chapterData?.chapter}`,
      [
        { text: "Close", style: "cancel" }
      ]
    );
  }, [chapterData]);

  // Handle copy verse functionality
  const handleCopyVerse = useCallback((verse: Verse) => {
    if (!chapterData) return;
    
    const verseText = `${chapterData.book} ${chapterData.chapter}:${verse.verse} - ${verse.text}`;
    
    // Use the correct Clipboard method
    Clipboard.setString(verseText);
    
    // Show toast notification
    Toast.show({
      type: 'success',
      text1: 'Verse copied',
      text2: 'Verse has been copied to clipboard',
      position: 'top',
      visibilityTime: 3000,
    });
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [chapterData]);

  if (loading || !chapterData) {
    return (
      <SafeAreaView style={{backgroundColor: theme.background, flex:1}} className="items-center justify-center">
        <ActivityIndicator size="large" color={theme.progressBarFill} />
      </SafeAreaView>
    );
  }

  const versesToShow: Verse[] = chapterData.verses.slice(0, currentIndex + 1);

  return (
    <SafeAreaView style={{backgroundColor: theme.background, flex:1}}>
      {/* Absolute background to cover outer safe areas */}
      <View style={{...StyleSheet.absoluteFillObject, backgroundColor: theme.background}} pointerEvents="none" />

      <View style={{flex:1, paddingBottom: 24, paddingHorizontal:16, paddingTop:16}}>
        <View 
          ref={headerContainerRef}
          className="mb-6"
        >
          <View className="flex-row items-center justify-between mb-3">
              {!pathInProgress && chapterData ? (
              <Reanimated.View 
                  className="flex-row items-center" 
                  entering={FadeInDown.duration(800).delay(200)}
              >
                <View style={styles.headerLeft}>
                  <TouchableOpacity style={styles.headerButton} onPress={handleOpenSelector}>
                    <Text style={[styles.headerButtonText, { color: THEME_COLORS[currentTheme].text }]}>
                      {chapterData ? `${chapterData.book} ${chapterData.chapter}` : 'Loading...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Reanimated.View>
              ) : <View />} 
              <TouchableOpacity 
                onPress={handlePresentSettingsModal} 
                className="p-2"
              >
                  <Feather name="settings" size={24} color={theme.iconColor} />
              </TouchableOpacity>
          </View>
          
          <View style={{backgroundColor: theme.progressBarBackground, borderRadius: 99, height: 10, overflow: 'hidden', width: '100%'}}>
            <Reanimated.View 
              style={[{backgroundColor: theme.progressBarFill, borderRadius: 99, height: '100%'}, animatedProgressStyle]}
            />
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onScrollEndDrag={handleScroll}
          onMomentumScrollBegin={() => setIsScrolling(true)}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          bounces={true}
        >
          {/* Add a touchable wrapper that covers the whole scroll area */}
          <TouchableWithoutFeedback onPress={handleNextVerse}>
            <View style={{ minHeight: '100%' }}>
              {versesToShow.map((v, index) => (
                <View key={v.verse}>
                  <Reanimated.View entering={FadeInUp.duration(300).delay(index * 60)}>
                    <View style={{backgroundColor: theme.bubbleBackground, borderColor: theme.bubbleBorder}} className="border-2 mt-4 p-4 rounded-2xl shadow-sm">
                      {index === currentIndex ? (
                        <TypingText
                          text={v.text}
                          baseTextStyle={{...verseTextStyle, fontFamily: 'DIN Next Rounded LT W01 Regular', marginBottom: 12}}
                          speed={20}
                          skipAnimation={skipTyping}
                          onComplete={handleTypingComplete}
                        />
                      ) : (
                        <Text style={{...verseTextStyle, fontFamily: 'DIN Next Rounded LT W01 Regular', marginBottom: 12}}>
                          {v.text}
                        </Text>
                      )}
                      
                      <View style={{borderTopColor: theme.bubbleBorder, opacity: 0.3}} className="flex-row items-center justify-between mt-0 pt-2">
                        <View style={{backgroundColor: theme.verseNumberBackground, height: 32, width: 32}} className="items-center justify-center rounded-full">
                          <Text style={{color: theme.verseNumberText, fontFamily: 'Feather Bold', fontSize:14}}>{v.verse}</Text>
                        </View>
                        <View className="flex-row space-x-5">
                          <TouchableOpacity 
                            onPress={(e) => { 
                              e.stopPropagation(); 
                              handleCopyVerse(v);
                            }}>
                            <Feather name="copy" size={16} color={theme.iconColor} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={(e) => { e.stopPropagation(); }}>
                            <Feather name="edit-2" size={16} color={theme.iconColor} className="mx-8"/>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={(e) => { e.stopPropagation(); }}>
                            <Feather name="message-circle" size={16} color={theme.iconColor} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Reanimated.View>
                </View>
              ))}
               
              {currentIndex < chapterData.verses.length - 1 ? (
                <View className="items-center mt-4">
                  {showTapGuidance && (
                    <Text style={{color: theme.headerText, fontFamily:'DIN Next Rounded LT W01 Regular', fontSize:16, opacity:0.7}}>
                      {isTypingComplete ? "Tap for next verse →" : "Tap to show full verse"}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{backgroundColor: theme.progressBarBackground, paddingVertical:12}} className="items-center mt-6 rounded-xl">
                  <Text style={{color: theme.headerText, fontFamily:'Feather Bold', fontSize:16}}>
                    End of Chapter 🎉
                  </Text>
                </View>
              )}
              
              {/* Add invisible spacer to ensure touchable area extends to bottom padding */}
              <View style={{ height: 80 }} />
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>

      {/* Back button at bottom of screen */}
      {showBackButton && (
        <Reanimated.View
          entering={FadeInUp.duration(300)}
          style={[styles.backButton, { backgroundColor: theme.progressBarBackground }]}
        >
          <TouchableOpacity
            onPress={navigateToPreviousChapter}
            accessibilityLabel="Go back to previous chapter"
          >
            <View className="flex-row items-center">
              <Feather name="chevron-left" size={24} color={theme.iconColor} />
              <Text style={{color: theme.headerText, fontFamily: 'Feather Bold', marginLeft: 4}}>
                Previous Chapter
              </Text>
            </View>
          </TouchableOpacity>
        </Reanimated.View>
      )}

      <Modal
          visible={isSettingsModalVisible}
          transparent
          animationType="none"
          onRequestClose={handleCloseSettingsModal}
      >
          <TouchableWithoutFeedback onPress={handleCloseSettingsModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <RNAnimated.View
                  style={[
                    styles.modalContent,
                    {
                      backgroundColor: theme.modalBackground,
                      transform: [{
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [400, 0], 
                        }),
                      }],
                    },
                  ]}
                >
                  <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                  
                  {/* Default Reader Toggle */}
                  <View style={styles.toggleContainer}>
                    <Text style={[styles.toggleLabel, {color: theme.text}]}>Default Reader</Text>
                    <Switch
                      trackColor={{ false: "#E0E0E0", true: "#F7B500" }}
                      thumbColor={"#FFFFFF"}
                      ios_backgroundColor="#E0E0E0"
                      onValueChange={handleDefaultReaderToggle}
                      value={false}
                    />
                  </View>

                  <Text style={[styles.modalSectionTitle, {color: theme.text}]}>Font Size</Text>
                  <View style={styles.sliderContainer}>
                    <Text style={[styles.sliderLabel, { color: theme.text }]}>A</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={MIN_FONT_SIZE}
                      maximumValue={MAX_FONT_SIZE}
                      value={fontSize}
                      onValueChange={handleFontSizeChange}
                      minimumTrackTintColor={theme.progressBarFill} 
                      maximumTrackTintColor={theme.sliderTrack}
                      thumbTintColor={theme.progressBarFill} 
                    />
                    <Text style={[styles.sliderLabelLarge, { color: theme.text }]}>A</Text>
                  </View>

                  <Text style={[styles.modalSectionTitle, {color: theme.text, marginTop: 16}]}>Line Spacing</Text>
                  <View style={styles.lineHeightButtons}>
                    {(Object.keys(LINE_HEIGHT_PRESETS) as LineHeightPreset[]).map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.lineHeightButton,
                          { borderColor: theme.border, backgroundColor: lineHeightPreset === preset ? theme.progressBarFill : 'transparent' },
                        ]}
                        onPress={() => handleLineHeightChange(preset)}
                      >
                        <Text style={[
                          styles.lineHeightButtonText,
                          { color: lineHeightPreset === preset ? (currentTheme === 'dark' ? theme.modalBackground : theme.bubbleBackground) : theme.text },
                        ]}>{preset.charAt(0).toUpperCase() + preset.slice(1).toLowerCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.modalSectionTitle, {color: theme.text, marginTop: 24}]}>Theme</Text>
                  <View style={styles.themeButtonsContainer}>
                    {(Object.keys(THEME_COLORS) as ThemeType[]).map((themeKey) => (
                      <TouchableOpacity
                        key={themeKey}
                        style={[
                          styles.themeButton,
                          { backgroundColor: THEME_COLORS[themeKey].bubbleBackground, borderColor: THEME_COLORS[themeKey].bubbleBorder },
                          currentTheme === themeKey && styles.selectedThemeButton,
                          currentTheme === themeKey && { borderColor: THEME_COLORS[themeKey].progressBarFill }
                        ]}
                        onPress={() => handleThemeChange(themeKey)}
                      />
                    ))}
                  </View>
                </RNAnimated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

      {/* Register toast at the end of the SafeAreaView */}
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  backButton: {
    backgroundColor: 'rgba(247, 181, 0, 0.2)',
    borderRadius: 50,
    bottom: 30,
    elevation: 5,
    left: 20,
    padding: 16,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerButton: {
    backgroundColor: 'rgba(220, 178, 128, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  headerButtonText: {
    color: '#3C584A',
    fontFamily: 'Feather Bold',
    fontSize: 16,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  lineHeightButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  lineHeightButtonText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
  },
  lineHeightButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
  },
  modalContent: {
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40, 
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
  },
  modalHandle: {
    borderRadius: 2,
    height: 4,
    marginBottom: 20,
    width: 40,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSectionTitle: {
    alignSelf: 'flex-start',
    fontFamily: 'Feather Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  selectedThemeButton: {
    borderWidth: 3,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
    width: '100%',
  },
  sliderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 50, 
    width: '100%',
  },
  sliderLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    textAlign: 'center',
    width: 20,
  },
  sliderLabelLarge: {
    fontFamily: 'Inter-Medium',
    fontSize: 20,
    textAlign: 'center',
    width: 20,
  },
  themeButton: {
    borderRadius: 25,
    borderWidth: 2,
    height: 50,
    width: 50,
  },
  themeButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    width: '100%',
  },
  toggleContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 181, 0, 0.1)',
    borderColor: '#F7B500',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 12,
    width: '100%',
  },
  toggleLabel: {
    fontFamily: 'Feather Bold',
    fontSize: 16,
  },
});

export default CardReaderView; 