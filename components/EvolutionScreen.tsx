import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { useAssets } from 'expo-asset';
import PrimaryButton from './PrimaryButton';
import { appLog, RPH } from '~/app/helper/helper';
import { hapticMedium } from '~/utils/haptics';
import { AppFonts } from '~/app/constants/appFonts';
import analytics from '../utils/analytics';

// Get screen dimensions
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EvolutionScreenProps {
  evolutionLevel?: number; // 1 or 2
  onClose: () => void;
}

export const EvolutionScreen: React.FC<EvolutionScreenProps> = ({
  evolutionLevel = 1,
  onClose,
}) => {
  const riveRef = useRef<RiveRef>(null);
  
  // Load Rive assets - assuming evolution animation is in the make_lamb.riv file
  const [riveAssets] = useAssets([require('../assets/riveAnimations/make_lamb.riv')]);
  
  // Animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-20)).current;
  const riveScaleAnim = useRef(new Animated.Value(0.8)).current;
  const riveRotateAnim = useRef(new Animated.Value(0.05)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;
  
  // State to control when to show the button
  const [showButton, setShowButton] = useState(false);
  
  // Messages based on evolution level
  const title = evolutionLevel === 1 ? 'Evolution Begins!' : 'Ultimate Evolution!';
  const subtitle = evolutionLevel === 1 
    ? 'Your lamb is transforming into a stronger form!' 
    : 'Witness the incredible power of your fully evolved lamb!';
  
  useEffect(() => {
    appLog(`🦋 EvolutionScreen mounted with level: ${evolutionLevel}`);
    
    // Log analytics
    analytics.logEvent('EvolutionAnimation_Shown', {
      evolutionLevel: evolutionLevel,
      source: 'debug_modal',
    });
    
    // Play haptic feedback
    hapticMedium();
    
    // Reset animations
    titleOpacity.setValue(0);
    titleTranslateY.setValue(-20);
    riveScaleAnim.setValue(0.8);
    riveRotateAnim.setValue(0.05);
    buttonOpacity.setValue(0);
    buttonTranslateY.setValue(20);
    
    // Start animations
    // Title animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);
    
    // Rive animation
    setTimeout(() => {
      if (riveRef.current) {
        riveRef.current.play();
      }
      
      Animated.parallel([
        Animated.timing(riveScaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(riveRotateAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);
    
    // Button animation
    setTimeout(() => {
      setShowButton(true);
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);
    
    return () => {
      if (riveRef.current?.reset) {
        riveRef.current.reset();
      }
    };
  }, [evolutionLevel]);
  
  const handleClose = () => {
    appLog('🦋 EvolutionScreen closing');
    analytics.logEvent('EvolutionAnimation_Closed', {
      evolutionLevel: evolutionLevel,
    });
    hapticMedium();
    onClose();
  };
  
  // Show loading if assets aren't ready
  if (!riveAssets) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream">
        <ActivityIndicator size="large" color="#3C584A" />
        <Text className="font-feather text-textPrimary mt-4">Loading evolution...</Text>
      </View>
    );
  }
  
  return (
    <View className="flex-1 bg-surfaceCream" style={{ backgroundColor: '#FFF4DC' }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: RPH(12) }}
        showsVerticalScrollIndicator={false}
        className="bg-surfaceCream">
        <View className="flex-1 items-center justify-center pt-8 px-5">
          
          {/* Title and subtitle */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            }}
            className="items-center mb-6">
            <Text 
              style={{ fontSize: AppFonts[32] }} 
              className="font-feather text-textPrimary mb-3 text-center">
              {title}
            </Text>
            <Text className="font-din text-xl text-secondaryText text-center px-6">
              {subtitle}
            </Text>
          </Animated.View>
          
          {/* Evolution Animation */}
          <View className="w-full h-[400px] my-4 items-center justify-center">
            <Animated.View
              style={{
                width: '140%',
                height: '140%',
                transform: [
                  { scale: riveScaleAnim },
                  {
                    rotate: riveRotateAnim.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ['-15deg', '0deg', '15deg'],
                    }),
                  },
                ],
              }}>
              <Rive
                ref={riveRef}
                resourceName='new_shepherd'
                autoplay={true}
                artboardName="Main"
                stateMachineName="State Machine 1"
                style={{
                  width: '100%',
                  height: '100%',
                  alignSelf: 'center',
                }}
                onPlay={() => {
                  appLog('🦋 Evolution animation started playing');
                  // Trigger the evolution based on level
                  if (riveRef.current && riveRef.current.setInputState) {
                    // Set the Switch input to trigger evolution
                    riveRef.current.setInputState('State Machine 1', 'Switch', evolutionLevel);
                    appLog(`🦋 Set Switch input to ${evolutionLevel}`);
                  }
                }}
              />
            </Animated.View>
          </View>
          
          {/* Evolution Stats Card */}
          <View className="w-full bg-surfaceCream/50 rounded-[18px] p-4 my-4 border-2 border-border">
            <Text className="text-caption font-din text-[#B89B4C] text-center uppercase mb-3 tracking-wider">
              EVOLUTION COMPLETE
            </Text>
            <View className="items-center">
              <Text className="font-din text-textPrimary text-lg mb-2">
                {evolutionLevel === 1 ? '⭐ Stage 1 Evolution' : '⭐⭐⭐ Final Evolution'}
              </Text>
              <Text className="font-din text-secondaryText text-center text-sm">
                Your lamb has grown stronger and gained new abilities!
              </Text>
            </View>
          </View>
          
        </View>
      </ScrollView>
      
      {/* Continue Button - Fixed at bottom */}
      {showButton && (
        <Animated.View
          className="absolute bottom-0 left-0 right-0 bg-surfaceCream px-5 pb-8 pt-4"
          style={{
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 5,
          }}>
          <PrimaryButton 
            buttonType="blue" 
            title="Awesome!" 
            onPress={handleClose} 
          />
        </Animated.View>
      )}
    </View>
  );
};

export default EvolutionScreen;