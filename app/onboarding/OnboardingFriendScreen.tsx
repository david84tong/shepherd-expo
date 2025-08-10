import React from 'react';
import { View, Text, Share, StatusBar, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../components/PrimaryButton';
import analytics from '../../utils/analytics';
import Animated, { useSharedValue, withTiming, withSpring, useAnimatedStyle, withDelay } from 'react-native-reanimated';

export default function OnboardingFriendScreen() {
  const router = useRouter();
  
  // Entrance animations
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(16);
  const imageOpacity = useSharedValue(0);
  const imageTranslateY = useSharedValue(16);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(16);
  const actionsOpacity = useSharedValue(0);
  const actionsTranslateY = useSharedValue(16);

  React.useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 450 });
    titleTranslateY.value = withSpring(0, { damping: 18, stiffness: 120 });
    imageOpacity.value = withDelay(100, withTiming(1, { duration: 450 }));
    imageTranslateY.value = withDelay(100, withSpring(0, { damping: 18, stiffness: 120 }));
    cardOpacity.value = withDelay(200, withTiming(1, { duration: 450 }));
    cardTranslateY.value = withDelay(200, withSpring(0, { damping: 18, stiffness: 120 }));
    actionsOpacity.value = withDelay(300, withTiming(1, { duration: 450 }));
    actionsTranslateY.value = withDelay(300, withSpring(0, { damping: 18, stiffness: 120 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslateY.value }] }));
  const imageStyle = useAnimatedStyle(() => ({ opacity: imageOpacity.value, transform: [{ translateY: imageTranslateY.value }] }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value, transform: [{ translateY: cardTranslateY.value }] }));
  const actionsStyle = useAnimatedStyle(() => ({ opacity: actionsOpacity.value, transform: [{ translateY: actionsTranslateY.value }] }));

  const handleInvite = async () => {
    try {
      analytics.trackEvent('OnboardingFriend_InvitePrayerBuddy_Pressed');
      const message =
        "Join me on Shepherd as my prayer buddy! ‘Two are better than one, because they have a good reward for their toil.’ — Ecclesiastes 4:9\n\nGet the app: https://shepherd.app";
      await Share.share({
        message,
        title: 'Invite a Prayer Buddy',
      });
    } catch (err) {
      // noop
    }
  };

  const handleSkip = () => {
    analytics.trackEvent('OnboardingFriend_Skip');
    try {
      router.back();
    } catch (e) {
      console.warn('Failed to navigate back from OnboardingFriendScreen', e);
    }
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="flex-1 bg-surfaceCream px-6 pt-12 pb-8 justify-between">
        {/* Top content */}
        <View>
          {/* Title */}
          <Animated.View style={titleStyle}>
            <Text className="font-feather text-h2 text-center text-textPrimary mb-4">
              Don&#39;t walk alone!
            </Text>
          </Animated.View>

          {/* Illustration */}
          <Animated.View style={imageStyle} className="items-center mb-4">
            <Image
              source={require('../../assets/onboarding/inviteFriend.png')}
              style={{ width: 240, height: 240 }}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Verse Card */}
          <Animated.View style={cardStyle} className="bg-surfaceCreamLight rounded-2xl p-5 shadow-card border border-[#eed39d]">
            <Text className="font-feather text-h4 text-textPrimary text-center">
              “Two are better than one, because they have a good reward for their toil.”
            </Text>
            <Text className="font-din text-textPrimary/60 text-center mt-3">— Ecclesiastes 4:9</Text>
          </Animated.View>
        </View>

        {/* Bottom actions */}
        <Animated.View style={actionsStyle}>
          <PrimaryButton
            title="Invite prayer buddy"
            onPress={handleInvite}
            buttonType="blue"
            width="100%"
          />
          <TouchableOpacity onPress={handleSkip} className="mt-4 self-center">
            <Text className="font-din text-textPrimary/60">Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}

