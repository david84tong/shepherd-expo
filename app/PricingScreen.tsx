import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, ImageBackground, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import PrimaryButton from '../components/PrimaryButton';
import useSubscriptionStore from './stores/subscriptionStore';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

const PricingScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get presentPaywall function from subscription store
  const { presentPaywall } = useSubscriptionStore();

  const toggleSwitch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTrialEnabled(previousState => !previousState);
  };

  const handleSubscribe = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Show loading state
      setIsLoading(true);
      
      // Present the RevenueCat paywall
      const result = await presentPaywall();
      
      // Handle the result
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        // Success! Handle successful purchase (navigate or show success message)
        router.back();
      }
    } catch (error) {
      console.error('Error during subscription process:', error);
    } finally {
      // Hide loading state regardless of outcome
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

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
        <View className="flex-row items-center justify-between px-5 py-3 mb-3">
          <TouchableOpacity onPress={handleBack} className="p-2">
            <Feather name="x" size={28} color="#B89B4C" />
          </TouchableOpacity>
          <View className="w-10" />{/* Spacer */}
        </View>
        
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
          <View className="items-center mb-4 flex justify-center mt-16">
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
          </View>
          
          {/* Top Introductory Section */}
          <View className="bg-white rounded-2xl shadow-card p-6 mb-8 items-center mt-4">
              <Feather name="star" size={48} color="#F7B500" /> 
              <Text className="font-feather text-h2 text-textPrimary mt-4 mb-2 text-center">Draw closer to God</Text>
              <Text className="font-din text-heading text-description text-center">Super users are 4.2x more likely to finish the bible!</Text>
          </View>

          {/* Feature Comparison Table */}
          <View className="bg-white rounded-2xl shadow-card mb-8 overflow-hidden">
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
              <View className="flex-row border-t border-surfaceCream">
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Access to Bible</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </View>
              
              {/* Unlimited Daily Bread */}
              <View className="flex-row border-t border-surfaceCream">
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Unlimited Daily Bread</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </View>
              
              {/* Unlimited Daily Prayers */}
              <View className="flex-row border-t border-surfaceCream">
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Unlimited Daily Prayers</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </View>
              
              {/* Unlimited Daily Reflections */}
              <View className="flex-row border-t border-surfaceCream">
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Unlimited Daily Reflections</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </View>
              
              {/* No Ads */}
              <View className="flex-row border-t border-surfaceCream">
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">No Ads</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </View>
              
              {/* Equip Skins */}
              <View className="flex-row border-t border-surfaceCream">
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Equip Skins</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </View>
              
              {/* Super Lamb Skin */}
              <View className="flex-row border-t border-surfaceCream">
                <View className="flex-1 py-4 pl-6 pr-2">
                  <Text className="font-din text-body text-textPrimary">Super Lamb Skin!</Text>
                </View>
                <View className="items-center justify-center" style={{ width: '25%' }}>
                  <Feather name="circle" size={22} color="#E9E2C7" />
                </View>
                <View className="items-center justify-center bg-accentGold/10" style={{ width: '25%' }}>
                  <Feather name="check-circle" size={22} color="#24CA17" />
                </View>
              </View>
            </View>
          </View>

          {/* How Trial Works Section */}
          <View className="mb-10">
            <Text className="font-feather text-h2 text-textPrimary mb-6">How the trial works</Text>
            
            <View className="bg-white rounded-2xl shadow-card p-5">
              {/* Today */}
              <View className="flex-row items-start mb-6">
                <View className="w-10 h-10 bg-lightGreen rounded-full items-center justify-center mr-4 shadow-sm">
                  <Feather name="unlock" size={20} color="#24CA17" />
                </View>
                <View className="flex-1">
                  <Text className="font-feather text-lg text-textPrimary mb-0.5">Today</Text>
                  <Text className="font-din text-body text-description leading-snug">Unlock premium access to all content for free. No payment needed to start.</Text>
                </View>
              </View>
              
              {/* Day 5 */}
              <View className="flex-row items-start mb-6">
                <View className="w-10 h-10 bg-lightGreen rounded-full items-center justify-center mr-4 shadow-sm">
                  <Feather name="bell" size={20} color="#24CA17" />
                </View>
                <View className="flex-1">
                  <Text className="font-feather text-lg text-textPrimary mb-0.5">Day 5</Text>
                  <Text className="font-din text-body text-description leading-snug">We&apos;ll send a reminder before your free trial ends.</Text>
                </View>
              </View>
              
              {/* Day 7 */}
              <View className="flex-row items-start">
                <View className="w-10 h-10 bg-lightGreen rounded-full items-center justify-center mr-4 shadow-sm">
                  <Feather name="calendar" size={20} color="#24CA17" />
                </View>
                <View className="flex-1">
                  <Text className="font-feather text-lg text-textPrimary mb-0.5">Day 7</Text>
                  <Text className="font-din text-body text-description leading-snug">Your subscription begins. Cancel anytime before if you change your mind.</Text>
                </View>
              </View>
            </View>
          </View>

     
          {/* Unlock Trial Toggle */}
          <View className="bg-white rounded-2xl shadow-card p-5 mb-8 flex-row justify-between items-center">
            <Text className="font-feather text-lg text-textPrimary">Unlock 7-day trial & reminder</Text>
            <Switch
              trackColor={{ false: '#E9E2C7', true: '#A8F093' }}
              thumbColor={trialEnabled ? '#24CA17' : '#FFF4D9'}
              ios_backgroundColor="#E9E2C7"
              onValueChange={toggleSwitch}
              value={trialEnabled}
              style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
            />
          </View>

          <View className="bg-white rounded-2xl shadow-card p-6 mb-8 items-center mt-4">
              <Feather name="star" size={48} color="#F7B500" /> 
              <Text className="font-feather text-heading text-textPrimary mt-4 mb-2 text-center">10% of profits are donated!</Text>
              <Text className="font-din text-heading text-description text-center">Help tithe to help fund mission trips, charities, and purchasing super accounts for those in need.</Text>
          </View>
        </ScrollView>
        
        {/* Sticky Footer */}
        <View 
          className="absolute bottom-0 left-0 right-0 bg-surfaceCream/90 pt-4 pb-2 px-5 z-20"
          style={{ 
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 247, 230, 1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1,
            shadowRadius: 5,
            elevation: 5,
            borderRadius: 20,
          }}
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
        </View>
        
        {/* Full Screen Loading Overlay (shown during paywall transitions) */}
        {isLoading && (
          <View 
            className="absolute inset-0 bg-black/30 items-center justify-center z-50"
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
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

export default PricingScreen;
