import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar, Image, ScrollView, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import PrimaryButton from '~/components/PrimaryButton';
import analytics from '~/utils/analytics';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSignedIn } from '~/app/hooks/authHook';

import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { hapticMedium } from '~/utils/haptics';

const DISCORD_CARD_DISMISSED_KEY = 'shepherd_discord_card_dismissed_v1';

export default function ShepherdCommunityScreen() {
  const router = useRouter();
  const [showDiscordCard, setShowDiscordCard] = useState(true);

  // Create Reanimated shared values for each component
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(40);

  const imageOpacity = useSharedValue(0);
  const imageTranslateY = useSharedValue(40);

  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(40);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);

  useEffect(() => {
    // Analytics for screen view
    analytics.logEvent('ShepherdCommunity_ScreenLoad', {
      timestamp: new Date().toISOString(),
      showDiscordCard: showDiscordCard
    });

    // Check Discord card dismissal status
    const checkDismissalStatus = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(DISCORD_CARD_DISMISSED_KEY);
        if (dismissed === 'true') {
          setShowDiscordCard(false);
        }
      } catch (error) {
        console.error('Failed to load discord card dismissal status', error);
      }
    };
    checkDismissalStatus();

    // Reset animation values
    headerOpacity.value = 0;
    headerTranslateY.value = 40;
    imageOpacity.value = 0;
    imageTranslateY.value = 40;
    formOpacity.value = 0;
    formTranslateY.value = 40;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 40;

    // Staggered animations for each component
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(
        delay,
        withSpring(0, {
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
    animateComponent(headerOpacity, headerTranslateY, 0);
    animateComponent(imageOpacity, imageTranslateY, 200);
    animateComponent(formOpacity, formTranslateY, 400);
    animateComponent(buttonOpacity, buttonTranslateY, 600);
  }, []);

  // Create animated styles for each component
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ translateY: imageTranslateY.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const handleDismissDiscordCard = async () => {
    try {
      await AsyncStorage.setItem(DISCORD_CARD_DISMISSED_KEY, 'true');
      setShowDiscordCard(false);
      analytics.logEvent('ShepherdCommunity_Discord_Dismissed', {
        timestamp: new Date().toISOString(),
        action: 'discord_card_dismissed'
      });
    } catch (error) {
      console.error('Failed to save discord card dismissal status', error);
    }
  };

  const handleJoinDiscord = async () => {
    analytics.logEvent('ShepherdCommunity_Button_JoinDiscord', {
      timestamp: new Date().toISOString(),
      action: 'join_discord_pressed'
    });
    await handleDismissDiscordCard();
    try {
      await Linking.openURL('https://discord.gg/W9MZdVaKBs');
      analytics.logEvent('ShepherdCommunity_Discord_LinkOpened', {
        timestamp: new Date().toISOString(),
        success: true
      });
    } catch (err) {
      console.error('Failed to open Discord link', err);
      analytics.logEvent('ShepherdCommunity_Discord_LinkError', {
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      Alert.alert(
        'Error',
        'Could not open the Discord link. Please ensure Discord is installed or try again later.'
      );
    }
  };

  const handleDone = async () => {
    hapticMedium();
    const userSignedIn = isSignedIn();
    analytics.logEvent('ShepherdCommunity_Button_Done', {
      timestamp: new Date().toISOString(),
      action: 'done_pressed',
      isSignedIn: userSignedIn,
      nextDestination: userSignedIn ? 'tabs' : 'signin'
    });

    // Check if user is signed in and redirect accordingly
    if (userSignedIn) {
      // User is signed in, go to home/tabs
      router.push('/(tabs)');
    } else {
      // User is not signed in, go to sign-in screen
      router.push('/onboarding/11');
    }
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <ScrollView className="flex-1 bg-surfaceCream">
        <View className="flex-1 px-6 pt-16 pb-8">

          {/* Header Section */}
          <Animated.View style={headerStyle} className="items-center mt-8 mb-3">
            <Text className="font-feather text-3xl text-textPrimary text-center mb-4">
              Welcome to the
              <Text className="text-blue"> Super Shepherd </Text>
              community!
            </Text>
            <Text className="font-din text-base text-description text-center px-4">
              Our team is grateful for your support
              and we&apos;ll be able to continue
              improve Shepherd thanks to you!
            </Text>
          </Animated.View>

          {/* Community Image Section */}
          <Animated.View style={imageStyle} className="items-center justify-center my-6">
            <View className="w-full items-center justify-center">
              <Image
                source={require('~/assets/onboarding/shepherdCommunity.png')}
                style={{ height: 220, borderRadius: 12 }}
                resizeMode="cover"
                className="w-full h-full"
              />
            </View>
          </Animated.View>

          {/* Community Text Section */}
          <Animated.View style={formStyle} className="items-center mb-8">


            {/* Discord Card */}
            {showDiscordCard && (
              <View className="w-full bg-surfaceCreamLight rounded-[20px] p-6 shadow-card border border-brownBorder relative mb-0">


                <View className="flex-row items-center mb-4">
                  <View className="bg-white p-3 rounded-full mr-4 shadow-md">
                    <FontAwesome6 name="discord" size={20} color="#5865F2" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-feather text-lg text-darkPurple">
                      Join our Discord
                    </Text>
                    <Text className="font-din text-base text-darkPurple opacity-80 mt-1 leading-tight">
                      We&apos;d love to see you in our community. Get sneak peeks at new features and help weigh in on features!
                    </Text>
                  </View>
                </View>

                <PrimaryButton
                  title="Join the Herd"
                  onPress={handleJoinDiscord}
                  primaryColor="bg-darkPurple"
                  textColor="text-white"
                  shadowStyle="shadow-darkPurple"
                  style="mt-2"
                />
              </View>
            )}

          </Animated.View>

          {/* Done Button */}
          <Animated.View style={buttonStyle} className="w-full">
            <PrimaryButton
              title="Contine Home"
              onPress={handleDone}
              buttonType="blue"
              buttonHeight={56}
            />
          </Animated.View>

        </View>
      </ScrollView>
    </>
  );
}
