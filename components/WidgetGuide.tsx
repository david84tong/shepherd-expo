// WidgetGuide.jsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, useWindowDimensions, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import analytics from '../utils/analytics';

interface WidgetGuideProps {
  visible: boolean;
  onClose: () => void;
}

export default function WidgetGuide({ visible, onClose }: WidgetGuideProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { height: screenHeight } = Dimensions.get('window');
  const router = useRouter();
  
  // Active step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(screenHeight)).current;
  
  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideUpAnim, {
          toValue: 0,
          tension: 45,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset state when closed
      setTimeout(() => {
        setCurrentStep(1);
      }, 300);
    }
  }, [visible, screenHeight]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent("WidgetGuide_Closed");
    onClose();
  };
  
  const handleBackdropPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent("WidgetGuide_BackdropTapped");
    onClose();
  };
  
  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep < totalSteps) {
      analytics.logEvent("WidgetGuide_NextStep", { fromStep: currentStep });
      setCurrentStep(prev => prev + 1);
    } else {
      analytics.logEvent("WidgetGuide_Completed");
      onClose();
    }
  };
  
  // Render the appropriate step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Text className="font-feather text-base text-amber-700 text-center mb-2">
              STEP 1
            </Text>
            <Text className="font-feather text-xl text-stone-800 text-center mb-6">
              Press and hold on your home screen
            </Text>
            <View className="bg-white/50 rounded-2xl p-4 mb-6 shadow-sm">
              <Image
                source={require('../assets/images/widget-step1.png')}
                style={{ width: width * 0.7, height: width * 0.8, alignSelf: 'center' }}
                className="rounded-xl"
                resizeMode="contain"
              />
            </View>
            <Text className="font-din text-sm text-stone-600 text-center mb-20">
              Touch and hold on an empty area of your home screen until the icons start wiggling.
            </Text>
          </>
        );
      case 2:
        return (
          <>
            <Text className="font-feather text-base text-amber-700 text-center mb-2">
              STEP 2
            </Text>
            <Text className="font-feather text-xl text-stone-800 text-center mb-6">
              Tap the Add (+) button in the corner
            </Text>
            <View className="bg-white/50 rounded-2xl p-4 mb-6 shadow-sm">
              <Image
                source={require('../assets/images/widget-step2.png')}
                style={{ width: width * 0.7, height: width * 0.8, alignSelf: 'center' }}
                className="rounded-xl"
                resizeMode="contain"
              />
            </View>
            <Text className="font-din text-sm text-stone-600 text-center mb-20">
              Look for the plus icon in the top left corner of your screen.
            </Text>
          </>
        );
      case 3:
        return (
          <>
            <Text className="font-feather text-base text-amber-700 text-center mb-2">
              STEP 3
            </Text>
            <Text className="font-feather text-xl text-stone-800 text-center mb-6">
              Search for "Shepherd" and tap on it
            </Text>
            <View className="bg-white/50 rounded-2xl p-4 mb-6 shadow-sm">
              <Image
                source={require('../assets/images/widget-step3.png')}
                style={{ width: width * 0.7, height: width * 0.8, alignSelf: 'center' }}
                className="rounded-xl"
                resizeMode="contain"
              />
            </View>
            <Text className="font-din text-sm text-stone-600 text-center mb-20">
              Find the Shepherd widget by searching or scrolling through the widget gallery.
            </Text>
          </>
        );
      case 4:
        return (
          <>
            <Text className="font-feather text-base text-amber-700 text-center mb-2">
              LAST STEP
            </Text>
            <Text className="font-feather text-xl text-stone-800 text-center mb-6">
              Tap the Add Widget button and you're done!
            </Text>
            <View className="bg-white/50 rounded-2xl p-4 mb-6 shadow-sm">
              <Image
                source={require('../assets/images/widget-step4.png')}
                style={{ width: width * 0.7, height: width * 0.8, alignSelf: 'center' }}
                className="rounded-xl"
                resizeMode="contain"
              />
            </View>
            <Text className="font-din text-sm text-stone-600 text-center mb-20">
              Select the Shepherd Streak widget, swipe to choose size, and tap "Add Widget".
            </Text>
          </>
        );
      default:
        return null;
    }
  };
  
  // Step indicators
  const renderStepIndicators = () => {
    return (
      <View className="flex-row items-center justify-center my-5">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          
          return (
            <View key={`step-${stepNumber}`} className="flex-row items-center">
              {/* Line between circles (except before first) */}
              {index > 0 && (
                <View 
                  className={`h-[2px] w-8 ${
                    stepNumber <= currentStep ? 'bg-amber-500' : 'bg-gray-300'
                  }`} 
                />
              )}
              
              {/* Circle indicator */}
              <View 
                className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
                  isActive 
                    ? 'bg-amber-500 border-amber-500' 
                    : stepNumber < currentStep 
                      ? 'bg-white border-amber-500' 
                      : 'bg-white border-gray-300'
                }`}
              >
                <Text 
                  className={`font-din font-medium ${
                    isActive 
                      ? 'text-white' 
                      : stepNumber < currentStep 
                        ? 'text-amber-500' 
                        : 'text-gray-400'
                  }`}
                >
                  {stepNumber}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <View
      className="absolute inset-0 justify-end z-50" 
      pointerEvents="box-none"
    >
      {/* Backdrop */}
      <Animated.View 
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropOpacity,
        }}
        pointerEvents={visible ? 'auto' : 'none'}
        onTouchEnd={handleBackdropPress}
      />
      
      {/* Sheet Container */}
      <Animated.View
        style={{
          transform: [{ translateY: slideUpAnim }],
          paddingBottom: insets.bottom,
          height: '95%' // Take up most of the screen
        }}
        className="bg-amber-50 rounded-t-3xl overflow-hidden"
      >
        {/* Handle */}
        <View className="w-full items-center pt-2 pb-2">
          <View className="w-12 h-1 rounded-full bg-gray-300" />
        </View>
        
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <TouchableOpacity onPress={handleBack} className="p-2">
            <Feather name="x" size={24} color="#B45309" />
          </TouchableOpacity>
          <Text className="font-feather text-lg text-stone-800">Add Widget Guide</Text>
          <View className="w-10" /> {/* Spacer for alignment */}
        </View>

        {/* Main Content */}
        <ScrollView 
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
        >
          <View className="py-4">
            {renderStepContent()}
          </View>
        </ScrollView>
        
        {/* Step indicators */}
        {renderStepIndicators()}
        
        {/* Bottom button */}
        <View className="px-5 py-4">
          <TouchableOpacity
            onPress={handleNext}
            className="bg-amber-400 rounded-full py-4 items-center shadow-sm"
            activeOpacity={0.8}
          >
            <Text className="font-feather text-base font-medium text-stone-800">
              {currentStep < totalSteps ? "CONTINUE" : "DONE"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}