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
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, SCREEN_HEIGHT } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import { useHomeScreen } from '../hooks/useHomeScreen';
import { useHomeStore } from '../stores/homeStore';
import DevotionalReader from '../../components/DevotionalReader';
import ProgressPill from '../../components/ProgressPill';
import SecondaryButton from '../../components/SecondaryButton';
import HeartsExplainerModal from '../../components/HeartsExplainerModal';
import ExplainerModal from '../../components/ExplainerModal';
import WidgetHowToSheet from '../../components/WidgetHowToSheet';
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
import { useMemo, useState, useEffect, useRef } from 'react';
import type { Devotional } from '../models/Devotional';
import { IS_ANDROID, IS_IOS } from '../utils/utils';
import Rive from 'rive-react-native';
import { responsiveHeight } from 'react-native-responsive-dimensions';
import { RPH } from '../helper/helper';
import analytics from '~/utils/analytics';
import BottomControls from '../components/BottomControls';
import i18n from '../utils/i18n';
import { useLanguageStore } from '../stores/languageStore';
import { AppFonts } from '../constants/appFonts';
import React from 'react';
import { hapticLight } from '~/utils/haptics';
import CardStack from '../components/CardStack';
import { useRouter, useFocusEffect } from 'expo-router';
import firestore from '@react-native-firebase/firestore';

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

