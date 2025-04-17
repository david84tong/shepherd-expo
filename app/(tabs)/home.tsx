import { View, Text, SafeAreaView, Platform, Image, Button, Animated, StyleSheet, Easing } from 'react-native';
import Rive, { RiveRef, RNRiveError } from 'rive-react-native';
import { useRef, useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import SecondaryButton from '../../components/SecondaryButton';
import PrimaryButton from '../../components/PrimaryButton';

// Assuming background is in assets/backgrounds
const grassBg = require('../../assets/backgrounds/grassBackground1.png');
const waterBg = require('../../assets/backgrounds/waterBackground.png');

// Assuming icons are in assets/icons
const breadIcon = require('../../assets/icons/breadIcon.png');
const dropIcon = require('../../assets/icons/breadIcon.png');
const quillIcon = require('../../assets/icons/breadIcon.png');

export default function HomeScreen() {
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState<RNRiveError | null>(null);
  const navigation = useNavigation();

  const [isPraying, setIsPraying] = useState(false);

  // Animation value to crossfade backgrounds and fade UI
  const bgAnim = useRef(new Animated.Value(0)).current;
  const grassOpacity = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const waterOpacity = bgAnim;

  // Water background pops up slightly while appearing
  const waterTranslateY = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
  const waterScale = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  // Rive avatar moves down when praying
  const riveContainerTranslateX = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }); // Adjust 180 as needed
  const riveContainerTranslateY = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 260] }); // Adjust 180 as needed

  // Fade out tab bar as bgAnim goes from 0 to 1
  useEffect(() => {
    const parent = navigation.getParent?.();
    const id = bgAnim.addListener(({ value }) => {
      parent?.setOptions({ tabBarStyle: { opacity: 1 - value } });
    });
    return () => bgAnim.removeListener(id);
  }, [bgAnim]);

  /** Send the lamb off–screen */
  const handleOutOfFrame = () => {
    try {
      riveRef.current?.setInputState('MAIN', 'Out of Frame', true);
    } catch (error) {
      console.error("Error setting Rive input state:", error);
    }
  };

  const handleRiveError = (error: RNRiveError) => {
    console.error("Rive Error:", error.message, error.type);
    setRiveError(error);
  };

  const handleReadPress = () => {
    console.log('Read Daily Bread Pressed');
    // Reset the Rive animation state
    try {
      riveRef.current?.reset();
    } catch (error) {
      console.error("Error resetting Rive animation:", error);
    }
  };

  const hideTabBar = () => {
    navigation.getParent?.()?.setOptions({ tabBarStyle: { display: 'none' } });
  };

  const showTabBar = () => {
    navigation.getParent?.()?.setOptions({ tabBarStyle: { display: 'flex', opacity: 1 } });
  };

  const handlePrayerPress = () => {
    console.log('Daily Prayer Pressed');
    hideTabBar();
    setIsPraying(true);
    // Crossfade to water background and fade UI
    Animated.timing(bgAnim, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        // Hide tab bar completely
        navigation.getParent?.()?.setOptions({ tabBarStyle: { display: 'none' } });
      }
    });
  };

  const handleDonePraying = () => {
    console.log('Done Praying Pressed');
    setIsPraying(false);
    showTabBar();
    // Animate back to grass background
    Animated.timing(bgAnim, {
      toValue: 0,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handleReflectionPress = () => {
    console.log('Daily Reflection / QT Pressed');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Grass background fades out */}
      <Animated.Image       className="flex-1"
      source={grassBg} style={[styles.backgroundImage, { opacity: grassOpacity }]} resizeMode="cover"  />
      {/* Water background fades in & pops */}
      <Animated.Image
        source={waterBg}
        style={[
          styles.backgroundImage,
          {
            opacity: waterOpacity,
            transform: [{ translateY: waterTranslateY }, { scale: waterScale }],
          },
        ]}
        resizeMode="cover"
      />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 pt-4 mb-4">
          <Text className="font-feather text-3xl text-white">Shepherd</Text>
          <View className="flex-row items-center space-x-1 bg-white/30 rounded-full px-3 py-1">
            <Text className="font-feather text-xl text-white">2</Text>
            <Text className="text-lg">🔥</Text>
          </View>
        </View>

        {/* Top Section - Lamb Avatar */}
        <Animated.View
          className="items-center justify-center"
          style={{
            flex: Platform.OS === 'ios' ? 0.8 : 0.6,
            transform: [{ translateX: riveContainerTranslateX }, { translateY: riveContainerTranslateY }],
          }}
        >
          <View className="w-56 h-56 items-center justify-center overflow-hidden">
            {riveError ? (
              <Text className="text-red-500 p-4 text-center">
                Error loading animation: {riveError.message} ({riveError.type})
              </Text>
            ) : (
              <Rive
              ref={riveRef}
              resourceName="idleLamb"
              autoplay={true}
              onError={handleRiveError}
              style={{ width: '100%', height: '100%' }}
            />
            )}
          </View>
          {!riveError && <Button title="Trigger Out of Frame" onPress={handleOutOfFrame} />}
        </Animated.View>

        {/* Bottom Section - Action Buttons Card */}
        <Animated.View
          className="flex-1 bg-main-bg rounded-t-3xl px-6 pt-8 space-y-4 mt-[-20px]"
          style={{
            opacity: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [
              {
                translateY: bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }),
              },
            ],
          }}
        >
          {/* Button 1: Read Daily Bread */}
          <SecondaryButton 
            icon={breadIcon}
            title="Read Daily Bread"
            subtitle="Feed your soul with scripture"
            points={5}
            onPress={handleReadPress}
          />

          {/* Button 2: Daily Prayer */}
          <SecondaryButton 
            icon={dropIcon}
            title="Daily Prayer"
            subtitle="Feed your soul with scripture"
            points={5}
            onPress={handlePrayerPress}
          />

          {/* Button 3: Daily Reflection / QT */}
          <SecondaryButton 
            icon={quillIcon}
            title="Daily Reflection / QT"
            subtitle="Feed your soul with scripture"
            points={5}
            onPress={handleReflectionPress}
          />
        </Animated.View>

        {/* Done Praying Button - Appears only when praying */}
        {isPraying && (
          <View style={styles.doneButtonContainer}>
            <PrimaryButton title="Done Praying" onPress={handleDonePraying} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  doneButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
}); 