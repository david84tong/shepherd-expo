// /Users/mac/Documents/projects/shepherd-expo/app/(tabs)/index.tsx

import {
  View,
  Text,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, SCREEN_HEIGHT } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { useAssets } from 'expo-asset';
import { useHomeScreen } from '../hooks/useHomeScreen';
import { useHomeStore } from '../stores/homeStore';
import DevotionalReader from '../../components/DevotionalReader';
import ProgressPill from '../../components/ProgressPill';
import SecondaryButton from '../../components/SecondaryButton';
import HeartsExplainerModal from '../../components/HeartsExplainerModal';
import ExplainerModal from '../../components/ExplainerModal';
import WidgetHowToSheet from '../../components/WidgetHowToSheet';
import bibleIcon from '../../assets/icons/bibleIcon.png';
import FullScreenShareCard from '../../components/FullScreenShareCard';
import SpotlightOverlay from '../../components/SpotlightOverlay';
// import PrayerView from '~/components/PrayerView';
import PrayerView from '~/components/WaterPrayerView';
import JournalComponent from '~/components/JournalComponent';
import DailyVerseCard from '~/components/Shared/DailyVerseCard';
import CustomToast from '../components/Shared/CustomToast';
import { imageAssets, useAssetsStore } from '../stores/assetsStore';
import { useDevotionalStore } from '../stores/devotionalStore';
import { usePathStore } from '../stores/pathStore';
import { useUserStore } from '../stores/userStore';
import { useMemo, useState, useEffect } from 'react';
import { IS_ANDROID, IS_IOS } from '../utils/utils';
import Rive from 'rive-react-native';
import * as Haptics from 'expo-haptics';
import { responsiveHeight } from 'react-native-responsive-dimensions';
import { RPH } from '../helper/helper';
import analytics from '~/utils/analytics';
import BottomControls from '../components/BottomControls';
import i18n from '../utils/i18n';
import { useLanguageStore } from '../stores/languageStore';
import { AppFonts } from '../constants/appFonts';
import React from 'react';
import { hapticLight } from '~/utils/haptics';
import OnboardingPathScreen from '../onboarding/8';
import { Feather } from '@expo/vector-icons';

// Custom toast config with explicit styling
const toastConfig = CustomToast;

// Image assets
const pathBg = imageAssets[2];
const journalBg = imageAssets[3];
const breadIcon = imageAssets[4];
const dropIcon = imageAssets[5];
const flameIcon = imageAssets[7];
const gemIcon = imageAssets[8];
const heartIcon = imageAssets[9];
const starIcon = imageAssets[10];

console.log('📄 HomeScreen file loaded at:', new Date().toISOString());

