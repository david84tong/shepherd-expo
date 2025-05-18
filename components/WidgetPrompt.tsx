import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import WidgetGuide from './WidgetGuide';

const WIDGET_PROMPT_SHOWN_KEY = 'widget_prompt_shown';

export default function WidgetPrompt() {
  const [visible, setVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Only check and show if iOS
    if (Platform.OS !== 'ios') return;
    
    // Check if we've already shown the prompt
    checkIfPromptShown();
  }, []);

  const checkIfPromptShown = async () => {
    try {
      const hasShown = await AsyncStorage.getItem(WIDGET_PROMPT_SHOWN_KEY);
      
      // If we haven't shown it yet, show after a short delay
      if (hasShown !== 'true') {
        setTimeout(() => {
          setVisible(true);
        }, 3000); // Show after 3 seconds
      }
    } catch (error) {
      console.error('Error checking widget prompt status:', error);
    }
  };

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(false);
    
    // Mark as shown
    try {
      await AsyncStorage.setItem(WIDGET_PROMPT_SHOWN_KEY, 'true');
    } catch (error) {
      console.error('Error saving widget prompt status:', error);
    }
  };

  const handleShowGuide = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowGuide(true);
  };
  
  const handleCloseGuide = async () => {
    setShowGuide(false);
    setVisible(false);
    
    // Mark as shown
    try {
      await AsyncStorage.setItem(WIDGET_PROMPT_SHOWN_KEY, 'true');
    } catch (error) {
      console.error('Error saving widget prompt status:', error);
    }
  };
  
  // Don't render anything if not iOS or not visible
  if (Platform.OS !== 'ios' || !visible) {
    return null;
  }

  return (
    <>
      <View className="absolute bottom-5 left-5 right-5 z-40">
        <LinearGradient
          colors={['#F9FAFB', '#E5E7EB']}
          className="rounded-xl p-4 shadow-lg border border-[#E5E7EB]"
        >
          <View className="flex-row items-center">
            <Image 
              source={require('../assets/goldLamb.png')} 
              className="w-16 h-16 mr-3"
            />
            <View className="flex-1">
              <Text className="font-bold text-base mb-1">Keep your lamb close!</Text>
              <Text className="text-sm text-gray-600">
                Add the Shepherd widget to see your streak status right on your home screen.
              </Text>
            </View>
          </View>
          
          <View className="mt-4 flex-row justify-end space-x-3">
            <TouchableOpacity
              onPress={handleDismiss}
              className="py-2 px-3"
            >
              <Text className="text-gray-500">Later</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleShowGuide}
              className="bg-primary rounded-lg py-2 px-4"
            >
              <Text className="text-white font-medium">Show Me How</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
      
      <Modal
        visible={showGuide}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <WidgetGuide onClose={handleCloseGuide} />
      </Modal>
    </>
  );
} 