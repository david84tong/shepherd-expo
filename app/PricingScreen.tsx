import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ImageBackground, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, SlideInRight, useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import PrimaryButton from '../components/PrimaryButton';
import useSubscriptionStore from './stores/subscriptionStore';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

const PricingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const headerOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const tableOpacity = useSharedValue(0);
  const trialOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);
  
  // Initialize animations
  useEffect(() => {
    // Staggered animation sequence
    headerOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    tableOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    trialOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    footerOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
  }, []);
  
  // Animated styles
  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: headerOpacity.value,
      transform: [
        { translateY: withTiming(headerOpacity.value * 0, { duration: 400 }) }
      ]
    };
  });
  
  const titleStyle = useAnimatedStyle(() => {
    return {
      opacity: titleOpacity.value,
      transform: [
        { translateY: withTiming((1 - titleOpacity.value) * 20, { duration: 500 }) }
      ]
    };
  });
  
  const tableStyle = useAnimatedStyle(() => {
    return {
      opacity: tableOpacity.value,
      transform: [
        { translateY: withTiming((1 - tableOpacity.value) * 30, { duration: 600 }) }
      ]
    };
  });
  
  const trialStyle = useAnimatedStyle(() => {
    return {
      opacity: trialOpacity.value,
      transform: [
        { translateY: withTiming((1 - trialOpacity.value) * 40, { duration: 500 }) }
      ]
    };
  });
  
  const footerStyle = useAnimatedStyle(() => {
    return {
      opacity: footerOpacity.value,
      transform: [
        { translateY: withTiming((1 - footerOpacity.value) * 20, { duration: 500 }) }
      ]
    };
  });
  
  // Get presentPaywall function from subscription store
  const { presentPaywall } = useSubscriptionStore();

  const toggleSwitch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTrialEnabled(previousState => !previousState);
  };

  const handleSubscribe = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Navigate to loading screen first
      router.push({
        pathname: '/onboarding/LoadingScreen',
        params: { 
          initialMessage: "Preparing your subscription",
          redirectAfterLoading: "back" // This will be handled in LoadingScreen
        }
      });
      
      // The paywall will be shown after LoadingScreen completes
      // The LoadingScreen component will handle the navigation back here
      // and then we'll show the paywall
      
    } catch (error) {
      console.error('Error during subscription process:', error);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)');
  };

  // This function will be called when navigating back from the LoadingScreen
  const showPaywall = async () => {
    try {
      setIsLoading(true);
      const result = await presentPaywall();
      
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        // Success! Navigate to main app
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error presenting paywall:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if we're returning from LoadingScreen
  React.useEffect(() => {
    const checkRouteParams = async () => {
      try {
        // Check if we have the fromLoading param
        const fromLoading = params.fromLoading;
        if (fromLoading === 'true') {
          console.log('Detected return from loading screen, showing paywall');
          // Show the paywall after a short delay to allow animation to complete
          setTimeout(() => {
            showPaywall();
          }, 500);
        }
      } catch (e) {
        console.error('Error checking route params:', e);
      }
    };
    
    checkRouteParams();
  }, [params]);

  return (
    <ImageBackground 
      source={require('../assets/backgrounds/godBackground.png')}
      className="flex-1"
      resizeMode="cover"
    >
      {/* Enhanced gradient with stronger colors to improve title visibility */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.35)', 'rgba(0,0,0,0)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 5
        }}
      />
      
      <View className="flex-1 relative z-10" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <Animated.View 
          className="flex-row items-center justify-between px-5 py-3 mb-3"
          style={headerStyle}
        >
          <TouchableOpacity onPress={handleBack} className="p-2">
            <Feather name="x" size={28} color="#B89B4C" />
          </TouchableOpacity>
          <View className="w-10" />{/* Spacer */}
        </Animated.View>
        
        {/* Main content with a bottom padding to account for the sticky button */}
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ 
            paddingBottom: 120, // Extra padding to ensure content isn't hidden behind sticky button
            paddingHorizontal: 20 
          }}
        >
          {/* Title with gradient styling approach */}
          <Animated.View 
            className="items-center mb-4 flex justify-center mt-16"
            style={titleStyle}
          >
            <LinearGradient
              colors={['#F7B500', '#FFF45B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 32,
                maxWidth: '85%',
              }}
            >
              <Text 
                className="font-nunito-italic text-title text-white text-center"
                style={{ 
                  textShadowColor: 'rgba(0,0,0,0.15)',
                  textShadowOffset: {width: 1, height: 1},
                  textShadowRadius: 3
                }}
              >
                SUPER
              </Text>
            </LinearGradient>
            <Text 
                className="font-feather text-title text-textPrimary text-center mt-2"
                style={{ 
                  textShadowColor: 'rgba(0,0,0,0.15)',
                  textShadowOffset: {width: 1, height: 1},
                  textShadowRadius: 3
                }}
              >
              SHEPHERD
            </Text>
          </Animated.View>
          
          {/* Top Introductory Section */}
          <Animated.View 
            className="bg-white rounded-2xl shadow-card p-6 mb-8 items-center mt-4"
            entering={FadeInDown.duration(600).delay(400)}
          >
              <Feather name="star" size={48} color="#F7B500" /> 
              <Text className="font-feather text-h2 text-textPrimary mt-4 mb-2 text-center">Draw closer to God</Text>
              <Text className="font-din text-heading text-description text-center">Super users are 4.2x more likely to finish the bible!</Text>
          </Animated.View>

          {/* Feature Comparison Table */}
          <Animated.View 
            className="bg-white rounded-2xl shadow-card mb-8 overflow-hidden"
            style={tableStyle}
          >
            {/* Header Row */}
            <View className="flex-row">
              {/* Column for features (empty in header) */}
              <View className="flex-1">
                {/* Empty space for alignment with feature names */}
              </View>
              
              {/* FREE column header */}
              <View className="items-center justify-center py-4" style={{ width: '25%' }}>
                <Text className="font-din text-md text-textPrimary">FREE</Text>
              </View>
              
              {/* SUPER column header with gradient pill */}
              <View className="items-center justify-center py-4 bg-accentGold/10" style={{ width: '25%' }}>
                <LinearGradient
                  colors={['#F7B500', '#FFF45B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    paddingHorizontal: 4,
                    paddingVertical: 6,
                    borderRadius: 32,
                    width: '80%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}
                >
                  <Text 
                    className="font-nunito-italic text-md text-white text-center"
                    style={{ 
                      textShadowColor: 'rgba(0,0,0,0.15)',
                      textShadowOffset: {width: 1, height: 1},
                      textShadowRadius: 3
                    }}
                  >
                    SUPER
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* Features List with consistent styling */}
            <View>
              {/* Access to Bible */}
              <Animated.View 
                className="flex-row border-t border-surfaceCream"
                entering={SlideInRight.duration(400).delay(600)}
              >
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Access to Bible</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </Animated.View>
              
              {/* Unlimited Daily Bread */}
              <Animated.View 
                className="flex-row border-t border-surfaceCream"
                entering={SlideInRight.duration(400).delay(650)}
              >
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Unlimited Daily Bread</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </Animated.View>
              
              {/* Unlimited Daily Prayers */}
              <Animated.View 
                className="flex-row border-t border-surfaceCream"
                entering={SlideInRight.duration(400).delay(700)}
              >
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Unlimited Daily Prayers</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </Animated.View>
              
              {/* Unlimited Daily Reflections */}
              <Animated.View 
                className="flex-row border-t border-surfaceCream"
                entering={SlideInRight.duration(400).delay(750)}
              >
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Unlimited Daily Reflections</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </Animated.View>
              
              {/* No Ads */}
              <Animated.View 
                className="flex-row border-t border-surfaceCream"
                entering={SlideInRight.duration(400).delay(800)}
              >
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">No Ads</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </Animated.View>
              
              {/* Equip Skins */}
              <Animated.View 
                className="flex-row border-t border-surfaceCream"
                entering={SlideInRight.duration(400).delay(850)}
              >
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Equip Skins</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </Animated.View>
              
              {/* Super Lamb Skin */}
              <Animated.View 
                className="flex-row border-t border-surfaceCream"
                entering={SlideInRight.duration(400).delay(900)}
              >
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Super Lamb Skin!</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </Animated.View>
            </View>
          </Animated.View>

          {/* How Trial Works Section */}
          <Animated.View 
            className="mb-10"
            style={trialStyle}
          >
            <Text className="font-feather text-h2 text-textPrimary mb-6">How the trial works</Text>
            
            <View className="bg-white rounded-2xl shadow-card p-5">
              {/* Today */}
              <Animated.View 
                className="flex-row items-start mb-6"
                entering={FadeInDown.duration(400).delay(900)}
              >
                <View className="w-10 h-10 bg-lightGreen rounded-full items-center justify-center mr-4 shadow-sm">
                  <Feather name="unlock" size={20} color="#24CA17" />
                </View>
                <View className="flex-1">
                  <Text className="font-feather text-lg text-textPrimary mb-0.5">Today</Text>
                  <Text className="font-din text-body text-description leading-snug">Unlock premium access to all content for free. No payment needed to start.</Text>
                </View>
              </Animated.View>
              
              {/* Day 5 */}
              <Animated.View 
                className="flex-row items-start mb-6"
                entering={FadeInDown.duration(400).delay(1000)}
              >
                <View className="w-10 h-10 bg-lightGreen rounded-full items-center justify-center mr-4 shadow-sm">
                  <Feather name="bell" size={20} color="#24CA17" />
                </View>
                <View className="flex-1">
                  <Text className="font-feather text-lg text-textPrimary mb-0.5">Day 5</Text>
                  <Text className="font-din text-body text-description leading-snug">We&apos;ll send a reminder before your free trial ends.</Text>
                </View>
              </Animated.View>
              
              {/* Day 7 */}
              <Animated.View 
                className="flex-row items-start"
                entering={FadeInDown.duration(400).delay(1100)}
              >
                <View className="w-10 h-10 bg-lightGreen rounded-full items-center justify-center mr-4 shadow-sm">
                  <Feather name="calendar" size={20} color="#24CA17" />
                </View>
                <View className="flex-1">
                  <Text className="font-feather text-lg text-textPrimary mb-0.5">Day 7</Text>
                  <Text className="font-din text-body text-description leading-snug">Your subscription begins. Cancel anytime before if you change your mind.</Text>
                </View>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Unlock Trial Toggle */}
          <Animated.View 
            className="bg-white rounded-2xl shadow-card p-5 mb-8 flex-row justify-between items-center"
            entering={FadeIn.duration(600).delay(1200)}
          >
            <Text className="font-feather text-lg text-textPrimary">Unlock 7-day trial & reminder</Text>
            <Switch
              trackColor={{ false: '#E9E2C7', true: '#A8F093' }}
              thumbColor={trialEnabled ? '#24CA17' : '#FFF4D9'}
              ios_backgroundColor="#E9E2C7"
              onValueChange={toggleSwitch}
              value={trialEnabled}
              style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
            />
          </Animated.View>

          <Animated.View 
            className="bg-white rounded-2xl shadow-card p-6 mb-8 items-center mt-4"
            entering={FadeInDown.duration(600).delay(1300)}
          >
              <Feather name="star" size={48} color="#F7B500" /> 
              <Text className="font-feather text-heading text-textPrimary mt-4 mb-2 text-center">10% of profits are donated!</Text>
              <Text className="font-din text-heading text-description text-center">Help tithe to help fund mission trips, charities, and purchasing super accounts for those in need.</Text>
          </Animated.View>
        </ScrollView>
        
        {/* Sticky Footer */}
        <Animated.View 
          className="absolute bottom-0 left-0 right-0 bg-surfaceCream/90 pt-4 pb-2 px-5 z-20"
          style={[
            footerStyle,
            { 
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 247, 230, 1)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 5,
              borderRadius: 20,
            }
          ]}
        >
          {/* Subscribe Button with Loading State */}
          {isLoading ? (
            <View className="py-3 flex-row justify-center items-center">
              <ActivityIndicator size="small" color="#F7B500" />
              <Text className="font-din text-lg text-textPrimary ml-3">Loading subscription options...</Text>
            </View>
          ) : (
            <PrimaryButton
              title="START MY FREE WEEK"
              onPress={handleSubscribe}
            />
          )}
          
          {/* Small terms text */}
          <Text className="font-din text-caption text-description/70 text-center mt-2 px-4 text-xs">
            By continuing, you agree to our Terms of Service
          </Text>
        </Animated.View>
        
        {/* Full Screen Loading Overlay (shown during paywall transitions) */}
        {isLoading && (
          <Animated.View 
            className="absolute inset-0 bg-black/30 items-center justify-center z-50"
            entering={FadeIn.duration(300)}
            style={{ 
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0
            }}
          >
            <View className="bg-white p-5 rounded-xl items-center">
              <ActivityIndicator size="large" color="#F7B500" />
              <Text className="font-din text-body text-textPrimary mt-3">
                Loading subscription options...
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </ImageBackground>
  );
};

export default PricingScreen;
