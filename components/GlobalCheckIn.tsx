import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import React, { useCallback, useRef, useImperativeHandle, useState, useEffect } from 'react';
import { View, Text, Pressable, Animated, Dimensions, Image } from 'react-native';

import PrimaryButton from './PrimaryButton';
import { hapticMedium } from '~/utils/haptics';
import { RPH } from '~/app/helper/helper';
import analytics from '~/utils/analytics';
import { useCheckInStore } from '~/app/stores/checkInStore';
import { createDevotionalFromCheckIn } from '~/app/api/ai';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { useRouter } from 'expo-router';
import { Devotional } from '~/app/models/Devotional';
import auth from '@react-native-firebase/auth';

export type GlobalCheckInRef = {
  expand: () => void;
  close: () => void;
};

interface GlobalCheckInProps {
  checkInRef: React.RefObject<GlobalCheckInRef>;
}

type CheckInScreen = 'mood' | 'focus' | 'struggle' | 'success';

const { width: screenWidth } = Dimensions.get('window');

const GlobalCheckIn: React.FC<GlobalCheckInProps> = ({ checkInRef }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [currentScreen, setCurrentScreen] = useState<CheckInScreen>('mood');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Hooks
  const router = useRouter();
  const { setCustomDevotional, setIsFromCheckIn } = useDevotionalStore();
  
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
  
  // Animation values for each screen
  const moodAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(screenWidth)).current;
  const struggleAnim = useRef(new Animated.Value(screenWidth)).current;
  const successAnim = useRef(new Animated.Value(screenWidth)).current;

  // Fixed snap points - use 60% for all screens
  const snapPoints = ['60%'];

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.close();
    // Reset everything after sheet closes
    setTimeout(() => {
      setCurrentScreen('mood');
      setSelectedMood(null);
      setSelectedFocus(null);
      setSelectedStruggle(null);
      clearCurrentSession(); // Clear store session
      setIsGenerating(false); // Reset generating state
      // Reset animations
      moodAnim.setValue(0);
      focusAnim.setValue(screenWidth);
      struggleAnim.setValue(screenWidth);
      successAnim.setValue(screenWidth);
    }, 300);
    hapticMedium();
  }, [moodAnim, focusAnim, struggleAnim, successAnim, clearCurrentSession]);

  // Handle custom devotional generation
  const handleGenerateCustomDevotional = useCallback(async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.error('No authenticated user available for generating devotional');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Get the user's ID token
      const idToken = await currentUser.getIdToken();
      
      // Create the check-in data
      const checkInData = {
        mood: currentMood,
        focus: currentFocus,
        struggle: currentStruggle
      };
      
      console.log('Generating custom devotional with check-in data:', checkInData);
      
      // Generate the custom devotional
      const customDevotional = await createDevotionalFromCheckIn(checkInData, idToken);
      
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
        date: new Date().toISOString().split('T')[0],
        imageURL: 'https://firebasestorage.googleapis.com/v0/b/shepherd-c74ad.firebasestorage.app/o/waterBackground.png?alt=media&token=b0266692-ada8-4ec9-98ce-a1e0a242186d',
        verse: customDevotional.verse || ''
      };
      
      console.log('GlobalCheckIn: Full devotional object:', fullDevotional);
      console.log('GlobalCheckIn: Verse field:', fullDevotional.verse);
      console.log('GlobalCheckIn: BibleReference field:', fullDevotional.bibleReference);
      
      setCustomDevotional(fullDevotional);
      
      // Complete the check-in
      completeCheckIn();
      
      // Log analytics
      analytics.logEvent('checkin_custom_devotional_generated', {
        mood: currentMood,
        focus: currentFocus,
        struggle: currentStruggle
      });
      
      // Don't navigate here - it's already handled in the button onPress
      
    } catch (error) {
      console.error('Error generating custom devotional:', error);
      setIsGenerating(false);
      // You might want to show an error toast here
    }
  }, [currentMood, currentFocus, currentStruggle, setCustomDevotional, completeCheckIn, handleDismiss, router]);

  // Animate screen transitions
  const animateToScreen = useCallback((screen: CheckInScreen) => {
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
      // Slide struggle out to left, success in from right
      animations.push(
        Animated.parallel([
          Animated.timing(struggleAnim, {
            toValue: -screenWidth,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(successAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    }

    Animated.sequence(animations).start(() => {
      setCurrentScreen(screen);
    });
  }, [moodAnim, focusAnim, struggleAnim, successAnim]);

  // Update snap points when screen changes
  useEffect(() => {
    if (bottomSheetRef.current) {
      bottomSheetRef.current.snapToIndex(0);
    }
  }, [currentScreen]);

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
        bottomSheetRef.current?.expand();
        // Reset to initial state when opening
        setCurrentScreen('mood');
        setSelectedMood(null);
        setSelectedFocus(null);
        setSelectedStruggle(null);
        clearCurrentSession(); // Clear store session
        moodAnim.setValue(0);
        focusAnim.setValue(screenWidth);
        struggleAnim.setValue(screenWidth);
        successAnim.setValue(screenWidth);
      },
      close: () => bottomSheetRef.current?.close(),
    }),
    [moodAnim, focusAnim, struggleAnim, successAnim, clearCurrentSession]
  );

  // Mood options with corresponding lamb images
  const moods = [
    { emoji: '😊', label: 'Great', value: 'Great', image: require('../assets/icons/moods/greatLamb.png') },
    { emoji: '😔', label: 'Good', value: 'good', image: require('../assets/icons/moods/goodLamb.png') },
    { emoji: '😌', label: 'Meh', value: 'meb', image: require('../assets/icons/moods/sheepIcon.png') },
    { emoji: '😤', label: 'Bad', value: 'bad', image: require('../assets/icons/moods/sadLamb.png') },
    { emoji: '😴', label: 'Very Bad', value: 'veryBad', image: require('../assets/icons/moods/reallyBadLamb.png') },
    { emoji: '🤗', label: 'Angry', value: 'angry', image: require('../assets/icons/moods/angryLamb.png') },
  ];

  // Focus areas with colors matching the style
  const focusAreas = [
    { icon: 'leaf', iconType: 'ionicon', label: 'Peace', value: 'peace', color: '#24CA17', bgColor: 'bg-lightGreen' },
    { icon: 'hands-praying', iconType: 'fontawesome6', label: 'Gratitude', value: 'gratitude', color: '#E64132', bgColor: 'bg-lightRed' },
    { icon: 'flower', iconType: 'ionicon', label: 'Humility', value: 'humility', color: '#7B2BFF', bgColor: 'bg-lightPurple' },
    { icon: 'hand-holding-heart', iconType: 'fontawesome6', label: 'Compassion', value: 'compassion', color: '#E6319E', bgColor: 'bg-lightPink' },
    { icon: 'shield', iconType: 'ionicon', label: 'Courage', value: 'courage', color: '#2196F3', bgColor: 'bg-lightBlue' },
    { icon: 'sunny', iconType: 'ionicon', label: 'Peace', value: 'peace2', color: '#F7B500', bgColor: 'bg-lightYellow' },
    { icon: 'star', iconType: 'ionicon', label: 'Faith', value: 'faith', color: '#17CABC', bgColor: 'bg-lightTeal' },
    { icon: 'time', iconType: 'ionicon', label: 'Patience', value: 'patience', color: '#F7B500', bgColor: 'bg-lightYellow' },
  ];

  // Struggle areas with appropriate icons and colors
  const struggleAreas = [
    { icon: 'eye', iconType: 'ionicon', label: 'Lust', value: 'lust', color: '#E64132', bgColor: 'bg-lightRed' },
    { icon: 'face-angry', iconType: 'fontawesome6', label: 'Envy', value: 'envy', color: '#E64132', bgColor: 'bg-lightRed' },
    { icon: 'flash', iconType: 'ionicon', label: 'Anger', value: 'anger', color: '#C81E28', bgColor: 'bg-lightCrimson' },
    { icon: 'cash', iconType: 'ionicon', label: 'Greed', value: 'greed', color: '#24CA17', bgColor: 'bg-lightGreen' },
    { icon: 'bed', iconType: 'ionicon', label: 'Laziness', value: 'laziness', color: '#7B2BFF', bgColor: 'bg-lightPurple' },
    { icon: 'trophy', iconType: 'ionicon', label: 'Pride', value: 'pride', color: '#FF8C1A', bgColor: 'bg-lightOrange' },
    { icon: 'glasses', iconType: 'ionicon', label: 'Vanity', value: 'vanity', color: '#E6319E', bgColor: 'bg-lightPink' },
    { icon: 'hourglass', iconType: 'ionicon', label: 'Impatience', value: 'impatience', color: '#18B2B6', bgColor: 'bg-lightCyan' },
    { icon: 'restaurant', iconType: 'ionicon', label: 'Gluttony', value: 'gluttony', color: '#2196F3', bgColor: 'bg-lightBlue' },
  ];

  const renderMoodScreen = () => (
    <Animated.View 
      style={{
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        transform: [{ translateX: moodAnim }],
      }}>
      <Text className="font-feather text-heading text-textPrimary mb-8">How are you feeling right now?</Text>
      <View className="flex-row flex-wrap justify-center gap-8 mb-6 ">
        {moods.map((mood) => (
          <Pressable
            key={mood.value}
            onPress={() => {
              setSelectedMood(mood.value);
              setMood(mood.value); // Save to store
              hapticMedium();
              analytics.logEvent('checkin_mood_selected', { mood: mood.value });
              // Automatically move to focus screen after selecting mood
              setTimeout(() => {
                animateToScreen('focus');
              }, 200); // Slightly longer delay for better visual feedback
            }}
         
            className={`w-28 h-32 rounded-2xl border-2 items-center justify-center shadow-buttonShadow bg-surfaceCreamLight ${
              selectedMood === mood.value
                ? 'border-orange'
                : 'border-accentGold'
            }`}>
            <Image 
              source={mood.image}
              style={{ width: 90, height: 90, marginBottom: -8, marginTop: -12 }}
              resizeMode="contain"
            />
            <Text className="font-din text-small text-textPrimary">{mood.label}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderFocusScreen = () => (
    <Animated.View 
      style={{
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        transform: [{ translateX: focusAnim }],
      }}>
      <Text className="font-feather text-heading text-textPrimary mb-6">What would you like to focus on?</Text>
      <View className="flex-row flex-wrap justify-center gap-3">
        {focusAreas.map((focus) => (
          <Pressable
            key={focus.value}
            onPress={() => {
              setSelectedFocus(focus.value);
              setFocus(focus.value); // Save to store
              hapticMedium();
              analytics.logEvent('checkin_focus_selected', { focus: focus.value });
              // Automatically move to struggle screen after selecting focus
              setTimeout(() => {
                animateToScreen('struggle');
              }, 100);
            }}
            className={`w-[30%] h-28  rounded-2xl border-2 items-center justify-center ${
              selectedFocus === focus.value
                ? 'bg-surfaceCreamLight border-orange'
                : 'bg-surfaceCreamLight border-accentGold'
            }`}>
            <View className={`${focus.bgColor} rounded-xl p-3 mb-2`}>
              {focus.iconType === 'fontawesome6' ? (
                <FontAwesome6
                  name={focus.icon as any}
                  size={RPH(2.6)}
                  color={focus.color}
                />
              ) : (
                <Ionicons
                  name={focus.icon as any}
                  size={RPH(2.6)}
                  color={focus.color}
                />
              )}
            </View>
            <Text className="font-din text-sm text-textPrimary">{focus.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => {
          skipFocus(); // Save empty string to store
          hapticMedium();
          analytics.logEvent('checkin_focus_skipped');
          // Skip focus screen and go to struggle
          setTimeout(() => {
            animateToScreen('struggle');
          }, 100);
        }}
        className="mt-auto mb-4">
        <Text className="font-din text-base text-gray-500 underline">Skip</Text>
      </Pressable>
    </Animated.View>
  );

  const renderStruggleScreen = () => (
    <Animated.View 
      style={{
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        transform: [{ translateX: struggleAnim }],
      }}>
      <Text className="font-feather text-heading text-textPrimary mb-6">What are you struggling with?</Text>
      <View className="flex-row flex-wrap justify-center gap-3 mb-6">
        {struggleAreas.map((struggle) => (
          <Pressable
            key={struggle.value}
            onPress={() => {
              setSelectedStruggle(struggle.value);
              setStruggle(struggle.value); // Save to store
              hapticMedium();
              analytics.logEvent('checkin_struggle_selected', { struggle: struggle.value });
              // Automatically move to success screen after selecting struggle
              setTimeout(() => {
                animateToScreen('success');
              }, 100);
            }}
            className={`w-[30%] h-28 rounded-2xl border-2 items-center justify-center ${
              selectedStruggle === struggle.value
                ? 'bg-surfaceCreamLight border-orange'
                : 'bg-surfaceCreamLight border-accentGold'
            }`}>
            <View className={`${struggle.bgColor} rounded-xl p-3 mb-2`}>
              {struggle.iconType === 'fontawesome6' ? (
                <FontAwesome6
                  name={struggle.icon as any}
                  size={RPH(2.6)}
                  color={struggle.color}
                />
              ) : (
                <Ionicons
                  name={struggle.icon as any}
                  size={RPH(2.6)}
                  color={struggle.color}
                />
              )}
            </View>
            <Text className="font-din text-sm text-textPrimary">{struggle.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => {
          skipStruggle(); // Save empty string to store
          hapticMedium();
          analytics.logEvent('checkin_struggle_skipped');
          // Skip struggle screen and go to success
          setTimeout(() => {
            animateToScreen('success');
          }, 100);
        }}
        className="mt-auto mb-4">
        <Text className="font-din text-base text-gray-500 underline">Skip</Text>
      </Pressable>
    </Animated.View>
  );

  const renderSuccessScreen = () => (
    <Animated.View 
      style={{
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        transform: [{ translateX: successAnim }],
      }}>
      <View className="bg-green-100 rounded-full w-32 h-32 items-center justify-center mb-6">
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
      </View>
      <Text className="font-feather text-h2 text-textPrimary mb-4">Check-in Complete!</Text>
      <Text className="font-din text-lg text-gray-600 text-center mb-8">
        You&apos;re all set for today. May God guide you in your focus on{' '}
        {focusAreas.find((f) => f.value === selectedFocus)?.label.toLowerCase()}.
      </Text>
      <View className="w-full mt-auto">
        <PrimaryButton
          title={(currentFocus !== '' || currentStruggle !== '') ? "Generate Custom Devotional" : "Start Today's Devotional"}
          onPress={() => {
            if (currentFocus !== '' || currentStruggle !== '') {
              // Set check-in flag
              setIsFromCheckIn(true);
              
              // Navigate to LoadingScreen immediately
              handleDismiss();
              
              // Navigate to loading screen
              setTimeout(() => {
                router.push('/onboarding/LoadingScreen' as any);
              }, 400);
              
              // Generate custom devotional in background
              handleGenerateCustomDevotional();
            } else {
              // Just complete check-in and go to regular devotional
              completeCheckIn();
              analytics.logEvent('checkin_completed', {
                mood: currentMood,
                focus: currentFocus,
                struggle: currentStruggle
              });
              handleDismiss();
              
              // Navigate to regular devotional
              setTimeout(() => {
                router.push('/(tabs)');
              }, 400);
            }
          }}
          style="w-full"
          buttonType="gold"
          disabled={isGenerating}
        />
        {isGenerating && (
          <Text className="font-din text-sm text-gray-600 text-center mt-2">
            Generating your personalized devotional...
          </Text>
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
      backgroundStyle={{ backgroundColor: '#FFF4D9', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      handleIndicatorStyle={{ backgroundColor: '#DCB280', height: 4, width: 40 }}
      backdropComponent={renderBackdrop}>
      <BottomSheetView style={{ flex: 1, paddingTop: 20, paddingBottom: 30, overflow: 'hidden' }}>
        <View style={{ flex: 1, position: 'relative' }}>
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