import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '../utils/analytics';

// Import the icon changing library
import ChangeIcon from 'react-native-change-icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface IconSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

const ICON_PREFERENCE_KEY = 'user_selected_icon';

export default function IconSelectionModal({ visible, onClose }: IconSelectionModalProps) {
  const [selectedIcon, setSelectedIcon] = useState<'regular' | 'super'>('regular');
  const [isChangingIcon, setIsChangingIcon] = useState(false);

  // Load saved icon preference on mount
  useEffect(() => {
    loadIconPreference();
  }, []);

  const loadIconPreference = async () => {
    try {
      const savedIcon = await AsyncStorage.getItem(ICON_PREFERENCE_KEY);
      if (savedIcon === 'super' || savedIcon === 'regular') {
        setSelectedIcon(savedIcon);
      }
    } catch (error) {
      console.error('Error loading icon preference:', error);
    }
  };

  const handleIconSelect = (iconType: 'regular' | 'super') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIcon(iconType);
  };

  const handleSave = async () => {
    if (isChangingIcon) return;

    try {
      setIsChangingIcon(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Save preference to AsyncStorage
      await AsyncStorage.setItem(ICON_PREFERENCE_KEY, selectedIcon);

      // Change the app icon
      if (Platform.OS === 'ios') {
        const iconName = selectedIcon === 'super' ? 'SuperIcon' : undefined; // undefined resets to default
        await ChangeIcon.changeIcon(iconName);
      } else if (Platform.OS === 'android') {
        // For Android, we'll need to handle this differently
        const iconName = selectedIcon === 'super' ? 'SuperIcon' : 'DefaultIcon';
        await ChangeIcon.changeIcon(iconName);
      }

      // Log analytics
      analytics.logEvent('icon_changed', {
        icon_type: selectedIcon,
        platform: Platform.OS,
      });

      // Show success feedback
      Alert.alert(
        'Icon Changed! 🎉',
        `Your app icon has been updated to the ${selectedIcon === 'super' ? 'Super Shepherd' : 'regular'} icon.`,
        [{ text: 'Awesome!', onPress: onClose }]
      );

    } catch (error) {
      console.error('Error changing icon:', error);
      Alert.alert(
        'Error',
        'Failed to change the app icon. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsChangingIcon(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent('icon_selection_modal_closed');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-surfaceCream">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 pt-12 pb-4">
          <TouchableOpacity
            onPress={handleClose}
            className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#3C584A" />
          </TouchableOpacity>
          <Text className="font-feather text-xl text-textPrimary">Choose Your Icon</Text>
          <View className="w-8" />
        </View>

        {/* Content */}
        <View className="flex-1 px-6">
          {/* Title and Description */}
          <View className="mb-8">
            <Text className="font-feather text-2xl text-textPrimary text-center mb-2">
              Super Shepherd Icon! 🌟
            </Text>
            <Text className="font-din text-description text-center">
              As a Super Shepherd member, you can choose between the regular icon and the exclusive Super Shepherd icon.
            </Text>
          </View>

          {/* Icon Options */}
          <View className="flex-row justify-center space-x-6 mb-8">
            {/* Regular Icon */}
            <TouchableOpacity
              onPress={() => handleIconSelect('regular')}
              className={`items-center p-4 rounded-2xl border-2 ${
                selectedIcon === 'regular' 
                  ? 'border-accentGold bg-lightYellow' 
                  : 'border-border bg-white'
              }`}
              style={{ width: SCREEN_WIDTH * 0.4 }}
              activeOpacity={0.8}
            >
              <Image
                source={require('../assets/icon.png')}
                className="w-20 h-20 rounded-2xl mb-3"
                resizeMode="cover"
              />
              <Text className="font-feather text-lg text-textPrimary text-center mb-1">
                Regular
              </Text>
              <Text className="font-din text-sm text-description text-center">
                Classic Shepherd icon
              </Text>
              {selectedIcon === 'regular' && (
                <View className="absolute top-2 right-2 bg-accentGold rounded-full p-1">
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>

            {/* Super Icon */}
            <TouchableOpacity
              onPress={() => handleIconSelect('super')}
              className={`items-center p-4 rounded-2xl border-2 ${
                selectedIcon === 'super' 
                  ? 'border-accentGold bg-lightYellow' 
                  : 'border-border bg-white'
              }`}
              style={{ width: SCREEN_WIDTH * 0.4 }}
              activeOpacity={0.8}
            >
              <Image
                source={require('../assets/icons/superIcon.png')}
                className="w-20 h-20 rounded-2xl mb-3"
                resizeMode="cover"
              />
              <Text className="font-feather text-lg text-textPrimary text-center mb-1">
                Super ⭐
              </Text>
              <Text className="font-din text-sm text-description text-center">
                Exclusive Super icon
              </Text>
              {selectedIcon === 'super' && (
                <View className="absolute top-2 right-2 bg-accentGold rounded-full p-1">
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isChangingIcon}
            className={`mx-4 py-4 rounded-2xl ${
              isChangingIcon 
                ? 'bg-gray-300' 
                : 'bg-darkGreen'
            }`}
            activeOpacity={0.8}
          >
            <Text className="font-feather text-lg text-white text-center">
              {isChangingIcon ? 'Changing Icon...' : 'Save Icon Choice'}
            </Text>
          </TouchableOpacity>

          {/* Info Text */}
          <Text className="font-din text-sm text-description text-center mt-4 px-4">
            Your icon choice will be applied immediately. You can change it anytime from your profile settings.
          </Text>
        </View>
      </View>
    </Modal>
  );
} 