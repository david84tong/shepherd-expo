import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import analytics from '~/utils/analytics';
import PrimaryButton from '../PrimaryButton';
import { Devotional } from '~/app/models/Devotional';

interface DailyVerseCardProps {
  devotional: Devotional;
  onPress?: () => void;
  onShare?: () => void;
  onExpand?: () => void;
  showShareButton?: boolean;
  showExpandButton?: boolean;
  share?: boolean; // New prop to determine if this is a share card or regular card
}

const DailyVerseCard: React.FC<DailyVerseCardProps> = ({
  devotional,
  onPress,
  onShare,
  onExpand,
  showShareButton = true,
  showExpandButton = true,
  share = false,
}) => {
  const handleCardPress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      analytics.logEvent('DailyVerseCard_Tapped', {
        bibleReference: devotional.bibleReference,
        isShareCard: share,
      });
      onPress();
    }
  };

  const handleSharePress = () => {
    if (onShare) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      analytics.logEvent('DailyVerseCard_Tapped_Share', {
        isShareCard: share,
      });
      onShare();
    }
  };

  const handleExpandPress = () => {
    if (onExpand) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      analytics.logEvent('DailyVerseCard_Tapped_Expand', {
        isShareCard: share,
      });
      onExpand();
    }
  };

  if (!devotional?.verse) {
    return null;
  }

  // Share card (poster style) when share=true
  if (share) {
    return (
      <Pressable
        onPress={handleCardPress}
        className="bg-surfaceCream rounded-3xl overflow-hidden mb-4 border border-buttonBorder shadow-card h-96">
        <ImageBackground
          source={{ uri: devotional.imageURL }}
          style={{ width: '100%' }}
          resizeMode="cover">
          {/* Dark overlay for readability */}
          <View className="absolute inset-0 bg-black/30" />

          {/* Content */}
          <View className="p-6 pb-4 h-full justify-between">
            <View>
              <Text className="font-feather text-white text-heading mb-1">
                {devotional.bibleReference}
              </Text>
              <Text className="font-din text-white/90 text-heading leading-[26px] mb-7">
                Verse of the day
              </Text>
              <Text className="font-din text-white/90 text-heading leading-[22px]">
                {devotional.verse}
              </Text>
            </View>

            {/* Share Button */}
            {showShareButton && (
              <View className="mt-10 w-full">
                <PrimaryButton
                  title="Share"
                  onPress={handleSharePress}
                  buttonType="orange"
                />
              </View>
            )}
          </View>

          {/* Expand button */}
          {showExpandButton && (
            <TouchableOpacity
              className="absolute top-4 right-4"
              onPress={handleExpandPress}>
              <Ionicons name="expand" size={24} color="white" />
            </TouchableOpacity>
          )}
        </ImageBackground>
      </Pressable>
    );
  }

  // Regular card (clean style) when share=false
  return (
    <TouchableOpacity
      onPress={handleCardPress}
      activeOpacity={0.9}
      className="bg-surfaceCreamLight rounded-2xl p-5 mb-4 border border-buttonBorder shadow-card">
      {/* Header with star icon and title */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-7 h-7 bg-lightBrown rounded-lg items-center justify-center mr-3">
            <Ionicons name="star" size={18} color="#FFD629" />
          </View>
          <Text className="font-feather text-heading text-textPrimary">
            Daily Verse
          </Text>
        </View>
        
        {/* Expand button */}
        {showExpandButton && (
          <TouchableOpacity onPress={handleExpandPress}>
            <Ionicons name="expand" size={20} color="#795323" />
          </TouchableOpacity>
        )}
      </View>

      {/* Bible Reference */}
      <Text className="font-feather text-brown text-lg font-bold mb-2">
        {devotional.bibleReference}
      </Text>

      {/* Verse Text */}
      <Text className="font-din text-textPrimary/90 text-body leading-[22px] italic mb-4">
        &ldquo;{devotional.verse}&rdquo;
      </Text>

      {/* Share Button */}
      {showShareButton && (
        <View className="mt-2">
          <PrimaryButton
            title="Share"
            onPress={handleSharePress}
            buttonType="orange"
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default DailyVerseCard;
