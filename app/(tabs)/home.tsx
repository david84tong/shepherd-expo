import { View, Text, ImageBackground, SafeAreaView, Platform, Image, Button } from 'react-native';
import Rive, { RiveRef, RNRiveError } from 'rive-react-native';
import { useRef, useState } from 'react';
import SecondaryButton from '../../components/SecondaryButton';

// Assuming background is in assets/backgrounds
const grassBg = require('../../assets/backgrounds/grassBackground1.png');

// Assuming icons are in assets/icons
const breadIcon = require('../../assets/icons/breadIcon.png');
const dropIcon = require('../../assets/icons/breadIcon.png');
const quillIcon = require('../../assets/icons/breadIcon.png');

export default function HomeScreen() {
  const riveRef = useRef<RiveRef>(null);
  const [riveError, setRiveError] = useState<RNRiveError | null>(null);

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

  const handlePrayerPress = () => {
    console.log('Daily Prayer Pressed');
  };

  const handleReflectionPress = () => {
    console.log('Daily Reflection / QT Pressed');
  };

  return (
    <ImageBackground 
      source={grassBg} 
      resizeMode="cover" 
      className="flex-1"
      imageStyle={{
        height: '65%',
        top: 0
      }}
    >
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
        <View className="items-center justify-center" style={{ flex: Platform.OS === 'ios' ? 0.8 : 0.6 }}>
          <View className="w-56 h-56 items-center justify-center overflow-hidden">
            {riveError ? (
              <Text className="text-red-500 p-4 text-center">
                Error loading animation: {riveError.message} ({riveError.type})
              </Text>
            ) : (
              <Rive
              ref={riveRef}
              resourceName="example"
              autoplay={true}
              onError={handleRiveError}
              style={{ width: '100%', height: '100%' }}
            />
            )}
          </View>
          {!riveError && <Button title="Trigger Out of Frame" onPress={handleOutOfFrame} />}
        </View>

        {/* Bottom Section - Action Buttons Card */}
        <View className="flex-1 bg-main-bg rounded-t-3xl px-6 pt-8 space-y-4 mt-[-20px]">
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
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
} 