/**
 * DEPRECATED: This component has been replaced by an inline BottomSheet implementation in _layout.tsx.
 * We're keeping this file for the HalfModalType enum which is still used throughout the codebase.
 * New code should use the global.showHalfModal function exposed from _layout.tsx instead of router.push.
 */

import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { useUIStore } from './stores/uiStore';
import { useUserStore } from './stores/userStore';
import PrimaryButton from '../components/PrimaryButton';

// Define the types of modals this screen can display
export enum HalfModalType {
  HEART_PENALTY = 'HEART_PENALTY',
  WIDGET_REMINDER = 'WIDGET_REMINDER',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  GENERIC = 'GENERIC',
}

export default function HalfModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);
  const getLambName = useUserStore((state) => state.getLambName);
  const lambName = getLambName();

  // Bottom sheet reference and configuration
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Animation value for the background
  const backdropOpacity = useSharedValue(0);

  // Helper function to safely get string param
  const getStringParam = (paramName: string): string | undefined => {
    const value = params[paramName];
    return typeof value === 'string' ? value : undefined;
  };

  // Determine content based on params
  const type = (getStringParam('type') as HalfModalType) || HalfModalType.GENERIC;
  let title = getStringParam('message') || 'Attention';
  let description = getStringParam('subMessage') || 'Something happened.';
  let icon = require('../assets/icons/heartIcon.png'); // Generic icon
  const penalty = parseInt(getStringParam('penalty') || '0', 10);
  const daysMissed = parseInt(getStringParam('daysMissed') || '0', 10);

  // Set content based on type (using require for icons)
  if (type === HalfModalType.HEART_PENALTY) {
    title = getStringParam('message') || 'Hearts Lost!';
    description =
      getStringParam('subMessage') ||
      `You lost ${penalty} hearts for ${daysMissed} days of inactivity.`;
    icon = require('../assets/lambStatic/cryingLamb.png');
  } else if (type === HalfModalType.WIDGET_REMINDER) {
    title = getStringParam('message') || 'Reminder';
    description = getStringParam('subMessage') || 'Just a friendly reminder!';
    icon = require('../assets/icons/heartIcon.png');
  } else if (type === HalfModalType.ANNOUNCEMENT) {
    title = getStringParam('message') || 'Announcement';
    description = getStringParam('subMessage') || 'We have news for you!';
    icon = require('../assets/icons/heartIcon.png');
  }

  // Function to dismiss the modal
  const handleDismiss = () => {
    bottomSheetRef.current?.close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Handle bottom sheet changes
  const handleSheetChange = (index: number) => {
    if (index >= 0) {
      setSheetOpen(true);
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      setSheetOpen(false);
      backdropOpacity.value = withTiming(0, { duration: 200 });

      // Only call router.back() when the sheet is fully closed
      if (index === -1) {
        setTimeout(() => {
          router.back();
        }, 100);
      }
    }
  };

  // Effect for managing dim state and presenting sheet
  useEffect(() => {
    console.log(`[HalfModal] Mounting (Type: ${type}), activating dim...`);
    setIsModalDimActive(true);

    // Open the bottom sheet after a slight delay
    const timer = setTimeout(() => {
      bottomSheetRef.current?.expand();
    }, 100);

    return () => {
      console.log('[HalfModal] Unmounting, setting dim inactive');
      clearTimeout(timer);
      setIsModalDimActive(false);
    };
  }, [setIsModalDimActive, type]);

  return (
    // Container with transparent background to see the overlay
    <View style={styles.container}>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={() => handleSheetChange(-1)}
        onChange={handleSheetChange}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}>
        <BottomSheetView style={styles.contentContainer}>
          {/* Icon */}
          <Image source={icon} style={styles.icon} resizeMode="contain" />

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Type-specific content (e.g., penalty info) */}
          {type === HalfModalType.HEART_PENALTY && penalty > 0 && (
            <View>
              <Text style={styles.penaltyText}>
                ❤️ {lambName} lost {penalty} hearts after {daysMissed} days away.
              </Text>
            </View>
          )}

          {/* Close Button using PrimaryButton */}
          <PrimaryButton
            title="Let's bounce back"
            onPress={handleDismiss}
            style="w-full mt-6"
            buttonType="default"
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    flex: 1,
    padding: 20,
    paddingBottom: 30,
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
    width: 40,
  },
  icon: {
    height: 240,
    marginBottom: 16,
    width: 240,
  },
  penaltyText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 18,
    color: '#666', // secondaryText
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontFamily: 'Nunito-Black',
    fontSize: 32,
    color: '#3C584A', // textPrimary
    marginBottom: 16,
    textAlign: 'center',
  },
});