export default function HomeScreen() {
  console.log('🏠 HomeScreen function called at:', new Date().toISOString());

  // Direct function call to test
  React.useEffect(() => {
    console.log('🔥 INLINE EFFECT RUNNING!');
  }, []);

  // Add a state to ensure component is mounted
  const [isMounted, setIsMounted] = useState(false);
  console.log('📍 State initialized');

  // Test effect to verify component is mounting
  useEffect(() => {
    const timestamp = new Date().toISOString();
    console.log(`🎉 [${timestamp}] HomeScreen component mounted!`);
    setIsMounted(true);
    
    try {
    // Initialize next unit preview based on current completion state
    const initializeNextUnit = usePathStore.getState().initializeNextUnitPreview;
    initializeNextUnit();
    } catch (error) {
      console.error('❌ Error initializing next unit preview:', error);
    }

    return () => {
      console.log(`👋 [${timestamp}] HomeScreen component unmounting`);
    };
  }, []);

  console.log('📍 First useEffect registered');

  // Separate effect for fetching devotional - runs when component is mounted
  useEffect(() => {
    console.log("isMounted ==>", isMounted);
    // if (!isMounted) return;

    const timestamp = new Date().toISOString();
    console.log(`🎯 [${timestamp}] Component is mounted, attempting to fetch devotional...`);
    
    try {
    const fetchDevotional = useDevotionalStore.getState().fetchTodaysDevotional;
    if (fetchDevotional) {
        console.log(`✅ [${timestamp}] fetchTodaysDevotional function found!`);
      fetchDevotional()
        .then(() => {
            const devotionalStore = useDevotionalStore.getState();
            const data = devotionalStore.currentDevotional;
            console.log(`📖 [${timestamp}] Devotional fetched successfully:`, data?.id, data?.bibleReference);
        })
        .catch((error: any) => {
            console.error(`❌ [${timestamp}] Error fetching devotional:`, error);
        });
    } else {
        console.log(`❌ [${timestamp}] fetchTodaysDevotional function not found!`);
      }
    } catch (error) {
      console.error('❌ Error in devotional useEffect:', error);
    }
  }, []);

  console.log('📍 Second useEffect registered');

  // Local state for prayer success screen visibility
  const [showPrayerSuccess, setShowPrayerSuccess] = useState(false);

  console.log('📍 About to call useHomeScreen hook');

  const {
    // State
    riveError,
    devotionalReadedFully,
    isCompletePrayerDisabled,
    showControlRow,
    isControlRowVisible,
    finishReading,
    showPrayerContent,
    currentStateInput,
    showBgRive,
    devotionalData,
    riveReady,
    isFirstLoad,
    showWidgetSheet,
    isLevelPillExpanded,
    showHeartsModal,
    showExplainerModal,
    showJournalContent,
    showShareCard,
    isDarkContant,

    // Store values
    mode,
    devotionalReaderVisible,
    readingCompleted,
    prayerCompleted,
    reflectionCompleted,
    lambHearts,
    streakCount,
    gens,
    lambName,
    currentDevotional,
    dailyDevotional,
    isLoadingDevotional,
    devotionalError,
    isPro,
    nextUnitPreview,

    // Refs
    devotionalReaderRef,
    prayerViewRef,
    journalRef,
    bottomSheetRef,
    riveRef,

    // Animation refs and values
    lambSizeAnim,
    headerDefaultOpacityAnim,
    pathOpacityAnim,
    waterOpacityAnim,
    journalOpacityAnim,
    lambOpacityAnim,
    lambChangeOpacityAnim,
    riveArtboardOpacityAnim,
    riveScaleAnim,
    riveRotateAnim,
    devotionalCardOpacityAnim,
    devotionalHeaderOpacityAnim,
    devotionaleRadingOpacityAnim,
    levelPillWidthAnim,
    androidBgOpacityAnim,
    firstLoadOpacity,
    bottomContentOpacity,
    bottomContentAnimY,
    controlRowOpacity,
    lambTranslateX,
    lambTranslateY,
    showGlow,
    levelInfo,
    buttonTitle,
    showDevotionalContent,

    // Handlers
    handleDevotionalFinishPress,
    handleDevotionalClose,
    handlePrayerPress,
    handleReadPress,
    handleReflectionPress,
    handleSheetChanges,
    handleShare,
    onCloseJournal,
    onClosePrayer,
    onSuperBadgePress,
    onLevelPress,
    onGemsPress,
    handleWidgetSheetClose,
    handleNextUnitPress,
    onStreakPress,
    setShowShareCard,
    setFinishReading,
    setDevotionalReadedFully,
    setCurrentVerseReference,
    setIsCompletePrayerDisabled,
    setJournalButtonEnabled,
    setShowControlRow,
    setShowHeartsModal,
    setShowExplainerModal,
    setShowJournalContent,
    // Other values
    snapPoints,
    BASE_LAMB_SIZE,
    handleRiveAnimationError,
    riveKey,
    riveSkinInitialized,
    handleRivePlay,
    MAX_HEARTS
  } = useHomeScreen();

  console.log('📍 useHomeScreen hook called successfully');

  const [startShareFlow, setStartShareFlow] = useState(false);

  console.log('📍 All local state initialized');

  // Add state for path selection modal
  const [showPathModal, setShowPathModal] = useState(false);

  // Debug effect to track nextUnitPreview changes
  useEffect(() => {
    console.log('🔍 NextUnitPreview debug:', {
      hasNextUnit: !!nextUnitPreview,
      unitId: nextUnitPreview?.id,
      unitTitle: nextUnitPreview?.title,
      readingCompleted,
      prayerCompleted,
      reflectionCompleted
    });
  }, [nextUnitPreview, readingCompleted, prayerCompleted, reflectionCompleted]);

  // Check if there are 2 readings from today
  const getCompletedReadings = useUserStore((state) => state.getCompletedReadings);
  const todaysReadingsCount = useMemo(() => {
    const readings = getCompletedReadings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysReadings = readings.filter(reading => {
      const readingDate = reading.date.toDate();
      readingDate.setHours(0, 0, 0, 0);
      return readingDate.getTime() === today.getTime();
    });

    return todaysReadings.length;
  }, [getCompletedReadings]);

  // Determine if next unit button should be marked as completed
  const isNextUnitCompleted = todaysReadingsCount >= 2;

  // Determine subtitle text based on total readings count
  const totalReadingsCount = getCompletedReadings().length;
  const nextUnitSubtitle = totalReadingsCount >= 4 ? i18n.t('continue_reading_plan') : i18n.t('start_bible_reading_plan');

  // Handler for path selection
  const handlePathSelected = (pathObj: any) => {
    if (!pathObj) return;
    // Update pathStore
    if (typeof pathObj === 'object' && pathObj.id) {
      usePathStore.getState().setSelectedPath(pathObj);
      // Update userStore as well
      useUserStore.getState().setUser({ selectedPathId: pathObj.id });
    }
    setShowPathModal(false);
  };

  // Get current path from pathStore
  const currentPath = usePathStore((state) => state.currentPath);

  // Load Rive assets
  const [riveAssets] = useAssets([
    require('../../assets/riveAnimations/new_shepherd.riv'),
    require('../../assets/riveAnimations/bg-green.riv'),
  ]);

  // Add state for asset loading
  const assetsLoaded = useAssetsStore((s) => s.loaded);
  const assets = useAssetsStore((s) => s.assets);

  // Subscribe to language changes
  const currentLanguage = useLanguageStore((state) => state.language);
  useEffect(() => {
    i18n.locale = currentLanguage;
  }, [currentLanguage]);
  

  // Set bottomSheetRef in home store so other components can access it
  useEffect(() => {
    const setBottomSheetRef = useHomeStore.getState().setBottomSheetRef;
    setBottomSheetRef(bottomSheetRef);
  }, [bottomSheetRef]);

  // Define riveComponent after state declarations so it can access showJournalContent and showPrayerContent
  const riveComponent = useMemo(() => {
    if (!riveAssets || !riveReady) return null;

    // Always use the main lamb asset (index 0)
    const lambAssetIndex = 0;
    const useArtboardName = '[Main] Shpeherd';

    return (
      <View
        style={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: riveSkinInitialized ? 1 : 0, // Hide until skin is initialized

        }}>
        <TouchableOpacity
          onPress={() => {
            hapticLight()
            analytics.logEvent('HomeScreen_Tapped_LambName');
          }}
          activeOpacity={0.7}
          style={{
            top: levelInfo.level < 10 ? RPH(7) : RPH(4.5)
          }}
          className={`bg-surfaceCream/80 rounded-full items-center justify-center flex-row h-6 px-2 -mt-2`}>
          <Text className="font-feather text-textPrimary text-xs">
            {lambName
              ? `${lambName.charAt(0).toUpperCase()}${lambName.slice(1).toLowerCase().slice(0, 8)}${lambName.length > 9 ? '...' : ''}`
              : ''}
          </Text>
        </TouchableOpacity>
        <View
          style={{
            width: '100%',
            height: RPH(27),
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}>
          {IS_ANDROID ? (
            <Rive
              key={riveKey}
              ref={riveRef}
              resourceName="new_shepherd"
              artboardName={useArtboardName}
              stateMachineName="State Machine 1"
              autoplay
              onError={handleRiveAnimationError}
              onPlay={handleRivePlay}
              style={{
                width: RPH(30),
                height: RPH(30),
                opacity: new Date().getHours() >= 19 ? 0.85 : 1,
              }}
            />
          ) : (
            <Rive
              key={riveKey}
              ref={riveRef}
              url={riveAssets[lambAssetIndex].uri!}
              artboardName={useArtboardName}
              onPlay={handleRivePlay}
              stateMachineName="State Machine 1"
              autoplay
              onError={handleRiveAnimationError}
              style={{
                width: RPH(30),
                height: RPH(30),
                opacity: new Date().getHours() >= 19 ? 0.85 : 1,
              }}
            />
          )}
        </View>
      </View>
    );
  }, [riveAssets, currentStateInput, riveKey, riveReady, isPro, lambName, isLevelPillExpanded, riveSkinInitialized]);

  // Gate of rendering: only render the screen if the assets are ready
  console.log('🚪 Asset loading check:', { assetsLoaded, hasAssets: !!assets });
  if (!assetsLoaded || !assets) {
    console.log('❌ Returning null - assets not ready!');
    return null;
  }

  // Pre-calculate the expanded width for the pill (use a reasonable fixed width instead of screen-based)
  const pillExpandedWidth = 350;

  const handleDailyVerseShare = () => {
    setStartShareFlow(true);
    setShowShareCard(true);
  };

  const handleDailyVersePress = () => {
    setStartShareFlow(false); // Ensure share flow is off when opening via card press
    setShowShareCard(true);
  };

  const handleDailyVerseExpand = () => {
    setStartShareFlow(false); // Ensure share flow is off when opening via expand
    setShowShareCard(true);
  };

  const handleFullScreenShareClose = () => {
    setShowShareCard(false);
    setStartShareFlow(false);
  };

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDarkContant ? 'light-content' : 'dark-content'}
      />
      <View className='flex-1 bg-[#FDEBB8]'>
        <Animated.View className="flex-1" style={{ opacity: isFirstLoad ? firstLoadOpacity : 1 }}>
          {/* Background Layers */}
          <Animated.View
            style={[
              { position: 'absolute', width: '100%', height: '100%', top: -100 },
              { opacity: showDevotionalContent ? 1 : 1 },
            ]}>
            <ImageBackground
              source={require('../../assets/backgrounds/mainBackground2.png')}
              style={{ width: '100%', height: '100%' }}>
              <Image
                source={require('../../assets/backgrounds/mainBackground2.png')}
                style={{ width: '100%', height: '100%' }}
              />
            </ImageBackground>
          </Animated.View>

          {(showDevotionalContent || showPrayerContent || showJournalContent) && !finishReading && (
            <Animated.View
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                opacity: devotionaleRadingOpacityAnim,
              }}
              pointerEvents="none"
            >
              <SpotlightOverlay visible={true} radius={150} centerY={SCREEN_HEIGHT * 0.25} />
            </Animated.View>
          )}

          <Animated.View
            style={[
              { position: 'absolute', width: '100%', height: '100%' },
              { opacity: pathOpacityAnim },
            ]}>
            <Image source={pathBg} style={{ width: '100%', height: '100%' }} />
          </Animated.View>

          <Animated.View
            style={[
              { position: 'absolute', width: '100%', height: '100%' },
              { opacity: journalOpacityAnim },
            ]}>
            <Image source={journalBg} style={{ width: '100%', height: '100%' }} />
          </Animated.View>

          {/* Prayer background Rive animation */}
          <Animated.View
            style={[
              { position: 'absolute', width: '100%', height: '100%', zIndex: 0 },
              { opacity: IS_IOS ? waterOpacityAnim : androidBgOpacityAnim },
            ]}>
            {IS_IOS ? (
              showBgRive &&
              riveAssets && (
                <Rive
                  url={riveAssets[1].uri!}
                  autoplay={true}
                  style={{ width: '160%', height: '160%', top: -300, left: -128 }}
                />
              )
            ) : (
              <Image
                source={require('../../assets/backgrounds/Forest Clearing Background Apr 18 2025.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            )}
          </Animated.View>

          <SafeAreaView className="flex-1">
            {/* Header */}
            <View
              className="flex-row justify-between items-center px-4 pt-1.5 pb-2 h-[42px] relative"
              style={{ zIndex: 9999, marginTop: Platform.OS === 'android' ? 25 : 0 }}>
              <Animated.View
                className="inset-0 flex-row items-center justify-between w-full"
                style={{ opacity: headerDefaultOpacityAnim }}
                pointerEvents={mode !== 'DEFAULT' ? 'none' : 'auto'}>
                <View className="flex-row items-center px-2 w-full flex-1 self-center justify-between">
                  <Text
                    className="font-feather text-white tracking-wide right-2"
                    style={{
                      textShadowColor: 'rgba(0, 0, 0, 0.2)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 2,
                      fontSize: AppFonts[24]
                    }}>
                    {showDevotionalContent
                      ? i18n.t('devotional_title')
                      : showPrayerContent
                        ? i18n.t('praying_title')
                        : showJournalContent
                          ? i18n.t('reflecting_title')
                          : i18n.t('home_title')}
                  </Text>
                  {!showDevotionalContent && !showPrayerContent && !showJournalContent && (
                    <View className="flex-row gap-2 justify-end ml-2">
                      <TouchableOpacity onPress={onLevelPress}>
                        <View style={{ position: 'relative', zIndex: 2 }}>
                          <ProgressPill
                            value={0}
                            label={lambHearts >= MAX_HEARTS ? levelInfo.level?.toString?.() : lambHearts?.toString?.()}
                            icon={lambHearts >= MAX_HEARTS ? starIcon : heartIcon}
                          />

                          {isLevelPillExpanded && (
                            <Animated.View
                              className="bg-surfaceCreamLight rounded-xl overflow-hidden flex-row items-center p-2"
                              style={{
                                position: 'absolute',
                                top: 40,
                                left: '50%',
                                transform: [
                                  {
                                    translateX: levelPillWidthAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0, -pillExpandedWidth / 2],
                                    }),
                                  },
                                ],
                                width: levelPillWidthAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [40, pillExpandedWidth],
                                }),
                              }}>

                              <View className="items-center flex">
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}>
                                  <Image source={heartIcon} className="w-4 h-4 mr-1" />
                                  <Text className="font-feather text-textPrimary text-mini w-12 ">
                                    {lambHearts?.toString?.()}
                                  </Text>
                                </View>

                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',

                                  }}>
                                  <Image source={starIcon} tintColor={'#FF8800'} className="w-4 h-4 mr-1" />
                                  <Text className="font-feather text-textPrimary text-mini w-12">
                                    LVL {levelInfo.level}
                                  </Text>
                                </View>

                              </View>

                              <View style={{ width: '80%' }}>
                                {/* Level Display */}


                                <View className="h-2 bg-red/25 rounded-md overflow-hidden">
                                  <View
                                    className="h-full bg-red rounded-full"
                                    style={{
                                      width: `${Math.min(100, (lambHearts / MAX_HEARTS) * 100)}%`,
                                    }}
                                  />
                                </View>

                                <View className="h-2 bg-orange/25 rounded-full overflow-hidden mt-1 ">
                                  <View
                                    className="h-full bg-orange rounded-full"
                                    style={{
                                      width: `${Math.max(Math.min(levelInfo.progress, 100), 1)}%`,
                                    }}
                                  />
                                </View>
                              </View>
                            </Animated.View>
                          )}
                        </View>
                      </TouchableOpacity>
                      <>
                        <TouchableOpacity onPress={onGemsPress}>
                          <ProgressPill value={0} label={gens?.toString?.()} icon={gemIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={onStreakPress}>
                          <ProgressPill value={0} label={streakCount?.toString?.()} icon={flameIcon} />
                        </TouchableOpacity>
                      </>
                    </View>
                  )}
                </View>
              </Animated.View>

              <Animated.View
                className="absolute inset-0 flex-row items-center justify-center px-8 w-full"
                style={{ opacity: devotionalHeaderOpacityAnim }}
                pointerEvents={devotionalReaderVisible ? 'auto' : 'none'}>
                <Text
                  className="text-h1 font-feather text-white tracking-wide"
                  style={{
                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}>
                  {/* Daily Devotional */}
                </Text>
              </Animated.View>
            </View>

            {/* Top Section - Lamb Avatar */}
            <Animated.View
              className="items-center justify-center"
              style={{
                opacity: Animated.multiply(
                  Animated.multiply(lambOpacityAnim, lambChangeOpacityAnim),
                  riveArtboardOpacityAnim
                ),
                transform: [{ translateX: lambTranslateX }, { translateY: lambTranslateY }],
                height: BASE_LAMB_SIZE,
                shadowColor: showGlow ? '#FDE047' : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: showGlow ? 0.6 : 0,
                shadowRadius: 15,
                marginTop: -RPH(4.5),
              }}>
              <Animated.View className="items-center justify-center" >
                {riveError ? (
                  <Text className="text-red-500 p-4 text-center">
                    {i18n.t('error_loading_animation')} {riveError.message} ({riveError.type})
                  </Text>
                ) : (
                  <>
                    <Animated.View
                      onTouchStart={() => {
                        hapticLight()
                      }}
                      style={{
                        width: lambSizeAnim,
                        height: lambSizeAnim,
                      }}>
                      <Animated.View
                        style={{
                          width: '100%',
                          height: '100%',
                          transform: [
                            { scale: riveScaleAnim },
                            {
                              rotate: riveRotateAnim.interpolate({
                                inputRange: [-1, 0, 1],
                                outputRange: ['-60deg', '0deg', '60deg'],
                              }),
                            },
                          ],
                        }}>
                        {riveComponent}
                      </Animated.View>
                    </Animated.View>
                    {currentStateInput === 8 && <View style={{ height: 36 }} />}
                  </>
                )}
              </Animated.View>
            </Animated.View>

            {/* SUPER badge for pro users */}
            {mode === 'DEFAULT' && (
              <TouchableOpacity
                onPress={onSuperBadgePress}
                activeOpacity={0.8}
                style={{
                  position: 'absolute',
                  left: 24,
                  top: SCREEN_HEIGHT * (Platform.select({ android: 0.28, ios: 0.35 }) || 0.35),
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 32,
                  zIndex: 20,
                }}>
              </TouchableOpacity>
            )}

            {/* Bottom Section - Action Buttons Card or DevotionalReader */}
            <BottomSheet
              ref={bottomSheetRef}
              index={0}
              snapPoints={snapPoints}
              enablePanDownToClose={false}
              animateOnMount={true}
              enableDynamicSizing={false}
              bottomInset={0}
              detached={false}
              handleComponent={showPrayerContent ? () => null : undefined}
              handleIndicatorStyle={{
                opacity: showPrayerContent || showDevotionalContent || showJournalContent ? 0 : 0.3,
                height: 4,
                width: showPrayerContent || showDevotionalContent || showJournalContent ? 0 : 40,
                backgroundColor: '#634012',
                borderRadius: 2,
              }}
              backgroundStyle={{
                backgroundColor: '#FDEBB8',
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                ...Platform.select({
                  ios: {
                    shadowColor: 'rgba(0,0,0,0.08)',
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 4,
                    shadowOpacity: 1,
                  },
                  android: { elevation: 3, shadowColor: 'rgba(0,0,0,0.08)' },
                }),
              }}
              
              onChange={handleSheetChanges}>
              <Animated.View style={{ flex: 1, opacity: devotionalCardOpacityAnim }}>
                {showDevotionalContent ? (
                  <DevotionalReader
                    ref={devotionalReaderRef}
                    visible={showDevotionalContent}
                    onClose={handleDevotionalClose}
                    setFinishReading={setFinishReading}
                    setDevotionalReadedFully={setDevotionalReadedFully}
                    setCurrentVerseReference={setCurrentVerseReference}
                  />
                ) : showJournalContent ? (
                  <JournalComponent
                    setJournalButtonEnabled={setJournalButtonEnabled}
                    ref={journalRef}
                    visible={showJournalContent}
                    setFinishReading={setFinishReading}
                    onClose={onCloseJournal}
                    setShowJournalContent={setShowJournalContent}
                  />
                ) : showPrayerContent ?

                  <PrayerView
                    setIsCompletePrayerDisabled={setIsCompletePrayerDisabled}
                    ref={prayerViewRef}
                    setShowControlRow={setShowControlRow}
                    showControlRow={showControlRow}
                    visible={showPrayerContent}
                    setFinishReading={setFinishReading}
                    onClose={onClosePrayer}
                    setShowPrayerSuccess={setShowPrayerSuccess}
                  />
                  : (
                    <BottomSheetScrollView
                      key={`scroll-${prayerCompleted}-${readingCompleted}-${reflectionCompleted}-${!!nextUnitPreview}`}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: RPH(30), paddingHorizontal: 24 }}
                      bounces={true}
                      alwaysBounceVertical={false}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                      removeClippedSubviews={false}
                      automaticallyAdjustContentInsets={false}
                      contentInsetAdjustmentBehavior="never">
                      {prayerCompleted && readingCompleted && reflectionCompleted && dailyDevotional && (
                        <DailyVerseCard
                          devotional={dailyDevotional}
                          share={true}
                          onPress={handleDailyVersePress}
                          onExpand={handleDailyVerseExpand}
                          onShare={handleDailyVerseShare}
                          showShareButton={true}
                          showExpandButton={true}
                        />
                      )}

                      {/* Next Unit Button - Only show when all activities are completed and there's a next unit */}
                      {prayerCompleted && readingCompleted && reflectionCompleted && (
                        <View
                          className="flex-row items-center justify-between"
                          style={{ marginTop: responsiveHeight(2) }}>

                          <View
                            style={{
                              width: 22,
                              marginRight: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                            {isNextUnitCompleted ? (
                              <Image
                                source={require('../../assets/icons/checkMini.png')}
                                style={{ width: 20, height: 20, resizeMode: 'contain' }}
                              />

                            ) : (
                            <View
                              className="bg-lightBrown/20"
                              style={{ width: 20, height: 20, borderRadius: 12 }}
                            />
                            )}

                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <SecondaryButton
                              icon={require('../../assets/icons/map.png')}
                              title={i18n.t('your_custom_plan')}
                              subtitle={nextUnitSubtitle}
                              points={0}
                              onPress={() => {
                                // Check if both nextUnitPreview and currentPath are null
                                if (!nextUnitPreview && !currentPath) {
                                  setShowPathModal(true);
                                } else {
                                  handleNextUnitPress();
                                }
                              }}
                              completed={isNextUnitCompleted}
                              disabled={isNextUnitCompleted}
                            />
                          </View>
                        </View>
                      )}

                      <View
                        className="flex-row items-center justify-between "
                        style={{ marginTop: responsiveHeight(2) }}>
                        <View
                          style={{
                            width: 22,
                            marginRight: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                          {readingCompleted ? (
                            <Image
                              source={require('../../assets/icons/checkMini.png')}
                              style={{ width: 20, height: 20, resizeMode: 'contain' }}
                            />
                          ) : (
                            <View
                              className="bg-textPrimary/15"
                              style={{ width: 20, height: 20, borderRadius: 12 }}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <SecondaryButton
                            icon={breadIcon}
                            title={i18n.t('daily_bread')}
                            subtitle={i18n.t('feed_soul')}
                            points={50}
                            onPress={handleReadPress}
                            completed={readingCompleted}
                            disabled={readingCompleted}
                          />
                        </View>
                      </View>
                      <View
                        className="flex-row items-center "
                        style={{ marginTop: responsiveHeight(2) }}>
                        <View
                          style={{
                            width: 22,
                            marginRight: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          {prayerCompleted ? (
                            <Image
                              source={require('../../assets/icons/checkMini.png')}
                              style={{ width: 20, height: 20, resizeMode: 'contain' }}
                            />
                          ) : (
                            <View
                              className="bg-textPrimary/15"
                              style={{ width: 20, height: 20, borderRadius: 12 }}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <SecondaryButton
                            icon={dropIcon}
                            title={i18n.t('living_water')}
                            subtitle={i18n.t('refresh_spirit_prayer')}
                            points={50}
                            onPress={handlePrayerPress}
                            completed={prayerCompleted}
                            disabled={!readingCompleted || prayerCompleted}
                          />
                        </View>
                      </View>
                      <View
                        className="flex-row items-center"
                        style={{ marginTop: responsiveHeight(2) }}>
                        <View
                          style={{
                            width: 22,
                            marginRight: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                          {reflectionCompleted ? (
                            <Image
                              source={require('../../assets/icons/checkMini.png')}
                              style={{ width: 20, height: 20, resizeMode: 'contain' }}
                            />
                          ) : (
                            <View
                              className="bg-textPrimary/15"
                              style={{ width: 20, height: 20, borderRadius: 12 }}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <SecondaryButton
                            icon={bibleIcon}
                            title={i18n.t('quiet_time')}
                            subtitle={i18n.t('pause_meet_god')}
                            points={50}
                            onPress={handleReflectionPress}
                            completed={reflectionCompleted}
                            disabled={!readingCompleted}
                          />
                        </View>
                        <View style={{ height: 4 }} />
                      </View>

                      {/* {isLoadingDevotional && (
                        <View className="bg-white/60 rounded-xl p-4 mb-4 border border-lightGreen/20">
                          <View className="flex-row items-center mb-2">
                            <View className="w-6 h-6 bg-lightGreen rounded-full items-center justify-center mr-2">
                              <Text className="text-darkGreen text-xs font-feather">📖</Text>
                            </View>
                            <Text className="font-feather text-base text-description">
                              {i18n.t('loading_daily_verse')}
                            </Text>
                          </View>
                        </View>
                      )} */}


                      {devotionalError && !currentDevotional && (
                        <View className="bg-red/10 rounded-xl p-4 mb-4 border border-red/20">
                          <View className="flex-row items-center mb-2">
                            <View className="w-6 h-6 bg-red rounded-full items-center justify-center mr-2">
                              <Text className="text-white text-xs font-feather">⚠️</Text>
                            </View>
                            <Text className="font-feather text-base text-red">
                              {i18n.t('daily_verse_unavailable')}
                            </Text>
                          </View>
                          <Text className="font-din text-sm text-description">
                            {i18n.t('check_connection')}
                          </Text>
                        </View>
                      )}
                    </BottomSheetScrollView>
                  )}
              </Animated.View>
            </BottomSheet>

            {/* BUTTONS */}
            <BottomControls
              bottomContentOpacity={bottomContentOpacity}
              bottomContentAnimY={bottomContentAnimY}
              showPrayerContent={showPrayerContent}
              controlRowOpacity={controlRowOpacity}
              isControlRowVisible={isControlRowVisible}
              showDevotionalContent={showDevotionalContent}
              showJournalContent={showJournalContent}
              RPH={RPH}
              handleDevotionalClose={handleDevotionalClose}
              devotionalReaderRef={devotionalReaderRef}
              prayerViewRef={prayerViewRef}
              buttonTitle={buttonTitle}
              handleDevotionalFinishPress={handleDevotionalFinishPress}
              devotionalReadedFully={devotionalReadedFully}
              isCompletePrayerDisabled={isCompletePrayerDisabled}
              showPrayerSuccess={showPrayerSuccess}
            />

            <WidgetHowToSheet visible={showWidgetSheet} onClose={handleWidgetSheetClose} />
            <HeartsExplainerModal
              visible={showHeartsModal}
              onClose={() => setShowHeartsModal(false)}
            />
            <ExplainerModal
              visible={showExplainerModal}
              onClose={() => setShowExplainerModal(false)}
            />
          </SafeAreaView>
        </Animated.View></View>

      {/* Path Selection Modal */}
      <Modal
        visible={showPathModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPathModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#FDEBB8' }}>
          {/* Show X button to close modal */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPathModal(false);
            }}
            style={{
              position: 'absolute',
              top: 48,
              right: 24,
              zIndex: 10,
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 8,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 4,
            }}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <Feather name="x" size={24} color="#3C584A" />
          </TouchableOpacity>
          <OnboardingPathScreen
            onPathSelected={handlePathSelected}
            hideContinueButton={false}
            onModalClose={() => setShowPathModal(false)}
          />
        </View>
      </Modal>

      <FullScreenShareCard
        visible={showShareCard}
        onClose={handleFullScreenShareClose}
        devotionalData={dailyDevotional || devotionalData}
        startShareFlow={startShareFlow}
        setStartShareFlow={setStartShareFlow}
      />

      <Toast config={toastConfig} />
    </>
  );
}