import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import RNAnimated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import PrimaryButton from './PrimaryButton';
import { RPH } from '~/app/helper/helper';
import { useUserStore } from '~/app/stores/userStore';
import { getLevelData } from '~/utils/levelUtils';
import i18n from '../app/utils/i18n';

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
}) => {
  const didLevelUp = useMemo(() => level > prevLevel, [level, prevLevel]);

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

  // Reanimated shared values
  const xp = useSharedValue(0);
  const hearts = useSharedValue(0);
  const textOpacity = useSharedValue(0.4);
  const blueOpacity = useSharedValue(0.3);
  const goldOpacity = useSharedValue(0.4);
  const scale = useSharedValue(0.8);
  const fadeOpacity = useSharedValue(0.1);
  const [localButtonsEnabled, setLocalButtonsEnabled] = useState(false);
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
    setLocalButtonsEnabled(false);
    
    // Animate pop out and fade in
    scale.value = withTiming(1, { duration: 600 });
    fadeOpacity.value = withTiming(1, { duration: 600 });
    
    // Animate progress bars and text
    setTimeout(() => {
      xp.value = withTiming(levelInfo.progress, { duration: 1200 });
      hearts.value = withTiming(lambHearts / MAX_HEARTS, { duration: 1200 });
      textOpacity.value = withTiming(1, { duration: 800 });
      setTimeout(() => {
        blueOpacity.value = withTiming(1, { duration: 600 });
        goldOpacity.value = withTiming(1, { duration: 600 });
        setLocalButtonsEnabled(true);
      }, 1700);
    }, 500);
  }, []); // Empty dependency array since we only want to run once on mount

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

  return (
    <RNAnimated.View className="flex-1 items-center" style={successViewAnimatedStyle}>
      {didLevelUp && (
        <>
          <View className="mb-0 mt-6">
            <Image source={require("../assets/icons/rocket.png")} style={{ width: 65, height: 65 }} />
          </View>
          <Text className="font-feather text-[28px] text-center mb-6 text-orange">
            {i18n.t('level_up', { level })}
          </Text>
        </>
      )}
      <RNAnimated.Text
        className={`font-feather text-[26px] text-center mb-1 text-brown/90 ${!didLevelUp ? '-mt-12' : ''}`}
        style={textOpacityStyle}
      >
        {title}
      </RNAnimated.Text>
      <Text className="font-din text-[17px]  text-brown/90 text-center mb-4" >
        {description}
      </Text>
      <Text style={{paddingTop:RPH(4)}} className="font-bold text-[13px] text-center mb-6 tracking-wider uppercase text-brown/80">
        {rewardsTitle}
      </Text>
      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Image source={require('../assets/icons/heartIcon.png')} className="w-7 h-7" />
        <View style={{ width: '92%' }}>
          <View className="h-2 bg-red/25 rounded-md overflow-hidden">
            <RNAnimated.View
              className="h-full bg-red rounded-full"
              style={heartsBarStyle}
            />
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', }}>
        <Image source={require('../assets/icons/starIcon.png')} tintColor={'#FF8800'} className="w-7 h-7" />
        <View style={{ width: '92%' }}>
          <View className="h-2 bg-orange/25 rounded-full overflow-hidden " >
            <RNAnimated.View
              className="h-full bg-orange rounded-full"
              style={xpBarStyle}
            />
          </View>
        </View>
      </View>
  <View style={{paddingTop:RPH(5)}} className='w-full items-center'>
  {!hidePrayButton && (
      <RNAnimated.View style={blueButtonStyle} className="w-full">
        <PrimaryButton
          title={prayButtonTitle}
          onPress={onPray}
          buttonType="blue"
          icon={require('../assets/icons/starIcon.png')}
          reward={"+25"}
          disabled={!localButtonsEnabled || !buttonsEnabled}
          width="100%"
        />
      </RNAnimated.View>)}
      <RNAnimated.View style={goldButtonStyle} className="w-full">
        <TouchableOpacity
          onPress={onGoHome}
          disabled={!localButtonsEnabled || !buttonsEnabled}
          className="h-[52px] w-full self-center bg-gold rounded-[16px] mt-4 items-center justify-center"
        >
          <Text className="font-feather text-brown/80 text-xl text-center">{homeButtonTitle}</Text>
        </TouchableOpacity>
      </RNAnimated.View>
  </View>
    </RNAnimated.View>
  );
};

export default SuccessMessage; 