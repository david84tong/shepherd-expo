import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '~/app/stores/userStore';
import { hapticLight } from '~/utils/haptics';
import analytics from '~/utils/analytics';
import phoenixSkin from '~/assets/lambStatic/FIre_Skin.png';
import i18n from '~/app/utils/i18n';
import { appLog } from '~/app/helper/helper';

const PHOENIX_BANNER_DISMISSED_KEY = 'phoenix_skin_banner_dismissed';

interface PhoenixSkinBannerProps {
  onDismiss?: () => void;
}

// Export function to reset banner dismissal state (for when user reaches 21 days)
export const resetPhoenixBannerDismissal = async () => {
  try {
    await AsyncStorage.removeItem(PHOENIX_BANNER_DISMISSED_KEY);
  } catch (error) {
    console.error('Error resetting Phoenix banner dismissal:', error);
  }
};

export default function PhoenixSkinBanner({ onDismiss }: PhoenixSkinBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldShow, setShouldShow] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Get current streak from user store
  const { currentStreak } = useUserStore((state) => state.covenantProgress);

  // Check if banner should be shown
  useEffect(() => {
    const checkBannerVisibility = async () => {
      try {
        if (currentStreak >= 21) {
          setShouldShow(false);
          setIsVisible(false);
          return;
        }

        // Check if banner was dismissed
        const dismissed = await AsyncStorage.getItem(PHOENIX_BANNER_DISMISSED_KEY);
        if (dismissed === 'true') {
          setShouldShow(false);
          setIsVisible(false);
          return;
        }

        // Show banner if conditions are met
        setShouldShow(true);
        setIsVisible(true);
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Track banner shown
        analytics.logEvent('Phoenix_Banner_Shown', {
          currentStreak,
          daysRemaining: 21 - currentStreak,
        });
      } catch (error) {
        console.error('Error checking Phoenix banner visibility:', error);
      }
    };

    checkBannerVisibility();
    
  }, [currentStreak, fadeAnim]);

  // Handle dismiss
  const handleDismiss = async () => {
    try {
      hapticLight();
      
      // Animate out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
        setShouldShow(false);
      });

      // Save dismissal state
      await AsyncStorage.setItem(PHOENIX_BANNER_DISMISSED_KEY, 'true');
      
      // Track dismissal
      analytics.logEvent('Phoenix_Banner_Dismissed', {
        currentStreak,
        daysRemaining: 21 - currentStreak,
      });

      // Call onDismiss callback if provided
      onDismiss?.();
    } catch (error) {
      console.error('Error dismissing Phoenix banner:', error);
    }
  };

  const daysRemaining = Math.max(0, 21 - currentStreak);
  const progressPercentage = Math.min(100, Math.max(0, (currentStreak / 21) * 100));
  
  appLog('shouldShow', shouldShow);
  appLog('isVisible', isVisible);

  if(currentStreak >= 21 || !shouldShow || !isVisible){
    return null;
  }

  return (
    <Animated.View 
      style={{ opacity: 1 }}
      className="mx-6 mt-4 mb-2"
    >
      <View
        className="border-2 border-orange shadow-lg rounded-[24px] mb-4 overflow-hidden relative"
        style={{
          shadowColor: '#FCD34D', // Orange fire color
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Close button - positioned absolutely in top right */}
        <TouchableOpacity
          onPress={handleDismiss}
          className="absolute top-2 right-4 w-8 h-8 bg-black/30 rounded-full items-center justify-center z-20"
          activeOpacity={0.7}
        >
          <FontAwesome name="times" size={16} color="white" />
        </TouchableOpacity>

        <View className="flex-row p-4 h-48 justify-between">
          {/* Phoenix Image - Same styling as StoreScreen */}
          <View className="w-48 h-full absolute left-0 bottom-0 ml-2">
            {/* Orange glow background */}
            <View
              className="w-48 h-48 absolute bottom-[-20] rounded-full"
              style={{
                backgroundColor: 'rgba(249, 115, 22, 0.1)', // Orange glow for Phoenix
                shadowColor: '#F97316',
                shadowOffset: { width: 0, height: 0 },
                right: 4,
                shadowOpacity: 0.7,
                shadowRadius: 25,
                elevation: 12,
              }}
            />
            <Image
              source={phoenixSkin}
              className="w-[200px] h-[200px] -left-[18px] absolute bottom-[-20]"
              resizeMode="contain"
            />
          </View>

          {/* Content - Add left padding to account for image */}
          <View className="flex-1 ml-44 pl-4 mr-2 my-2">
            {/* Name */}
            <Text className="font-feather text-lg text-textPrimary mb-1" numberOfLines={1}>
              {i18n.t('phoenix_skin_title')}
            </Text>

            {/* Description */}
            <Text className="font-din text-sm text-description -mb-2" numberOfLines={3}>
              {i18n.t('phoenix_skin_description', { days: daysRemaining })}
            </Text>

            {/* Progress section instead of button */}
            <View style={{ marginTop: 10 }}>
              <View className="mt-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="font-din text-sm text-brown">
                    {i18n.t('phoenix_skin_progress', { current: currentStreak })}
                  </Text>
                  <Text className="font-din text-sm text-brown">
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>
                <View className="h-3 bg-white/30 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-orange rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
} 