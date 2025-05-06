import { Feather } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import auth from '@react-native-firebase/auth';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useState, useRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useUIStore } from '../app/stores/uiStore';
import { useUserStore } from '../app/stores/userStore';
import { useSharedValue } from 'react-native-reanimated';
import { usePathStore } from '../app/stores/pathStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsSheetProps {
  settingsSheetRef: React.RefObject<SettingsSheetRef>;
  snapPoints: string[];
}

// Define the ref type that includes both BottomSheet methods and our custom show method
export type SettingsSheetRef = {
  show: () => void;
  close: () => void;
  expand: () => void;
};

const SettingsSheet: React.FC<SettingsSheetProps> = ({ settingsSheetRef, snapPoints }) => {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('Anonymous user');
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);
  const [translationModalVisible, setTranslationModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Get user store data
  const notificationTime = useUserStore(state => state.notificationTime);
  const setNotificationTime = useUserStore(state => state.setNotificationTime || (() => {}));
  
  // State for the time picker
  const [selectedTime, setSelectedTime] = useState(new Date());
  
  // Animation shared values
  const timePickerHeight = useSharedValue(0);
  const toggleScale = useSharedValue(1);
  
  // Initialize selectedTime based on notificationTime on mount
  useEffect(() => {
    if (notificationTime && notificationTime !== 'none' && !['morning', 'afternoon', 'evening', 'night'].includes(notificationTime)) {
      // For custom time format "HH:MM"
      if (notificationTime.includes(':')) {
        const [hours, minutes] = notificationTime.split(':').map(part => parseInt(part, 10));
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);
        setSelectedTime(date);
      }
    } else {
      // Set to a default time
      const date = new Date();
      date.setHours(8); // Default to 8 AM
      date.setMinutes(0);
      setSelectedTime(date);
    }
  }, [notificationTime]);
  
  // Get path store functions
  const savedTranslation = usePathStore(state => state.savedTranslation);
  const setSavedTranslation = (translation: string) => {
    usePathStore.setState({ savedTranslation: translation });
  };

  // Available translations
  const translations = [
    { id: 'WEB', name: 'World English Bible (WEB)' },
    { id: 'KJV', name: 'King James Version (KJV)' },
    { id: 'ASV', name: 'American Standard-ASV1901 (ASV)' },
    { id: 'BBE', name: 'Bible in Basic English (BBE)' },
    { id: 'DARBY', name: 'Darby English Bible (DARBY)' },
    { id: 'YLT', name: 'Young\'s Literal Translation (YLT)' },
    { id: 'NLT', name: 'New Living Translation (NLT)' },
    { id: 'NIV', name: 'New International Version (NIV)' },
    { id: 'ESV', name: 'English Standard Version (ESV)' },
  ];

  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Handle sheet changes
  const handleSettingsChange = useCallback((index: number) => {
    if (index === -1) {
      // When sheet closes, reset any state if needed
    }
  }, []);

  // Close the settings sheet
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await auth().signOut();
      await AsyncStorage.setItem('@shepherd/onboarding_completed', 'true');

      useUserStore.getState().resetUserStore();
      bottomSheetRef.current?.close();
      setIsModalDimActive(false);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [router, setIsModalDimActive]);

  // Handle copying the user ID
  const handleCopyUserId = useCallback(() => {
    Clipboard.setString(userId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('Copied!', 'User ID copied to clipboard');
  }, [userId]);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Update user ID when the sheet is shown
  const prepareAndShow = useCallback(() => {
    // Get user ID directly from Firebase or userStore
    let currentUserId = 'Not authenticated';

    // First try to get the current Firebase user's UID
    const currentUser = auth().currentUser;
    if (currentUser?.uid) {
      currentUserId = currentUser.uid;
    } else {
      // Fallback to userStore
      const user = useUserStore.getState().getUser();
      currentUserId = user?.id || 'Not authenticated';
    }

    setUserId(currentUserId);

    // Show the sheet
    bottomSheetRef.current?.expand();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  // Expose methods via ref
  useImperativeHandle(
    settingsSheetRef,
    () => ({
      show: prepareAndShow,
      close: () => bottomSheetRef.current?.close(),
      expand: () => bottomSheetRef.current?.expand(),
    }),
    [prepareAndShow]
  );

  // Funções utilitárias e handlers ausentes
  const animateToggle = (enable: boolean) => {
    // Simples toggle, pode ser expandido para animação real
    if (enable) {
      setNotificationTime('08:00'); // Default para 8h
    } else {
      setNotificationTime('none');
    }
  };

  const toggleTimePicker = () => {
    setShowTimePicker((prev) => !prev);
  };

  const getNotificationTimeDisplay = () => {
    if (notificationTime && notificationTime.includes(':')) {
      const [h, m] = notificationTime.split(':');
      const hour = parseInt(h, 10);
      const minute = m.padStart(2, '0');
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${hour12}:${minute} ${ampm}`;
    }
    // Fallback para presets
    switch (notificationTime) {
      case 'morning': return 'Morning (8:00 AM)';
      case 'afternoon': return 'Afternoon (12:00 PM)';
      case 'evening': return 'Evening (6:00 PM)';
      case 'night': return 'Night (9:00 PM)';
      default: return 'Select Time';
    }
  };

  const handleTimeConfirm = () => {
    const hours = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    setNotificationTime(`${hours}:${minutes.toString().padStart(2, '0')}`);
    setShowTimePicker(false);
  };

  const handleTranslationChange = (id: string) => {
    setSavedTranslation(id);
    setTranslationModalVisible(false);
  };

  // Estilos animados placeholders (ajuste conforme necessário)
  const selectorButtonStyle = {};
  const timePickerAnimatedStyle = {};

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onChange={handleSettingsChange}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        backdropComponent={renderBackdrop}>
        <BottomSheetView style={styles.settingsContentContainer}>
          {/* Header */}
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <TouchableOpacity onPress={handleClose} style={{ padding: 5 }}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Sheet Content */}
          <View style={styles.settingsContent}>
            {/* User ID Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>User ID</Text>
              <View style={styles.userIdContainer}>
                <Text style={styles.userIdText} numberOfLines={1} ellipsizeMode="tail">
                  {userId}
                </Text>
                <TouchableOpacity onPress={handleCopyUserId} style={styles.copyButton}>
                  <Feather name="copy" size={16} color="#3C584A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Notification Time Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Notification Time</Text>
              {/* Toggle for enabling/disabling notifications */}
              <View style={styles.notificationToggleContainer}>
                <Text style={styles.notificationToggleText}>
                  {notificationTime === 'none' ? 'Notifications disabled' : 'Notifications enabled'}
                </Text>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton,
                    notificationTime !== 'none' ? styles.toggleButtonActive : {}
                  ]}
                  onPress={() => animateToggle(notificationTime === 'none')}
                >
                  <Animated.View 
                    style={[
                      styles.toggleKnob, 
                      notificationTime !== 'none' ? styles.toggleKnobActive : {},
                      {
                        transform: [
                          { translateX: notificationTime !== 'none' ? 20 : 0 }
                        ]
                      }
                    ]} 
                  />
                </TouchableOpacity>
              </View>
              {notificationTime !== 'none' && (
                <Animated.View style={selectorButtonStyle}>
                  <TouchableOpacity 
                    style={[
                      styles.timeSelector,
                      showTimePicker && styles.timeSelectorActive
                    ]}
                    onPress={toggleTimePicker}
                  >
                    <Text style={styles.timeSelectorText}>
                      {getNotificationTimeDisplay()}
                    </Text>
                    <Feather name={showTimePicker ? "chevron-up" : "clock"} size={18} color="#3C584A" />
                  </TouchableOpacity>
                </Animated.View>
              )}
              {/* Embedded Time Picker with animation */}
              {notificationTime !== 'none' && (
                <Animated.View 
                  style={[
                    styles.timePickerContainer,
                    timePickerAnimatedStyle,
                    showTimePicker ? null : { height: 0, opacity: 0, overflow: 'hidden' }
                  ]}
                >
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={(event, date) => date && setSelectedTime(date)}
                    style={styles.timePicker}
                  />
                  <TouchableOpacity
                    style={styles.donePickingButton}
                    onPress={handleTimeConfirm}
                  >
                    <Text style={styles.donePickingText}>Done</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Placeholder for future settings */}
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.settingsText}>More settings coming soon...</Text>
            </View>

            {/* Sign Out Button */}
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>

      {/* Translation Selection Modal */}
      <Modal
        visible={translationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTranslationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Bible Translation</Text>
            <ScrollView style={styles.translationScrollView} showsVerticalScrollIndicator={false}>
              {translations.map(translation => (
                <TouchableOpacity
                  key={translation.id}
                  style={[
                    styles.translationOption,
                    savedTranslation === translation.id && styles.selectedTranslation
                  ]}
                  onPress={() => handleTranslationChange(translation.id)}
                >
                  <Text style={[
                    styles.translationOptionText,
                    savedTranslation === translation.id && styles.selectedTranslationText
                  ]}>
                    {translation.name}
                  </Text>
                  {savedTranslation === translation.id && (
                    <Feather name="check" size={18} color="#F7B500" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setTranslationModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {/* Sign Out Button */}
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  copyButton: {
    padding: 5,
  },
  divider: {
    backgroundColor: '#FFE4A8',
    height: 1,
    marginVertical: 20,
  },
  doneButton: {
    color: '#F7B500',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
    width: 40,
  },
  settingsContent: {
    flex: 1,
    padding: 20,
  },
  settingsContentContainer: {
    flex: 1,
  },
  settingsHeader: {
    alignItems: 'center',
    borderBottomColor: '#FFE4A8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18,
    marginBottom: 10,
  },
  settingsText: {
    color: 'rgba(60, 88, 74, 0.7)',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  settingsTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18,
  },
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  signOutButton: {
    backgroundColor: 'rgba(223, 69, 51, 0.1)',
    borderLeftColor: '#DF4533',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 20,
    padding: 16,
  },
  signOutText: {
    color: '#DF4533',
    fontFamily: 'Nunito-Black',
    fontSize: 16,
  },
  userIdContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  userIdText: {
    color: '#3C584A',
    flexShrink: 1,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    marginRight: 10, // Allow text to shrink
  },
  translationSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    padding: 12,
    borderRadius: 10,
  },
  translationText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF4D9',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 350,
    maxHeight: '90%',
  },
  modalTitle: {
    fontFamily: 'Feather Bold',
    fontSize: 18,
    color: '#3C584A',
    marginBottom: 16,
    textAlign: 'center',
  },
  translationScrollView: {
    maxHeight: 450,
  },
  translationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedTranslation: {
    backgroundColor: 'rgba(247, 181, 0, 0.1)',
  },
  translationOptionText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
  },
  selectedTranslationText: {
    fontWeight: '600',
    color: '#3C584A',
  },
  cancelButton: {
    marginTop: 12,
    padding: 14,
    backgroundColor: 'rgba(60, 88, 74, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
    fontWeight: '600',
  },
  notificationToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationToggleText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    padding: 5,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#F7B500',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    // Remove transform from here, we'll handle it with Animated
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  timeSelectorText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
  },
  timePickerContainer: {
    backgroundColor: 'rgba(255, 244, 217, 0.95)',
    borderRadius: 16,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFE4A8',
  },
  timePicker: {
    width: '100%',
    height: 180,
  },
  donePickingButton: {
    backgroundColor: '#F7B500',
    padding: 14,
    alignItems: 'center',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  donePickingText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeSelectorActive: {
    backgroundColor: 'rgba(247, 181, 0, 0.15)',
    borderColor: '#F7B500',
  },
});

export default SettingsSheet;