// Memoized scroll view content to prevent unnecessary re-renders
const MemoizedScrollContent = React.memo(({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
});

export default function HomeScreen() {
  console.log('🏠 HomeScreen function called at:', new Date().toISOString());

  const router = useRouter();

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

      // Force sync Firebase data to ensure we have latest completedMapPaths
      const syncData = useUserStore.getState().syncFirestoreData;
      const currentUser = useUserStore.getState();
      if (currentUser.id && syncData) {
        console.log('🔄 Syncing Firestore data on mount...');
        // Fetch latest user data from Firestore
        firestore()
          .collection('users')
          .doc(currentUser.id)
          .get()
          .then((doc) => {
            if (doc.exists) {
              const userData = doc.data();
              if (userData && userData.completedMapPaths) {
                console.log(
                  '📥 Fresh completedMapPaths from Firestore:',
                  userData.completedMapPaths
                );
                syncData(userData as any).catch((error: any) => {
                  console.error('❌ Error in syncData:', error);
                });
              }
            }
          })
          .catch((error) => {
            console.error('❌ Error syncing Firestore data:', error);
          });
      }
    } catch (error) {
      console.error('❌ Error initializing:', error);
    }

    return () => {
      console.log(`👋 [${timestamp}] HomeScreen component unmounting`);
    };
  }, []);

  console.log('📍 First useEffect registered');

  // Separate effect for fetching devotional - runs when component is mounted
  useEffect(() => {
    console.log('isMounted ==>', isMounted);
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
            console.log(
              `📖 [${timestamp}] Devotional fetched successfully:`,
              data?.id,
              data?.bibleReference
            );
          })
          .catch((error: any) => {
            console.error(`❌ [${timestamp}] Error fetching devotional`, error);
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

  // Add state to track the selected devotional for FullScreenShareCard
  const [selectedDevotionalForShare, setSelectedDevotionalForShare] = useState<Devotional | null>(
    null
  );

  // Track scroll position without triggering re-renders
  const scrollOffsetRef = useRef(0);
  const scrollViewRef = useRef<any>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    customDevotional,
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
    MAX_HEARTS,
  } = useHomeScreen();

  console.log('📍 useHomeScreen hook called successfully');

  const [startShareFlow, setStartShareFlow] = useState(false);

  console.log('📍 All local state initialized');

  // Path selection modal state removed - now navigating directly to map screen

  // Get recent devotionals from global store
  const recentDevotionals = useDevotionalStore((state) => state.recentDevotionals);

  // Debug effect to track nextUnitPreview changes
  useEffect(() => {
    console.log('🔍 NextUnitPreview debug:', {
      hasNextUnit: !!nextUnitPreview,
      unitId: nextUnitPreview?.id,
      unitTitle: nextUnitPreview?.title,
      readingCompleted,
      prayerCompleted,
      reflectionCompleted,
    });
  }, [nextUnitPreview, readingCompleted, prayerCompleted, reflectionCompleted]);

  // Get completed map paths from user store
  const completedMapPaths = useUserStore((state) => state.completedMapPaths);

  // Debug effect to track completedMapPaths changes
  useEffect(() => {
    console.log('🗺️ CompletedMapPaths updated:', {
      count: completedMapPaths?.length || 0,
      paths: completedMapPaths,
    });
  }, [completedMapPaths]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 HomeScreen focused - refreshing data');

      // Refresh user data from Firestore
      const currentUser = useUserStore.getState();
      if (currentUser.id) {
        firestore()
          .collection('users')
          .doc(currentUser.id)
          .get()
          .then((doc) => {
            if (doc.exists) {
              const userData = doc.data();
              if (userData && userData.completedMapPaths) {
                console.log('📥 Refreshed completedMapPaths on focus:', userData.completedMapPaths);
                const syncData = useUserStore.getState().syncFirestoreData;
                if (syncData) {
                  syncData(userData as any).catch((error: any) => {
                    console.error('❌ Error in syncData:', error);
                  });
                }
              }
            }
          })
          .catch((error) => {
            console.error('❌ Error refreshing data on focus:', error);
          });
      }
    }, [])
  );



  // Check if there are 2 readings from today
  const getCompletedReadings = useUserStore((state) => state.getCompletedReadings);
  const todaysReadingsCount = useMemo(() => {
    const readings = getCompletedReadings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysReadings = readings.filter((reading) => {
      if (!reading || !reading.date) return false;

      let readingDate;
      try {
        // Handle Firestore Timestamp
        if (reading.date && typeof reading.date.toDate === 'function') {
          readingDate = reading.date.toDate();
        } else if (reading.date instanceof Date) {
          // Handle regular Date object
          readingDate = reading.date;
        } else {
          // Skip invalid dates
          return false;
        }

        readingDate.setHours(0, 0, 0, 0);
        return readingDate.getTime() === today.getTime();
      } catch (error) {
        console.error('Error processing reading date:', error);
        return false;
      }
    });

    return todaysReadings.length;
  }, [getCompletedReadings]);

  // Determine if next unit button should be marked as completed
  const isNextUnitCompleted = todaysReadingsCount >= 2;

  // Check if a custom path unit was completed today
  const completedUnitToday = usePathStore((state) => state.completedUnitToday);
  const checkAndResetDailyCompletion = usePathStore((state) => state.checkAndResetDailyCompletion);

  // Check and reset daily completion on component mount and when focused
  useEffect(() => {
    checkAndResetDailyCompletion();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkAndResetDailyCompletion();
    }, [])
  );

  // Fix scroll issues when bottom sheet state changes
  useEffect(() => {
    if (bottomSheetRef.current && scrollViewRef.current) {
      // Force re-enable scrolling after state changes
      const timer = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: scrollOffsetRef.current, animated: false });
          console.log('Restored scroll position to:', scrollOffsetRef.current);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showDevotionalContent, showJournalContent, showPrayerContent, prayerCompleted, readingCompleted, reflectionCompleted]);

  const isCustomPathCompletedToday = useMemo(() => {
    // First check the new completedUnitToday flag
    if (completedUnitToday) {
      console.log('🗺️ Custom path completed today (from pathStore):', true);
      return true;
    }

    // Fallback to checking completedMapPaths for backward compatibility
    if (!completedMapPaths || completedMapPaths.length === 0) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if any map path was completed today
    const todaysMapPathCompletions = completedMapPaths.filter((path) => {
      if (!path || !path.date) return false;

      let completionDate;
      try {
        // Handle Firestore Timestamp
        if (path.date && typeof path.date.toDate === 'function') {
          completionDate = path.date.toDate();
        } else if (path.date instanceof Date) {
          // Handle regular Date object
          completionDate = path.date;
        } else if (typeof path.date === 'string' || typeof path.date === 'number') {
          // Handle string or timestamp number
          completionDate = new Date(path.date);
        } else {
          console.warn('Unknown date format for completedMapPath:', path.date);
          return false;
        }

        completionDate.setHours(0, 0, 0, 0);
        return completionDate.getTime() === today.getTime();
      } catch (error) {
        console.error('Error processing map path date:', error);
        return false;
      }
    });

    console.log('🗺️ Custom path completion check (fallback):', {
      totalCompletedPaths: completedMapPaths.length,
      todaysCompletions: todaysMapPathCompletions.length,
      isCompleted: todaysMapPathCompletions.length > 0,
    });

    return todaysMapPathCompletions.length > 0;
  }, [completedMapPaths, completedUnitToday]);

  // Determine subtitle text based on total readings count
  const totalReadingsCount = getCompletedReadings().length;
  const nextUnitSubtitle =
    totalReadingsCount >= 4 ? i18n.t('continue_reading_plan') : i18n.t('start_bible_reading_plan');

  // Get current path from pathStore
  const currentPath = usePathStore((state) => state.currentPath);

  // Get completed units from pathStore to check if any unit was completed today
  const completedUnitIds = usePathStore((state) => state.completedUnitIds);
  // const completedMapPaths = useUserStore((state) => state.completedMapPaths); // Moved up

  // Use preloaded Rive assets from store instead of loading locally
  const preloadedRiveAssets = useAssetsStore((s) => s.riveAssets);
  const riveAssetsLoaded = useAssetsStore((s) => s.riveLoaded);

  // Add state for asset loading
  const assetsLoaded = useAssetsStore((s) => s.loaded);
  const assets = useAssetsStore((s) => s.assets);

  // Subscribe to language changes
  const currentLanguage = useLanguageStore((state) => state.language);
  useEffect(() => {
    i18n.locale = currentLanguage;
  }, [currentLanguage]);

  // Expose handleReadPress globally so it can be called from GlobalCheckIn
  useEffect(() => {
    (global as any).triggerDailyBread = handleReadPress;
    return () => {
      delete (global as any).triggerDailyBread;
    };
  }, [handleReadPress]);

  // Streak trigger logic will be handled in handleDevotionalClose when user presses "Go Home"

  // Set bottomSheetRef in home store so other components can access it
  useEffect(() => {
    const setBottomSheetRef = useHomeStore.getState().setBottomSheetRef;
    setBottomSheetRef(bottomSheetRef);
  }, [bottomSheetRef]);

  // Define riveComponent after state declarations so it can access showJournalContent and showPrayerContent
  const riveComponent = useMemo(() => {
    if (!preloadedRiveAssets || !riveReady || !riveAssetsLoaded) return null;

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
            hapticLight();
            analytics.logEvent('HomeScreen_Tapped_LambName');
          }}
          activeOpacity={0.7}
          style={{
            top: levelInfo.level < 10 ? RPH(7) : RPH(4.5),
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
            marginLeft: RPH(1),
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
              url={preloadedRiveAssets[lambAssetIndex].uri!}
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
  }, [
    preloadedRiveAssets,
    riveAssetsLoaded,
    currentStateInput,
    riveKey,
    riveReady,
    isPro,
    lambName,
    isLevelPillExpanded,
    riveSkinInitialized,
  ]);

  // Gate of rendering: only render the screen if the assets are ready
  console.log('🚪 Asset loading check:', { assetsLoaded, hasAssets: !!assets, riveAssetsLoaded, hasRiveAssets: !!preloadedRiveAssets });
  if (!assetsLoaded || !assets || !riveAssetsLoaded || !preloadedRiveAssets) {
    console.log('❌ Returning null - assets not ready!');
    return null;
  }

  // Pre-calculate the expanded width for the pill (use a reasonable fixed width instead of screen-based)
  const pillExpandedWidth = 350;

  const handleDailyVerseShare = (devotional?: Devotional) => {
    if (devotional) {
      setSelectedDevotionalForShare(devotional);
    }
    setStartShareFlow(true);
    setShowShareCard(true);
  };

  const handleDailyVersePress = (devotional?: Devotional) => {
    if (devotional) {
      setSelectedDevotionalForShare(devotional);
    }
    setStartShareFlow(false); // Ensure share flow is off when opening via card press
    setShowShareCard(true);
  };

  const handleDailyVerseExpand = (devotional?: Devotional) => {
    if (devotional) {
      setSelectedDevotionalForShare(devotional);
    }
    setStartShareFlow(false); // Ensure share flow is off when opening via expand
    setShowShareCard(true);
  };

  const handleFullScreenShareClose = () => {
    setShowShareCard(false);
    setStartShareFlow(false);
    setSelectedDevotionalForShare(null); // Clear the selected devotional
  };

  const handleCustomDevotionalShare = () => {
    setStartShareFlow(true);
    setShowShareCard(true);
  };

  // Handler for custom devotional button
  const handleCustomDevotionalPress = async () => {
    // Simply show the check-in sheet
    const showCheckIn = (global as any).showCheckIn;
    if (showCheckIn && typeof showCheckIn === 'function') {
      showCheckIn();
      analytics.logEvent('custom_devotional_triggered_checkin');
    } else {
      console.error('[handleCustomDevotionalPress] showCheckIn function not found on global');
    }
  };

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDarkContant ? 'light-content' : 'dark-content'}
      />
      <View className="flex-1 bg-[#FDEBB8]">
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
              pointerEvents="none">
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
              preloadedRiveAssets && (
                <Rive
                  url={preloadedRiveAssets[1].uri!}
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
                      fontSize: AppFonts[24],
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
                            label={
                              lambHearts >= MAX_HEARTS
                                ? levelInfo.level?.toString?.()
                                : lambHearts?.toString?.()
                            }
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
                                  <Image
                                    source={starIcon}
                                    tintColor={'#FF8800'}
                                    className="w-4 h-4 mr-1"
                                  />
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
                        <TouchableOpacity onPress={onStreakPress}>
                          <ProgressPill
                            value={0}
                            label={streakCount?.toString?.()}
                            icon={flameIcon}
                          />
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
              <Animated.View className="items-center justify-center">
                {riveError ? (
                  <Text className="text-red-500 p-4 text-center">
                    {i18n.t('error_loading_animation')} {riveError.message} ({riveError.type})
                  </Text>
                ) : (
                  <>
                    <Animated.View
                      onTouchStart={() => {
                        hapticLight();
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
                }}></TouchableOpacity>
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
                opacity: 0.3,
                height: 4,
                width: 40,
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
              onChange={handleSheetChanges}
              android_keyboardInputMode="adjustResize"
              keyboardBehavior={Platform.OS === 'ios' ? 'extend' : 'interactive'}
              keyboardBlurBehavior="restore"
              enableContentPanningGesture={!(showDevotionalContent || showJournalContent || showPrayerContent)}
              simultaneousHandlers={[]}>
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
                ) : showPrayerContent ? (
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
                ) : (
                  <View style={{ flex: 1 }} pointerEvents="box-none">
                    <BottomSheetScrollView
                      ref={scrollViewRef}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingBottom: 150,
                        paddingHorizontal: 24,
                        flexGrow: 1,
                        minHeight: '100%'
                      }}
                      bounces={true}
                      alwaysBounceVertical={true}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled={true}
                      removeClippedSubviews={Platform.OS === 'android'}
                      automaticallyAdjustContentInsets={false}
                      contentInsetAdjustmentBehavior="never"

                      overScrollMode="always"
                      onScroll={(event) => {
                        const offset = event.nativeEvent.contentOffset.y;
                        scrollOffsetRef.current = offset;
                      }}
                      onScrollBeginDrag={() => {
                        setIsScrolling(true);
                      }}
                      onScrollEndDrag={() => {
                        setIsScrolling(false);
                      }}
                      onMomentumScrollBegin={() => {
                        setIsScrolling(true);
                      }}
                      onMomentumScrollEnd={() => {
                        setIsScrolling(false);
                      }}
                      scrollEnabled={true}>
                      <MemoizedScrollContent>
                        {/* Next Unit Button - Only show when all activities are completed and there's a next unit */}

                        {readingCompleted && (
                          <View className="w-full mt-4 mb-8">
                            {(() => {
                              // Show at most 2 cards: daily verse + last custom devotional
                              const devotionalsToShow: Devotional[] = [];
                              const addedIds = new Set<string>();

                              // First, always add the daily devotional (verse of the day)
                              if (
                                dailyDevotional &&
                                dailyDevotional.id &&
                                dailyDevotional.id !== 'undefined'
                              ) {
                                devotionalsToShow.push(dailyDevotional);
                                addedIds.add(dailyDevotional.id);
                              }

                              // Then add the most recent custom devotional (if any)
                              if (recentDevotionals.length > 0) {
                                // Filter to get only custom devotionals (not daily verse)
                                const customDevotionals = recentDevotionals.filter(
                                  (d) => d && d.id && d.id !== 'undefined' && !addedIds.has(d.id)
                                ) as Devotional[];

                                // Add only the most recent custom devotional
                                if (customDevotionals.length > 0) {
                                  devotionalsToShow.push(customDevotionals[0]);
                                  addedIds.add(customDevotionals[0].id);
                                }
                              }

                              // If we don't have a custom devotional from recent, check if there's a current custom devotional
                              if (
                                devotionalsToShow.length === 1 &&
                                customDevotional &&
                                customDevotional.id &&
                                customDevotional.id !== 'undefined' &&
                                !addedIds.has(customDevotional.id)
                              ) {
                                devotionalsToShow.push(customDevotional);
                              }

                              // If we only have daily verse, that's fine. If we have no devotionals at all, try currentDevotional
                              if (
                                devotionalsToShow.length === 0 &&
                                currentDevotional &&
                                currentDevotional.id &&
                                currentDevotional.id !== 'undefined'
                              ) {
                                devotionalsToShow.push(currentDevotional);
                              }

                              // Ensure maximum 2 cards
                              const finalDevotionals = devotionalsToShow.slice(0, 3);

                              if (finalDevotionals.length > 0) {
                                // If only one devotional, render it directly without CardStack
                                if (finalDevotionals.length === 1) {
                                  return (
                                    <View className="mt-4 mb-8">
                                      <DailyVerseCard
                                        devotional={finalDevotionals[0]}
                                        share={true}
                                        onPress={() => handleDailyVersePress(finalDevotionals[0])}
                                        onExpand={() => handleDailyVerseExpand(finalDevotionals[0])}
                                        onShare={() => handleDailyVerseShare(finalDevotionals[0])}
                                        showShareButton={true}
                                        showExpandButton={true}
                                        height="dynamic"
                                      />
                                    </View>
                                  );
                                } else {
                                  // Multiple devotionals, use CardStack
                                  return (
                                    <View className="-mt-4">
                                      <CardStack
                                        data={finalDevotionals}
                                        renderCard={(
                                          devotional: Devotional,
                                          index: number,
                                          onCardTap: () => void
                                        ) => (
                                          <DailyVerseCard
                                            devotional={devotional}
                                            share={true}
                                            onPress={onCardTap}
                                            onExpand={() => handleDailyVerseExpand(devotional)}
                                            onShare={() => handleDailyVerseShare(devotional)}
                                            showShareButton={true}
                                            showExpandButton={true}
                                            height={35}
                                          />
                                        )}
                                      />
                                    </View>
                                  );
                                }
                              }

                              // If still no devotionals to show, return null
                              return null;
                            })()}
                          </View>
                        )}

                        {/* UNCOMPLETED TASKS SECTION - Show first */}

                        {/* Custom Path Button - Show when reading is completed and not completed today */}
                        {readingCompleted && !isCustomPathCompletedToday && (
                          <View
                            className="flex-row items-center "
                            style={{
                              marginTop: -responsiveHeight(2),
                              marginBottom: responsiveHeight(2),
                            }}>
                            <View
                              style={{
                                width: 22,
                                marginRight: 10,
                                alignItems: 'center',
                                justifyContent: 'center',
                                left: -8,
                              }}>
                              <View
                                className="bg-textPrimary/15"
                                style={{ width: 20, height: 20, borderRadius: 12 }}
                              />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <SecondaryButton
                                icon={require('../../assets/icons/map.png')}
                                title={i18n.t('custom_path')}
                                subtitle={i18n.t('your_custom_path')}
                                points={0}
                                onPress={() => {
                                  hapticLight();
                                  router.push({
                                    pathname: '/components/map',
                                    params: {
                                      fromHome: 'true',
                                    },
                                  });
                                }}
                                completed={false}
                                disabled={false}
                              />
                            </View>
                          </View>
                        )}

                        {/* Prayer and Journal Buttons - Show only incomplete buttons when reading is completed */}
                        {readingCompleted && (!prayerCompleted || !reflectionCompleted) && (
                          <View style={{ marginTop: responsiveHeight(0) }}>
                            {/* Prayer Button - Only show if not completed */}
                            {!prayerCompleted && (
                              <View
                                className="flex-row items-center"
                                style={{ marginBottom: responsiveHeight(2) }}>
                                <View
                                  style={{
                                    width: 22,
                                    marginRight: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    left: -8,
                                  }}>
                                  <View
                                    className="bg-textPrimary/15"
                                    style={{ width: 20, height: 20, borderRadius: 12 }}
                                  />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <SecondaryButton
                                    icon={dropIcon}
                                    title={i18n.t('praying')}
                                    subtitle={i18n.t('talk_to_god')}
                                    points={50}
                                    onPress={handlePrayerPress}
                                    completed={false}
                                    disabled={false}
                                  />
                                </View>
                              </View>
                            )}

                            {/* Journal Button - Only show if not completed */}
                            {!reflectionCompleted && (
                              <View
                                className="flex-row items-center"
                                style={{ marginBottom: responsiveHeight(2) }}>
                                <View
                                  style={{
                                    width: 22,
                                    marginRight: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    left: -8,
                                  }}>
                                  <View
                                    className="bg-textPrimary/15"
                                    style={{ width: 20, height: 20, borderRadius: 12 }}
                                  />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <SecondaryButton
                                    icon={require('../../assets/icons/journalIcon.png')}
                                    title={i18n.t('reflecting')}
                                    subtitle={i18n.t('journal_thoughts')}
                                    points={25}
                                    onPress={handleReflectionPress}
                                    completed={false}
                                    disabled={false}
                                  />
                                </View>
                              </View>
                            )}
                          </View>
                        )}

                        {/* COMPLETED TASKS SECTION - Show after uncompleted tasks */}

                        {/* Show completed tasks when reading is completed */}
                        {readingCompleted && (
                          <View style={{ marginTop: responsiveHeight(1) }}>
                            <View
                              className="flex-row items-center"
                              style={{ marginBottom: responsiveHeight(2) }}>
                              <View
                                style={{
                                  width: 22,
                                  marginRight: 10,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  left: -8,
                                }}>
                                <Image
                                  source={require('../../assets/icons/checkMini.png')}
                                  style={{ width: 20, height: 20, resizeMode: 'contain' }}
                                />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <SecondaryButton
                                  icon={breadIcon}
                                  title={i18n.t('daily_bread')}
                                  subtitle={i18n.t('feed_soul')}
                                  points={50}
                                  onPress={() => { }}
                                  completed={true}
                                  disabled={true}
                                />
                              </View>
                            </View>

                            {/* Show completed prayer button */}
                            {prayerCompleted && (
                              <View
                                className="flex-row items-center"
                                style={{ marginBottom: responsiveHeight(2) }}>
                                <View
                                  style={{
                                    width: 22,
                                    marginRight: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    left: -8,
                                  }}>
                                  <Image
                                    source={require('../../assets/icons/checkMini.png')}
                                    style={{ width: 20, height: 20, resizeMode: 'contain' }}
                                  />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <SecondaryButton
                                    icon={dropIcon}
                                    title={i18n.t('praying')}
                                    subtitle={i18n.t('talk_to_god')}
                                    points={50}
                                    onPress={() => { }}
                                    completed={true}
                                    disabled={true}
                                  />
                                </View>
                              </View>
                            )}

                            {/* Show completed reflection button */}
                            {reflectionCompleted && (
                              <View
                                className="flex-row items-center"
                                style={{ marginBottom: responsiveHeight(2) }}>
                                <View
                                  style={{
                                    width: 22,
                                    marginRight: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    left: -8,
                                  }}>
                                  <Image
                                    source={require('../../assets/icons/checkMini.png')}
                                    style={{ width: 20, height: 20, resizeMode: 'contain' }}
                                  />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <SecondaryButton
                                    icon={require('../../assets/icons/journalIcon.png')}
                                    title={i18n.t('reflecting')}
                                    subtitle={i18n.t('journal_thoughts')}
                                    points={25}
                                    onPress={() => { }}
                                    completed={true}
                                    disabled={true}
                                  />
                                </View>
                              </View>
                            )}

                            {/* Show completed custom path button if it was completed today */}
                            {isCustomPathCompletedToday && (
                              <View
                                className="flex-row items-center"
                                style={{ marginBottom: responsiveHeight(2) }}>
                                <View
                                  style={{
                                    width: 22,
                                    marginRight: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    left: -8,
                                  }}>
                                  <Image
                                    source={require('../../assets/icons/checkMini.png')}
                                    style={{ width: 20, height: 20, resizeMode: 'contain' }}
                                  />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <SecondaryButton
                                    icon={require('../../assets/icons/map.png')}
                                    title={i18n.t('custom_path')}
                                    subtitle={i18n.t('your_custom_path')}
                                    points={0}
                                    onPress={() => { }}
                                    completed={true}
                                    disabled={true}
                                  />
                                </View>
                              </View>
                            )}

                            {/* Show completed custom devotional button if it was completed today */}
                            {(() => {
                              // Check if there's a custom devotional in recent devotionals from today
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);

                              const hasCustomDevotionalToday = recentDevotionals.some((devotional) => {
                                if (!devotional || !devotional.date) return false;

                                let devotionalDate;
                                try {
                                  if (devotional.date && typeof devotional.date.toDate === 'function') {
                                    devotionalDate = devotional.date.toDate();
                                  } else if (devotional.date instanceof Date) {
                                    devotionalDate = devotional.date;
                                  } else {
                                    return false;
                                  }

                                  devotionalDate.setHours(0, 0, 0, 0);
                                  // Check if it's from today and it's NOT the daily devotional
                                  return devotionalDate.getTime() === today.getTime() &&
                                    devotional.id !== dailyDevotional?.id;
                                } catch (error) {
                                  return false;
                                }
                              });

                              if (hasCustomDevotionalToday) {
                                return (
                                  <View
                                    className="flex-row items-center"
                                    style={{ marginBottom: responsiveHeight(2) }}>
                                    <View
                                      style={{
                                        width: 22,
                                        marginRight: 10,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        left: -8,
                                      }}>
                                      <Image
                                        source={require('../../assets/icons/checkMini.png')}
                                        style={{ width: 20, height: 20, resizeMode: 'contain' }}
                                      />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                      <SecondaryButton
                                        icon={require('../../assets/icons/customBread.png')}
                                        title={i18n.t('generate_custom_devotional') || 'Generate Custom Devotional'}
                                        subtitle={i18n.t('create_personalized_devotional') || 'Create a personalized devotional'}
                                        points={50}
                                        onPress={() => { }}
                                        completed={true}
                                        disabled={true}
                                      />
                                    </View>
                                  </View>
                                );
                              }
                              return null;
                            })()}
                          </View>
                        )}
                        {!readingCompleted && (
                          <View style={{ position: 'relative' }}>
                            {/* Daily Bread Button */}
                            <View
                              className="flex-row items-center justify-between"
                              style={{ marginTop: responsiveHeight(2) }}>
                              <View style={{ width: 22, marginRight: 10 }} />
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

                            {/* Custom Devotional Button */}
                            <View
                              className="flex-row items-center"
                              style={{ marginTop: responsiveHeight(2) }}>
                              <View style={{ width: 22, marginRight: 10 }} />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <SecondaryButton
                                  icon={require('../../assets/icons/customBread.png')}
                                  title={i18n.t('generate_custom_devotional') || 'Generate Custom Devotional'}
                                  subtitle={i18n.t('create_personalized_devotional') || 'Create a personalized devotional'}
                                  points={50}
                                  onPress={handleCustomDevotionalPress}
                                  completed={false}
                                  disabled={false}
                                />
                              </View>
                            </View>

                            {/* Centered Check Circle - Positioned between both buttons */}
                            <View
                              style={{
                                position: 'absolute',
                                left: -8,
                                top: '50%',
                                transform: [{ translateY: -10 }],
                                width: 32,
                                height: 20,
                                alignItems: 'center',
                                justifyContent: 'center',
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
                          </View>
                        )}



                        {/* Custom Path Button - Show at bottom only when reading is NOT completed */}
                        {!readingCompleted &&
                          !(prayerCompleted && readingCompleted && reflectionCompleted) && (
                            <View
                              className="flex-row items-center "
                              style={{ marginTop: responsiveHeight(3) }}>
                              <View
                                style={{
                                  width: 22,
                                  marginRight: 10,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  left: -8,
                                }}>
                                {isCustomPathCompletedToday ? (
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
                                  icon={require('../../assets/icons/map.png')}
                                  title={i18n.t('custom_path')}
                                  subtitle={i18n.t('your_custom_path')}
                                  points={0}
                                  onPress={() => {
                                    hapticLight();
                                    router.push({
                                      pathname: '/components/map',
                                      params: {
                                        fromHome: 'true',
                                      },
                                    });
                                  }}
                                  completed={isCustomPathCompletedToday}
                                  disabled={!readingCompleted}
                                />
                              </View>
                            </View>
                          )}

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

                        {/* Generate Custom Devotional Button - Only show when reading is completed and no custom devotional today */}
                        {readingCompleted && (() => {
                          // Check if there's a custom devotional in recent devotionals from today
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);

                          const hasCustomDevotionalToday = recentDevotionals.some((devotional) => {
                            if (!devotional || !devotional.date) return false;

                            let devotionalDate;
                            try {
                              if (devotional.date && typeof devotional.date.toDate === 'function') {
                                devotionalDate = devotional.date.toDate();
                              } else if (devotional.date instanceof Date) {
                                devotionalDate = devotional.date;
                              } else {
                                return false;
                              }

                              devotionalDate.setHours(0, 0, 0, 0);
                              // Check if it's from today and it's NOT the daily devotional
                              return devotionalDate.getTime() === today.getTime() &&
                                devotional.id !== dailyDevotional?.id;
                            } catch (error) {
                              return false;
                            }
                          });

                          // Only show if custom devotional hasn't been completed today
                          if (!hasCustomDevotionalToday) {
                            return (
                              <View style={{ marginTop: responsiveHeight(3), marginBottom: responsiveHeight(4) }}>
                                <SecondaryButton
                                  icon={require('../../assets/icons/customBread.png')}
                                  title={i18n.t('generate_custom_devotional') || 'Generate Custom Devotional'}
                                  subtitle={i18n.t('create_personalized_devotional') || 'Create a personalized devotional'}
                                  points={0}
                                  onPress={handleCustomDevotionalPress}
                                  completed={false}
                                  disabled={false}
                                />
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </MemoizedScrollContent>
                    </BottomSheetScrollView>
                  </View>
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
              onSharePress={handleCustomDevotionalShare}
              showDevotionalSuccess={devotionalReaderRef.current?.showSuccess || false}
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
        </Animated.View>
      </View>

      <FullScreenShareCard
        visible={showShareCard}
        onClose={handleFullScreenShareClose}
        devotionalData={
          selectedDevotionalForShare || customDevotional || dailyDevotional || devotionalData
        }
        startShareFlow={startShareFlow}
        setStartShareFlow={setStartShareFlow}
      />

      <Toast config={toastConfig} />
    </>
  );
}
