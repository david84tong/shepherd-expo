import {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { validateName } from '../utils/validation';
import { useUserStore } from '../app/stores/userStore';
import BottomSheet from '@gorhom/bottom-sheet';
import analytics from '../utils/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

interface EditNameSheetProps {
  editNameSheetRef: React.RefObject<{
    show: () => void;
    close: () => void;
  }>;
}

const EditNameSheet: React.FC<EditNameSheetProps> = ({ editNameSheetRef }) => {
  // Internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  // Get lamb name from store
  const getLambName = useUserStore((state: any) => state.getLambName);
  const setLambName = useUserStore((state: any) => state.setLambName);
  const initialName = getLambName?.() || '';

  // Local state
  const [isVisible, setIsVisible] = useState(false);
  const [inputName, setInputName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();

  // Snap points
  const snapPoints = useMemo(() => {
    return ['35%', '35%']; // Fixed height of 155px
  }, []);

  // Custom backdrop
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  // Handle sheet changes
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        setIsVisible(false);
        setError(undefined);
        setInputName(initialName);
      }
    },
    [initialName]
  );

  // Handle input change
  const handleInputChange = (text: string) => {
    setInputName(text);
    const validation = validateName(text);
    if (!validation?.isValid) {
      setError(validation.error);
    } else {
      setError(undefined);
    }
  };

  // Handle save
  const handleSave = useCallback(() => {
    const validation = validateName(inputName);
    if (validation.isValid) {
      const name = inputName.trim();

      // Log event
      analytics.logEvent('Profile_EditName_Save', {
        oldName: initialName,
        newName: name,
      });

      // Save to store (this will sync with Firebase)
      setLambName(name);

      // Close sheet
      bottomSheetRef.current?.close();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Name updated successfully!',
        text2: `Your lamb's name is now ${name}`,
        position: 'top',
        visibilityTime: 2000,
      });
    } else {
      setError(validation.error);
    }
  }, [inputName, initialName, setLambName]);

  // Expose methods via ref
  React.useImperativeHandle(
    editNameSheetRef,
    () => ({
      show: () => {
        setIsVisible(true);
        setInputName(initialName);
        setError(undefined);
        bottomSheetRef.current?.expand();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }),
    [initialName]
  );
  console.log('snapPoints ==>', snapPoints);

  return (
    <>
      {isVisible ? (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          onChange={handleSheetChange}
          backdropComponent={renderBackdrop}
          keyboardBlurBehavior="restore"
          keyboardBehavior="interactive"
          android_keyboardInputMode="adjustPan">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            className="flex-1">
            <BottomSheetScrollView
              className="flex-1 px-6"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 85 : 65),
              }}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="font-feather text-2xl text-textPrimary">Edit Lamb Name</Text>
                <TouchableOpacity
                  onPress={() => bottomSheetRef.current?.close()}
                  className="w-8 h-8 rounded-full bg-lightYellow items-center justify-center">
                  <Feather name="x" size={20} color="#B89B4C" />
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <BottomSheetTextInput
                className="font-feather text-xl text-center text-textPrimary bg-white p-6 rounded-2xl border-4 border-border"
                placeholder="Enter name"
                placeholderTextColor="#B89B4C"
                maxLength={16}
                value={inputName}
                onChangeText={handleInputChange}
                autoCorrect={false}
                autoCapitalize="none"
                spellCheck={false}
              />
              {error && (
                <Text className="font-din text-sm text-red-500 mt-2 text-center">{error}</Text>
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={!inputName.trim() || !!error || inputName === initialName}
                className={`mt-6 p-4 rounded-2xl items-center justify-center ${
                  !inputName.trim() || !!error || inputName === initialName
                    ? 'bg-gray-200'
                    : 'bg-accentGold'
                }`}>
                <Text
                  className={`font-feather text-lg ${
                    !inputName.trim() || !!error || inputName === initialName
                      ? 'text-gray-500'
                      : 'text-white'
                  }`}>
                  Save Changes
                </Text>
              </TouchableOpacity>
            </BottomSheetScrollView>
          </KeyboardAvoidingView>
        </BottomSheet>
      ) : null}
    </>
  );
};

export default EditNameSheet;
