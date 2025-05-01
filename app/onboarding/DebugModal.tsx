import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SuccessAnimationContent from './SuccessAnimation';
import { HalfModalType } from '../../app/halfModal';
import firestore from '@react-native-firebase/firestore';
import { useUserStore } from '../../app/stores/userStore';

// ... existing code ...

export function DebugButton({ }: DebugButtonProps) {
  // ... existing code ...

  // Handler for showing sitemap
  const handleShowSitemap = useCallback(() => {
    const pathname = usePathname();
    Alert.alert(
      "Current Route",
      `You are currently at: ${pathname}`,
      [{ text: "OK" }]
    );
  }, []);

  // Handler for showing a test modal
  const handleShowPenaltyModal = useCallback(() => {
    // Show a penalty modal for testing
    const params = {
      type: HalfModalType.HEART_PENALTY,
      message: "Test Penalty Modal",
      subMessage: "This is a test penalty modal",
      penalty: 5,
      daysMissed: 3,
    };
    
    // Use global showHalfModal instead of router.push
    if (typeof global !== 'undefined' && (global as any).showHalfModal) {
      (global as any).showHalfModal(params);
    } else {
      console.error('showHalfModal not available on global object');
    }
  }, []);

  return (
    <>
      {/* ... existing code ... */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50">
          <View className="m-5 mt-[60px] bg-surfaceCream rounded-[20px] flex-1 shadow-lg">
            {/* ... existing header code ... */}

            <ScrollView className="p-4">
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Animations & Modals</Text>
                
                {/* ... existing animation buttons ... */}

                {/* Sitemap Button */}
                <TouchableOpacity
                  className="bg-[#E0F7E6] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FD675]"
                  onPress={handleShowSitemap}
                >
                  <Text className="font-feather text-base text-textPrimary">Show Current Route</Text>
                  <Text className="font-din text-sm text-[#5B8A6A] mt-1">Display current app route</Text>
                </TouchableOpacity>
              </View>

              {/* ... rest of existing code ... */}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ... existing BottomSheetModal code ... */}
    </>
  );
} 