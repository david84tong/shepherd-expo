import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import RNAnimated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import PrimaryButton from './PrimaryButton';
import { RPH } from '~/app/helper/helper';
import { useUserStore } from '~/app/stores/userStore';
import { useHomeStore } from '~/app/stores/homeStore';
import { getLevelData } from '~/utils/levelUtils';
import i18n from '../app/utils/i18n';
import { imageAssets } from '~/app/stores/assetsStore';
import { AppFonts } from '~/app/constants/appFonts';
import analytics from '../utils/analytics';

interface SuccessMessageProps {
  title?: string;
  description?: string;
  level: number;
  prevLevel: number;
  buttonsEnabled: boolean;
  onGoHome: () => void;
  onPray: () => void;
  prayButtonTitle?: string;
  hidePrayButton?: boolean;
  homeButtonTitle?: string;
  rewardsTitle?: string;
  heartsGained?: number;
  xpGained?: number;
  showCollectBonus?: boolean;
  onLoad?: () => void;
  screenType?: 'reading' | 'prayer' | 'reflection';
}

const MAX_HEARTS = 100;

const SuccessMessage: React.FC<SuccessMessageProps> = ({
  title = i18n.t('reading_complete'),
  description = i18n.t('reading_complete_desc'),
  level,
  prevLevel,
  buttonsEnabled,
  onGoHome,
  onPray,
  prayButtonTitle = i18n.t('pray_about_this_verse'),
  hidePrayButton = false,
  homeButtonTitle = i18n.t('go_home'),
  rewardsTitle = i18n.t('reading_rewards'),
  heartsGained = 0,
  xpGained = 0,
  showCollectBonus = false,
  onLoad,
  screenType,
}) => {
  const didLevelUp = useMemo(() => level > prevLevel, [level, prevLevel]);

  useEffect(() => {
    onLoad?.()
  }, [])


  // Get completion states from homeStore
  const readingCompleted = useHomeStore((state) => state.readingCompleted);
  const reflectionCompleted = useHomeStore((state) => state.reflectionCompleted);
  const sawDailyBonus = useHomeStore((state) => state.sawDailyBonus);
  const sawStreakToday = useHomeStore((state) => state.sawStreakToday);

  // Determine if we should show collect bonus button
  // This happens when completing prayer and both reading and reflection are already done
  // OR when completing reflection and prayer has already been done
  // Get prayerCompleted from store properly
  const prayerCompleted = useHomeStore((state) => state.prayerCompleted);
  
  const shouldShowCollectBonus = useMemo(() => {
    if (showCollectBonus) return true; // Explicit prop override

    // Check if bonus is available - either after prayer with reading+reflection done
    // OR after reflection with reading+prayer done
    // const isFirstReadingOfDay = !sawStreakToday;
    const allActivitiesComplete = readingCompleted && reflectionCompleted && prayerCompleted;
    const isBonusAvailable = allActivitiesComplete && !sawDailyBonus;

    return isBonusAvailable;
  }, [showCollectBonus, readingCompleted, reflectionCompleted, prayerCompleted, sawStreakToday, sawDailyBonus]);


  // Get user data
  const lambHearts = useUserStore((state) => state?.getLambHearts?.());
  const lamb = useUserStore((state) => state.getLamb?.());
  const levelInfo = useMemo(() => {
    if (!lamb || lamb.xp === undefined)
      return {
        level: 1,
        xp: 0,
        xpForCurrentLevel: 0,
        xpForNextLevel: 90,
        xpProgress: 0,
        xpNeeded: 90,
        progress: 0,
      };
    return getLevelData(lamb.xp);
  }, [lamb?.xp]);

  // Get daily XP tracking functions
  const getDailyXpRemaining = useHomeStore((state) => state.getDailyXpRemaining);

  // Calculate actual XP that would be awarded (respecting daily limit)
  const actualXpGained = useMemo(() => {
    const remaining = getDailyXpRemaining();
    return Math.min(xpGained, remaining);
  }, [xpGained, getDailyXpRemaining]);

  // Get gem icon from assets
  const gemIcon = imageAssets[8];

  // Reanimated shared values
  const xp = useSharedValue(0);
  const hearts = useSharedValue(0);
  const textOpacity = useSharedValue(0.4);
  const blueOpacity = useSharedValue(0.3);
  const goldOpacity = useSharedValue(0.4);
  const scale = useSharedValue(0.8);
  const fadeOpacity = useSharedValue(0.1);
  // Level up specific animations
  const levelUpScale = useSharedValue(0);
  const levelUpOpacity = useSharedValue(0);
  const rocketRotation = useSharedValue(0);
  // Final stats animations
  const finalStatsOpacity = useSharedValue(0);
  const finalStatsScale = useSharedValue(0.8);
  const [localButtonsEnabled, setLocalButtonsEnabled] = useState(false);
  const [showFinalStats, setShowFinalStats] = useState(false);
  const hasAnimated = useRef(false);

  // Compute paddingTop outside the worklet
  const paddingTopValue = !didLevelUp ? RPH(8) : 0;

  // Animate on mount or when values change
  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    xp.value = 0;
    hearts.value = 0;
    textOpacity.value = 0.4;
    blueOpacity.value = 0.3;
    goldOpacity.value = 0.4;
    scale.value = 0.6;
    fadeOpacity.value = 0;
    // Reset level up animations
    levelUpScale.value = 0;
    levelUpOpacity.value = 0;
    rocketRotation.value = 0;
    // Reset final stats animations
    finalStatsOpacity.value = 0;
    finalStatsScale.value = 0.8;
    setLocalButtonsEnabled(false);

    // Animate pop out and fade in
    scale.value = withTiming(1, { duration: 600 });
    fadeOpacity.value = withTiming(1, { duration: 600 });

    // If level up, animate level up elements first
    if (didLevelUp) {
      setTimeout(() => {
        levelUpOpacity.value = withTiming(1, { duration: 800 });
        levelUpScale.value = withTiming(1, { duration: 800 });
        rocketRotation.value = withTiming(360, { duration: 1000 });
      }, 300);
    }

    // Animate progress bars and text
    setTimeout(() => {
      xp.value = withTiming(levelInfo.progress, { duration: 1200 });
      hearts.value = withTiming(lambHearts / MAX_HEARTS, { duration: 1200 });
      textOpacity.value = withTiming(1, { duration: 800 });

      // After progress bars finish, switch to final stats
      setTimeout(() => {
        setShowFinalStats(true);
        // Animate in the final stats
        finalStatsOpacity.value = withTiming(1, { duration: 600 });
        finalStatsScale.value = withTiming(1, { duration: 600 });
        setTimeout(() => {
          blueOpacity.value = withTiming(1, { duration: 600 });
          goldOpacity.value = withTiming(1, { duration: 600 });
          setTimeout(() => {
            setLocalButtonsEnabled(true);
          }, 0);
        }, 600); // Wait for final stats animation
      }, 1200); // Wait for progress bars to finish
    }, didLevelUp ? 1000 : 500); // Start later if level up
  }, []); // Empty dependency array since we only want to run once on mount

  // Track level up and update analytics profile
  useEffect(() => {
    if (!didLevelUp) return;
    const userId = useUserStore.getState().id || 'anonymous';
    analytics.trackEvent('Lamb_Level_Up', {
      new_level: level,
      previous_level: prevLevel,
    });
    analytics.identifyUser(userId, { lamb_level: level });
  }, [didLevelUp, level, prevLevel]);

  // Animated styles
  const xpBarStyle = useAnimatedStyle(() => ({
    width: `${xp.value}%`,
  }));
  const heartsBarStyle = useAnimatedStyle(() => ({
    width: `${hearts.value * 100}%`,
  }));
  const textOpacityStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    paddingTop: paddingTopValue,
  }));
  const blueButtonStyle = useAnimatedStyle(() => ({
    opacity: blueOpacity.value,
  }));
  const goldButtonStyle = useAnimatedStyle(() => ({
    opacity: goldOpacity.value,
  }));
  const successViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const levelUpAnimatedStyle = useAnimatedStyle(() => ({
    opacity: levelUpOpacity.value,
    transform: [{ scale: levelUpScale.value }],
  }));

  const rocketAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rocketRotation.value}deg` }],
  }));

  const finalStatsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: finalStatsOpacity.value,
    transform: [{ scale: finalStatsScale.value }],
  }));

  return (
    <RNAnimated.View className="flex-1 items-center" style={successViewAnimatedStyle}>
      {didLevelUp && (
        <RNAnimated.View style={levelUpAnimatedStyle} className="items-center">
          <RNAnimated.View style={rocketAnimatedStyle} className="mb-0 mt-0">
            <Image source={require("../assets/icons/rocket.png")} style={{ width: 65, height: 65 }} />
          </RNAnimated.View>
          <Text className="font-feather text-[28px] text-center mb-6 text-orange">
            {i18n.t('level_up', { level })}
          </Text>
        </RNAnimated.View>
      )}
      <RNAnimated.Text
        className={`font-feather  text-center mb-1 text-brown/90 ${!didLevelUp ? '-mt-12' : ''}`}
        style={[textOpacityStyle, { fontSize: AppFonts[22] }]}
      >
        {title}
      </RNAnimated.Text>
      <Text style={{ fontSize: AppFonts[15] }} className="font-din   text-brown/90 text-center mb-4" >
        {description}
      </Text>
      {/* <Text style={{paddingTop:RPH(4)}} className="font-bold text-[13px] text-center mb-6 tracking-wider uppercase text-brown/80">
        {rewardsTitle}
      </Text> */}
      <View
        style={[
          { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
          !didLevelUp && { marginTop: 8 },
        ]}
      >
        <View style={{ width: 40, alignItems: 'flex-end' }}>
          {!showFinalStats ? (
            <Text className="font-feather text-red text-sm">+{heartsGained || 15}</Text>
          ) : (
            <RNAnimated.View style={finalStatsAnimatedStyle}>
              <Text className="font-feather text-red text-sm">{lambHearts}</Text>
            </RNAnimated.View>
          )}
        </View>
        <Image source={require('../assets/icons/heartIcon.png')} className="w-7 h-7 mr-2" />
        <View style={{ flex: 1 }}>
          <View className="h-2 bg-red/25 rounded-md overflow-hidden">
            <RNAnimated.View
              className="h-full bg-red rounded-full"
              style={heartsBarStyle}
            />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', }}>
        <View style={{ width: 40, alignItems: 'flex-end' }}>
          {!showFinalStats ? (
            <Text className="font-feather text-orange text-sm">+{actualXpGained || 50}</Text>
          ) : (
            <RNAnimated.View style={finalStatsAnimatedStyle}>
              <Text className="font-feather text-orange text-sm">LVL {levelInfo.level}</Text>
            </RNAnimated.View>
          )}
        </View>
        <Image source={require('../assets/icons/starIcon.png')} style={{ tintColor: '#FF8800' }} className="w-7 h-7 mr-2" />
        <View style={{ flex: 1 }}>
          <View className="h-2 bg-orange/25 rounded-full overflow-hidden " >
            <RNAnimated.View
              className="h-full bg-orange rounded-full"
              style={xpBarStyle}
            />
          </View>
        </View>
      </View>

      {/* Show daily XP limit warning if XP was reduced */}
      {actualXpGained < xpGained && (
        <View className="mt-3 py-2 px-3 bg-lightYellow rounded-xl w-full">
          <Text className="font-din text-description text-center text-sm">
            Daily XP limit reached ({getDailyXpRemaining()} remaining)
          </Text>
        </View>
      )}

      <View
        style={{ paddingTop: RPH(5) }}
        className={`w-full items-center ${didLevelUp ? '-mt-4' : 'mt-8'}`}
      >
        {shouldShowCollectBonus ? (
          // Show only collect bonus button with gem icon
          <RNAnimated.View style={blueButtonStyle} className="w-full">
            <PrimaryButton
              title={i18n.t('collect_bonus')}
              onPress={onPray}
              buttonType="blue"
              icon={gemIcon}
              reward="+100"
              disabled={!localButtonsEnabled || !buttonsEnabled}
              width="100%"
            />
          </RNAnimated.View>
        ) : (
          // Normal flow with both buttons
          <>
            {!hidePrayButton && (screenType !== 'reflection') && (
              <RNAnimated.View style={blueButtonStyle} className="w-full">
                <PrimaryButton
                  title={prayButtonTitle || i18n.t('pray_about_this_verse')}
                  onPress={onPray}
                  buttonType="blue"
                  icon={require('../assets/icons/starIcon.png')}
                  reward="+50"
                  disabled={!localButtonsEnabled || !buttonsEnabled}
                  width="100%"
                />
              </RNAnimated.View>
            )}
            <RNAnimated.View style={goldButtonStyle} className="w-full">
              <TouchableOpacity
                onPress={() => {
                  // Ensure streak logic can evaluate using the state BEFORE any completion flags are mutated
                  onGoHome();
                }}
                disabled={!localButtonsEnabled || !buttonsEnabled}
                className="h-[52px] w-full self-center bg-gold rounded-[16px] mt-4 items-center justify-center"
              >
                <Text className="font-feather text-brown/80 text-xl text-center">{homeButtonTitle}</Text>
              </TouchableOpacity>
            </RNAnimated.View>
          </>
        )}
      </View>
    </RNAnimated.View>
  );
};

export default SuccessMessage; 