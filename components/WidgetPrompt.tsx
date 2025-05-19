// WidgetPrompt.jsx
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import PrimaryButton from './PrimaryButton';
import analytics from '../utils/analytics';

interface WidgetPromptProps {
  visible: boolean;
  onClose: () => void;
  onShowGuide: () => void;
}

/**
 * A bottom sheet component that prompts the user to add the Shepherd Streak widget
 */
const WidgetPrompt: React.FC<WidgetPromptProps> = ({ visible, onClose, onShowGuide }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');
  
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
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, screenHeight]);

  const handleBackdropPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent("WidgetPrompt_BackdropTapped");
    onClose();
  };

  const handleAddWidget = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.logEvent("WidgetPrompt_AddWidget_Tapped");
    onShowGuide();
  };

  const handleNoThanks = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent("WidgetPrompt_NoThanks_Tapped");
    onClose();
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
      
      {/* Bottom Sheet */}
      <Animated.View 
        style={{
          transform: [{ translateY: slideUpAnim }],
          paddingBottom: insets.bottom,
        }}
        className="bg-white rounded-t-3xl overflow-hidden"
      >
        {/* Handle */}
        <View className="w-full items-center pt-2 pb-4">
          <View className="w-12 h-1 rounded-full bg-gray-300" />
        </View>
        
        {/* Content */}
        <LinearGradient
          colors={['#FFD95C', '#FFB82E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-5 pt-4 pb-8"
        >
          <Text className="font-feather text-2xl font-semibold text-stone-800 text-center mb-1">
            Shepherd widget
          </Text>
          <Text className="font-din text-base text-stone-700 text-center mb-6">
            Add the streak widget to your home screen
          </Text>

          <View className="items-center justify-center mb-6 bg-white/20 rounded-xl p-4">
            <View className="bg-white/70 rounded-lg p-3 w-56 h-56 items-center justify-center shadow-sm">
              <Image 
                source={require('../assets/images/sheep-widget-preview.png')} 
                className="w-48 h-48 rounded-lg"
                resizeMode="contain"
              />
              <View className="absolute bottom-2 bg-yellow-100 px-3 py-1 rounded-full">
                <Text className="font-din text-sm font-medium text-amber-700">
                  Streak: 12 days
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <TouchableOpacity
              onPress={handleAddWidget}
              className="bg-amber-400 rounded-full py-4 items-center shadow-sm"
              activeOpacity={0.8}
            >
              <Text className="font-feather text-base font-medium text-stone-800">
                SHOW ME HOW
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleNoThanks}
            className="items-center py-2"
          >
            <Text className="font-din text-stone-800 text-base underline">
              Not now
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

export default WidgetPrompt;
