import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import analytics from '~/utils/analytics';
import PrimaryButton from '../PrimaryButton';
import { Devotional } from '~/app/models/Devotional';
import { ImageBackground } from 'expo-image';
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

  // Always use poster-style background, but conditionally show buttons based on props
  return (
    <Pressable
      onPress={handleCardPress}
      className={`bg-surfaceCream rounded-3xl overflow-hidden mb-4 border border-buttonBorder shadow-card ${share && showShareButton ? 'h-80' : 'h-64'}`}>
      <ImageBackground
        source={{ uri: devotional.imageURL }}
        style={{ width: '100%', backgroundColor:'#AAB33D' }}
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

          {/* Share Button - only show when share=true AND showShareButton is true */}
          {share && showShareButton && (
            <View className="mt-10 w-full -top-4">
              <PrimaryButton
                title="Share"
                onPress={handleSharePress}
                buttonType="orange"
              />
            </View>
          )}
        </View>

        {/* Expand button - only show when share=true AND showExpandButton is true */}
        {share && showExpandButton && (
          <TouchableOpacity
            className="absolute top-4 right-4"
            onPress={handleExpandPress}>
            <Ionicons name="expand" size={24} color="white" />
          </TouchableOpacity>
        )}
      </ImageBackground>
    </Pressable>
  );
};

export default DailyVerseCard;
