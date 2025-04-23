import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Rive, { RiveRef } from 'rive-react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';

interface SuccessAnimationProps {
  message?: string;
  subMessage?: string;
  onClose: () => void;
}

/**
 * Content for the success animation bottom sheet.
 */
const SuccessAnimationContent: React.FC<SuccessAnimationProps> = ({
  message = "Success!",
  subMessage = "Your action was completed successfully.",
  onClose
}) => {
  const riveRef = useRef<RiveRef>(null);

  // Play animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (riveRef.current) {
        riveRef.current.play();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BottomSheetView style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center p-5 bg-surfaceCream">
        {/* Rive animation */}
        <View className="w-64 h-64 mb-6">
          <Rive
            ref={riveRef}
            resourceName="mainSheep1"
            autoplay={false}
            style={{ width: '100%', height: '100%' }}
          />
        </View>
        
        {/* Success message */}
        <Text className="font-feather text-[28px] text-textPrimary mb-2 text-center">{message}</Text>
        <Text className="font-din text-lg text-secondaryText text-center mb-8">{subMessage}</Text>
        
        {/* Close button */}
        <TouchableOpacity 
          className="py-3 px-10 bg-forestGreen80 rounded-3xl mt-5"
          onPress={onClose}
        >
          <Text className="font-din text-base text-white">Close</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetView>
  );
};

export default SuccessAnimationContent;
