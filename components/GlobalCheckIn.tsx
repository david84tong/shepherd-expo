import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import React, { useCallback, useRef, useImperativeHandle, useState, useEffect } from 'react';
import { View, Text, Pressable, Animated, Dimensions, Image, ScrollView, Alert } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { useAssets } from 'expo-asset';

import PrimaryButton from './PrimaryButton';
import { hapticMedium, hapticSuccess } from '~/utils/haptics';
import { appLog, RPH } from '~/app/helper/helper';
import analytics from '~/utils/analytics';
import { useCheckInStore } from '~/app/stores/checkInStore';
import { createDevotionalFromCheckIn } from '~/app/api/ai';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { useRouter } from 'expo-router';
import { Devotional, devotionalBackgrounds } from '~/app/models/Devotional';
import auth from '@react-native-firebase/auth';
import { useHomeStore } from '~/app/stores/homeStore';
import { useUserStore } from '~/app/stores/userStore';
import { Timestamp } from '@react-native-firebase/firestore';
import { IS_ANDROID } from '~/app/utils/utils';
import { useSoundStore } from '~/app/stores/soundStore';
import useSubscriptionStore, { safelyPresentPaywall } from '~/app/stores/subscriptionStore';
import dayjs from 'dayjs';
import i18n from '~/app/utils/i18n';

// Import gem icon
import gemIcon from '../assets/icons/greenGemIcon.png';

export type GlobalCheckInRef = {
  expand: () => void;
  close: () => void;
  forceShow: () => void;
};

interface GlobalCheckInProps {
  checkInRef: React.RefObject<GlobalCheckInRef>;
}

type CheckInScreen = 'mood' | 'focus' | 'struggle' | 'success';

const { width: screenWidth } = Dimensions.get('window');

// Helper function to get responsive card dimensions using RPH and RPW
const getResponsiveCardDimensions = () => {
  // Device size breakpoints
  const isSmallDevice = screenWidth <= 375;
  const isMediumDevice = screenWidth > 375 && screenWidth < 414;
  const isLargeDevice = screenWidth >= 414 && screenWidth < 768;
  const isTablet = screenWidth >= 768;

  // Calculate items per row based on device size
  const getMoodItemsPerRow = () => {
    if (isSmallDevice) return 2;
    if (isMediumDevice) return 3;
    if (isLargeDevice) return 3;
    if (isTablet) return 4;
    return 3;
  };
  const getFocusItemsPerRow = () => 3;

  // Responsive gap
  const gap = 12;
  // Account for container padding (20px each side = 40px total)
  const containerPadding = 40;
  const availableWidth = screenWidth - containerPadding;
  const focusItemsPerRow = getFocusItemsPerRow();
  
  // For iPhone 16 Pro Max (440px), ensure 3 cards fit by using a more aggressive calculation
  let focusBoxWidth;
  if (screenWidth >= 440) {
    // For iPhone 16 Pro Max and larger, use a fixed width that ensures 3 cards fit
    focusBoxWidth = 120; // Fixed width that works for 3 cards
  } else {
    // For other devices, use the calculated width
    focusBoxWidth = Math.min(
      (availableWidth - gap * (focusItemsPerRow - 1)) / focusItemsPerRow,
      isTablet ? 160 : 9999 // cap at 160px for tablets, no cap for phones
    );
  }

  return {
    mood: {
      width: RPH(12),
      height: RPH(14),
      itemsPerRow: getMoodItemsPerRow()
    },
    focus: {
      width: focusBoxWidth,
      height: RPH(11),
      itemsPerRow: focusItemsPerRow
    },
    gap,
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isTablet
  };
};

