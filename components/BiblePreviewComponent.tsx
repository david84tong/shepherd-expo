import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { router } from 'expo-router';
import { usePathStore } from '../store/pathStore';
import { Ionicons } from '@expo/vector-icons';

interface BiblePreviewProps {
  /** Whether the preview overlay should be shown. */
  visible: boolean;
  /** Callback to close the preview */
  onClose: () => void;
}

/**
 * Full‑screen overlay that shows a placeholder "Bible Preview" screen.
 * Rendered only when `visible` is true.
 */
const BiblePreviewComponent: React.FC<BiblePreviewProps> = ({ visible, onClose }) => {
  const containerOpacity = useRef(new Animated.Value(0)).current; // Overall container opacity
  const cardAnim = useRef(new Animated.Value(-100)).current; // Y offset for entry
  const cardOpacity = useRef(new Animated.Value(0)).current;
  
  // Get saved reading & path in progress state from path store
  const { savedBook, savedChapter, setPathInProgress } = usePathStore();
  
  // Animation values for the primary button
  const buttonAnim = useRef(new Animated.Value(60)).current; // Start 60 units below final position
  const buttonOpacity = useRef(new Animated.Value(0)).current; // Start fully transparent

  useEffect(() => {
    if (visible) {
      // Set path in progress when component becomes visible
      setPathInProgress(true);
      
      // First animate the container opacity and card entry
      Animated.parallel([
        Animated.timing(containerOpacity, { // Fade in container
          toValue: 1,
          duration: 400, // Faster fade-in
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
      
      // Then animate the button with a delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(buttonAnim, {
            toValue: 0, 
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          })
        ]).start();
      }, 200); 
    } else {
      // Reset animations when component is hidden
      containerOpacity.setValue(0); // Reset container opacity
      cardAnim.setValue(-100);
      cardOpacity.setValue(0);
      buttonAnim.setValue(60);
      buttonOpacity.setValue(0);
    }
  }, [visible, setPathInProgress]);

  // We still return null immediately when not visible, so fade-out isn't seen
  // A different approach (e.g., keeping mounted until animation finishes) 
  // would be needed for a visible fade-out.
  if (!visible) return null;

  const handleBack = () => {
    setPathInProgress(false);
    onClose();
  };

  const handleStart = () => {
    setPathInProgress(false);
    
    // Navigate to the standalone bibleReader screen with animation
    router.push({
      pathname: '/bibleReader',
      params: {
        transition: 'slide_from_right'
      }
    });
  };

  return (
    <Animated.View
      className="absolute inset-0 flex flex-col"
      style={{ opacity: containerOpacity }}
      pointerEvents="box-none"
    >
      {/* Back Button */} 
      <View className="pt-[60px] px-5 w-full z-10 absolute top-0 left-0">
       <TouchableOpacity 
         onPress={handleBack} 
         className="w-[44px] h-[44px] rounded-full bg-[rgba(255,244,217,0.95)] items-center justify-center"
         style={{
           shadowColor: '#000',
           shadowOffset: { width: 0, height: 2 },
           shadowOpacity: 0.15,
           shadowRadius: 3,
           elevation: 3
         }}
       >
          <Ionicons name="chevron-back" size={22} color="#2D3720" />
        </TouchableOpacity>
      </View>

      {/* Animated Card Preview at the top */} 
      <Animated.View
        className="w-[90%] bg-surfaceCream rounded-[28px] py-8 px-6 items-center z-10 mx-auto my-auto mt-[120px] border-4 border-border"
        style={{ opacity: cardOpacity, transform: [{ translateY: cardAnim }] }}
      >
        {/* Pillar Title */} 
        <Text className="text-h1 font-feather text-accentGold mb-2 text-center leading-tight ">The Good Shepherd</Text>
        {/* Date or subtitle */} 
        <Text className="text-body font-din text-[#B89B4C] mb-4">Today's Reading · {savedBook} {savedChapter}</Text>
        {/* Summary Section */} 
        <View className="w-full bg-surfaceCream/50 rounded-[18px] p-4 mt-2 border border-border mb-2">
          <Text className="text-caption font-din text-[#B89B4C] text-center uppercase mb-1 tracking-wider">SUMMARY</Text>
          <Text className="text-body font-din text-textPrimary text-center">
            {savedBook === 'John' && savedChapter === 3 ? 
              "Jesus teaches Nicodemus about being born again and God's love for the world." : 
              "Jesus describes Himself as the Good Shepherd who lays down His life for the sheep."}
          </Text>
        </View>
      </Animated.View>
      <View className="flex-1 h-96" />
      {/* Animated Primary Button */}
      <Animated.View 
        className="w-full px-5 mb-10 mt-auto items-center z-10 mt-0"
        style={{ opacity: buttonOpacity, transform: [{ translateY: buttonAnim }] }}
      >
        <PrimaryButton title="Start Reading" onPress={handleStart} />
      </Animated.View>
    </Animated.View>
  );
};

export default BiblePreviewComponent;
