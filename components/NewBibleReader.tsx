import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, TouchableWithoutFeedback, SafeAreaView, StyleSheet, ScrollView } from 'react-native';
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

const FONT_SIZE_KEY = 'userNewBibleFontSize';
const DEFAULT_FONT_SIZE = 20;
const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 30;

const LINE_HEIGHT_KEY = 'userNewBibleLineHeight';
const LINE_HEIGHT_PRESETS = {
  COMPACT: 20,
  REGULAR: 24,
  RELAXED: 32,
} as const;
type LineHeightPreset = keyof typeof LINE_HEIGHT_PRESETS;

const TAP_GUIDANCE_KEY = 'userHideTapGuidance';

const THEME_COLORS = {
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
    verseNumberText: '#F7B500',
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
type ThemeType = keyof typeof THEME_COLORS;

interface NewBibleReaderProps {
  bookId: number;
  chapter: number;
  translation?: string;
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

const NewBibleReader: React.FC<NewBibleReaderProps> = ({ bookId, chapter, translation = 'ESV' }) => {
  const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipTyping, setSkipTyping] = useState(false);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showTapGuidance, setShowTapGuidance] = useState(true);
  const [tapCount, setTapCount] = useState(0);
  
  const progressValue = useSharedValue(0);
  const pathInProgress = usePathStore((s) => s.pathInProgress);
  const scrollViewRef = useRef<ScrollView>(null);

  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [lineHeightPreset, setLineHeightPreset] = useState<LineHeightPreset>('REGULAR');
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('light');
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const slideAnim = useRef(new RNAnimated.Value(0)).current;

  const theme = THEME_COLORS[currentTheme];
  const verseTextStyle = { fontSize: fontSize, lineHeight: LINE_HEIGHT_PRESETS[lineHeightPreset], color: theme.text };

  // Add state to track scrolling
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchChapter(translation, bookId, chapter);
      if ('error' in res) {
        console.error(res.message);
      } else {
        setChapterData(res);
      }
      setLoading(false);
      setIsTypingComplete(false);
      setSkipTyping(false);
      progressValue.value = withTiming(0, { duration: 0 });
    };
    load();
  }, [bookId, chapter, translation]);

  useEffect(() => {
    if (chapterData?.verses?.length) {
      const newProgress = (currentIndex + 1) / chapterData.verses.length;
      progressValue.value = withTiming(newProgress, { duration: 600 });
    }
  }, [currentIndex, chapterData, progressValue]);

  const scrollToBottom = useCallback(() => {
    // Small delay to ensure rendering is complete
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

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
      setCurrentIndex((i) => i + 1);
      setSkipTyping(false);
      setIsTypingComplete(false);
      // Schedule auto-scroll after the next verse is added
      setTimeout(scrollToBottom, 150);
    }
  }, [currentIndex, chapterData, isTypingComplete, scrollToBottom, showTapGuidance, tapCount, isScrolling]);

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
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            {!pathInProgress && chapterData ? (
              <Reanimated.View 
                className="items-center" 
                entering={FadeInDown.duration(800).delay(200)}
              >
                <View style={{backgroundColor: theme.progressBarBackground, borderRadius: 99, paddingHorizontal: 24, paddingVertical: 8}}>
                  <Text style={{color: theme.headerText, fontFamily: 'Feather Bold', fontSize: 24}}>
                    {chapterData.book} {chapterData.chapter}
                  </Text>
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
          
          <View style={{backgroundColor: theme.progressBarBackground, borderRadius: 99, height: 6, overflow: 'hidden', width: '100%'}}>
            <Reanimated.View 
              style={[{backgroundColor: theme.progressBarFill, borderRadius: 99, height: '100%'}, animatedProgressStyle]}
            />
          </View>
        </View>

        {/* Add a touchable layer beneath ScrollView */}
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFillObject}
          onPress={handleNextVerse}
        />

        <ScrollView 
          ref={scrollViewRef}
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          onScrollBeginDrag={() => setIsScrolling(true)}
          onScrollEndDrag={handleScroll}
          onMomentumScrollBegin={() => setIsScrolling(true)}
          onMomentumScrollEnd={handleScroll}
        >
          {versesToShow.map((v, index) => (
            <TouchableOpacity
              key={v.verse}
              activeOpacity={1}
              onPress={handleNextVerse}
            >
              <Reanimated.View entering={FadeInUp.duration(450).delay(index * 100)}>
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
                      <TouchableOpacity onPress={(e) => { e.stopPropagation(); }}><Feather name="copy" size={16} color={theme.iconColor} /></TouchableOpacity>
                      <TouchableOpacity onPress={(e) => { e.stopPropagation(); }}><Feather name="edit-2" size={16} color={theme.iconColor} className="mx-8"/></TouchableOpacity>
                      <TouchableOpacity onPress={(e) => { e.stopPropagation(); }}><Feather name="message-circle" size={16} color={theme.iconColor} /></TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Reanimated.View>
            </TouchableOpacity>
          ))}
           
          {currentIndex < chapterData.verses.length - 1 ? (
            <TouchableOpacity 
              className="items-center mt-4"
              onPress={handleNextVerse}
            >
              {showTapGuidance && (
                <Text style={{color: theme.headerText, fontFamily:'DIN Next Rounded LT W01 Regular', fontSize:16, opacity:0.7}}>
                  {isTypingComplete ? "Tap for next verse →" : "Tap to show full verse"}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{backgroundColor: theme.progressBarBackground, paddingVertical:12}} className="items-center mt-6 rounded-xl">
              <Text style={{color: theme.headerText, fontFamily:'Feather Bold', fontSize:16}}>
                End of Chapter 🎉
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
});

export default NewBibleReader;
