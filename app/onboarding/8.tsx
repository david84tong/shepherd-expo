import React, { useState, useEffect } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import PrimaryButton from '../../components/PrimaryButton';

// Path images
const walkInLightImg = require('../../assets/onboarding/chronological.png');
const wisdomImg = require('../../assets/onboarding/dailyWisdom.png');
const overcomingImg = require('../../assets/onboarding/overcomingFlesh.png');
const knowingJesusImg = require('../../assets/onboarding/walkingWithJesus.png');

export type PathOption = {
  id: string;
  title: string;
  subtitle: string;
  image: any;
  order: [string];
};

export default function OnboardingPathScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const { setUser } = useUserStore();
  const [selectedPathId, setSelectedPathId] = useState("knowing-jesus");
  const [pressedId, setPressedId] = useState<string | undefined>(undefined);

  // Create Reanimated shared values for each component
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);
  const optionsOpacity = useSharedValue(0);
  const optionsTranslateY = useSharedValue(40);

  useEffect(() => {
    // Reset animation values
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    optionsOpacity.value = 0;
    optionsTranslateY.value = 40;
    
    // Staggered animations for each component
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(delay, 
        withSpring(0, { 
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
    animateComponent(titleOpacity, titleTranslateY, 0);
    animateComponent(optionsOpacity, optionsTranslateY, 200);
  }, []);

  // Create animated styles for each component
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }]
  }));

  const optionsStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
    transform: [{ translateY: optionsTranslateY.value }]
  }));

  const handleSelection = async (pathId: string) => {
    // Trigger light haptic feedback
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics not available');
    }
    setSelectedPathId(pathId);
    await setResponse('selectedPath', pathId as any);
    setUser({ selectedPathId: pathId });
  };
 
  const paths: PathOption[] = [
    {
      id: 'knowing-jesus',
      title: 'Knowing Jesus',
      subtitle: 'Deepen your relationship with Christ',
      image: knowingJesusImg,
      order: [""]

    },  
    {
      id: 'way-of-wisdom',
      title: 'The Way of Wisdom',
      subtitle: 'Gain clarity and discernment',
      image: wisdomImg,
      order: [""]
    },
    {
      id: 'overcoming',
      title: 'Overcoming the Flesh',
      subtitle: 'Learn to resist temptation',
      image: overcomingImg,
      order: [""]
    },
    {
      id: 'walk-in-light',
      title: 'Journey Through',
      subtitle: 'Read the Bible chronologically',
      image: walkInLightImg,
      order: [""],
    },
  ];

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-12">
      {/* Title Section */}
      <Animated.View style={titleStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-2">
          Choose Your Path
        </Text>
        <Text className="font-din text-body text-center text-description mb-8">
         How would you like to read the Bible?
        </Text>
      </Animated.View>

      {/* Path Options Grid */}
      <Animated.View style={optionsStyle} className="flex-1">
        <View className="flex-row flex-wrap justify-between gap-y-4 w-[100%] pb-24 overflow-hidden shadow-buttonShadow">
          {paths.map((path) => (
            <View key={path.id} className={`bg-surfaceCream w-[46%] rounded-xl border-border border-4 overflow-hidden ${
              selectedPathId === path.id ? 'border-4 border-accentGold' : 'opacity-70'
            }`}>
              <Pressable
                onPress={() => handleSelection(path.id)}
                onPressIn={() => {
                  setPressedId(path.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onPressOut={() => setPressedId(undefined)}
                className={`transform ${pressedId === path.id ? 'translate-y-[3px]' : 'translate-y-0'}`}
                style={({ pressed }) => [
                  { elevation: pressed ? 0 : 6 }
                ]}
              >
                {/* Path Image */}
                <Image
                  source={path.image}
                  className={`w-[100%] h-40 shadow-md`}
                  resizeMode="cover"
                />
                
                {/* Path Text Content */}
                <View className="p-3">
                  <Text className="font-feather text-h3 text-textPrimary mb-1 text-center">
                    {path.title}
                  </Text>
                  <Text className="font-din text-md text-description text-center">
                    {path.subtitle}
                  </Text>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Continue Button */}
      <PrimaryButton
        title="Continue"
        onPress={() => {
          setUser({ selectedPathId: selectedPathId });
          router.push('/onboarding/9' as any);
        }}
        disabled={!selectedPathId}
        style="mt-6 mb-12"
      />
    </View>
  );
}
