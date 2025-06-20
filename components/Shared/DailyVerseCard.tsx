import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import analytics from '~/utils/analytics';
import PrimaryButton from '../PrimaryButton';
import { Devotional } from '~/app/models/Devotional';
import { ImageBackground } from 'expo-image';
import i18n from '../../app/utils/i18n';

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
        style={{ width: '100%'}}
        resizeMode="cover">
        {/* Linear gradient overlay for readability - darker at top, lighter at bottom */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.1)']}
          locations={[0, 0.6, 1]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Content */}
        <View className="p-6 pb-4 h-full justify-between">
          <View>
            <Text className="font-feather text-white text-heading mb-1">
              {devotional.bibleReference}
            </Text>
            <Text className="font-din text-white text-heading leading-[26px] mb-7">
              {i18n.t('verse_of_the_day')}
            </Text>
            <Text className="font-nunito-italic text-white text-heading leading-[22px]">
              {devotional.verse}
            </Text>
          </View>

          {/* Share Button - only show when share=true AND showShareButton is true */}
          {share && showShareButton && (
            <View className="mt-10 w-full -top-8">
              <PrimaryButton
                title={i18n.t('share')}
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
