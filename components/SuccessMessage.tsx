import React, { useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import RNAnimated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import PrimaryButton from './PrimaryButton';
import { RPH } from '~/app/helper/helper';
import { useUserStore } from '~/app/stores/userStore';
import { getLevelData } from '~/utils/levelUtils';

interface SuccessMessageProps {
  title?: string;
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
  title = 'Reading Complete!',
  level,
  prevLevel,
  buttonsEnabled,
  onGoHome,
  onPray,
  prayButtonTitle = 'Pray about this verse',
  hidePrayButton = false,
  homeButtonTitle = 'Go Home',
  rewardsTitle = 'READING REWARDS',
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
    setLocalButtonsEnabled(false);
    
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
    width: '100%',
  }));
  const goldButtonStyle = useAnimatedStyle(() => ({
    opacity: goldOpacity.value,
    width: '100%',
  }));
  const successViewAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1,
    transform: [{ scale: 1 }],
  }));

  return (
    <RNAnimated.View className="flex-1 items-center" style={successViewAnimatedStyle}>
      {didLevelUp && (
        <>
          <View className="mb-0 mt-6">
            <Image source={require("../assets/icons/rocket.png")} style={{ width: 65, height: 65 }} />
          </View>
          <Text className="font-feather-bold text-[28px] text-center mb-6 text-orange">
            {`Level UP ${level}!`}
          </Text>
        </>
      )}
      <RNAnimated.Text
        className="font-feather-bold text-[26px] text-center mb-1 text-brown/90"
        style={textOpacityStyle}
      >
        {title}
      </RNAnimated.Text>
      <Text className="font-din text-[17px]  text-brown/90 text-center mb-4" >
        Hurray! You finished today&apos;s bible reading & fed your lamb.
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
  <View style={{paddingTop:RPH(5)}} className='w-full'>
  {!hidePrayButton && (
      <RNAnimated.View style={blueButtonStyle}>
        <PrimaryButton
          title={prayButtonTitle}
          onPress={onPray}
          buttonType="blue"
          icon={require('../assets/icons/starIcon.png')}
          reward={"+25"}
          disabled={!localButtonsEnabled || !buttonsEnabled}
        />
      </RNAnimated.View>)}
      <RNAnimated.View style={goldButtonStyle}>
        <TouchableOpacity
          onPress={onGoHome}
          disabled={!localButtonsEnabled || !buttonsEnabled}
          className=" h-[52px] w-full self-center bg-gold rounded-full mt-2 items-center justify-center"
        >
          <Text className="font-feather-bold text-brown/80 text-xl text-center">{homeButtonTitle}</Text>
        </TouchableOpacity>
      </RNAnimated.View>
  </View>
    </RNAnimated.View>
  );
};

export default SuccessMessage; 