const GlobalCheckIn: React.FC<GlobalCheckInProps> = ({ checkInRef }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [currentScreen, setCurrentScreen] = useState<CheckInScreen>('mood');
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkInSaved, setCheckInSaved] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const expandAttempts = useRef(0);

  // Hooks
  const router = useRouter();
  const { setCustomDevotional, setIsFromCheckIn, createCustomDevotionalFromCheckIn } =
    useDevotionalStore();
  const { readingCompleted } = useHomeStore();
  const { addCheckIn, getGens, setGens,customDevotionalsLeft,setCustomDevotionalsLeft } = useUserStore();
  const { playChestOpeningSound } = useSoundStore();

  // Use CheckIn store
  const {
    currentMood,
    currentFocus,
    currentStruggle,
    setMood,
    setFocus,
    setStruggle,
    skipFocus,
    skipStruggle,
    completeCheckIn,
    clearCurrentSession,
  } = useCheckInStore();

  // Local state for UI feedback
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [selectedStruggle, setSelectedStruggle] = useState<string | null>(null);

  // State for gem reward
  const [gemsAwarded, setGemsAwarded] = useState(false);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);

  // Animation values for each screen
  const moodAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(screenWidth)).current;
  const struggleAnim = useRef(new Animated.Value(screenWidth)).current;
  const successAnim = useRef(new Animated.Value(screenWidth)).current;

  // Animation values for rewards
  const rewardCardOpacity = useRef(new Animated.Value(0)).current;
  const rewardCardScale = useRef(new Animated.Value(0.8)).current;
  const gemTextOpacity = useRef(new Animated.Value(0)).current;

  // Rive ref for chest animation
  const riveRef = useRef<RiveRef>(null);

  // Load Rive assets
  const [riveAssets] = useAssets([require('../assets/riveAnimations/success_lamb.riv')]);

  // Dynamic snap points based on current screen
  const snapPoints = currentScreen === 'success' ? ['65%'] : ['65%'];

  // Log when component mounts/unmounts
  useEffect(() => {
    appLog('[GlobalCheckIn] Component mounted at:', new Date().toISOString());
    return () => {
      appLog('[GlobalCheckIn] Component unmounted at:', new Date().toISOString());
    };
  }, []);

  // Complete check-in and save to both stores
  const handleCompleteCheckIn = useCallback(async () => {
    appLog('[GlobalCheckIn] handleCompleteCheckIn started');

    // Prevent double-saving
    if (checkInSaved) {
      appLog('[GlobalCheckIn] Check-in already saved, skipping...');
      return;
    }

    appLog('[GlobalCheckIn] handleCompleteCheckIn called with:', {
      mood: currentMood,
      focus: currentFocus,
      struggle: currentStruggle,
    });

    try {
      // Complete check-in in checkInStore
      appLog('[GlobalCheckIn] Completing check-in in checkInStore...');
      completeCheckIn();

      // Save to userStore for Firestore sync
      const checkInData = {
        mood: currentMood,
        focus: currentFocus,
        struggles: currentStruggle,
        timeStamp: Timestamp.now()
      };

      // Create unique key using timestamp to prevent overrides
      const now = new Date();
      const timestamp = now.getTime(); // milliseconds since epoch
      const dateKey = `${timestamp}`; // Use timestamp as key for uniqueness
      appLog('[GlobalCheckIn] Saving check-in data to userStore:', checkInData);
      await addCheckIn(dateKey, checkInData);

      appLog('[GlobalCheckIn] Check-in completed and saved to both stores');
      setCheckInSaved(true);
    } catch (error) {
      console.error('[GlobalCheckIn] Error in handleCompleteCheckIn:', error);
      throw error; // Re-throw to be handled by caller
    }

    // Award 20 gems for completing check-in
    if (!gemsAwarded) {
      const currentGems = getGens();
      setGens(currentGems + 20);
      setGemsAwarded(true);
      setShowRewardAnimation(true);
      appLog(`Awarded +20 Gems for check-in. New total: ${currentGems + 20}`);

      // Log analytics
      analytics.logEvent('checkin_gems_awarded', {
        gemsAwarded: 20,
        newGemCount: currentGems + 20,
        mood: currentMood,
        focus: currentFocus,
        struggle: currentStruggle,
      });
    }

    // Verify the check-in was saved
    const verifyCheckIn = useCheckInStore.getState().getTodaysCheckIn();
    appLog('[GlobalCheckIn] Verification - Today\'s check-in after save:', verifyCheckIn);
  }, [currentMood, currentFocus, currentStruggle, completeCheckIn, addCheckIn, checkInSaved, gemsAwarded, getGens, setGens]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsSheetVisible(false);
    // Reset everything after sheet closes
    setTimeout(() => {
      setCurrentScreen('mood');
      setSelectedMood(null);
      setSelectedFocus(null);
      setSelectedStruggle(null);
      clearCurrentSession(); // Clear store session
      setIsGenerating(false); // Reset generating state
      setCheckInSaved(false); // Reset saved flag
      setGemsAwarded(false); // Reset gems awarded flag
      setShowRewardAnimation(false); // Reset reward animation
      // Reset animations
      moodAnim.setValue(0);
      focusAnim.setValue(screenWidth);
      struggleAnim.setValue(screenWidth);
      successAnim.setValue(screenWidth);
      rewardCardOpacity.setValue(0);
      rewardCardScale.setValue(0.8);
      gemTextOpacity.setValue(0);
    }, 300);
    hapticMedium();
  }, [
    moodAnim,
    focusAnim,
    struggleAnim,
    successAnim,
    clearCurrentSession,
    rewardCardOpacity,
    rewardCardScale,
    gemTextOpacity,
  ]);

  // Handle custom devotional purchase with gem confirmation
  const handleCustomDevotionalPurchase = useCallback(async () => {
    appLog('[GlobalCheckIn] handleCustomDevotionalPurchase started');
    
    const { getGens, setGens, customDevotionalsLeft, setCustomDevotionalsLeft } = useUserStore.getState();
    const currentGems = getGens();
    const gemCost = 200;
    
    // Check if user has enough gems
    if (currentGems < gemCost) {
      appLog('[GlobalCheckIn] Not enough gems for custom devotional, showing free trial');
      analytics.logEvent('checkin_custom_devotional_insufficient_gems', {
        currentGems,
        requiredGems: gemCost,
      });
      
      // Show free trial paywall
      await safelyPresentPaywall('free');
      return;
    }
    
    // Show confirmation alert
    Alert.alert(
      'Purchase Custom Devotional',
      `Are you sure you want to create a custom devotional for 200 gems?\n\nYou currently have ${currentGems} gems.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            appLog('[GlobalCheckIn] Custom devotional purchase cancelled');
            analytics.logEvent('checkin_custom_devotional_purchase_cancelled', {
              currentGems,
              gemCost,
            });
          },
        },
        {
          text: 'Purchase',
          style: 'default',
          onPress: async () => {
            try {
              // Deduct gems and add custom devotional count
              const newGems = currentGems - gemCost;
              
              setGens(newGems);
              
              appLog('[GlobalCheckIn] Custom devotional purchased successfully', {
                newGems,
              });
              
              // Haptic feedback
              hapticSuccess();
              
              // Log analytics
              analytics.logEvent('checkin_custom_devotional_purchased', {
                gemCost,
                newGems,
              });
              
              // Now generate the custom devotional (skip pro check since they just purchased with gems)
              await handleGenerateCustomDevotional(true);
              
            } catch (error) {
              console.error('[GlobalCheckIn] Error purchasing custom devotional:', error);
              Alert.alert(
                'Purchase Failed',
                'There was an error processing your purchase. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  }, []);

  // Handle custom devotional generation
  const handleGenerateCustomDevotional = useCallback(async (skipProCheck = false) => {
    appLog('[GlobalCheckIn] handleGenerateCustomDevotional started, skipProCheck:', skipProCheck);
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.error('No authenticated user available for generating devotional');
      return;
    }

    // Only check pro status if not skipping (i.e., not called after gem purchase)
    if (!skipProCheck) {
      // Check if user is pro - check both subscription store and user store
      const { isProMember, forceRefreshProStatus } = useSubscriptionStore.getState();
      const userProStatus = useUserStore.getState().proStatus;
      
      // First force refresh pro status to get latest from all sources
      await forceRefreshProStatus();
      
      // Re-check pro status after refresh
      const subscriptionStore = useSubscriptionStore.getState();
      const userStore = useUserStore.getState();
      const isProAfterRefresh = subscriptionStore.isProMember;
      const userProStatusAfterRefresh = userStore.proStatus;
      const userIsPro = userStore.getUser()?.isPro;
      
      // Check all possible pro status sources
      const isPro = isProAfterRefresh || userProStatusAfterRefresh === 'pro' || userIsPro === true;
      
      appLog('[GlobalCheckIn] Pro status check:', {
        isProMember,
        isProAfterRefresh,
        userProStatus,
        userProStatusAfterRefresh,
        userIsPro,
        finalIsPro: isPro
      });
      
      if (!isPro && customDevotionalsLeft <= 0) {
        appLog('[GlobalCheckIn] User is not pro and no custom devotionals left, presenting free trial paywall');
        await safelyPresentPaywall('free');
        return;
      }
    }

    setIsGenerating(true);

    try {
      // Get the user's ID token
      const idToken = await currentUser.getIdToken();

      // Create the check-in data
      const checkInData = {
        mood: currentMood,
        focus: currentFocus,
        struggle: currentStruggle,
      };

      appLog('[GlobalCheckIn] Generating custom devotional with check-in data:', checkInData);

      // Generate the custom devotional
      const customDevotional = await createDevotionalFromCheckIn(checkInData, idToken);

      // Get random background using the proper backgrounds from model
      const backgroundUrls = Object.values(devotionalBackgrounds);
      const randomBackground = backgroundUrls[Math.floor(Math.random() * backgroundUrls.length)];

      // Save the custom devotional to the store
      const fullDevotional: Devotional = {
        id: 'custom-checkin',
        title: customDevotional.title,
        content: customDevotional.context, // Using context as content
        createdAt: new Date().toISOString(),
        context: customDevotional.context,
        bibleReference: customDevotional.bibleReference || '',
        prayer: customDevotional.prayer,
        reflectionPrompt: customDevotional.reflectionPrompt,
        likes: 0,
        shares: 0,
        completed: 0,
        date: dayjs().format('YYYY-MM-DD') || new Date().toISOString().split('T')[0],
        imageURL: randomBackground,
        verse: customDevotional.verse || '',
      };

      appLog('GlobalCheckIn: Full devotional object:', fullDevotional);
      appLog('GlobalCheckIn: Verse field:', fullDevotional.verse);
      appLog('GlobalCheckIn: BibleReference field:', fullDevotional.bibleReference);

      // Use the new function to save to Firestore
      await createCustomDevotionalFromCheckIn(fullDevotional);

      // Complete the check-in and save to both stores
      appLog('[GlobalCheckIn] About to save check-in...');
      await handleCompleteCheckIn();
      appLog('[GlobalCheckIn] Check-in saved successfully');

      // Log analytics
      analytics.logEvent('checkin_custom_devotional_generated', {
        mood: currentMood,
        focus: currentFocus,
        struggle: currentStruggle,
      });

      // Set check-in flag
      setIsFromCheckIn(true);

      // Set navigation flag to prevent check-in from showing during navigation
      const { setIsNavigating } = useCheckInStore.getState();
      setIsNavigating(true);

      // Close the sheet directly without handleDismiss to prevent reappearing
      bottomSheetRef.current?.close();

      // Navigate after sheet closes
      setTimeout(() => {
        router.push('/devotionalLoading' as any);

        // Reset navigation flag after a delay
        setTimeout(() => {
          setIsNavigating(false);
        }, 3000); // 3 seconds should be enough for navigation to complete

        // Reset state after navigation
        setTimeout(() => {
          setCurrentScreen('mood');
          setSelectedMood(null);
          setSelectedFocus(null);
          setSelectedStruggle(null);
          clearCurrentSession();
          setIsGenerating(false);
          setCheckInSaved(false);
          setGemsAwarded(false);
          setShowRewardAnimation(false);
          // Reset animations
          moodAnim.setValue(0);
          focusAnim.setValue(screenWidth);
          struggleAnim.setValue(screenWidth);
          successAnim.setValue(screenWidth);
          rewardCardOpacity.setValue(0);
          rewardCardScale.setValue(0.8);
          gemTextOpacity.setValue(0);
        }, 100);
      }, 300);
    } catch (error) {
      appLog('Error generating custom devotional:', error);
      setIsGenerating(false);
      // You might want to show an error toast here
    }
  }, [
    currentMood,
    currentFocus,
    currentStruggle,
    setCustomDevotional,
    handleCompleteCheckIn,
    handleDismiss,
    router,
    customDevotionalsLeft,
  ]);

  // Animate screen transitions
  const animateToScreen = useCallback(
    (screen: CheckInScreen) => {
      const animations: Animated.CompositeAnimation[] = [];

      if (screen === 'focus') {
        // Slide mood out to left, focus in from right
        animations.push(
          Animated.parallel([
            Animated.timing(moodAnim, {
              toValue: -screenWidth,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(focusAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        );
      } else if (screen === 'struggle') {
        // Slide focus out to left, struggle in from right
        animations.push(
          Animated.parallel([
            Animated.timing(focusAnim, {
              toValue: -screenWidth,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(struggleAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        );
      } else if (screen === 'success') {
        // Slide struggle out to left, success in from right with easing
        animations.push(
          Animated.parallel([
            Animated.timing(struggleAnim, {
              toValue: -screenWidth,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.spring(successAnim, {
              toValue: 0,
              tension: 60,
              friction: 10,
              useNativeDriver: true,
            }),
          ])
        );
      }

      Animated.sequence(animations).start(() => {
        setCurrentScreen(screen);
      });
    },
    [moodAnim, focusAnim, struggleAnim, successAnim]
  );

  // Update snap points when screen changes
  useEffect(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0);
    }
  }, []);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Expose methods via ref
  useImperativeHandle(
    checkInRef,
    () => ({
      expand: () => {
        appLog('[GlobalCheckIn] expand() called, isSheetVisible:', isSheetVisible, 'isClosing:', isClosing);
        
        // If currently closing, wait and retry
        if (isClosing) {
          appLog('[GlobalCheckIn] Sheet is closing, waiting to expand...');
          expandAttempts.current++;
          if (expandAttempts.current < 3) {
            setTimeout(() => {
              checkInRef.current?.expand();
            }, 400);
          }
          return;
        }
        
        // Reset expand attempts
        expandAttempts.current = 0;
        
        // Reset to initial state when opening
        setCurrentScreen('mood');
        setSelectedMood(null);
        setSelectedFocus(null);
        setSelectedStruggle(null);
        clearCurrentSession();
        setCheckInSaved(false);
        setIsGenerating(false);
        setGemsAwarded(false);
        setShowRewardAnimation(false);
        moodAnim.setValue(0);
        focusAnim.setValue(screenWidth);
        struggleAnim.setValue(screenWidth);
        successAnim.setValue(screenWidth);
        rewardCardOpacity.setValue(0);
        rewardCardScale.setValue(0.8);
        gemTextOpacity.setValue(0);

        // Force expand using snapToIndex
        setIsSheetVisible(true);
        requestAnimationFrame(() => {
          bottomSheetRef.current?.snapToIndex(0);
        });

        // Log analytics for check-in shown
        analytics.logEvent('checkin_sheet_shown', {
          trigger: 'custom_devotional',
          hasBeenOneHour: useCheckInStore.getState().hasBeenOneHourSinceLastCheckIn(),
        });
      },
      close: () => {
        appLog('[GlobalCheckIn] close() called');
        setIsClosing(true);
        bottomSheetRef.current?.close();
      },
      forceShow: () => {
        appLog('[GlobalCheckIn] forceShow() called');
        
        // Reset expand attempts
        expandAttempts.current = 0;
        
        // First, force close if visible
        if (isSheetVisible) {
          setIsClosing(true);
          bottomSheetRef.current?.close();
          
          // Wait for close to complete, then expand
          setTimeout(() => {
            setIsClosing(false);
            checkInRef.current?.expand();
          }, 400);
        } else {
          // Not visible, just expand
          setIsClosing(false);
          checkInRef.current?.expand();
        }
        
        // Log analytics
        analytics.logEvent('checkin_sheet_force_shown', {
          trigger: 'custom_devotional'
        });
      },
    }),
    [moodAnim, focusAnim, struggleAnim, successAnim, clearCurrentSession, isSheetVisible, isClosing]
  );

  // Mood options with corresponding lamb images
  const moods = [
    {
      emoji: '😊',
      label: i18n.t('checkin_mood_great'),
      value: 'Great',
      image: require('../assets/icons/moods/greatLamb.png'),
    },
    {
      emoji: '😔',
      label: i18n.t('checkin_mood_good'),
      value: 'good',
      image: require('../assets/icons/moods/goodLamb.png'),
    },
    {
      emoji: '😌',
      label: i18n.t('checkin_mood_meh'),
      value: 'meb',
      image: require('../assets/icons/moods/sheepIcon.png'),
    },
    {
      emoji: '😤',
      label: i18n.t('checkin_mood_bad'),
      value: 'bad',
      image: require('../assets/icons/moods/sadLamb.png'),
    },
    {
      emoji: '😴',
      label: i18n.t('checkin_mood_very_bad'),
      value: 'veryBad',
      image: require('../assets/icons/moods/reallyBadLamb.png'),
    },
    {
      emoji: '🤗',
      label: i18n.t('checkin_mood_angry'),
      value: 'angry',
      image: require('../assets/icons/moods/angryLamb.png'),
    },
  ];

  // Focus areas with colors matching the style
  const focusAreas = [
    {
      icon: 'leaf',
      iconType: 'ionicon',
      label: i18n.t('checkin_focus_peace'),
      value: 'peace',
      color: '#24CA17',
      bgColor: 'bg-lightGreen',
    },
    {
      icon: 'hands-praying',
      iconType: 'fontawesome6',
      label: i18n.t('checkin_focus_gratitude'),
      value: 'gratitude',
      color: '#E64132',
      bgColor: 'bg-lightRed',
    },
    {
      icon: 'flower',
      iconType: 'ionicon',
      label: i18n.t('checkin_focus_humility'),
      value: 'humility',
      color: '#7B2BFF',
      bgColor: 'bg-lightPurple',
    },
    {
      icon: 'hand-holding-heart',
      iconType: 'fontawesome6',
      label: i18n.t('checkin_focus_compassion'),
      value: 'compassion',
      color: '#E6319E',
      bgColor: 'bg-lightPink',
    },
    {
      icon: 'shield',
      iconType: 'ionicon',
      label: i18n.t('checkin_focus_courage'),
      value: 'courage',
      color: '#2196F3',
      bgColor: 'bg-lightBlue',
    },
    {
      icon: 'sunny',
      iconType: 'ionicon',
      label: i18n.t('checkin_focus_peace'),
      value: 'peace2',
      color: '#F7B500',
      bgColor: 'bg-lightYellow',
    },
    {
      icon: 'star',
      iconType: 'ionicon',
      label: i18n.t('checkin_focus_faith'),
      value: 'faith',
      color: '#17CABC',
      bgColor: 'bg-lightTeal',
    },
    {
      icon: 'time',
      iconType: 'ionicon',
      label: i18n.t('checkin_focus_patience'),
      value: 'patience',
      color: '#F7B500',
      bgColor: 'bg-lightYellow',
    },
  ];

  // Struggle areas with appropriate icons and colors
  const struggleAreas = [
    {
      icon: 'eye',
      iconType: 'ionicon',
      label: i18n.t('checkin_struggle_lust'),
      value: 'lust',
      color: '#E64132',
      bgColor: 'bg-lightRed',
      verse: 'Matt 5:28', // "But I tell you that anyone who looks at a woman lustfully..."
    },
    {
      icon: 'face-angry',
      iconType: 'fontawesome6',
      label: i18n.t('checkin_struggle_envy'),
      value: 'envy',
      color: '#E64132',
      bgColor: 'bg-lightRed',
      verse: 'Prov 14:30', // "A heart at peace gives life to the body, but envy rots the bones"
    },
    {
      icon: 'flash',
      iconType: 'ionicon',
      label: i18n.t('checkin_struggle_anger'),
      value: 'anger',
      color: '#C81E28',
      bgColor: 'bg-lightCrimson',
      verse: 'Eph 4:26', // "In your anger do not sin"
    },
    {
      icon: 'cash',
      iconType: 'ionicon',
      label: i18n.t('checkin_struggle_greed'),
      value: 'greed',
      color: '#24CA17',
      bgColor: 'bg-lightGreen',
      verse: '1 Tim 6:10', // "For the love of money is a root of all kinds of evil"
    },
    {
      icon: 'bed',
      iconType: 'ionicon',
      label: i18n.t('checkin_struggle_laziness'),
      value: 'laziness',
      color: '#7B2BFF',
      bgColor: 'bg-lightPurple',
      verse: 'Prov 6:6', // "Go to the ant, you sluggard"
    },
    {
      icon: 'trophy',
      iconType: 'ionicon',
      label: i18n.t('checkin_struggle_pride'),
      value: 'pride',
      color: '#FF8C1A',
      bgColor: 'bg-lightOrange',
      verse: 'Prov 16:18', // "Pride goes before destruction"
    },
    {
      icon: 'glasses',
      iconType: 'ionicon',
      label: i18n.t('checkin_struggle_vanity'),
      value: 'vanity',
      color: '#E6319E',
      bgColor: 'bg-lightPink',
      verse: 'Ecc 1:2', // "Vanity of vanities, all is vanity"
    },
    {
      icon: 'hourglass',
      iconType: 'ionicon',
      label: i18n.t('checkin_struggle_impatience'),
      value: 'impatience',
      color: '#18B2B6',
      bgColor: 'bg-lightCyan',
      verse: 'James 5:7', // "Be patient, then, brothers and sisters"
    },
    {
      icon: 'restaurant',
      iconType: 'ionicon',
      label: i18n.t('checkin_struggle_gluttony'),
      value: 'gluttony',
      color: '#2196F3',
      bgColor: 'bg-lightBlue',
      verse: 'Phil 3:19', // "Their god is their stomach"
    },
  ];

  const renderMoodScreen = () => {
    const dimensions = getResponsiveCardDimensions();
    const imageSize = RPH(8); // Responsive image size
    
    return (
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: RPH(2),
          transform: [{ translateX: moodAnim }],
        }}>
        <Text className="font-feather text-2xl text-textPrimary mb-2 text-center px-2">
          {i18n.t('checkin_how_are_you_feeling')}
        </Text>
        <Text className="font-feather text-xl mb-6 text-center px-1 text-textPrimary/70">
          {i18n.t('checkin_select_mood_help')}
        </Text>
        <View className="flex-1 w-full flex-row flex-wrap justify-center items-center gap-2  px-2">
          {moods.map((mood) => (
            <Pressable
              key={mood.value}
              onPress={() => {
                setSelectedMood(mood.value);
                setMood(mood.value);
                hapticMedium();
                analytics.logEvent('checkin_mood_selected', { mood: mood.value });
                setTimeout(() => {
                  animateToScreen('focus');
                }, 200);
              }}
              className={`w-[30%] rounded-3xl border-[2.5px] items-center justify-center
                ${
                  selectedMood === mood.value
                    ? 'border-orange bg-white/90'
                    : 'border-accentGold bg-white/60'
                }`}>
              <Image
                source={mood.image}
                style={{ width: imageSize, height: imageSize }}
                resizeMode="contain"
                className=""
              />
              <Text className="font-din text-base text-textPrimary p-1">{mood.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderFocusScreen = () => {
    const dimensions = getResponsiveCardDimensions();
    const iconSize = dimensions.isSmallDevice ? RPH(2.8) : RPH(3.5);
    
    return (
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: RPH(2),
          transform: [{ translateX: focusAnim }],
        }}>
        <Text className="font-feather text-2xl text-textPrimary mb-2 text-center px-2">
          {i18n.t('checkin_what_focus_on')}
        </Text>
        <Text className="font-feather text-xl mb-6 text-center px-1 text-textPrimary/70">
          {i18n.t('checkin_select_focus_help')}
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: RPH(2) }}
          className="flex-1 w-full">
          <View className="flex-row flex-wrap justify-center gap-3 px-2">
            {focusAreas.map((focus) => (
              <Pressable
                key={focus.value}
                onPress={() => {
                  setSelectedFocus(focus.value);
                  setFocus(focus.value);
                  hapticMedium();
                  analytics.logEvent('checkin_focus_selected', { focus: focus.value });
                  setTimeout(() => {
                    animateToScreen('struggle');
                  }, 100);
                }}
                className={`w-[31%] rounded-3xl border-[2.5px] items-center justify-center p-2
                  ${
                    selectedFocus === focus.value
                      ? 'border-orange bg-white/90'
                      : 'border-accentGold bg-white/60'
                  }`}>
                <View className={`${focus.bgColor} rounded-2xl p-3`}>
                  {focus.iconType === 'fontawesome6' ? (
                    <FontAwesome6 name={focus.icon as any} size={iconSize} color={focus.color} />
                  ) : (
                    <Ionicons name={focus.icon as any} size={iconSize} color={focus.color} />
                  )}
                </View>
                <Text className="font-din text-sm text-textPrimary text-center mt-2">
                  {focus.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View className="w-full px-4 pb-4">
          <Pressable
            onPress={() => {
              skipFocus();
              hapticMedium();
              analytics.logEvent('checkin_focus_skipped');
              setTimeout(() => {
                animateToScreen('struggle');
              }, 100);
            }}
            className="border-accentGold/40">
            <Text className="font-din text-base text-gray-600 text-center underline">
              {i18n.t('checkin_skip_this_step')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const renderStruggleScreen = () => {
    const dimensions = getResponsiveCardDimensions();
    const iconSize = dimensions.isSmallDevice ? RPH(4.2) : RPH(3.7);
    
    return (
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          paddingHorizontal: 2,
          justifyContent: 'center',
          transform: [{ translateX: struggleAnim }],
        }}>
        <Text className="font-feather text-2xl text-textPrimary text-center px-2 mb-2 mt-4">
          {i18n.t('checkin_what_struggling_with')}
        </Text>
        <Text className="font-feather text-xl text-center mb-6 text-textPrimary/70">
          {i18n.t('checkin_select_struggle_help')}
        </Text>

        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-center gap-3">
            {struggleAreas.map((struggle) => (
              <Pressable
                key={struggle.value}
                onPress={() => {
                  setSelectedStruggle(struggle.value);
                  setStruggle(struggle.value);
                  hapticMedium();
                  analytics.logEvent('checkin_struggle_selected', { struggle: struggle.value });
                  setTimeout(async () => {
                    await handleCompleteCheckIn();
                    animateToScreen('success');
                  }, 100);
                }}
                className={`w-[28%] rounded-3xl border-[2.5px] items-center justify-center p-2
                  ${
                    selectedStruggle === struggle.value
                      ? 'border-orange bg-white/90'
                      : 'border-accentGold bg-white/60'
                  }`}>
                <View className={`${struggle.bgColor} rounded-2xl p-2.5 mb-1.5`}>
                  {struggle.iconType === 'fontawesome6' ? (
                    <FontAwesome6
                      name={struggle.icon as any}
                      size={iconSize}
                      color={struggle.color}
                    />
                  ) : (
                    <Ionicons name={struggle.icon as any} size={iconSize} color={struggle.color} />
                  )}
                </View>
                <Text className="font-din text-sm text-textPrimary text-center mb-1">
                  {struggle.label}
                </Text>
              
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View className="px-4 pb-4">
          <Pressable
            onPress={() => {
              skipStruggle();
              hapticMedium();
              analytics.logEvent('checkin_struggle_skipped');
              setTimeout(async () => {
                await handleCompleteCheckIn();
                animateToScreen('success');
              }, 100);
            }}
            className="border-accentGold/40">
            <Text className="font-din text-base text-gray-600 text-center underline">
              {i18n.t('checkin_skip_this_step')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  // Trigger animations when success screen is shown
  useEffect(() => {
    if (currentScreen === 'success' && showRewardAnimation) {
      // Reset animation values
      rewardCardOpacity.setValue(0);
      rewardCardScale.setValue(0.8);
      gemTextOpacity.setValue(0);

      // Play chest opening sound
      playChestOpeningSound?.();

      // Start Rive animation
      setTimeout(() => {
        if (riveRef.current) {
          riveRef.current.play();
        }
      }, 50);
      
      // Animate reward card with bounce effect
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(rewardCardOpacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(rewardCardScale, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Animate gem text after card appears
          Animated.sequence([
            Animated.delay(100),
            Animated.timing(gemTextOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 200);
    }
  }, [currentScreen, showRewardAnimation]);

  const renderSuccessScreen = () => (
    <Animated.View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: RPH(2),
        transform: [{ translateX: successAnim }],
      }}>
      <Text className="font-feather text-2xl text-textPrimary text-center px-4">
        {i18n.t('checkin_complete')}
      </Text>
      {showRewardAnimation && riveAssets ? (
        <View className="w-full items-center justify-center" style={{ height: RPH(20) }}>
          {IS_ANDROID ? (
            <Rive
              ref={riveRef}
              resourceName={'success_lamb'}
              artboardName="chest"
              autoplay={true}
              style={{ width: '160%', height: '160%' }}
            />
          ) : (
            <Rive
              ref={riveRef}
              resourceName='success_lamb'
              artboardName="chest"
              autoplay={true}
              style={{ width: '160%', height: '160%' }}
            />
          )}
        </View>
      ) : (
        <View className="items-center justify-center" style={{ height: RPH(20) }}>
          <View className="bg-green-50 rounded-full w-28 h-28 items-center justify-center border-4 border-green-100">
            <Ionicons name="checkmark-circle" size={RPH(8)} color="#10B981" />
          </View>
        </View>
      )}

      {showRewardAnimation && (
        <View className="items-center">
          <Animated.View
            className="bg-white/80 rounded-[28px] px-8 py-6 border-[2.5px] border-accentGold w-[85%] max-w-sm"
            style={{
              opacity: rewardCardOpacity,
              transform: [{ scale: rewardCardScale }],
            }}>
            <Text className="text-sm font-din text-[#B89B4C] text-center uppercase mb-3 tracking-wider">
              {i18n.t('checkin_rewards')}
            </Text>
            <Animated.View
              className="flex-row items-center justify-center"
              style={{ opacity: gemTextOpacity }}>
              <Image source={gemIcon} style={{ width: RPH(4), height: RPH(4) }} className="mr-3" />
              <Text className="font-din text-textPrimary text-3xl font-bold">{i18n.t('checkin_gems_awarded')}</Text>
            </Animated.View>
          </Animated.View>
        </View>
      )}

      <View className="w-full space-y-3 mt-2 px-4 pb-8 gap-3">
        <PrimaryButton
          title={
            currentFocus !== '' || currentStruggle !== ''
              ? (() => {
                  // Check if user is pro
                  const { isProMember } = useSubscriptionStore.getState();
                  const { getUser, customDevotionalsLeft } = useUserStore.getState();
                  const user = getUser();
                  
                  // If user is pro, show normal text
                  if (isProMember || user?.isPro || user?.isProWithReferral) {
                    return i18n.t('checkin_generate_custom_devotional');
                  }
                  
                  // If user has custom devotionals left, show normal text
                  if (customDevotionalsLeft > 0) {
                    return i18n.t('checkin_generate_custom_devotional');
                  }
                  
                  // If user is not pro and has no custom devotionals left, show with gem cost
                  return `${i18n.t('checkin_generate_custom_devotional_for_gems')} (-200)`;
                })()
              : i18n.t('checkin_start_todays_devotional')
          }
          onPress={async () => {
            if (currentFocus !== '' || currentStruggle !== '') {
              // Check if user is pro or has custom devotionals left
              const { isProMember } = useSubscriptionStore.getState();
              const { getUser, customDevotionalsLeft } = useUserStore.getState();
              const user = getUser();
              
              // Check if user is pro
              const isPro = isProMember || user?.isPro || user?.isProWithReferral;
              
              if (isPro) {
                // Pro user - generate custom devotional directly (skip pro check)
                appLog('[GlobalCheckIn] Pro user generating custom devotional');
                await handleGenerateCustomDevotional(true);
                return;
              }
              
              // Non-pro user - check if they have custom devotionals left
              if (customDevotionalsLeft > 0) {
                // User has custom devotionals left - generate directly (skip pro check)
                appLog('[GlobalCheckIn] User has custom devotionals left, generating');
                await handleGenerateCustomDevotional(true);
                setCustomDevotionalsLeft(customDevotionalsLeft > 0 ? customDevotionalsLeft - 1 : 0);
                return;
              }
              
              // Non-pro user with no custom devotionals left - show purchase flow
              appLog('[GlobalCheckIn] Non-pro user needs to purchase custom devotional');
              await handleCustomDevotionalPurchase();
            } else {
              // Check-in already saved, just log analytics
              analytics.logEvent('checkin_completed', {
                mood: currentMood,
                focus: currentFocus,
                struggle: currentStruggle,
              });

              // Set navigation flag to prevent check-in from showing during navigation
              const { setIsNavigating } = useCheckInStore.getState();
              setIsNavigating(true);

              // Close the sheet directly without handleDismiss to prevent reappearing
              bottomSheetRef.current?.close();

              // Navigate after sheet closes
              setTimeout(() => {
                router.push('/(tabs)');

                // Reset navigation flag after a delay
                setTimeout(() => {
                  setIsNavigating(false);
                }, 2000); // 2 seconds for home navigation

                // Reset state after navigation
                setTimeout(() => {
                  setCurrentScreen('mood');
                  setSelectedMood(null);
                  setSelectedFocus(null);
                  setSelectedStruggle(null);
                  clearCurrentSession();
                  setIsGenerating(false);
                  setGemsAwarded(false);
                  setShowRewardAnimation(false);
                  // Reset animations
                  moodAnim.setValue(0);
                  focusAnim.setValue(screenWidth);
                  struggleAnim.setValue(screenWidth);
                  successAnim.setValue(screenWidth);
                  rewardCardOpacity.setValue(0);
                  rewardCardScale.setValue(0.8);
                  gemTextOpacity.setValue(0);
                }, 100);
              }, 300);
            }
          }}
          style="w-full"
          buttonType="gold"
          disabled={isGenerating}
          hasGemsInside={
            currentFocus !== '' || currentStruggle !== ''
              ? (() => {
                  // Check if user is pro
                  const { isProMember } = useSubscriptionStore.getState();
                  const { getUser, customDevotionalsLeft } = useUserStore.getState();
                  const user = getUser();
                  
                  // If user is pro, don't show gem icon
                  if (isProMember || user?.isPro || user?.isProWithReferral) {
                    return false;
                  }
                  
                  // If user has custom devotionals left, don't show gem icon
                  if (customDevotionalsLeft > 0) {
                    return false;
                  }
                  
                  // If user is not pro and has no custom devotionals left, show gem icon
                  return true;
                })()
              : false
          }
        />

        {isGenerating && (
          <Text className="font-din text-sm text-gray-500 text-center py-2">
            {i18n.t('checkin_generating_personalized')}
          </Text>
        )}

        {!readingCompleted && (
          <Pressable
            onPress={async () => {
              hapticMedium();
              analytics.logEvent('checkin_start_worldwide_devotional_tapped', {
                mood: currentMood,
                focus: currentFocus,
                struggle: currentStruggle,
              });

              // Log the check-in completion
              appLog('Starting worldwide devotional check-in completion...');

              // Check-in already saved when struggle was selected/skipped

              // Verify the check-in was saved
              const checkInState = useCheckInStore.getState();
              appLog('Check-in state after completion:', {
                lastCheckInTime: checkInState.lastCheckInTime,
                hasBeenOneHour: checkInState.hasBeenOneHourSinceLastCheckIn(),
              });

              // Log analytics
              analytics.logEvent('checkin_completed', {
                mood: currentMood,
                focus: currentFocus,
                struggle: currentStruggle,
                source: 'start_worldwide_devotional',
              });

              // Set navigation flag to prevent check-in from showing during navigation
              const { setIsNavigating } = useCheckInStore.getState();
              setIsNavigating(true);

              // Close the sheet first
              bottomSheetRef.current?.close();

              // Wait a bit for sheet to start closing, then trigger devotional
              setTimeout(() => {
                // Trigger the daily bread devotional
                const triggerDailyBread = (global as any).triggerDailyBread;
                if (triggerDailyBread && typeof triggerDailyBread === 'function') {
                  appLog('Triggering daily bread from check-in...');
                  triggerDailyBread();
                } else {
                  console.error('triggerDailyBread function not found on global');
                }

                // Reset navigation flag after a delay
                setTimeout(() => {
                  setIsNavigating(false);
                }, 2000);

                // Reset check-in state after triggering devotional
                setTimeout(() => {
                  setCurrentScreen('mood');
                  setSelectedMood(null);
                  setSelectedFocus(null);
                  setSelectedStruggle(null);
                  clearCurrentSession();
                  setIsGenerating(false);
                  setCheckInSaved(false);
                  setGemsAwarded(false);
                  setShowRewardAnimation(false);
                  // Reset animations
                  moodAnim.setValue(0);
                  focusAnim.setValue(screenWidth);
                  struggleAnim.setValue(screenWidth);
                  successAnim.setValue(screenWidth);
                  rewardCardOpacity.setValue(0);
                  rewardCardScale.setValue(0.8);
                  gemTextOpacity.setValue(0);
                }, 300);
              }, 300); // Reduced wait time for better UX
            }}
            className=" border-accentGold/40">
            <Text className="font-din text-base text-gray-600 text-center underline">
              {i18n.t('checkin_start_worldwide_devotional')}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{
        backgroundColor: '#FFF4D9',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
      }}
      handleIndicatorStyle={{
        backgroundColor: '#DCB280',
        height: 6,
        width: 60,
        borderRadius: 3,
      }}
      backdropComponent={renderBackdrop}
      onChange={(index) => {
        appLog('[GlobalCheckIn] BottomSheet changed to index:', index);
        
        // Update visibility state
        const wasVisible = isSheetVisible;
        const isNowVisible = index >= 0;
        setIsSheetVisible(isNowVisible);
        
        // If sheet just closed
        if (wasVisible && !isNowVisible) {
          appLog('[GlobalCheckIn] Sheet closed, marking as not closing');
          setIsClosing(false);
          
          // Reset states after close
          setTimeout(() => {
            setCurrentScreen('mood');
            setSelectedMood(null);
            setSelectedFocus(null);
            setSelectedStruggle(null);
            clearCurrentSession();
            setIsGenerating(false);
            setCheckInSaved(false);
            setGemsAwarded(false);
            setShowRewardAnimation(false);
            // Reset animations
            moodAnim.setValue(0);
            focusAnim.setValue(screenWidth);
            struggleAnim.setValue(screenWidth);
            successAnim.setValue(screenWidth);
            rewardCardOpacity.setValue(0);
            rewardCardScale.setValue(0.8);
            gemTextOpacity.setValue(0);
          }, 300);
        }
      }}>
      <BottomSheetView
        style={{
          width: '100%',
          height: '100%',
          paddingTop: 16,
          overflow: 'hidden',
        }}>
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Top Right Close Button */}
          <Pressable
            style={{
              position: 'absolute',
              top: -15,
              right: 20,
              width: 36,
              height: 36,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
            onPress={handleDismiss}
          >
            <FontAwesome6 name="xmark" size={18} color="#634012" />
          </Pressable>

          {/* All screens are rendered but with proper touch handling */}
          <View
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            pointerEvents={currentScreen === 'mood' ? 'auto' : 'none'}>
            {renderMoodScreen()}
          </View>
          <View
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            pointerEvents={currentScreen === 'focus' ? 'auto' : 'none'}>
            {renderFocusScreen()}
          </View>
          <View
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            pointerEvents={currentScreen === 'struggle' ? 'auto' : 'none'}>
            {renderStruggleScreen()}
          </View>
          <View
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            pointerEvents={currentScreen === 'success' ? 'auto' : 'none'}>
            {renderSuccessScreen()}
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default GlobalCheckIn;