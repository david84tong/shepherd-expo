import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

export default function WidgetGuide({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <View
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      className="flex-1 bg-white"
    >
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-200 py-4 px-4">
        <TouchableOpacity onPress={handleBack} className="mr-4">
          <Text className="text-primary">Close</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold flex-1 text-center">Add Widget Guide</Text>
        <View className="w-10" />
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-5">
        <Text className="text-xl font-bold mt-6 mb-2">Add the Shepherd Widget</Text>
        <Text className="text-base text-gray-700 mb-6">
          Follow these simple steps to add the Shepherd streak widget to your home screen.
        </Text>

        {/* Step 1 */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2">
              <Text className="text-white font-bold">1</Text>
            </View>
            <Text className="text-lg font-semibold">Press and hold on your home screen</Text>
          </View>
          <Text className="text-base text-gray-700 ml-10 mb-4">
            Find an empty area on your home screen and press and hold until the icons start wiggling.
          </Text>
          {/* Placeholder for image - replace with actual screenshot */}
          <View className="bg-gray-200 rounded-lg h-40 items-center justify-center">
            <Text className="text-gray-600">Screenshot: Home screen in edit mode</Text>
          </View>
        </View>

        {/* Step 2 */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2">
              <Text className="text-white font-bold">2</Text>
            </View>
            <Text className="text-lg font-semibold">Tap the "+" icon</Text>
          </View>
          <Text className="text-base text-gray-700 ml-10 mb-4">
            Tap the "+" icon in the top-left corner of your screen to open the widget gallery.
          </Text>
          {/* Placeholder for image - replace with actual screenshot */}
          <View className="bg-gray-200 rounded-lg h-40 items-center justify-center">
            <Text className="text-gray-600">Screenshot: Tapping the + icon</Text>
          </View>
        </View>

        {/* Step 3 */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2">
              <Text className="text-white font-bold">3</Text>
            </View>
            <Text className="text-lg font-semibold">Find Shepherd</Text>
          </View>
          <Text className="text-base text-gray-700 ml-10 mb-4">
            Scroll down or search for "Shepherd" in the widget gallery.
          </Text>
          {/* Placeholder for image - replace with actual screenshot */}
          <View className="bg-gray-200 rounded-lg h-40 items-center justify-center">
            <Text className="text-gray-600">Screenshot: Finding Shepherd in widget gallery</Text>
          </View>
        </View>

        {/* Step 4 */}
        <View className="mb-8">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2">
              <Text className="text-white font-bold">4</Text>
            </View>
            <Text className="text-lg font-semibold">Choose widget size</Text>
          </View>
          <Text className="text-base text-gray-700 ml-10 mb-4">
            Select the small widget size by swiping left or right, then tap "Add Widget".
          </Text>
          {/* Placeholder for image - replace with actual screenshot */}
          <View className="bg-gray-200 rounded-lg h-40 items-center justify-center">
            <Text className="text-gray-600">Screenshot: Selecting widget size</Text>
          </View>
        </View>

        {/* Step 5 */}
        <View className="mb-12">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2">
              <Text className="text-white font-bold">5</Text>
            </View>
            <Text className="text-lg font-semibold">Position and Done</Text>
          </View>
          <Text className="text-base text-gray-700 ml-10 mb-4">
            Position the widget where you want it on your home screen, then tap "Done" in the top-right corner.
          </Text>
          {/* Placeholder for image - replace with actual screenshot */}
          <View className="bg-gray-200 rounded-lg h-40 items-center justify-center">
            <Text className="text-gray-600">Screenshot: Final widget on home screen</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom button */}
      <View className="px-5 py-4 border-t border-gray-200">
        <TouchableOpacity
          onPress={handleBack}
          className="bg-primary rounded-lg py-3 items-center"
        >
          <Text className="text-white font-bold text-lg">Got It</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 