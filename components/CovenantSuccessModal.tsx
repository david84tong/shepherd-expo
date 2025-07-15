import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, Image, Animated } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { useAssets } from 'expo-asset';
import { AppFonts } from '~/app/constants/appFonts';
import { useUserStore } from '~/app/stores/userStore';
import { useSoundStore } from '~/app/stores/soundStore';
import { hapticLight } from '~/utils/haptics';
import { IS_ANDROID } from '~/app/utils/utils';
import i18n from '~/app/utils/i18n';
import analytics from '~/utils/analytics';
import { RPH, appLog } from '~/app/helper/helper';
import { Ionicons } from '@expo/vector-icons';

const STATE_MACHINE = 'State Machine 1';

interface CovenantSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  completedDays: number;
  onSelectNextCovenant?: (days: number) => void;
}

export const CovenantSuccessModal: React.FC<CovenantSuccessModalProps> = ({
  visible,
  onClose,
  completedDays,
  onSelectNextCovenant,
}) => {
  const riveRef = useRef<RiveRef>(null);
  const riveRefPhoenix = useRef<RiveRef>(null);
  const [riveAssets] = useAssets([
    require('../assets/riveAnimations/successLamb.riv'),
    require('../assets/riveAnimations/new_shepherd.riv'),
  ]);
  const { playTrifectaCompleteSound, playButtonSound, playChestOpeningSound } = useSoundStore();
  const [riveLoaded, setRiveLoaded] = useState(false);
  const [selectedNextCovenant, setSelectedNextCovenant] = useState<number | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(true);
  const [showPhoenixAnimation, setShowPhoenixAnimation] = useState(false);

  // Animation Values
  const rewardCardOpacity = useRef(new Animated.Value(0)).current;
  const rewardCardScale = useRef(new Animated.Value(0.8)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const chestScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      playTrifectaCompleteSound();
      setSelectedNextCovenant(null); // Reset selection when modal opens
      setShowRewardAnimation(true);
      setShowPhoenixAnimation(completedDays === 21);
      
      // Start animations
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rewardCardOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(rewardCardScale, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Play chest animation after modal appears
      setTimeout(() => {
        playChestAnimation();
      }, 400);
    } else {
      // Reset animations
      rewardCardOpacity.setValue(0);
      rewardCardScale.setValue(0.8);
      contentOpacity.setValue(0);
      chestScale.setValue(1);
    }
  }, [visible]);

  // Update skin number input for Phoenix
  useEffect(() => {
    if (!riveRefPhoenix.current || !riveLoaded || !visible) return;
    
    if (showPhoenixAnimation) {
      riveRefPhoenix.current?.setInputState(STATE_MACHINE, 'Skin-Number', 10);
      riveRefPhoenix.current?.setInputState(STATE_MACHINE, 'Action-Number', 12);
      appLog('Phoenix Rive inputs set - Skin: 10, Action: 12');
    }
  }, [riveLoaded, visible, showPhoenixAnimation]);

  useEffect(() => {
    appLog('Rive assets loaded:', riveAssets);
    if (riveAssets && riveAssets[0] && riveAssets[1]) {
      appLog('Rive asset URIs:', riveAssets.map(asset => asset.uri));
      const timer = setTimeout(() => {
        setRiveLoaded(true);
        appLog('Rive loaded via timeout');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [riveAssets]);

  const playChestAnimation = () => {
    // Reset chest animation
    chestScale.setValue(1);

    // Trigger Rive animation
    if (riveRef.current) {
      riveRef.current.reset();
      riveRef.current.play();
    }

    // Scale animation for chest
    Animated.timing(chestScale, {
      toValue: 1.2,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const handleCovenantOptionSelect = (days: number) => {
    hapticLight();
    setSelectedNextCovenant(days);
    playButtonSound();
    
    if (days === 21) {
      setShowPhoenixAnimation(true);
      setShowRewardAnimation(false);
    } else {
      setShowPhoenixAnimation(false);
      setShowRewardAnimation(true);
    }
    
    analytics.logEvent('CovenantSuccess_CovenantOptionSelected', { 
      completedDays,
      selectedDays: days 
    });
  };

  const handleContinue = () => {
    if (!selectedNextCovenant) return;
    
    hapticLight();
    if (onSelectNextCovenant) {
      onSelectNextCovenant(selectedNextCovenant);
    }
    analytics.logEvent('CovenantSuccess_NextCovenantSelected', { 
      completedDays,
      selectedDays: selectedNextCovenant 
    });
    onClose();
  };

  const getNextCovenantOptions = () => {
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
  };

  // Render Methods
  const renderRewardAnimation = () => {
    if (!showRewardAnimation || !riveAssets || showPhoenixAnimation) return null;

    return (
      <View className="w-full items-center justify-center" style={{ height: RPH(20) }}>
        <Animated.View style={{ transform: [{ scale: chestScale }] }}>
          {IS_ANDROID ? (
            <Rive
              ref={riveRef}
              resourceName={'success_lamb'}
              artboardName="chest"
              autoplay={true}
              style={{ width: 250, height: 250 }}
            />
          ) : (
            <Rive
              ref={riveRef}
              url={(riveAssets && riveAssets[0] && riveAssets[0].uri) || ''}
              artboardName="chest"
              autoplay={true}
              style={{ width: 250, height: 250 }}
            />
          )}
        </Animated.View>
      </View>
    );
  };

  const renderPhoenixAnimation = () => {
    if (!showPhoenixAnimation || !riveAssets) return null;

    return (
      <View className="w-[250px] h-[250px] items-center justify-center">
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
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <Animated.View 
          className="bg-surfaceCream rounded-3xl w-11/12 max-w-md p-6 relative"
          style={{
            opacity: rewardCardOpacity,
            transform: [{ scale: rewardCardScale }],
          }}
        >
          {/* Close Button */}
          <Pressable 
            onPress={onClose}
            onPressIn={() => hapticLight()}
            className="absolute right-4 top-4 z-10"
          >
            <Ionicons name="close" size={24} color="#4A5568" />
          </Pressable>

          {/* Title */}
          <Text 
            className="font-feather text-center text-textPrimary mb-4"
            style={{ fontSize: AppFonts[20] }}
          >
            {i18n.t('covenant_success_title')}
          </Text>

          {/* Animation */}
          <View className="h-[250px] w-full items-center justify-center mb-4">
            {renderRewardAnimation()}
            {renderPhoenixAnimation()}
          </View>

          {/* Description */}
          <Animated.View style={{ opacity: contentOpacity }} className="space-y-4">
            <Text 
              className="font-din text-center text-description mb-6"
              style={{ fontSize: AppFonts[16] }}
            >
              {i18n.t('covenant_success_description', { days: completedDays })}
            </Text>

            {/* Next Covenant Options */}
            <View className="flex flex-col gap-3">
              {getNextCovenantOptions().map((option) => (
                <Pressable
                  key={option.days}
                  onPress={() => handleCovenantOptionSelect(option.days)}
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
              <Pressable
                onPress={handleContinue}
                onPressIn={() => hapticLight()}
                disabled={!selectedNextCovenant}
                className={`p-4 rounded-3xl border-t-2 border-b-[6px] border-l-2 border-r-2 ${
                  selectedNextCovenant 
                    ? 'bg-darkGreen border-accentGold/80' 
                    : 'bg-gray-300 border-gray-400/30'
                }`}
              >
                <Text className={`font-feather text-xl text-center ${
                  selectedNextCovenant ? 'text-white' : 'text-gray-500'
                }`}>
                  {i18n.t('continue')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}; 