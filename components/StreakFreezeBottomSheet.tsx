import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useRef, useImperativeHandle, useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppFonts } from '~/app/constants/appFonts';
import { useSoundStore } from '~/app/stores/soundStore';
import { useUserStore } from '~/app/stores/userStore';
import { hapticLight } from '~/utils/haptics';
import i18n from '~/app/utils/i18n';
import analytics from '~/utils/analytics';
import { appLog } from '~/app/helper/helper';
import PrimaryButton from './PrimaryButton';
import streakFreezeIcon from '~/assets/images/streakFreezeIcon.png';

export type StreakFreezeBottomSheetRef = {
  show: () => void;
  close: () => void;
};

interface StreakFreezeBottomSheetProps {
  freezeSheetRef: React.RefObject<StreakFreezeBottomSheetRef>;
}

// Animation Helper - memoized
const createSmoothAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = 400,
  useSpring: boolean = false
) => {
  if (useSpring) {
    return Animated.spring(animatedValue, {
      toValue,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    });
  }
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    useNativeDriver: true,
  });
};

const StreakFreezeBottomSheet: React.FC<StreakFreezeBottomSheetProps> = ({
  freezeSheetRef,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  const { playButtonSound } = useSoundStore();
  const { getStreakFreezes } = useUserStore();
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  
  // Get current freeze data
  const freezesRemaining = getStreakFreezes();
  const totalFreezes = 2;


  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsSheetVisible(false);
  }, []);

  const handleContinue = useCallback(() => {
    hapticLight();
    
    analytics.logEvent('StreakFreezeSheet_Continue_Tapped', { 
      freezesRemaining,
      totalFreezes 
    });
    
    handleDismiss();
  }, [freezesRemaining, totalFreezes, handleDismiss]);

  // Expose methods via ref
  useImperativeHandle(
    freezeSheetRef,
    () => ({
      show: () => {
        appLog('[StreakFreezeBottomSheet] show() called');
        
        setIsSheetVisible(true);
        bottomSheetRef.current?.snapToIndex(0);
        
        playButtonSound();
      },
      close: () => {
        appLog('[StreakFreezeBottomSheet] close() called');
        handleDismiss();
      },
    }),
    [playButtonSound, handleDismiss]
  );

  // Log screen view when sheet becomes visible
  useEffect(() => {
    if (isSheetVisible) {
      analytics.logEvent('StreakFreezeSheet_Viewed', {
        freezesRemaining,
        totalFreezes
      });
    }
  }, [isSheetVisible, freezesRemaining, totalFreezes]);

  // Memoized freeze icon render
  const renderFreezeIcon = useMemo(() => {
    return (
      <View 
        className="w-[120px] h-[120px] items-center justify-center mb-4"
      >
            <Image
            source={streakFreezeIcon}
            className="w-40 h-40 absolute left-10"
            resizeMode="contain"
            />
            <Image
            source={streakFreezeIcon}
            className="w-40 h-40 absolute -left-5 top-4"
            resizeMode="contain"
            />
        
      </View>
    );
  }, []);

  const renderInfoCard = useMemo(() => {
    return (
      <View className="items-center mb-4 mt-6">
        <View
          className="px-3 py-4">
          <Text className="font-feather text-[#3C584A] text-center" style={{ fontSize: AppFonts[22] }}>
            A streak freeze protects your streak for a day. You have{' '}
            <Text className="font-feather text-accentGold">{freezesRemaining} of {totalFreezes}</Text>{' '}
            equipped.
          </Text>
        </View>
      </View>
    );
  }, [freezesRemaining, totalFreezes]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['60%', '65%', '70%']}
      enableDynamicSizing={true}
      enablePanDownToClose
      backgroundStyle={{
        backgroundColor: '#FFF4D9',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
      }}
      handleIndicatorStyle={{
        backgroundColor: '#DCB280',
        height: 6,
        width: 60,
        borderRadius: 3,
      }}
      backdropComponent={renderBackdrop}
      onChange={(index) => {
        appLog('[StreakFreezeBottomSheet] BottomSheet changed to index:', index);
        setIsSheetVisible(index >= 0);
      }}>
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 16,
          height: '100%',
        }}>
    

        {/* Freeze Icon */}
        <View className="h-[140px] w-full items-center justify-center">
          {renderFreezeIcon}
        </View>

        {/* Info Card */}
        {renderInfoCard}

        {/* Description */}
        <View className="space-y-4 mt-4 flex-1 items-center">
          {/* Continue Button */}
          <View className="w-full">
            <PrimaryButton 
              buttonType="blue" 
              title="Continue" 
              onPress={handleContinue}
            />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default StreakFreezeBottomSheet;