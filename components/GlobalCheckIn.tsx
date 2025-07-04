import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import React, { useCallback, useRef, useImperativeHandle, useState, useEffect } from 'react';
import { View, Text, Pressable, Animated, Dimensions, Image } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { useAssets } from 'expo-asset';

import PrimaryButton from './PrimaryButton';
import { hapticMedium } from '~/utils/haptics';
import { RPH } from '~/app/helper/helper';
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

// Import gem icon
import gemIcon from '../assets/icons/greenGemIcon.png';
import heartIcon from '../assets/icons/heartIcon.png';

export type GlobalCheckInRef = {
  expand: () => void;
  close: () => void;
};

interface GlobalCheckInProps {
  checkInRef: React.RefObject<GlobalCheckInRef>;
}

type CheckInScreen = 'welcome' | 'heart' | 'prayer' | 'blessing';

const { width: screenWidth } = Dimensions.get('window');

const GlobalCheckIn: React.FC<GlobalCheckInProps> = ({ checkInRef }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [currentScreen, setCurrentScreen] = useState<CheckInScreen>('welcome');
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkInSaved, setCheckInSaved] = useState(false);

  // Hooks
  const router = useRouter();
  const { setCustomDevotional, setIsFromCheckIn, createCustomDevotionalFromCheckIn } = useDevotionalStore();
  const { readingCompleted } = useHomeStore();
  const { addCheckIn, getGens, setGens } = useUserStore();
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
  const [selectedHeart, setSelectedHeart] = useState<string | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null);
  
  // State for gem reward
  const [gemsAwarded, setGemsAwarded] = useState(false);
  const [showBlessings, setShowBlessings] = useState(false);

  // Animation values for each screen
  const welcomeAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(screenWidth)).current;
  const prayerAnim = useRef(new Animated.Value(screenWidth)).current;
  const blessingAnim = useRef(new Animated.Value(screenWidth)).current;
  
  // Animation values for blessings
  const blessingOpacity = useRef(new Animated.Value(0)).current;
  const blessingScale = useRef(new Animated.Value(0.8)).current;
  const gemTextOpacity = useRef(new Animated.Value(0)).current;
  
  // Animation for mood spiral rotation
  const spiralRotation = useRef(new Animated.Value(0)).current;
  
  // Rive ref for blessing animation
  const riveRef = useRef<RiveRef>(null);
  
  // Load Rive assets
  const [riveAssets] = useAssets([require('../assets/riveAnimations/successLamb.riv')]);

  // Dynamic snap points based on current screen
  const snapPoints = currentScreen === 'blessing' ? ['70%'] : ['68%'];

  // Complete check-in and save to both stores
  const handleCompleteCheckIn = useCallback(async () => {
    if (checkInSaved) {
      console.log('[GlobalCheckIn] Check-in already saved, skipping...');
      return;
    }

    console.log('Completing heart check-in with:', {
      heart: selectedHeart,
      prayer: selectedPrayer
    });

    // Map our new format to the existing store format
    setMood(selectedHeart || 'peaceful');
    setFocus(selectedPrayer || 'gratitude');
    setStruggle(''); // We're not asking about struggles anymore

    completeCheckIn();

    // Save to userStore for Firestore sync
    const checkInData = {
      mood: selectedHeart || 'peaceful',
      focus: selectedPrayer || 'gratitude',
      struggle: '',
      completedAt: Timestamp.now()
    };

    const now = new Date();
    const timestamp = now.getTime();
    const dateKey = `${timestamp}`;

    console.log('Saving check-in data to userStore with key:', dateKey, checkInData);
    
    await addCheckIn(dateKey, checkInData as any);

    console.log('Check-in completed and saved to both stores');
    setCheckInSaved(true);
    
    // Award 25 gems for completing check-in
    if (!gemsAwarded) {
      const currentGems = getGens();
      setGens(currentGems + 25);
      setGemsAwarded(true);
      setShowBlessings(true);
      console.log(`Awarded +25 Gems for check-in. New total: ${currentGems + 25}`);
      
      // Log analytics
      analytics.logEvent('checkin_gems_awarded', {
        gemsAwarded: 25,
        newGemCount: currentGems + 25,
        heart: selectedHeart,
        prayer: selectedPrayer
      });
    }
  }, [selectedHeart, selectedPrayer, completeCheckIn, addCheckIn, checkInSaved, gemsAwarded, getGens, setGens, setMood, setFocus, setStruggle]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.close();
    setTimeout(() => {
      setCurrentScreen('welcome');
      setSelectedHeart(null);
      setSelectedPrayer(null);
      clearCurrentSession();
      setIsGenerating(false);
      setCheckInSaved(false);
      setGemsAwarded(false);
      setShowBlessings(false);
      // Reset animations
      welcomeAnim.setValue(0);
      heartAnim.setValue(screenWidth);
      prayerAnim.setValue(screenWidth);
      blessingAnim.setValue(screenWidth);
      blessingOpacity.setValue(0);
      blessingScale.setValue(0.8);
      gemTextOpacity.setValue(0);
    }, 300);
    hapticMedium();
  }, [welcomeAnim, heartAnim, prayerAnim, blessingAnim, clearCurrentSession, blessingOpacity, blessingScale, gemTextOpacity]);

  // Handle custom devotional generation
  const handleGenerateCustomDevotional = useCallback(async () => {
    console.log('[GlobalCheckIn] Generating custom devotional');
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.error('No authenticated user available for generating devotional');
      return;
    }

    setIsGenerating(true);

    try {
      const idToken = await currentUser.getIdToken();

      const checkInData = {
        mood: selectedHeart || 'peaceful',
        focus: selectedPrayer || 'gratitude',
        struggle: '' // No struggles in new flow
      };

      console.log('[GlobalCheckIn] Generating with data:', checkInData);

      const customDevotional = await createDevotionalFromCheckIn(checkInData, idToken);

      const backgroundUrls = Object.values(devotionalBackgrounds);
      const randomBackground = backgroundUrls[Math.floor(Math.random() * backgroundUrls.length)];

      const fullDevotional: Devotional = {
        id: 'custom-checkin',
        title: customDevotional.title,
        content: customDevotional.context,
        createdAt: new Date().toISOString(),
        context: customDevotional.context,
        bibleReference: customDevotional.bibleReference || '',
        prayer: customDevotional.prayer,
        reflectionPrompt: customDevotional.reflectionPrompt,
        likes: 0,
        shares: 0,
        completed: 0,
        date: new Date().toISOString().split('T')[0],
        imageURL: randomBackground,
        verse: customDevotional.verse || ''
      };

      await createCustomDevotionalFromCheckIn(fullDevotional);
      await handleCompleteCheckIn();

      analytics.logEvent('checkin_custom_devotional_generated', {
        heart: selectedHeart,
        prayer: selectedPrayer
      });

    } catch (error) {
      console.error('Error generating custom devotional:', error);
      setIsGenerating(false);
    }
  }, [selectedHeart, selectedPrayer, setCustomDevotional, handleCompleteCheckIn, createCustomDevotionalFromCheckIn]);

  // Animate screen transitions
  const animateToScreen = useCallback((screen: CheckInScreen) => {
    const animations: Animated.CompositeAnimation[] = [];

    if (screen === 'heart') {
      animations.push(
        Animated.parallel([
          Animated.timing(welcomeAnim, {
            toValue: -screenWidth,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(heartAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ])
      );
    } else if (screen === 'prayer') {
      animations.push(
        Animated.parallel([
          Animated.timing(heartAnim, {
            toValue: -screenWidth,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(prayerAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ])
      );
    } else if (screen === 'blessing') {
      animations.push(
        Animated.parallel([
          Animated.timing(prayerAnim, {
            toValue: -screenWidth,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.spring(blessingAnim, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ])
      );
    }

    Animated.sequence(animations).start(() => {
      setCurrentScreen(screen);
    });
  }, [welcomeAnim, heartAnim, prayerAnim, blessingAnim]);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    []
  );

  // Expose methods via ref
  useImperativeHandle(
    checkInRef,
    () => ({
      expand: () => {
        bottomSheetRef.current?.expand();
        setCurrentScreen('welcome');
        setSelectedHeart(null);
        setSelectedPrayer(null);
        clearCurrentSession();
        setCheckInSaved(false);
        setIsGenerating(false);
        setGemsAwarded(false);
        setShowBlessings(false);
        welcomeAnim.setValue(0);
        heartAnim.setValue(screenWidth);
        prayerAnim.setValue(screenWidth);
        blessingAnim.setValue(screenWidth);
        blessingOpacity.setValue(0);
        blessingScale.setValue(0.8);
        gemTextOpacity.setValue(0);

        analytics.logEvent('checkin_sheet_shown', {
          trigger: 'heart_check_in',
        });
      },
      close: () => bottomSheetRef.current?.close(),
    }),
    [welcomeAnim, heartAnim, prayerAnim, blessingAnim, clearCurrentSession]
  );

  // Heart conditions - more gospel-focused
  const heartConditions = [
    { 
      value: 'grateful', 
      label: 'Grateful', 
      verse: 'Ps 100:4',
      icon: '🙏',
      color: '#24CA17',
      bgColor: 'bg-green-50',
      description: 'My heart overflows with thankfulness'
    },
    { 
      value: 'peaceful', 
      label: 'Peaceful', 
      verse: 'Phil 4:7',
      icon: '🕊️',
      color: '#2196F3',
      bgColor: 'bg-blue-50',
      description: 'His peace guards my heart and mind'
    },
    { 
      value: 'hopeful', 
      label: 'Hopeful', 
      verse: 'Rom 15:13',
      icon: '🌅',
      color: '#F7B500',
      bgColor: 'bg-yellow-50',
      description: 'My hope is anchored in His promises'
    },
    { 
      value: 'seeking', 
      label: 'Seeking', 
      verse: 'Jer 29:13',
      icon: '🔍',
      color: '#7B2BFF',
      bgColor: 'bg-purple-50',
      description: 'I am searching for His presence'
    },
    { 
      value: 'weary', 
      label: 'Weary', 
      verse: 'Matt 11:28',
      icon: '😌',
      color: '#E6319E',
      bgColor: 'bg-pink-50',
      description: 'I need His rest and renewal'
    },
    { 
      value: 'joyful', 
      label: 'Joyful', 
      verse: 'Neh 8:10',
      icon: '✨',
      color: '#17CABC',
      bgColor: 'bg-teal-50',
      description: 'His joy is my strength today'
    },
  ];

  // Prayer focus - simplified and more meaningful
  const prayerFocus = [
    { 
      value: 'worship', 
      label: 'Worship', 
      verse: 'Ps 95:6',
      icon: 'musical-notes',
      color: '#7B2BFF',
      description: 'I want to praise Him with my whole heart'
    },
    { 
      value: 'gratitude', 
      label: 'Gratitude', 
      verse: '1 Thess 5:18',
      icon: 'heart',
      color: '#E64132',
      description: 'I want to thank Him for His goodness'
    },
    { 
      value: 'guidance', 
      label: 'Guidance', 
      verse: 'Prov 3:6',
      icon: 'compass',
      color: '#2196F3',
      description: 'I need His wisdom for my path'
    },
    { 
      value: 'healing', 
      label: 'Healing', 
      verse: 'Ps 147:3',
      icon: 'medical',
      color: '#24CA17',
      description: 'I trust in His healing power'
    },
    { 
      value: 'provision', 
      label: 'Provision', 
      verse: 'Phil 4:19',
      icon: 'gift',
      color: '#F7B500',
      description: 'He will supply all my needs'
    },
    { 
      value: 'others', 
      label: 'Others', 
      verse: '1 Tim 2:1',
      icon: 'people',
      color: '#17CABC',
      description: 'I want to lift up those around me'
    },
  ];

  // Start spiral rotation animation on component mount
  useEffect(() => {
    const spinSpiral = () => {
      spiralRotation.setValue(0);
      Animated.timing(spiralRotation, {
        toValue: 1,
        duration: 15000, // 15 seconds for full rotation
        useNativeDriver: true,
      }).start(() => spinSpiral()); // Loop infinitely
    };
    
    spinSpiral();
  }, []);

  // Mood spiral component
  const MoodSpiral = () => {
    // Vrais émojis d'humeur quotidienne pour le check-in
    const moodEmojis = ['😊', '😔', '😰', '😌', '😤', '🤗', '😴', '🥰'];
    
    const rotation = spiralRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View className="w-40 h-40 items-center justify-center">
        {/* Outer ring */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            transform: [{ rotate: rotation }],
          }}
        >
          {moodEmojis.map((emoji, index) => {
            const angle = (index * 360) / moodEmojis.length;
            const radius = 65;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            
            return (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  left: 80 + x - 15,
                  top: 80 + y - 15,
                  width: 30,
                  height: 30,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
              </View>
            );
          })}
        </Animated.View>
        
        {/* Center heart */}
        <View className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full items-center justify-center shadow-lg border-2 border-pink-200">
          <Image 
            source={heartIcon} 
            className="w-10 h-10"
            style={{ tintColor: '#E91E63' }}
          />
        </View>
        
        {/* Inner glow effect */}
        <View className="absolute w-32 h-32 bg-gradient-to-br from-yellow-100/30 to-orange-100/30 rounded-full" />
      </View>
    );
  };


  const renderWelcomeScreen = () => (
    <Animated.View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        transform: [{ translateX: welcomeAnim }],
      }}>
      
      {/* Mood Spiral Animation */}
      <View className="mb-8">
        <MoodSpiral />
        
      </View>

      {/* Welcome message */}
      <Text className="font-feather text-2xl text-textPrimary text-center mb-4">
        Welcome to your Heart Check-in
      </Text>
      
      <Text className="font-din text-base text-gray-600 text-center mb-8 leading-relaxed px-4">
        Let's pause for a moment to connect with the Shepherd. 
        How is your heart today?
      </Text>
      
      <View className="w-full px-4">
        <PrimaryButton
          title="Begin"
          onPress={() => {
            hapticMedium();
            animateToScreen('heart');
            analytics.logEvent('checkin_welcome_begin');
          }}
          style="w-full"
          buttonType="gold"
        />
      </View>
      
      <Pressable onPress={handleDismiss} className="mt-6">
        <Text className="font-din text-sm text-gray-500">Maybe later</Text>
      </Pressable>
    </Animated.View>
  );

  const renderHeartScreen = () => (
    <Animated.View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        transform: [{ translateX: heartAnim }],
      }}>
      
      <Text className="font-feather text-xl text-textPrimary mb-2 text-center">
        How is your heart today?
      </Text>
      
      <Text className="font-din text-sm text-gray-600 mb-6 text-center">
        Choose what resonates with your spirit right now
      </Text>
      
      <View className="flex-row flex-wrap justify-center gap-3 mb-6">
        {heartConditions.map((heart) => (
          <Pressable
            key={heart.value}
            onPress={() => {
              setSelectedHeart(heart.value);
              hapticMedium();
              analytics.logEvent('checkin_heart_selected', { heart: heart.value });
              setTimeout(() => {
                animateToScreen('prayer');
              }, 150);
            }}
            className={`w-[45%] rounded-2xl border-2 p-4 items-center ${
              selectedHeart === heart.value
                ? 'bg-white border-orange shadow-lg'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
            
            <View className={`${heart.bgColor} rounded-full w-12 h-12 items-center justify-center mb-3`}>
              <Text className="text-2xl">{heart.icon}</Text>
            </View>
            
            <Text className="font-feather text-base text-textPrimary mb-1">
              {heart.label}
            </Text>
            
            <Text className="font-din text-xs text-gray-500 text-center">
              {heart.verse}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderPrayerScreen = () => (
    <Animated.View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        transform: [{ translateX: prayerAnim }],
      }}>
      
      <Text className="font-feather text-xl text-textPrimary mb-2 text-center">
        What's on your heart to pray about?
      </Text>
      
      <Text className="font-din text-sm text-gray-600 mb-6 text-center">
        Let's bring this before the Lord together
      </Text>
      
      <View className="flex-row flex-wrap justify-center gap-3 mb-6">
        {prayerFocus.map((prayer) => (
          <Pressable
            key={prayer.value}
            onPress={() => {
              setSelectedPrayer(prayer.value);
              hapticMedium();
              analytics.logEvent('checkin_prayer_selected', { prayer: prayer.value });
              setTimeout(async () => {
                await handleCompleteCheckIn();
                animateToScreen('blessing');
              }, 150);
            }}
            className={`w-[45%] rounded-2xl border-2 p-4 items-center ${
              selectedPrayer === prayer.value
                ? 'bg-white border-orange shadow-lg'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
            
            <View className="bg-blue-50 rounded-full w-12 h-12 items-center justify-center mb-3">
              <Ionicons name={prayer.icon as any} size={24} color={prayer.color} />
            </View>
            
            <Text className="font-feather text-base text-textPrimary mb-1">
              {prayer.label}
            </Text>
            
            <Text className="font-din text-xs text-gray-500 text-center">
              {prayer.verse}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  // Trigger animations when blessing screen is shown
  useEffect(() => {
    if (currentScreen === 'blessing' && showBlessings) {
      blessingOpacity.setValue(0);
      blessingScale.setValue(0.8);
      gemTextOpacity.setValue(0);
      
      playChestOpeningSound?.();
      
      setTimeout(() => {
        if (riveRef.current) {
          riveRef.current.play();
        }
      }, 100);
      
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(blessingOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(blessingScale, {
            toValue: 1,
            tension: 40,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(gemTextOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            })
          ]).start();
        });
      }, 800);
    }
  }, [currentScreen, showBlessings]);

  const renderBlessingScreen = () => (
    <Animated.View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        transform: [{ translateX: blessingAnim }],
      }}>
      
      {/* Blessing Animation */}
      {showBlessings && riveAssets ? (
        <View className="w-full items-center justify-center" style={{ height: RPH(18) }}>
          {IS_ANDROID ? (
            <Rive
              ref={riveRef}
              resourceName={'success_lamb'}
              artboardName="chest"
              autoplay={true}
              style={{ width: '180%', height: '180%' }}
            />
          ) : (
            <Rive
              ref={riveRef}
              url={(riveAssets && riveAssets[0] && riveAssets[0].uri) || ''}
              artboardName="chest"
              autoplay={true}
              style={{ width: '180%', height: '180%' }}
            />
          )}
        </View>
      ) : (
        <View className="items-center justify-center" style={{ height: RPH(18) }}>
          <View className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full w-32 h-32 items-center justify-center shadow-lg">
            <Text className="text-6xl">🙏</Text>
          </View>
        </View>
      )}
      
      <Text className="font-feather text-2xl text-textPrimary text-center mb-4">
        Blessed Are You
      </Text>
      
      <Text className="font-din text-base text-gray-600 text-center mb-6 leading-relaxed px-2">
        The Lord sees your heart and delights in your desire to seek Him.
      </Text>
      
      {/* Blessing Card */}
      {showBlessings && (
        <View className="items-center mb-6">
          <Animated.View
            className="bg-white rounded-3xl px-6 py-5 border border-gray-100"
            style={{
              opacity: blessingOpacity,
              transform: [{ scale: blessingScale }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 8,
              minWidth: '80%',
            }}>
            <Text className="text-xs font-din text-amber-600 text-center uppercase mb-3 tracking-widest">
              BLESSING RECEIVED
            </Text>
            <Animated.View 
              className="flex-row items-center justify-center"
              style={{ opacity: gemTextOpacity }}>
              <Image source={gemIcon} className="w-8 h-8 mr-3" />
              <Text className="font-feather text-textPrimary text-xl">+25 Gems</Text>
            </Animated.View>
          </Animated.View>
        </View>
      )}
      
      {/* Action Buttons */}
      <View className="w-full space-y-3">
        <PrimaryButton
          title={selectedPrayer ? "Receive Personal Word" : "Continue in His Presence"}
          onPress={async () => {
            if (selectedPrayer) {
              setIsFromCheckIn(true);
              const { setIsNavigating } = useCheckInStore.getState();
              setIsNavigating(true);
              
              bottomSheetRef.current?.close();
              
              setTimeout(() => {
                router.push('/devotionalLoading' as any);
                setTimeout(() => setIsNavigating(false), 3000);
                
                setTimeout(() => {
                  setCurrentScreen('welcome');
                  setSelectedHeart(null);
                  setSelectedPrayer(null);
                  clearCurrentSession();
                  setIsGenerating(false);
                  setCheckInSaved(false);
                  setGemsAwarded(false);
                  setShowBlessings(false);
                  welcomeAnim.setValue(0);
                  heartAnim.setValue(screenWidth);
                  prayerAnim.setValue(screenWidth);
                  blessingAnim.setValue(screenWidth);
                  blessingOpacity.setValue(0);
                  blessingScale.setValue(0.8);
                  gemTextOpacity.setValue(0);
                }, 100);
              }, 300);
              
              handleGenerateCustomDevotional();
            } else {
              analytics.logEvent('checkin_completed', {
                heart: selectedHeart,
                prayer: selectedPrayer
              });
              
              const { setIsNavigating } = useCheckInStore.getState();
              setIsNavigating(true);
              
              bottomSheetRef.current?.close();
              
              setTimeout(() => {
                router.push('/(tabs)');
                setTimeout(() => setIsNavigating(false), 2000);
                
                setTimeout(() => {
                  setCurrentScreen('welcome');
                  setSelectedHeart(null);
                  setSelectedPrayer(null);
                  clearCurrentSession();
                  setIsGenerating(false);
                  setGemsAwarded(false);
                  setShowBlessings(false);
                  welcomeAnim.setValue(0);
                  heartAnim.setValue(screenWidth);
                  prayerAnim.setValue(screenWidth);
                  blessingAnim.setValue(screenWidth);
                  blessingOpacity.setValue(0);
                  blessingScale.setValue(0.8);
                  gemTextOpacity.setValue(0);
                }, 100);
              }, 300);
            }
          }}
          style="w-full"
          buttonType="gold"
          disabled={isGenerating}
        />
        
        {isGenerating && (
          <Text className="font-din text-sm text-gray-500 text-center">
            Preparing your personal word from the Lord...
          </Text>
        )}
        
        {!readingCompleted && (
          <Pressable
            onPress={async () => {
              hapticMedium();
              analytics.logEvent('checkin_start_daily_devotional', {
                heart: selectedHeart,
                prayer: selectedPrayer
              });
              
              const { setIsNavigating } = useCheckInStore.getState();
              setIsNavigating(true);
              
              bottomSheetRef.current?.close();
              
              setTimeout(() => {
                const triggerDailyBread = (global as any).triggerDailyBread;
                if (triggerDailyBread && typeof triggerDailyBread === 'function') {
                  triggerDailyBread();
                }
                
                setTimeout(() => setIsNavigating(false), 2000);
                
                setTimeout(() => {
                  setCurrentScreen('welcome');
                  setSelectedHeart(null);
                  setSelectedPrayer(null);
                  clearCurrentSession();
                  setIsGenerating(false);
                  setCheckInSaved(false);
                  setGemsAwarded(false);
                  setShowBlessings(false);
                  welcomeAnim.setValue(0);
                  heartAnim.setValue(screenWidth);
                  prayerAnim.setValue(screenWidth);
                  blessingAnim.setValue(screenWidth);
                  blessingOpacity.setValue(0);
                  blessingScale.setValue(0.8);
                  gemTextOpacity.setValue(0);
                }, 300);
              }, 300);
            }}
            className="mt-3 py-3"
          >
            <Text className="font-din text-base text-gray-500 text-center underline">
              Join today's devotional
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
        backgroundColor: '#FEFCF7', 
        borderTopLeftRadius: 28, 
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        borderTopColor: '#F3E8D1'
      }}
      handleIndicatorStyle={{ backgroundColor: '#DCB280', height: 4, width: 40 }}
      backdropComponent={renderBackdrop}>
      <BottomSheetView style={{ width: '100%', height: '100%', paddingTop: 16, paddingBottom: 24 }}>
        <View style={{ flex: 1, position: 'relative' }}>
          {/* All screens rendered with proper touch handling */}
          <View
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            pointerEvents={currentScreen === 'welcome' ? 'auto' : 'none'}>
            {renderWelcomeScreen()}
          </View>
          <View
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            pointerEvents={currentScreen === 'heart' ? 'auto' : 'none'}>
            {renderHeartScreen()}
          </View>
          <View
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            pointerEvents={currentScreen === 'prayer' ? 'auto' : 'none'}>
            {renderPrayerScreen()}
          </View>
          <View
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            pointerEvents={currentScreen === 'blessing' ? 'auto' : 'none'}>
            {renderBlessingScreen()}
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default GlobalCheckIn;