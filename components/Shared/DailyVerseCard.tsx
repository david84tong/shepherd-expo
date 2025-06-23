import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Share,
  Platform,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import analytics from '~/utils/analytics';
import PrimaryButton from '../PrimaryButton';
import { Devotional } from '~/app/models/Devotional';
import { ImageBackground } from 'expo-image';
import i18n from '../../app/utils/i18n';
import { RPH } from '~/app/helper/helper';
import { AppFonts } from '~/app/constants/appFonts';
import firestore, { firebase } from '@react-native-firebase/firestore';
import { useUserStore } from '~/app/stores/userStore';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import * as FileSystem from 'expo-file-system';

interface DailyVerseCardProps {
  devotional: Devotional & { likedBy?: string[] };
  onPress?: () => void;
  onExpand?: () => void;
  showShareButton?: boolean;
  showExpandButton?: boolean;
  share?: boolean; // New prop to determine if this is a share card or regular card
}

const DailyVerseCard: React.FC<DailyVerseCardProps> = ({
  devotional,
  onPress,
  onExpand,
  showShareButton = true,
  showExpandButton = true,
  share = false,
}) => {
  const currentUser = useUserStore.getState();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(devotional.likes || 0);
  const [shareCount, setShareCount] = useState(devotional.shares || 0);

  // A devotional is only "real" (and thus likeable/shareable) if it's not a locally generated one.
  const isRealDevotional = !devotional.id.startsWith('quick-') && !devotional.id.startsWith('ai-');

  useEffect(() => {
    if (currentUser?.id && devotional.likedBy && isRealDevotional) {
      setIsLiked(devotional.likedBy.includes(currentUser.id));
    }
    setLikeCount(devotional.likes || 0);
    setShareCount(devotional.shares || 0);
  }, [devotional, currentUser, isRealDevotional]);

  const handleLikePress = async () => {
    if (!isRealDevotional || !currentUser?.id || !devotional.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

    const devotionalRef = firestore().collection('dailyDevotionals').doc(devotional.id);

    try {
      await devotionalRef.update({
        likes: firestore.FieldValue.increment(newLikedState ? 1 : -1),
        likedBy: newLikedState
          ? firestore.FieldValue.arrayUnion(currentUser.id)
          : firestore.FieldValue.arrayRemove(currentUser.id),
      });
      analytics.logEvent('DailyVerseCard_Tapped_Like', {
        bibleReference: devotional.bibleReference,
        liked: newLikedState,
      });
      useDevotionalStore.getState().updateLikeStatus(devotional.id, newLikedState);
    } catch (error) {
      console.error("Error updating likes:", error);
      // Revert state on error
      setIsLiked(!newLikedState);
      setLikeCount(prev => newLikedState ? prev - 1 : prev + 1);
    }
  };

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

  const handleSharePress = async () => {
    if (!isRealDevotional || !devotional.id || !devotional.imageURL) return;

    try {
      // 1. Download the image to a temporary local file
      const localUri = FileSystem.cacheDirectory + 'share_image.jpg';
      await FileSystem.downloadAsync(devotional.imageURL, localUri);

      const message = `"${devotional.verse}" - ${devotional.bibleReference}`;

      // 2. Use RN's Share API with the local file URI
      const result = await Share.share({
        title: 'Share Daily Verse',
        message: Platform.OS === 'android' ? `${message}\n${localUri}` : message,
        url: localUri,
      });

      // 3. Only increment if the share was successful

      setShareCount(prev => prev + 1);
      const devotionalRef = firestore().collection('dailyDevotionals').doc(devotional.id);
      await devotionalRef.update({
        shares: firestore.FieldValue.increment(1),
      });
      analytics.logEvent('DailyVerseCard_Tapped_Share', {
        isShareCard: share,
        bibleReference: devotional.bibleReference,
      });
      useDevotionalStore.getState().incrementShareCount(devotional.id);

    } catch (error) {
      console.error("Error sharing:", error);
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
      className="bg-surfaceCream rounded-3xl overflow-hidden mb-4 border border-buttonBorder shadow-card">
      <ImageBackground
        source={{ uri: devotional.imageURL }}
        style={{ width: '100%', minHeight: RPH(23) }}
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
        <View style={{ padding: RPH(2), minHeight: RPH(23) }} className="pb-4 justify-between">
          <View>
            <Text style={{ fontSize: AppFonts[17], marginBottom: RPH(0.3) }} className="font-feather text-white">
              {devotional.bibleReference}
            </Text>
            <Text style={{ fontSize: AppFonts[17], marginBottom: RPH(2) }} className="font-nunito-mediumItalic text-white shadow-lg  leading-[26px]">
              {i18n.t('verse_of_the_day')}
            </Text>
            <Text style={{ fontSize: AppFonts[17] }} className="font-din text-white  leading-[22px]">
              {devotional.verse}
            </Text>

            {showExpandButton ? <View className="flex-row items-center mt-4">
              <TouchableOpacity onPress={handleLikePress} disabled={!isRealDevotional} className="flex-row items-center mr-4">
                <Ionicons name="heart" size={RPH(2.2)} color={isLiked && isRealDevotional ? "#B36303" : "white"} />
                <Text className="ml-2 text-white font-din text-lg">{likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSharePress} disabled={!isRealDevotional} className="flex-row items-center">
                <FontAwesome5 name="share-alt" size={RPH(1.8)} color="white" />
                <Text className="ml-2 text-white font-din text-lg">{shareCount}</Text>
              </TouchableOpacity>
            </View> : null}
          </View>

          {/* Share Button - only show when share=true AND showShareButton is true */}
          {share && showShareButton && (
            <View style={{ marginTop: RPH(1) }} className="w-full ">
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
            className="absolute top-6 right-4"
            onPress={handleExpandPress}>
            <Ionicons name="expand" size={24} color="white" />
          </TouchableOpacity>
        )}
      </ImageBackground>
    </Pressable>
  );
};

export default DailyVerseCard;
