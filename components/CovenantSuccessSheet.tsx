import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useRef, useImperativeHandle, useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Animated, Image } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { useAssets } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';

import { AppFonts } from '~/app/constants/appFonts';
import { useUserStore } from '~/app/stores/userStore';
import { useSoundStore } from '~/app/stores/soundStore';
import { hapticLight } from '~/utils/haptics';
import { IS_ANDROID } from '~/app/utils/utils';
import i18n from '~/app/utils/i18n';
import analytics from '~/utils/analytics';
import { RPH, appLog } from '~/app/helper/helper';
import { COVENANT_STATES } from '~/app/hooks/streakHook';
import { useHomeStore } from '~/app/stores/homeStore';
import PrimaryButton from './PrimaryButton';

// Assets
import gemIcon from '../assets/icons/greenGemIcon.png';

const STATE_MACHINE = 'State Machine 1';

export type CovenantSuccessSheetRef = {
  show: () => void;
  close: () => void;
};

interface CovenantSuccessSheetProps {
  covenantSheetRef: React.RefObject<CovenantSuccessSheetRef>;
  completedDays: number;
  onSelectNextCovenant?: (days: number) => void;
}

// Covenant options with rewards - memoized constant
const COVENANT_OPTIONS = [
  {
    days: 3,
    label: i18n.t('onboarding_streak_commitment_3_day'),
    status: i18n.t('onboarding_streak_commitment_faithful'),
    reward: {
      type: 'gem',
      amount: 100,
      description: '100 gems',
      scale: 0.8,
    },
  },
  {
    days: 7,
    label: i18n.t('onboarding_streak_commitment_7_day'),
    status: i18n.t('onboarding_streak_commitment_devoted'),
    reward: {
      type: 'gem',
      amount: 300,
      description: '300 gems',
      scale: 1.2,
    },
  },
  {
    days: 21,
    label: i18n.t('onboarding_streak_commitment_21_day'),
    status: i18n.t('onboarding_streak_commitment_blessed'),
    reward: {
      type: 'skin',
      description: 'Phoenix Lamb Skin',
      scale: 1.5,
    },
  },
];

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

