import React, { useCallback, useState, useRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView, Linking } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { FontAwesome6 } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../app/stores/userStore';
import { useUIStore } from '../app/stores/uiStore';
import { usePathStore } from '../app/stores/pathStore';
import { useNotificationStore, NOTIFICATION_IDS, NotificationTimeOption } from '../app/stores/notificationStore';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import analytics from '../utils/analytics';
import Purchases from 'react-native-purchases';
import useSubscriptionStore from '../app/stores/subscriptionStore';

import Animated, { 
  useAnimatedStyle,
  withTiming,
  Easing,
  useSharedValue,
  interpolate,
  withSequence,
} from 'react-native-reanimated';

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
  const [isUserSignedIn, setIsUserSignedIn] = useState<boolean>(false);
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);
  const [translationModalVisible, setTranslationModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Get user store data
  const notificationTime = useUserStore(state => state.notificationTime);
  const setNotificationTime = useUserStore(state => state.setNotificationTime);
  
  // Get notification store data
  const notificationsEnabled = useNotificationStore(state => state.notificationsEnabled);
  const setNotificationsEnabled = useNotificationStore(state => state.setNotificationsEnabled);
  const scheduleStreakReminders = useNotificationStore(state => state.scheduleStreakReminders);
  const cancelStreakNotifications = useNotificationStore(state => state.cancelStreakNotifications);
  const scheduleDailyReminder = useNotificationStore(state => state.scheduleDailyReminder);
  const cancelDailyReminder = useNotificationStore(state => state.cancelDailyReminder);
  
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
  
  // Check notification permissions on mount
  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  // Check notification permissions
  const checkNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        // If permissions are granted, ensure our store reflects that
        setNotificationsEnabled(true);
      } else {
        // If permissions are not granted, disable notifications in our store
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };
  
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    bottomSheetRef.current?.close();
  }, []);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    analytics.logEvent("Settings_Tapped_SignOut", {
      userId: userId
    });
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await auth().signOut().then(() => {
        useUserStore.getState().resetUserStore();
        bottomSheetRef.current?.close();
        setIsModalDimActive(false);
        router.replace('/login');
      }).catch((error) => {
        console.error('Error signing out:', error);
      });
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
    let isUserSignedIn = false;
    
    // First try to get the current Firebase user's UID
    const currentUser = auth().currentUser;
    if (currentUser?.uid) {
      currentUserId = currentUser.uid;
      isUserSignedIn = true;
    } else {
      // Fallback to userStore
      const user = useUserStore.getState().getUser();
      currentUserId = user?.id || 'Not authenticated';
      isUserSignedIn = !!user?.id;
    }
    
    setUserId(currentUserId);
    setIsUserSignedIn(isUserSignedIn);
    
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSavedTranslation(translation);
    setTranslationModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    analytics.logEvent("Settings_Tapped_TranslationChange", {
      translation: translation
    });
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
  const toggleNotifications = async (enableNotifications: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    if (enableNotifications) {
      // Request permissions if enabling notifications
      const { status } = await Notifications.getPermissionsAsync();
      console.log(`Current notification permission status: ${status}`);
      
      if (status !== 'granted') {
        // Request permissions if not already granted
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log(`New notification permission status after request: ${newStatus}`);
        
        if (newStatus !== 'granted') {
          // If still not granted, show alert with option to go to settings
          Alert.alert(
            'Notification Permission Required',
            'Please enable notifications in your device settings to receive Bible reading reminders.',
            [
              { 
                text: 'Open Settings', 
                onPress: () => {
                  Linking.openSettings();
                  analytics.logEvent("Settings_Opened_SystemSettings_Notifications");
                } 
              },
              { 
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
          return;
        }
      }
      
      // Update notification store
      setNotificationsEnabled(true);
      
      // Schedule notifications
      await scheduleStreakReminders();
      
      // If turning on, show the time picker
      setShowTimePicker(true);
      
      // Default notification time if none set
      if (notificationTime === 'none') {
        setNotificationTime('19:00'); // Default to 7 PM
      }
    } else {
      // If turning off, cancel all notifications
      await cancelStreakNotifications();
      await cancelDailyReminder();
      
      // Update notification store
      setNotificationsEnabled(false);
      
      // Hide the time picker if it's open
      if (showTimePicker) {
        timePickerHeight.value = withTiming(0, { 
          duration: 250, 
          easing: Easing.out(Easing.cubic) 
        });
        setTimeout(() => {
          setShowTimePicker(false);
        }, 200);
      }
    }
  };

  // Toggle time picker visibility with animation
  const toggleTimePicker = () => {
    // Add haptic feedback
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
  const handleTimeConfirm = async () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    if (selectedTime) {
      const hours = selectedTime.getHours();
      const minutes = selectedTime.getMinutes();
      
      // Format as "HH:MM"
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Update the time in userStore
      setNotificationTime(timeString);
      
      // Map time to NotificationTimeOption when possible, for standard times
      let timeOption: NotificationTimeOption;
      if (hours === 8 && minutes === 0) {
        timeOption = 'morning';
      } else if (hours === 14 && minutes === 0) {
        timeOption = 'afternoon';
      } else if (hours === 19 && minutes === 0) {
        timeOption = 'evening';
      } else if (hours === 21 && minutes === 0) {
        timeOption = 'night';
      } else {
        // For custom times that don't match our predefined options,
        // still use 'morning' etc. as defined in the notificationStore
        // based on the hour of day
        if (hours >= 5 && hours < 12) {
          timeOption = 'morning';
        } else if (hours >= 12 && hours < 17) {
          timeOption = 'afternoon';
        } else if (hours >= 17 && hours < 21) {
          timeOption = 'evening';
        } else {
          timeOption = 'night';
        }
      }
      
      // Log the time selection for analytics
      analytics.logEvent("Settings_Changed_NotificationTime", {
        time: timeString,
        timeOption: timeOption
      });
      
      // Schedule only the daily reminder notification using the store method
      await scheduleDailyReminder(timeOption);
      
      // Provide success feedback
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

  // Update the cancel button in translation modal
  const handleCancelTranslation = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTranslationModalVisible(false);
  }, []);

  // Open Discord link
  const handleOpenDiscord = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Linking.openURL('https://discord.gg/W9MZdVaKBs').catch(err => {
      console.error('Error opening Discord link:', err);
      Alert.alert('Could not open link', 'Please check your internet connection and try again.');
    });
  }, []);

  // Delete account and related data
  const handleDeleteAccount = useCallback(() => {
    analytics.logEvent("Settings_Tapped_DeleteAccount", {
      userId: userId,
      email: auth().currentUser?.email
    });
    Alert.alert(
      'Delete Account & Data',
      'This will delete your account, all Firestore data, and clear local storage. This action CANNOT be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get current user
              const currentUser = auth().currentUser;
              if (!currentUser) {
                Alert.alert('Error', 'No user is currently signed in');
                return;
              }
              
              const userId = currentUser.uid;
              console.log('Attempting to delete user:', userId);
              
              try {
                // Delete Firestore user document first
                await firestore().collection('users').doc(userId).delete();
                console.log('✅ User document deleted from Firestore');
              } catch (firestoreError) {
                console.error('❌ Error deleting Firestore document:', firestoreError);
                Alert.alert('Firestore Error', 'Failed to delete Firestore data. Continuing with other deletion steps.');
              }
              
              try {
                // Clear AsyncStorage
                await AsyncStorage.clear();
                console.log('✅ Local storage cleared successfully');
              } catch (storageError) {
                console.error('❌ Error clearing AsyncStorage:', storageError);
                Alert.alert('Storage Error', 'Failed to clear local storage. Continuing with other deletion steps.');
              }
              
              // Reset user store regardless of other errors
              useUserStore.getState().resetUserStore();
              console.log('✅ User store reset');
              
              try {
                // Try to delete the account after sign out
                // Note: This often fails due to Firebase security rules requiring recent authentication
                if (currentUser) {
                  await currentUser.delete();
                  console.log('✅ User auth account deleted');
                  
                  // Only sign out if account deletion was successful
                  await auth().signOut();
                  console.log('✅ User signed out after account deletion');
                }
              } catch (authError: any) {
                console.error('❌ Error with auth operations:', authError);
                
                // Handle the specific "requires-recent-login" error from Firebase
                if (authError.code === 'auth/requires-recent-login') {
                  Alert.alert(
                    'Authentication Timeout',
                    'This operation requires recent authentication. You will need to re-login and try again. Would you like to sign out and go to the login screen?',
                    [
                      { 
                        text: 'Yes', 
                        onPress: async () => {
                          try {
                            await auth().signOut();
                            bottomSheetRef.current?.close();
                            router.replace('/login');
                          } catch (e) {
                            console.error('Failed to sign out:', e);
                          }
                        } 
                      },
                      { text: 'No', style: 'cancel' }
                    ]
                  );
                  return; // Exit early if we're showing the re-auth message
                } else {
                  Alert.alert('Auth Error', `Error: ${authError.message || 'Unknown auth error'}`);
                }
              }
              
              // Always redirect to login screen regardless of errors
              Alert.alert(
                'Account Data Deleted',
                'Your account data has been deleted. The app will now redirect to the login screen.',
                [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      bottomSheetRef.current?.close();
                      router.replace('/login');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('❌ Unhandled error in account deletion:', error);
              Alert.alert(
                'Error', 
                'Something went wrong during account deletion. The app will try to sign you out anyway.',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      try {
                        await auth().signOut();
                        bottomSheetRef.current?.close();
                        router.replace('/login');
                      } catch (e) {
                        console.error('Final error handler signout failed:', e);
                      }
                    }
                  }
                ]
              );
            }
          },
        },
      ]
    );
  }, [router]);

  // Get subscription state and actions from the store
  const { 
    isProMember,
    presentPaywall,
    getCustomerInfo,
  } = useSubscriptionStore();

  // Handle subscription button press using the store action
  const handleSubscriptionPress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await presentPaywall();
  }, [presentPaywall]);
  
  // Handle promo code redemption
  const handlePromoCodePress = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      
      // Track analytics event
      analytics.logEvent("Settings_Tapped_PromoCode");
      
      // Present the code redemption sheet
      await Purchases.presentCodeRedemptionSheet();
      
      // Refresh customer info after redemption
      await getCustomerInfo();
    } catch (error) {
      console.error('Error presenting promo code sheet:', error);
      Alert.alert(
        'Error',
        'Unable to open the redemption screen. Please try again later.'
      );
    }
  }, [getCustomerInfo]);

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

          {/* Sheet Content - Wrapped in ScrollView */}
          <ScrollView 
            style={styles.settingsContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
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
              <Text style={styles.settingsSectionTitle}>Notifications</Text>
              
              {/* Toggle for enabling/disabling notifications */}
              <TouchableOpacity 
                style={styles.translationSelector}
                onPress={() => animateToggle(!notificationsEnabled)}
                activeOpacity={0.7}
              >
                <Text style={styles.translationText}>
                  {notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
                </Text>
                <View style={[
                  styles.toggleButton,
                  notificationsEnabled ? styles.toggleButtonActive : {}
                ]}>
                  <Animated.View 
                    style={[
                      styles.toggleKnob, 
                      notificationsEnabled ? styles.toggleKnobActive : {},
                      {
                        transform: [
                          { translateX: notificationsEnabled ? 20 : 0 }
                        ]
                      }
                    ]} 
                  />
                </View>
              </TouchableOpacity>
              
              {notificationsEnabled && (
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
              {notificationsEnabled && (
                <Animated.View 
                  style={[
                    styles.timePickerContainer,
                    timePickerAnimatedStyle,
                    showTimePicker ? null : { height: 0, opacity: 0, overflow: 'hidden' }
                  ]}
                >
                  <View style={styles.timePickerWrapper}>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      onChange={(event, date) => date && setSelectedTime(date)}
                      style={styles.timePicker}
                      accentColor="#3C584A"
                      themeVariant="light"
                    />
                  </View>
                  
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
     
              
            {/* Join Discord */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Community</Text>
              <TouchableOpacity 
                style={styles.discordButton}
                onPress={handleOpenDiscord}
              >
                <View style={styles.discordButtonContent}>
                  <FontAwesome6 name="discord" size={20} color="#5865F2" />
                  <Text style={styles.discordButtonText}>Join the Shepherd Family!</Text>
                </View>
                <Feather name="external-link" size={18} color="#3C584A" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            {/* Subscription Section */}
            <View className="mb-6">
              <Text className="font-feather text-xl text-[#5D5531] mb-2">Subscription</Text>
              <View className="bg-white rounded-xl p-4 shadow-sm mb-2">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 mr-4">
                    <Text className="font-feather text-base text-textPrimary">
                      {isProMember ? 'Super Shepherd (Active)' : 'Upgrade to Super Shepherd'}
                    </Text>
                    <Text className="font-din text-description mt-1">
                      {isProMember 
                        ? 'Thank you for supporting our mission!' 
                        : 'Unlock premium features and support our mission'}
                    </Text>
                  </View>
                  {!isProMember && (
                    <TouchableOpacity
                      onPress={handleSubscriptionPress}
                      className="bg-[#FFE07D] px-4 py-2 rounded-lg">
                      <Text className="font-feather text-textPrimary">Upgrade</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Promo Code Button */}
              <TouchableOpacity
                onPress={handlePromoCodePress}
                className="bg-white rounded-xl p-4 shadow-sm flex-row justify-between items-center">
                <View>
                  <Text className="font-feather text-base text-textPrimary">Redeem Promo Code</Text>
                  <Text className="font-din text-description mt-1">
                    Enter a promotional code to unlock premium features
                  </Text>
                </View>
                <Feather name="tag" size={20} color="#B89B4C" />
              </TouchableOpacity>
            </View>
            
            {/* User ID Section - Moved to bottom */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>User ID</Text>
              <TouchableOpacity 
                onPress={handleCopyUserId}
                style={styles.userIdContainer}
              >
                <Text style={styles.userIdText} numberOfLines={1} ellipsizeMode="tail">{userId}</Text>
                <View style={styles.copyButton}>
                  <Feather name="copy" size={16} color="#3C584A" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Sign Out Button - Only show if user is signed in */}
            {isUserSignedIn && (
              <>
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.signOutButton}
                >
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
                
                {/* Delete Account Button */}
                <TouchableOpacity
                  onPress={handleDeleteAccount}
                  style={styles.deleteAccountButton}
                >
                  <Text style={styles.deleteAccountText}>Delete Account</Text>
                </TouchableOpacity>
              </>
            )}
            
            {/* Add some bottom padding for better scrolling */}
            <View style={{height: 20}} />
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>

      {/* Translation Selection Modal */}
      <Modal
        visible={translationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelTranslation}
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
              onPress={handleCancelTranslation}
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
  deleteAccountButton: {
    backgroundColor: 'rgba(223, 69, 51, 0.2)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DF4533',
    marginBottom: 20,
  },
  deleteAccountText: {
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
    marginVertical: 12,
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
    marginTop: 24,
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
    padding: 8,
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
  timePickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4A8',
    paddingVertical: 8,
  },
  discordButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5865F2',
  },
  discordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discordButtonText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
    marginLeft: 10,
  },
  promoCodeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 181, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F7B500',
  },
  promoCodeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoCodeButtonText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
    marginLeft: 10,
  },
});

export default SettingsSheet; 