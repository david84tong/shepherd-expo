import React, { useCallback, useState, useRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, Platform } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useUserStore } from '../app/stores/userStore';
import { useUIStore } from '../app/stores/uiStore';
import { usePathStore } from '../app/stores/pathStore';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import Animated, { 
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  Easing,
  useSharedValue,
  interpolate,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

// Add the function to schedule notifications
const scheduleNotification = async (time: string) => {
  // Skip if user selected 'none'
  if (time === 'none') {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  
  try {
    // Get permission first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }
    
    // Cancel any existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Parse time ranges into hours for notifications
    let hour = 8; // Default to 8 AM
    let minute = 0;
    
    switch (time) {
      case 'morning':
        hour = 8; // 8 AM
        break;
      case 'afternoon':
        hour = 14; // 2 PM
        break;
      case 'evening':
        hour = 19; // 7 PM
        break;
      case 'night':
        hour = 21; // 9 PM
        break;
      case 'custom':
        // For custom times, the time string will be in format "HH:MM"
        if (time.includes(':')) {
          const [hourStr, minuteStr] = time.split(':');
          hour = parseInt(hourStr, 10);
          minute = parseInt(minuteStr, 10);
        }
        break;
      default:
        hour = 8; // Default to 8 AM
    }
    
    // Schedule daily notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to talk with the Shepherd",
        body: "Take a moment to read scripture and connect with God.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * 60 * 24, // 24 hours
        repeats: true,
      },
    });
    
    console.log(`Notification scheduled to repeat daily`);
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
};

interface SettingsSheetProps {
  settingsSheetRef: React.RefObject<SettingsSheetRef>;
  snapPoints: string[];
}

// Define the ref type that includes both BottomSheet methods and our custom show method
export type SettingsSheetRef = {
  show: () => void;
  close: () => void;
  expand: () => void;
}

const SettingsSheet: React.FC<SettingsSheetProps> = ({
  settingsSheetRef,
  snapPoints,
}) => {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('Anonymous user');
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);
  const [translationModalVisible, setTranslationModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Get user store data
  const notificationTime = useUserStore(state => state.notificationTime);
  const setNotificationTime = useUserStore(state => state.setNotificationTime);
  
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
  const setSavedTranslation = usePathStore(state => state.setSavedTranslation);

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
      useUserStore.getState().resetUserStore();
      bottomSheetRef.current?.close();
      setIsModalDimActive(false);
      router.replace('/onboarding/1');
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
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
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
      expand: () => bottomSheetRef.current?.expand()
    }),
    [prepareAndShow]
  );

  // Handle translation selection
  const handleTranslationChange = useCallback((translation: string) => {
    setSavedTranslation(translation);
    setTranslationModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [setSavedTranslation]);

  // Function to get display text for notification time
  const getNotificationTimeDisplay = useCallback(() => {
    if (!notificationTime || notificationTime === 'none') {
      return 'No notifications';
    }
    
    switch (notificationTime) {
      case 'morning':
        return 'Morning (7-9 AM)';
      case 'afternoon':
        return 'Afternoon (2-5 PM)';
      case 'evening':
        return 'Evening (6-8 PM)';
      case 'night':
        return 'Night (9-11 PM)';
      default:
        // For custom time format "HH:MM"
        if (notificationTime.includes(':')) {
          const [hours, minutes] = notificationTime.split(':').map(part => parseInt(part, 10));
          const time = new Date();
          time.setHours(hours);
          time.setMinutes(minutes);
          return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return notificationTime;
    }
  }, [notificationTime]);

  // Toggle notifications on/off
  const toggleNotifications = (enableNotifications: boolean) => {
    if (!enableNotifications) {
      setNotificationTime('none');
      scheduleNotification('none');
    } else {
      // If turning on, show the time picker
      setShowTimePicker(true);
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // Toggle time picker visibility with animation
  const toggleTimePicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    // Animate the scale of the selector button
    toggleScale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 100, easing: Easing.inOut(Easing.quad) })
    );
    
    // First update state, then animate
    const newPickerState = !showTimePicker;
    setShowTimePicker(newPickerState);
    
    // Animate picker height with slight delay to ensure state has updated
    setTimeout(() => {
      timePickerHeight.value = withTiming(
        newPickerState ? 230 : 0, 
        { 
          duration: 300, 
          easing: Easing.bezierFn(0.25, 1, 0.5, 1) 
        }
      );
    }, 10);
  };

  // Generate animated styles
  const timePickerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: timePickerHeight.value,
      opacity: interpolate(
        timePickerHeight.value,
        [0, 50, 230],
        [0, 0.5, 1]
      ),
      transform: [
        { 
          scale: interpolate(
            timePickerHeight.value,
            [0, 230],
            [0.95, 1]
          ) 
        }
      ]
    };
  });
  
  const selectorButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: toggleScale.value }]
    };
  });

  // Handle time selection and close picker
  const handleTimeConfirm = () => {
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      
      // Format as "HH:MM"
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Update the time in userStore
      setNotificationTime(timeString);
      
      // Reschedule notifications with the new time
      scheduleNotification(timeString);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    
    // Animate picker closing
    timePickerHeight.value = withTiming(0, { 
      duration: 250, 
      easing: Easing.out(Easing.cubic) 
    });
    
    // Close the picker after animation
    setTimeout(() => {
      setShowTimePicker(false);
    }, 200);
  };

  // Animate toggle button on press
  const animateToggle = (enableNotifications: boolean) => {
    toggleScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1.1, { duration: 100 }),
      withTiming(1, { duration: 150 })
    );
    
    toggleNotifications(enableNotifications);
  };

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        onChange={handleSettingsChange}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        backdropComponent={renderBackdrop}
      >
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
                <Text style={styles.userIdText} numberOfLines={1} ellipsizeMode="tail">{userId}</Text>
                <TouchableOpacity 
                  onPress={handleCopyUserId}
                  style={styles.copyButton}
                >
                  <Feather name="copy" size={16} color="#3C584A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Bible Translation Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Bible Translation</Text>
              <TouchableOpacity 
                style={styles.translationSelector}
                onPress={() => setTranslationModalVisible(true)}
              >
                <Text style={styles.translationText}>
                  {translations.find(t => t.id === savedTranslation)?.name || 'English Standard Version (ESV)'}
                </Text>
                <Feather name="chevron-right" size={18} color="#3C584A" />
              </TouchableOpacity>
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
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    width: 40,
    height: 4,
  },
  settingsContentContainer: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4A8',
  },
  settingsTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Black',
    color: '#3C584A',
  },
  doneButton: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#F7B500',
    fontWeight: '600',
  },
  settingsContent: {
    flex: 1,
    padding: 20,
  },
  settingsText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: 'rgba(60, 88, 74, 0.7)',
    fontSize: 16,
  },
  signOutButton: {
    backgroundColor: 'rgba(223, 69, 51, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DF4533',
    marginBottom: 20,
  },
  signOutText: {
    fontFamily: 'Nunito-Black',
    fontSize: 16,
    color: '#DF4533',
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingsSectionTitle: {
    fontFamily: 'Nunito-Black',
    fontSize: 18,
    color: '#3C584A',
    marginBottom: 10,
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIdText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
    marginRight: 10,
    flexShrink: 1, // Allow text to shrink
  },
  copyButton: {
    padding: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#FFE4A8',
    marginVertical: 20,
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