const CovenantSuccessSheet: React.FC<CovenantSuccessSheetProps> = ({
  covenantSheetRef,
  completedDays,
  onSelectNextCovenant,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const riveRef = useRef<RiveRef>(null);
  const riveRefPhoenix = useRef<RiveRef>(null);
  const [riveAssets] = useAssets([
    require('../assets/riveAnimations/successLamb.riv'),
    require('../assets/riveAnimations/new_shepherd.riv'),
  ]);
  
  const { playTrifectaCompleteSound, playButtonSound, playChestOpeningSound } = useSoundStore();
  const { setCovenantProgress } = useUserStore();
  const { setShowCovenantSuccessModal } = useHomeStore();
  const [riveLoaded, setRiveLoaded] = useState(false);
  const [showPhoenixAnimation, setShowPhoenixAnimation] = useState(false);
  const [selectedNextCovenant, setSelectedNextCovenant] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  // Animation Values
  const rewardCardOpacity = useRef(new Animated.Value(0)).current;
  const rewardCardScale = useRef(new Animated.Value(0.8)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const chestScale = useRef(new Animated.Value(1)).current;
  const gemTextOpacity = useRef(new Animated.Value(1)).current;

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['70%', '80%', '90%'], []);

  // Memoized computed values
  const completedReward = useMemo(() => {
    return COVENANT_OPTIONS.find(option => option.days === completedDays);
  }, [completedDays]);

  const selectedReward = useMemo(() => {
    if (!selectedNextCovenant) return null;
    return COVENANT_OPTIONS.find(option => option.days === selectedNextCovenant);
  }, [selectedNextCovenant]);

  const nextCovenantOptions = useMemo(() => {
    if (completedDays === 3) {
      return [
        { days: 7, label: i18n.t('onboarding_streak_commitment_7_day') },
        { days: 21, label: i18n.t('onboarding_streak_commitment_21_day') }
      ];
    } else if (completedDays === 7) {
      return [
        { days: 21, label: i18n.t('onboarding_streak_commitment_21_day') }
      ];
    }
    return [];
  }, [completedDays]);

  const showPhoenix = useMemo(() => {
    return (completedDays === 21 && !selectedNextCovenant) || selectedNextCovenant === 21;
  }, [completedDays, selectedNextCovenant]);

  const showChest = useMemo(() => {
    return completedDays !== 21 && selectedNextCovenant !== 21;
  }, [completedDays, selectedNextCovenant]);

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
    // Reset state after sheet closes
    setTimeout(() => {
      setSelectedNextCovenant(null);
      setAnimationKey(0);
      // Reset animations
      rewardCardOpacity.setValue(0);
      rewardCardScale.setValue(0.8);
      contentOpacity.setValue(0);
      chestScale.setValue(1);
      gemTextOpacity.setValue(1);
    }, 300);
  }, [rewardCardOpacity, rewardCardScale, contentOpacity, chestScale, gemTextOpacity]);

  // Memoized callbacks
  const playChestAnimation = useCallback((scaleValue: number) => {
    createSmoothAnimation(chestScale, scaleValue, 500).start();
  }, [chestScale]);

  const handleCovenantOptionSelect = useCallback((days: number) => {
    hapticLight();
    setSelectedNextCovenant(days);
    setAnimationKey(prev => prev + 1);
    playButtonSound();
    
    if (days === 21) {
      // If selecting Phoenix, no chest animation needed
      playChestOpeningSound?.();
    } else {
      // For gem rewards (3 and 7 days), animate chest scaling
      playChestOpeningSound?.();
      
      // Get scale value for chest animation based on gems/reward
      const selectedOption = COVENANT_OPTIONS.find(option => option.days === days);
      const scaleValue = selectedOption?.reward.scale || 1;
      
      // Animate chest to new scale smoothly
      playChestAnimation(scaleValue);
    }

    // Animate reward card content change
    Animated.sequence([
      createSmoothAnimation(gemTextOpacity, 0, 150),
      createSmoothAnimation(gemTextOpacity, 1, 150),
    ]).start();
    
    analytics.logEvent('CovenantSuccess_CovenantOptionSelected', { 
      completedDays,
      selectedDays: days 
    });
  }, [completedDays, playButtonSound, playChestOpeningSound, playChestAnimation, gemTextOpacity]);

  const handleContinue = useCallback(() => {
    if (!selectedNextCovenant && completedDays !== 21) return;
    
    hapticLight();
    
    if (selectedNextCovenant && onSelectNextCovenant) {
      onSelectNextCovenant(selectedNextCovenant);
    } else if (completedDays === 21) {
      // For 21 days completion, just close the modal
      // go to store
      
      setShowCovenantSuccessModal(false);
    }
    
    analytics.logEvent('CovenantSuccess_NextCovenantSelected', { 
      completedDays,
      selectedDays: selectedNextCovenant 
    });
    
    handleDismiss();
  }, [selectedNextCovenant, onSelectNextCovenant, completedDays, handleDismiss, setShowCovenantSuccessModal]);

  // Expose methods via ref
  useImperativeHandle(
    covenantSheetRef,
    () => ({
      show: () => {
        appLog('[CovenantSuccessSheet] show() called');
        
        // Reset state when opening
        setSelectedNextCovenant(null);
        setAnimationKey(prev => prev + 1);
        
        // Set initial chest scale based on completed days
        if (completedDays !== 21) {
          const initialScale = completedReward?.reward.scale || 1;
          chestScale.setValue(initialScale);
        }
        
        setIsSheetVisible(true);
        bottomSheetRef.current?.snapToIndex(0);
        
        // Play sound and start animations
        playTrifectaCompleteSound();
        
        // Start smooth entrance animations
        setTimeout(() => {
          Animated.sequence([
            Animated.parallel([
              createSmoothAnimation(rewardCardOpacity, 1, 400),
              createSmoothAnimation(rewardCardScale, 1, 400, true),
            ]),
            createSmoothAnimation(contentOpacity, 1, 300),
          ]).start();

          // Play chest animation after modal appears (only if not 21 days completed)
          if (completedDays !== 21) {
            setTimeout(() => {
              playChestOpeningSound?.();
            }, 400);
          }
        }, 100);
      },
      close: () => {
        appLog('[CovenantSuccessSheet] close() called');
        handleDismiss();
      },
    }),
    [completedDays, completedReward, playTrifectaCompleteSound, playChestOpeningSound, handleDismiss, chestScale, rewardCardOpacity, rewardCardScale, contentOpacity]
  );

  useEffect(() => {
    appLog('Rive assets loaded:', riveAssets);
    
    if (riveAssets && riveAssets[1]) {
      appLog('Rive asset URI:', riveAssets[1].uri);
      
      const timer = setTimeout(() => {
        setRiveLoaded(true);
        appLog('Rive loaded via timeout');

        // Set Rive inputs once loaded
        if (riveRefPhoenix.current) {
          riveRefPhoenix.current.setInputState(STATE_MACHINE, 'Skin-Number', 10);
          riveRefPhoenix.current.setInputState(STATE_MACHINE, 'Action-Number', 12);
          appLog('Rive inputs set - Skin: 10, Action: 12');
        }
      }, 200);
      return () => clearTimeout(timer);
    }

  }, [riveAssets, selectedNextCovenant, riveRefPhoenix?.current]);

  // Memoized render methods
  const renderLambAnimation = useMemo(() => {
    if (!showPhoenix || !riveAssets) return null;
    
    return (
      <View className="w-[250px] h-[250px] mt-[-60px]" key={`lamb-${animationKey}`}>
        {IS_ANDROID ? (
          <Rive
            ref={riveRefPhoenix}
            resourceName={'new_shepherd'}
            artboardName="[Main] Shpeherd"
            stateMachineName="State Machine 1"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Rive
            ref={riveRefPhoenix}
            url={riveAssets[1].uri!}
            artboardName="[Main] Shpeherd"
            stateMachineName="State Machine 1"
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </View>
    );
  }, [showPhoenix, riveAssets, animationKey]);

  const renderRewardAnimation = useMemo(() => {
    if (!showChest || !riveAssets) return null;

    return (
      <Animated.View 
        className="w-[250px] h-[250px] items-center justify-center"
        style={{ transform: [{ scale: chestScale }] }}
        key={`chest-${animationKey}`}
      >
        {IS_ANDROID ? (
          <Rive
            ref={riveRef}
            resourceName={'success_lamb'}
            artboardName="chest"
            autoplay={true}
            style={{ width: '120%', height: '130%', position: 'absolute', top: 0 }}
          />
        ) : (
          <Rive
            ref={riveRef}
            url={(riveAssets && riveAssets[0] && riveAssets[0].uri) || ''}
            artboardName="chest"
            autoplay={true}
            style={{ width: '120%', height: '130%', position: 'absolute', top: -10 }}
          />
        )}
      </Animated.View>
    );
  }, [showChest, riveAssets, animationKey, chestScale]);

  const renderNextRewardCard = useMemo(() => {
    if (!selectedNextCovenant || !selectedReward) return null;

    const isPhoenixLamb = selectedNextCovenant === 21;

    return (
      <View className="items-center mb-4 mt-6">
        <Animated.View
          className="bg-white rounded-[28px] px-6 py-4 border-[2.5px] border-accentGold w-[90%] max-w-sm"
          style={{
            opacity: rewardCardOpacity,
            transform: [{ scale: rewardCardScale }],
          }}>
          <Text className="text-sm font-din text-description text-center uppercase mb-2 tracking-wider">
            {i18n.t('next_reward')}
          </Text>
          <Animated.View
            className="flex-row items-center justify-center"
            style={{ opacity: gemTextOpacity }}>
            {isPhoenixLamb ? (
              <Text className="font-din text-textPrimary text-xl font-bold text-center">
                {i18n.t('unlock_phoenix_lamb')}
              </Text>
            ) : (
              <>
                <Image
                  source={gemIcon}
                  style={{ width: RPH(3.5), height: RPH(3.5) }}
                  className="mr-2"
                />
                <Text className="font-din text-textPrimary text-2xl font-bold">
                  +{selectedReward.reward.amount} Gems
                </Text>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    );
  }, [selectedNextCovenant, selectedReward, rewardCardOpacity, rewardCardScale, gemTextOpacity]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
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
        appLog('[CovenantSuccessSheet] BottomSheet changed to index:', index);
        setIsSheetVisible(index >= 0);
        
        if (index < 0) {
          // Sheet closed, reset state
          setTimeout(() => {
            setSelectedNextCovenant(null);
            setAnimationKey(0);
            // Reset animations
            rewardCardOpacity.setValue(0);
            rewardCardScale.setValue(0.8);
            contentOpacity.setValue(0);
            chestScale.setValue(1);
            gemTextOpacity.setValue(1);
          }, 300);
        }
      }}>
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 16,
        }}>
        
        {/* Close Button */}
        <Pressable 
          onPress={handleDismiss}
          onPressIn={() => hapticLight()}
          className="absolute right-4 top-4 z-10 bg-white/60 rounded-full p-2"
        >
          <Ionicons name="close" size={24} color="#4A5568" />
        </Pressable>

        {/* Title */}
        <Text 
          className="font-feather text-center text-textPrimary mb-3"
          style={{ fontSize: AppFonts[20] }}
        >
          {i18n.t('covenant_success_title')}
        </Text>

        {completedDays !== 21 && (
          <Text 
            className="font-din text-center text-description"
            style={{ fontSize: AppFonts[16] }}
          >
            {i18n.t('covenant_success_gems_earned', { gems: completedDays === 3 ? '100' : '300' })}
          </Text>
        )}

        {/* Animation */}
        <View className="h-[180px] w-full items-center justify-center">
          {renderLambAnimation}
          {renderRewardAnimation}
        </View>

        {/* Next Reward Card */}
        {renderNextRewardCard}

        {/* Description */}
        <Animated.View style={{ opacity: contentOpacity }} className="space-y-4 mt-4 flex-1">
          {completedDays !== 21 && (
            <Text 
              className="font-din text-center text-description mb-6"
              style={{ fontSize: AppFonts[16] }}
            >
              {i18n.t('covenant_success_description', { days: completedDays })}
            </Text>
          )}

          {completedDays === 21 && (
            <Text 
              className="font-din text-center text-description mb-6"
              style={{ fontSize: AppFonts[16] }}
            >
              {i18n.t('covenant_success_description_21_days')}
            </Text>
          )}

          {/* Next Covenant Options */}
          <View className="flex flex-col gap-2">
            {nextCovenantOptions.map((option) => (
              <Pressable
                key={option.days}
                onPress={() => {
                  if (option.days === selectedNextCovenant) {
                    return;
                  }
                  handleCovenantOptionSelect(option.days);
                }}
                onPressIn={() => hapticLight()}
                className={`p-4 rounded-3xl border-t-2 border-b-[6px] border-l-2 border-r-2 ${
                  selectedNextCovenant !== option.days
                    ? 'bg-white border-accentGold/30'
                    : 'bg-surfaceCream border-accentGold/80'
                }`}
              >
                <View className="flex-col">
                  <View className="flex-row justify-between items-center">
                    <Text className={`font-feather text-xl ${
                      selectedNextCovenant === option.days ? 'text-textPrimary' : 'text-textPrimary'
                    }`}>
                      {option.label}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}

            {/* Continue Button */}
            <PrimaryButton 
              buttonType="blue" 
              title={i18n.t('continue')} 
              onPress={handleContinue}
              disabled={!selectedNextCovenant && completedDays !== 21}
            />
          </View>
        </Animated.View>
      </BottomSheetView>
    </BottomSheet>
  );
};

export default CovenantSuccessSheet; 