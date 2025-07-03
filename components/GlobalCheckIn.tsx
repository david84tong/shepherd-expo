import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useImperativeHandle, useState } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';

import PrimaryButton from './PrimaryButton';
import { hapticMedium } from '~/utils/haptics';

export type GlobalCheckInRef = {
  expand: () => void;
  close: () => void;
};

interface GlobalCheckInProps {
  checkInRef: React.RefObject<GlobalCheckInRef>;
}

type CheckInScreen = 'mood' | 'focus' | 'success';

const { width: screenWidth } = Dimensions.get('window');

const GlobalCheckIn: React.FC<GlobalCheckInProps> = ({ checkInRef }) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [currentScreen, setCurrentScreen] = useState<CheckInScreen>('mood');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  
  // Animation values for each screen
  const moodAnim = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(screenWidth)).current;
  const successAnim = useRef(new Animated.Value(screenWidth)).current;

  // Fixed snap points - use 50% for all screens to prevent resizing
  const snapPoints = ['50%'];

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.close();
    // Reset everything after sheet closes
    setTimeout(() => {
      setCurrentScreen('mood');
      setSelectedMood(null);
      setSelectedFocus(null);
      // Reset animations
      moodAnim.setValue(0);
      focusAnim.setValue(screenWidth);
      successAnim.setValue(screenWidth);
    }, 300);
    hapticMedium();
  }, [moodAnim, focusAnim, successAnim]);

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
    } else if (screen === 'success') {
      // Slide focus out to left, success in from right
      animations.push(
        Animated.parallel([
          Animated.timing(focusAnim, {
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
  }, [moodAnim, focusAnim, successAnim]);

  // Handle navigation between screens
  const handleNextScreen = useCallback(() => {
    hapticMedium();
    if (currentScreen === 'mood' && selectedMood) {
      animateToScreen('focus');
    } else if (currentScreen === 'focus' && selectedFocus) {
      animateToScreen('success');
    }
  }, [currentScreen, selectedMood, selectedFocus, animateToScreen]);

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
        moodAnim.setValue(0);
        focusAnim.setValue(screenWidth);
        successAnim.setValue(screenWidth);
      },
      close: () => bottomSheetRef.current?.close(),
    }),
    [moodAnim, focusAnim, successAnim]
  );

  // Mood options
  const moods = [
    { emoji: '😊', label: 'Happy', value: 'happy' },
    { emoji: '😔', label: 'Sad', value: 'sad' },
    { emoji: '😌', label: 'Peaceful', value: 'peaceful' },
    { emoji: '😤', label: 'Frustrated', value: 'frustrated' },
    { emoji: '😴', label: 'Tired', value: 'tired' },
    { emoji: '🤗', label: 'Grateful', value: 'grateful' },
  ];

  // Focus areas
  const focusAreas = [
    { icon: 'heart', label: 'Relationships', value: 'relationships' },
    { icon: 'briefcase', label: 'Work', value: 'work' },
    { icon: 'fitness', label: 'Health', value: 'health' },
    { icon: 'school', label: 'Growth', value: 'growth' },
    { icon: 'flower', label: 'Peace', value: 'peace' },
    { icon: 'people', label: 'Family', value: 'family' },
  ];

  const renderMoodScreen = () => (
    <Animated.View 
      style={{
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        transform: [{ translateX: moodAnim }],
      }}>
      <Text className="font-feather text-h3 text-textPrimary mb-4">How are you feeling today?</Text>
      <View className="flex-row flex-wrap justify-center gap-3 mb-6">
        {moods.map((mood) => (
          <Pressable
            key={mood.value}
            onPress={() => {
              setSelectedMood(mood.value);
              hapticMedium();
            }}
            className={`w-24 h-24 rounded-2xl border-2 items-center justify-center ${
              selectedMood === mood.value
                ? 'bg-accentGold/20 border-accentGold'
                : 'bg-surfaceCream border-gray-200'
            }`}>
            <Text className="text-4xl mb-1">{mood.emoji}</Text>
            <Text className="font-din text-xs text-textPrimary">{mood.label}</Text>
          </Pressable>
        ))}
      </View>
      <View className="w-full mt-auto">
        <PrimaryButton
          title="Continue"
          onPress={handleNextScreen}
          disabled={!selectedMood}
          style="w-full"
          buttonType="default"
        />
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
      <Text className="font-feather text-h3 text-textPrimary mb-6">What would you like to focus on?</Text>
      <View className="flex-row flex-wrap justify-center gap-4 mb-8">
        {focusAreas.map((focus) => (
          <Pressable
            key={focus.value}
            onPress={() => {
              setSelectedFocus(focus.value);
              hapticMedium();
            }}
            className={`w-28 h-28 rounded-2xl border-2 items-center justify-center ${
              selectedFocus === focus.value
                ? 'bg-[#00B0F7]/20 border-[#00B0F7]'
                : 'bg-surfaceCream border-gray-200'
            }`}>
            <Ionicons
              name={focus.icon as any}
              size={32}
              color={selectedFocus === focus.value ? '#00B0F7' : '#3C584A'}
            />
            <Text className="font-din text-sm text-textPrimary mt-2">{focus.label}</Text>
          </Pressable>
        ))}
      </View>
      <View className="w-full mt-auto">
        <PrimaryButton
          title="Set Intention"
          onPress={handleNextScreen}
          disabled={!selectedFocus}
          style="w-full"
          buttonType="blue"
        />
      </View>
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
          title="Start Your Day"
          onPress={handleDismiss}
          style="w-full"
          buttonType="gold"
        />
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
            pointerEvents={currentScreen === 'success' ? 'auto' : 'none'}>
            {renderSuccessScreen()}
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default GlobalCheckIn;