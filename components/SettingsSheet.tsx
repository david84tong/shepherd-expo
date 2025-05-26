import React, { useCallback, useState, useRef, useImperativeHandle, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  Linking,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
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
import { useNotificationStore, NOTIFICATION_IDS } from '../app/stores/notificationStore';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import analytics from '../utils/analytics';
import Purchases from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import useSubscriptionStore from '../app/stores/subscriptionStore';
import {
  useStreakManager,
  checkStreakAndApplyPenalties,
  getDateFromTimestamp,
} from '../app/hooks/streakHook';
import * as Application from 'expo-application';
import { useOnboardingStore } from '../app/stores/onboardingStore';
import { saveFeedback } from '../utils/firestore';

import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
  useSharedValue,
  interpolate,
  withSequence,
} from 'react-native-reanimated';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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
  const [isUserSignedIn, setIsUserSignedIn] = useState<boolean>(false);
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);
  const [translationModalVisible, setTranslationModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  // Get user store data
  const notificationTime = useUserStore((state) => state.notificationTime);
  const setNotificationTime = useUserStore((state) => state.setNotificationTime);
  const frequencyGoal = useUserStore((state) => state.frequencyGoal);
  const setFrequencyGoal = useUserStore((state) => state.setFrequencyGoal);

  // Get notification store data
  const notificationsEnabled = useNotificationStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useNotificationStore((state) => state.setNotificationsEnabled);
  const scheduleStreakReminders = useNotificationStore((state) => state.scheduleStreakReminders);
  const cancelStreakNotifications = useNotificationStore(
    (state) => state.cancelStreakNotifications
  );
  const scheduleDailyReminder = useNotificationStore((state) => state.scheduleDailyReminder);
  const cancelDailyReminder = useNotificationStore((state) => state.cancelDailyReminder);

  // State for the time picker
  const [selectedTime, setSelectedTime] = useState(new Date());

  // States for the referral code and modal
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  // States for cancellation flow
  const [cancellationModalVisible, setCancellationModalVisible] = useState(false);
  const [cancellationReasons, setCancellationReasons] = useState<string[]>([]);
  const [cancellationFeedback, setCancellationFeedback] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  // Add state for daily cancellation tracking
  const [hasCancelledToday, setHasCancelledToday] = useState(false);

  // Add state for reading time modal
  const [readingTimeModalVisible, setReadingTimeModalVisible] = useState(false);
  const [selectedReadingTime, setSelectedReadingTime] = useState<string>(frequencyGoal || '6-10');

  // Animation shared values
  const timePickerHeight = useSharedValue(0);
  const toggleScale = useSharedValue(1);

  // Initialize selectedTime based on notificationTime on mount
  useEffect(() => {
    if (!notificationTime || notificationTime === 'none') {
      // Set to a default time
      const date = new Date();
      date.setHours(19); // Default to 7 PM
      date.setMinutes(0);
      setSelectedTime(date);
      return;
    }

    // For custom time format "HH:MM"
    if (notificationTime.includes(':')) {
      const [hours, minutes] = notificationTime.split(':').map((part) => parseInt(part, 10));
      const date = new Date();
      date.setHours(hours);
      date.setMinutes(minutes);
      setSelectedTime(date);
      return;
    }

    // For preset times (morning, afternoon, evening, night)
    const presetTimes = {
      morning: 8,
      afternoon: 14,
      evening: 19,
      night: 21,
    };

    const hour = presetTimes[notificationTime as keyof typeof presetTimes] || 19;
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(0);
    setSelectedTime(date);
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
      console.log('Error checking notification permissions:', error);
    }
  };

  // Get path store functions
  const savedTranslation = usePathStore((state) => state.savedTranslation);
  const setSavedTranslation = usePathStore((state) => state.setSavedTranslation);

  // Available translations
  const translations = [
    { id: 'WEB', name: 'World English Bible (WEB)' },
    { id: 'KJV', name: 'King James Version (KJV)' },
    { id: 'NIV', name: 'New International Version (NIV)' },
    { id: 'ESV', name: 'English Standard Version (ESV)' },
    { id: 'ICB', name: "International Children's Bible (ICB)" },
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
    analytics.logEvent('Settings_Tapped_SignOut', {
      userId: userId,
    });
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Check if we're on Android and if the user is not signed in with Google
      const currentUser = auth().currentUser;
      const isAnonymous = currentUser?.isAnonymous;

      // Proceed with sign out
      await auth().signOut();

      // Only revoke Google access on Android
      if (Platform.OS === 'android' && !isAnonymous) {
        await GoogleSignin.revokeAccess?.();
      }

      useUserStore.getState().resetUserStore();
      bottomSheetRef.current?.close();
      setIsModalDimActive(false);
      router.replace({ pathname: '/(auth)' });
    } catch (error) {
      console.log('Error signing out:', error);
    }
  }, [router, setIsModalDimActive, userId]);

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
    let isUserSignedIn = false;

    // First try to get the current Firebase user's UID
    const currentUser = auth().currentUser;
    if (currentUser?.uid) {
      currentUserId = currentUser.uid;
      isUserSignedIn = true;
    } else {
      // Fallback to userStore
      const user = useUserStore.getState().getUser?.();
      currentUserId = user?.id || 'Not authenticated';
      isUserSignedIn = !!user?.id;
    }

    setUserId(currentUserId);
    setIsUserSignedIn(isUserSignedIn);

    // Show the sheet at the first snap point (60%)
    bottomSheetRef.current?.snapToIndex(0);
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

  // Handle translation selection
  const handleTranslationChange = useCallback(
    (translation: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setSavedTranslation(translation);
      setTranslationModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      analytics.logEvent('Settings_Tapped_TranslationChange', {
        translation: translation,
      });
    },
    [setSavedTranslation]
  );

  // Function to get display text for notification time
  const getNotificationTimeDisplay = useCallback(() => {
    if (!notificationTime || notificationTime === 'none') {
      return 'No notifications';
    }

    // For custom time format "HH:MM"
    if (notificationTime.includes(':')) {
      const [hours, minutes] = notificationTime.split(':').map((part) => parseInt(part, 10));
      const time = new Date();
      time.setHours(hours);
      time.setMinutes(minutes);
      return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    // For preset times
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
                  analytics.logEvent('Settings_Opened_SystemSettings_Notifications');
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
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
          easing: Easing.out(Easing.cubic),
        });
        setTimeout(() => {
          setShowTimePicker(false);
        }, 200);
      }
    }
  };

  // Toggle time picker visibility
  const toggleTimePicker = () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Animate the scale of the selector button
    toggleScale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 100, easing: Easing.inOut(Easing.quad) })
    );

    if (Platform.OS === 'android') {
      setShowAndroidPicker(true);
    } else {
      // iOS behavior
      const newPickerState = !showTimePicker;
      setShowTimePicker(newPickerState);

      setTimeout(() => {
        timePickerHeight.value = withTiming(newPickerState ? 230 : 0, {
          duration: 300,
          easing: Easing.bezierFn(0.25, 1, 0.5, 1),
        });
      }, 10);
    }
  };

  // Generate animated styles
  const timePickerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: timePickerHeight.value,
      opacity: interpolate(timePickerHeight.value, [0, 50, 230], [0, 0.5, 1]),
      transform: [
        {
          scale: interpolate(timePickerHeight.value, [0, 230], [0.95, 1]),
        },
      ],
    };
  });

  const selectorButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: toggleScale.value }],
    };
  });

  // Handle time selection and close picker
  const handleTimeConfirm = async (event?: any, selectedDate?: Date) => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // For Android, we need to handle the selected date from the event
    const finalSelectedTime = Platform.OS === 'android' ? selectedDate : selectedTime;

    if (finalSelectedTime) {
      const hours = finalSelectedTime.getHours();
      const minutes = finalSelectedTime.getMinutes();

      // Format as "HH:MM"
      const timeString = `${hours?.toString().padStart(2, '0')}:${minutes?.toString().padStart(2, '0')}`;

      try {
        // Update stores and schedule notifications
        await setNotificationTime(timeString);
        await cancelDailyReminder();

        // 3. Schedule notification for the exact time
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Time to talk with the Shepherd',
            body: 'Take a moment to read scripture and connect with God.',
            sound: true,
            data: { type: 'daily-reminder' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
          },
          identifier: NOTIFICATION_IDS.DAILY_REMINDER,
        });

        // 4. Update the notification store with custom time
        const notificationStore = useNotificationStore.getState();
        notificationStore.setPreferredNotificationTime('custom');
        await notificationStore.scheduleDailyReminder('custom');

        // 5. Update the onboarding store
        const onboardingStore = useOnboardingStore.getState();
        await onboardingStore.setNotificationPreference({
          enabled: true,
          time: timeString,
        });

        // 6. Ensure the notification is enabled in all stores
        setNotificationsEnabled(true);

        // 7. Log the time selection for analytics
        analytics.logEvent('Settings_Changed_NotificationTime', {
          time: timeString,
          isCustomTime: true,
        });

        // 8. Verify the notification was scheduled
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const dailyReminder = scheduledNotifications.find(
          (n) => n.identifier === NOTIFICATION_IDS.DAILY_REMINDER
        );

        if (!dailyReminder) {
          console.log('Daily reminder was not scheduled properly');
          throw new Error('Failed to schedule notification');
        }

        // 9. Force sync with Firestore
        const userStore = useUserStore.getState();
        if (userStore.getUser?.()) {
          await userStore.syncWithFirestore();
        }

        if (Platform.OS === 'android') {
          setShowAndroidPicker(false);
        } else {
          // Animate picker closing for iOS
          timePickerHeight.value = withTiming(0, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
          setTimeout(() => {
            setShowTimePicker(false);
          }, 200);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (error) {
        console.log('Failed to update notification time:', error);
        Alert.alert('Error', 'Failed to update notification time. Please try again.');
      }
    }
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
    Linking.openURL('https://discord.gg/W9MZdVaKBs').catch((err) => {
      console.log('Error opening Discord link:', err);
      Alert.alert('Could not open link', 'Please check your internet connection and try again.');
    });
  }, []);

  // Open roadmap link
  const handleOpenRoadmap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Linking.openURL('https://shepherd.nolt.io/roadmap').catch((err) => {
      console.error('Error opening roadmap link:', err);
      Alert.alert('Could not open link', 'Please check your internet connection and try again.');
    });
  }, []);

  // Delete account and related data
  const handleDeleteAccount = useCallback(() => {
    analytics.logEvent('Settings_Tapped_DeleteAccount', {
      userId: userId,
      email: auth().currentUser?.email,
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
                console.log('❌ Error deleting Firestore document:', firestoreError);
                Alert.alert(
                  'Firestore Error',
                  'Failed to delete Firestore data. Continuing with other deletion steps.'
                );
              }

              try {
                // Clear AsyncStorage
                await AsyncStorage.clear();
                console.log('✅ Local storage cleared successfully');
              } catch (storageError) {
                console.log('❌ Error clearing AsyncStorage:', storageError);
                Alert.alert(
                  'Storage Error',
                  'Failed to clear local storage. Continuing with other deletion steps.'
                );
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
                console.log('❌ Error with auth operations:', authError);

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
                            router.replace({ pathname: '/(auth)' });
                          } catch (e) {
                            console.log('Failed to sign out:', e);
                          }
                        },
                      },
                      { text: 'No', style: 'cancel' },
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
                      router.replace({ pathname: '/(auth)' });
                    },
                  },
                ]
              );
            } catch (error) {
              console.log('❌ Unhandled error in account deletion:', error);
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
                        router.replace({ pathname: '/(auth)' });
                      } catch (e) {
                        console.log('Final error handler signout failed:', e);
                      }
                    },
                  },
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
    handleReferralCode,
    isProMember,
    presentPaywall,
    getCustomerInfo,
    getUsedReferralCodes,
    presentHalfOffPaywall,
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
      analytics.logEvent('Settings_Tapped_PromoCode');

      // Present the code redemption sheet
      await Purchases.presentCodeRedemptionSheet();

      // Refresh customer info after redemption
      await getCustomerInfo();
    } catch (error) {
      console.log('Error presenting promo code sheet:', error);
      Alert.alert('Error', 'Unable to open the redemption screen. Please try again later.');
    }
  }, [getCustomerInfo]);

  // Add state for developer panel
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [devPanelExpanded, setDevPanelExpanded] = useState(true);
  const [streakData, setStreakData] = useState<any>(null);
  const [devPanelLoading, setDevPanelLoading] = useState(false);

  // Get streak manager
  const { checkStreakAndApplyPenalties: checkStreak } = useStreakManager();

  // Get user data
  const userData = useUserStore((state) => ({
    lambHearts: state.lamb?.hearts || 0,
    lambMood: state.lamb?.mood || 'lamb-idle',
    streakCount: state.streakCount || 0,
    lastActivityDate: state.lastActivityDate,
    lastReadingDate: state.lastReadingDate,
    lastPrayerDate: state.lastPrayerDate,
    lastReflectionDate: state.lastReflectionDate,
    lastReadingPenaltyDate: state.lastReadingPenaltyDate,
    lastPrayerPenaltyDate: state.lastPrayerPenaltyDate,
    lastReflectionPenaltyDate: state.lastReflectionPenaltyDate,
  }));

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = getDateFromTimestamp(timestamp);
    if (!date) return 'Invalid';
    return date.toLocaleString();
  };

  // Toggle developer panel
  const toggleDevPanel = useCallback(() => {
    const newState = !showDevPanel;
    setShowDevPanel(newState);

    // Check for streak data when panel is opened
    if (newState) {
      refreshStreakData();
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [showDevPanel]);

  // Refresh streak data
  const refreshStreakData = useCallback(async () => {
    setDevPanelLoading(true);
    try {
      // Direct call to check streak and apply penalties
      const result = await checkStreakAndApplyPenalties();
      setStreakData(result);
    } catch (error) {
      console.log('Error fetching streak data:', error);
      Alert.alert('Error', 'Failed to fetch streak data');
    } finally {
      setDevPanelLoading(false);
    }
  }, []);

  // Toggle expand/collapse of developer panel
  const toggleDevPanelExpanded = useCallback(() => {
    setDevPanelExpanded(!devPanelExpanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [devPanelExpanded]);

  // Function to get display text for reading time
  const getReadingTimeDisplay = useCallback(() => {
    switch (frequencyGoal) {
      case '1-5':
        return '1-5 mins (1 chapter)';
      case '6-10':
        return '6-10 mins (3-4 chapters)';
      case '15-25':
      case '11-15': // Handle both possible values
        return '11-15 mins (6-8 chapters)';
      default:
        return '5-10 mins';
    }
  }, [frequencyGoal]);

  // Handle navigation to reading time selection
  const handleEditReadingTime = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedReadingTime(frequencyGoal || '6-10');
    setReadingTimeModalVisible(true);
    analytics.logEvent('Settings_Tapped_EditReadingTime');
  }, [frequencyGoal]);

  // Get app version and build number for developer panel
  const appVersion = Application.nativeApplicationVersion || 'Unknown';
  const buildNumber = Application.nativeBuildVersion || 'Unknown';

  // Open referral modal and clear input
  const handleOpenReferralModal = useCallback(() => {
    setReferralInput('');
    setReferralModalVisible(true);
  }, []);

  // Handle referral code submission
  const handleReferralSubmit = async (selectedCode: string) => {
    setIsSubmittingReferral(true);
    try {
      await handleReferralCode(selectedCode);
      Alert.alert('Success!', 'Referral code applied successfully', [
        { text: 'OK', onPress: () => setReferralModalVisible(false) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to apply referral code');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  // Handle reading time selection
  const handleReadingTimeSelection = useCallback(
    async (duration: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        // Update user store
        setFrequencyGoal(duration);

        // Update in Firestore directly
        const user = auth().currentUser;
        if (user) {
          await firestore().collection('users').doc(user.uid).update({
            frequencyGoal: duration,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
          console.log('Updated frequency goal in Firestore');
        }

        // Close modal
        setReadingTimeModalVisible(false);

        // Success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Log analytics
        analytics.logEvent('Settings_Changed_ReadingTime', {
          newDuration: duration,
          fromSettings: true,
        });
      } catch (error) {
        console.error('Error updating reading time:', error);
        Alert.alert('Error', 'Failed to update reading time. Please try again.');
      }
    },
    [setFrequencyGoal]
  );

  // Check if user has already cancelled today on mount
  useEffect(() => {
    const checkDailyCancellation = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
        const dailyCancelKey = `cancellation_used_${today}`;
        const cancelledToday = await AsyncStorage.getItem(dailyCancelKey);
        setHasCancelledToday(cancelledToday === 'true');
        console.log(
          `[SettingsSheet] User cancelled today (${today}): ${cancelledToday === 'true'}`
        );
      } catch (error) {
        console.error('[SettingsSheet] Error checking daily cancellation:', error);
        setHasCancelledToday(false);
      }
    };
    checkDailyCancellation();
  }, []);

  // Handle cancellation modal open
  const handleOpenCancellationModal = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Check if user has already cancelled today
    if (hasCancelledToday) {
      console.log('🚫 User already cancelled today, redirecting to Apple subscriptions');
      analytics.logEvent('Settings_CancellationBlocked_DailyLimit', {
        userId: userId,
      });

      Alert.alert(
        'Already Submitted Today',
        'Apple handles all subscription management, so please contact them',
        [
          {
            text: 'Go to Apple Account',
            onPress: () => {
              Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {
                Alert.alert(
                  'Error',
                  'Could not open Apple subscriptions. Please go to Settings > Apple ID > Subscriptions manually.'
                );
              });
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    setCancellationReasons([]);
    setCancellationFeedback('');
    setCancellationModalVisible(true);
    analytics.logEvent('Settings_Opened_CancellationFlow');
  }, [hasCancelledToday, userId]);

  // Handle cancellation reason toggle
  const toggleCancellationReason = useCallback((reason: string) => {
    setCancellationReasons((prev) => {
      if (prev.includes(reason)) {
        return prev.filter((r) => r !== reason);
      } else {
        return [...prev, reason];
      }
    });
  }, []);

  // Handle cancellation submission
  const handleSubmitCancellation = useCallback(async () => {
    console.log('🔄 Starting cancellation submission...');
    console.log('📝 Cancellation reasons:', cancellationReasons);
    console.log('💬 Cancellation feedback:', cancellationFeedback);
    console.log('👤 User ID:', userId);

    if (cancellationReasons.length === 0) {
      Alert.alert('Please select a reason', 'Please select at least one reason for cancelling.');
      return;
    }

    setIsSubmittingCancellation(true);

    try {
      console.log('💾 Attempting to save feedback to Firestore...');
      // Save feedback to Firestore
      const result = await saveFeedback({
        type: 'cancellation',
        reasons: cancellationReasons,
        feedback: cancellationFeedback,
        userId: userId,
        timestamp: new Date().toISOString(),
      });

      console.log('✅ Feedback save result:', result);

      // Mark that user has cancelled today
      const today = new Date().toISOString().split('T')[0];
      const dailyCancelKey = `cancellation_used_${today}`;
      await AsyncStorage.setItem(dailyCancelKey, 'true');
      setHasCancelledToday(true);
      console.log(`✅ Marked cancellation as used for today: ${today}`);

      // Log analytics
      console.log('📊 Logging analytics event...');
      analytics.logEvent('Settings_Submitted_CancellationFeedback', {
        reasons: cancellationReasons,
        hasFeedback: cancellationFeedback.length > 0,
        userId: userId,
        reasonCount: cancellationReasons.length,
        feedbackLength: cancellationFeedback.length,
        // Individual reason flags for easier filtering
      });

      // Log individual events for each reason selected
      cancellationReasons.forEach((reason) => {
        analytics.logEvent('Settings_CancellationReason_Selected', {
          reason: reason,
          userId: userId,
          totalReasonsSelected: cancellationReasons.length,
        });
      });

      // Close modal
      setCancellationModalVisible(false);

      // Show half-off paywall before they leave
      console.log('🎯 Showing half-off paywall...');
      const paywallResult = await presentHalfOffPaywall();

      if (paywallResult === PAYWALL_RESULT.CANCELLED || paywallResult === PAYWALL_RESULT.ERROR) {
        console.log('💔 User cancelled paywall, redirecting to Apple subscriptions...');
      } else if (
        paywallResult === PAYWALL_RESULT.PURCHASED ||
        paywallResult === PAYWALL_RESULT.RESTORED
      ) {
        console.log('🎉 User purchased or restored subscription!');
        // They successfully subscribed, no need to redirect to Apple
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      console.error('❌ Error submitting cancellation feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingCancellation(false);
      console.log('🏁 Cancellation submission completed');
    }
  }, [cancellationReasons, cancellationFeedback, userId, presentHalfOffPaywall]);

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
        backdropComponent={renderBackdrop}>
        <BottomSheetScrollView
          style={styles.settingsContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={styles.settingsContentContainer}>
          {/* Header */}
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <TouchableOpacity onPress={handleClose} style={{ padding: 5 }}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Sheet Content */}
          <View style={styles.settingsContent}>
            {/* Bible Translation Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Bible Translation</Text>
              <TouchableOpacity
                style={styles.translationSelector}
                onPress={() => setTranslationModalVisible(true)}>
                <Text style={styles.translationText}>
                  {translations.find((t) => t.id === savedTranslation)?.name ||
                    'English Standard Version (ESV)'}
                </Text>
                <Feather name="chevron-right" size={18} color="#3C584A" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Daily Reading Time Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Daily Reading Time</Text>
              <TouchableOpacity style={styles.translationSelector} onPress={handleEditReadingTime}>
                <Text style={styles.translationText}>{getReadingTimeDisplay()}</Text>
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
                activeOpacity={0.7}>
                <Text style={styles.translationText}>
                  {notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
                </Text>
                <View
                  style={[
                    styles.toggleButton,
                    notificationsEnabled ? styles.toggleButtonActive : {},
                  ]}>
                  <Animated.View
                    style={[
                      styles.toggleKnob,
                      notificationsEnabled ? styles.toggleKnobActive : {},
                      {
                        transform: [{ translateX: notificationsEnabled ? 20 : 0 }],
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {notificationsEnabled && (
                <Animated.View style={selectorButtonStyle}>
                  <TouchableOpacity
                    style={[styles.timeSelector, showTimePicker && styles.timeSelectorActive]}
                    onPress={toggleTimePicker}>
                    <Text style={styles.timeSelectorText}>{getNotificationTimeDisplay()}</Text>
                    <Feather
                      name={showTimePicker ? 'chevron-up' : 'clock'}
                      size={18}
                      color="#3C584A"
                    />
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Time Picker Section */}
              {notificationsEnabled && Platform.OS === 'ios' && (
                <Animated.View
                  style={[
                    styles.timePickerContainer,
                    timePickerAnimatedStyle,
                    showTimePicker ? null : { height: 0, opacity: 0, overflow: 'hidden' },
                  ]}>
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

                  <TouchableOpacity style={styles.donePickingButton} onPress={handleTimeConfirm}>
                    <Text style={styles.donePickingText}>Done</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Android Time Picker */}
              {Platform.OS === 'android' && showAndroidPicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={(event, date) => {
                    setShowAndroidPicker(false);
                    if (event.type !== 'dismissed' && date) {
                      handleTimeConfirm(event, date);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.divider} />

            {/* Join Discord */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Community</Text>
              <TouchableOpacity style={styles.discordButton} onPress={handleOpenDiscord}>
                <View style={styles.discordButtonContent}>
                  <FontAwesome6 name="discord" size={20} color="#5865F2" />
                  <Text style={styles.discordButtonText}>Join the Shepherd Family!</Text>
                </View>
                <Feather name="external-link" size={18} color="#3C584A" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.roadmapButton} onPress={handleOpenRoadmap}>
                <View style={styles.roadmapButtonContent}>
                  <Feather name="map" size={20} color="#22C55E" />
                  <Text style={styles.roadmapButtonText}>Roadmap & Feature Requests</Text>
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
                  {isProMember ? (
                    <TouchableOpacity
                      onPress={handleOpenCancellationModal}
                      className="bg-red/10 px-4 py-2 rounded-lg border border-red">
                      <Text className="font-feather text-red">Cancel</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handleSubscriptionPress}
                      className="bg-[#FFE07D] px-4 py-2 rounded-lg">
                      <Text className="font-feather text-textPrimary">Upgrade</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Promo Code Button */}

              {/* Referral Code Button */}
              <TouchableOpacity
                onPress={handleOpenReferralModal}
                className="bg-white rounded-xl p-4 mt-2 shadow-sm flex-row justify-between items-center">
                <View>
                  <Text className="font-feather text-base text-textPrimary">Referral Code</Text>
                  <Text className="font-din text-description mt-1">
                    Enter a referral code to unlock special features
                  </Text>
                </View>
                <Feather name="gift" size={20} color="#B89B4C" />
              </TouchableOpacity>
            </View>

            {/* User ID Section - Moved to bottom */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>User ID</Text>
              <TouchableOpacity onPress={handleCopyUserId} style={styles.userIdContainer}>
                <Text style={styles.userIdText} numberOfLines={1} ellipsizeMode="tail">
                  {userId}
                </Text>
                <View style={styles.copyButton}>
                  <Feather name="copy" size={16} color="#3C584A" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Sign Out Button - Only show if user is signed in */}
            {isUserSignedIn && (
              <>
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteAccountButton}>
                  <Text style={styles.deleteAccountText}>Delete Account</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Developer Panel Toggle */}
            <TouchableOpacity onPress={toggleDevPanel} style={styles.developerToggleButton}>
              <Text style={styles.developerToggleText}>
                {showDevPanel ? 'Hide Developer Panel' : 'Show Developer Panel'}
              </Text>
            </TouchableOpacity>

            {/* Developer Panel */}
            {showDevPanel && (
              <View style={styles.developerPanel}>
                <View style={styles.developerPanelHeader}>
                  <Text style={styles.developerPanelTitle}>Developer Panel</Text>
                  {devPanelLoading ? (
                    <ActivityIndicator size="small" color="#3C584A" />
                  ) : (
                    <TouchableOpacity
                      onPress={refreshStreakData}
                      style={styles.refreshButton}
                      disabled={devPanelLoading}>
                      <Feather name="refresh-cw" size={16} color="#3C584A" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* App Version Info Section */}
                <View style={styles.developerPanelSection}>
                  <Text style={styles.developerPanelSectionTitle}>App Information</Text>
                  <View style={styles.developerDataRow}>
                    <Text style={styles.developerDataLabel}>Version:</Text>
                    <Text style={styles.developerDataValue}>{appVersion}</Text>
                  </View>
                  <View style={styles.developerDataRow}>
                    <Text style={styles.developerDataLabel}>Build:</Text>
                    <Text style={styles.developerDataValue}>{buildNumber}</Text>
                  </View>
                </View>

                {/* Basic Data */}
                <View style={styles.developerPanelSection}>
                  <Text style={styles.developerPanelSectionTitle}>Streak Data</Text>
                  <View style={styles.developerDataRow}>
                    <Text style={styles.developerDataLabel}>Streak Count:</Text>
                    <Text style={styles.developerDataValue}>{userData.streakCount}</Text>
                  </View>
                  <View style={styles.developerDataRow}>
                    <Text style={styles.developerDataLabel}>Lamb Hearts:</Text>
                    <Text style={styles.developerDataValue}>{userData.lambHearts}</Text>
                  </View>
                  <View style={styles.developerDataRow}>
                    <Text style={styles.developerDataLabel}>Lamb Mood:</Text>
                    <Text style={styles.developerDataValue}>{userData.lambMood}</Text>
                  </View>
                </View>

                {/* Expandable Details Section */}
                <TouchableOpacity
                  onPress={toggleDevPanelExpanded}
                  style={styles.developerPanelExpandButton}>
                  <Text style={styles.developerExpandText}>
                    {devPanelExpanded ? 'Hide Details' : 'Show Details'}
                  </Text>
                  <Feather
                    name={devPanelExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#3C584A"
                  />
                </TouchableOpacity>

                {/* Streak Data Section (Toggle Expanded) */}
                {devPanelExpanded && (
                  <>
                    {/* Last Activity Dates */}
                    <View style={styles.developerPanelSection}>
                      <Text style={styles.developerPanelSectionTitle}>Last Activity Dates</Text>
                      <View style={styles.developerDataRow}>
                        <Text style={styles.developerDataLabel}>Last Activity:</Text>
                        <Text style={styles.developerDataValue}>
                          {formatDate(userData.lastActivityDate)}
                        </Text>
                      </View>
                      <View style={styles.developerDataRow}>
                        <Text style={styles.developerDataLabel}>Last Reading:</Text>
                        <Text style={styles.developerDataValue}>
                          {formatDate(userData.lastReadingDate)}
                        </Text>
                      </View>
                      <View style={styles.developerDataRow}>
                        <Text style={styles.developerDataLabel}>Last Prayer:</Text>
                        <Text style={styles.developerDataValue}>
                          {formatDate(userData.lastPrayerDate)}
                        </Text>
                      </View>
                      <View style={styles.developerDataRow}>
                        <Text style={styles.developerDataLabel}>Last Reflection:</Text>
                        <Text style={styles.developerDataValue}>
                          {formatDate(userData.lastReflectionDate)}
                        </Text>
                      </View>
                    </View>

                    {/* Last Penalty Dates */}
                    <View style={styles.developerPanelSection}>
                      <Text style={styles.developerPanelSectionTitle}>Last Penalty Dates</Text>
                      <View style={styles.developerDataRow}>
                        <Text style={styles.developerDataLabel}>Reading Penalty:</Text>
                        <Text style={styles.developerDataValue}>
                          {formatDate(userData.lastReadingPenaltyDate)}
                        </Text>
                      </View>
                      <View style={styles.developerDataRow}>
                        <Text style={styles.developerDataLabel}>Prayer Penalty:</Text>
                        <Text style={styles.developerDataValue}>
                          {formatDate(userData.lastPrayerPenaltyDate)}
                        </Text>
                      </View>
                      <View style={styles.developerDataRow}>
                        <Text style={styles.developerDataLabel}>Reflection Penalty:</Text>
                        <Text style={styles.developerDataValue}>
                          {formatDate(userData.lastReflectionPenaltyDate)}
                        </Text>
                      </View>
                    </View>

                    {/* Streak Check Results */}
                    {streakData && (
                      <View style={styles.developerPanelSection}>
                        <Text style={styles.developerPanelSectionTitle}>
                          Last Streak Check Results
                        </Text>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>Streak Broken:</Text>
                          <Text style={styles.developerDataValue}>
                            {streakData.streakBroken ? 'Yes' : 'No'}
                          </Text>
                        </View>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>Heart Penalty:</Text>
                          <Text style={styles.developerDataValue}>
                            {streakData.heartPenalty || 0}
                          </Text>
                        </View>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>Days Missed:</Text>
                          <Text style={styles.developerDataValue}>
                            {streakData.daysMissed || 0}
                          </Text>
                        </View>
                        <View style={styles.developerDataRow}>
                          <Text style={styles.developerDataLabel}>New Day:</Text>
                          <Text style={styles.developerDataValue}>
                            {streakData.newDay ? 'Yes' : 'No'}
                          </Text>
                        </View>
                        {streakData.error && (
                          <View style={styles.developerDataRow}>
                            <Text style={styles.developerDataLabel}>Error:</Text>
                            <Text style={[styles.developerDataValue, { color: 'red' }]}>
                              {String(streakData.error)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}

                {/* Force Streak Check Button */}
                <TouchableOpacity
                  onPress={refreshStreakData}
                  style={styles.forceCheckButton}
                  disabled={devPanelLoading}>
                  <Text style={styles.forceCheckButtonText}>
                    {devPanelLoading ? 'Checking...' : 'Force Streak Check'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Extra padding at bottom */}
            <View style={{ height: 40 }} />
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Translation Selection Modal */}
      <Modal
        visible={translationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelTranslation}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Bible Translation</Text>

            <ScrollView style={styles.translationScrollView} showsVerticalScrollIndicator={false}>
              {translations.map((translation) => (
                <TouchableOpacity
                  key={translation.id}
                  style={[
                    styles.translationOption,
                    savedTranslation === translation.id && styles.selectedTranslation,
                  ]}
                  onPress={() => handleTranslationChange(translation.id)}>
                  <Text
                    style={[
                      styles.translationOptionText,
                      savedTranslation === translation.id && styles.selectedTranslationText,
                    ]}>
                    {translation.name}
                  </Text>
                  {savedTranslation === translation.id && (
                    <Feather name="check" size={18} color="#F7B500" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTranslation}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Referral Code Modal*/}
      <Modal
        visible={referralModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReferralModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-surfaceCream rounded-2xl p-5 w-[85%] max-w-[350px]">
            {/* Title */}
            <Text className="font-feather text-xl text-textPrimary text-center mb-4">
              Enter Referral Code
            </Text>

            {/* Input Field */}
            <View className="mb-4">
              <TextInput
                className="bg-white rounded-xl px-4 py-3 text-lg font-din text-textPrimary border border-[#FFE4A8]"
                placeholder="Enter code here"
                placeholderTextColor="#B89B4C"
                value={referralInput || ''}
                onChangeText={setReferralInput}
                autoCapitalize="characters"
                maxLength={6}
                editable={!isSubmittingReferral}
              />
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={() => handleReferralSubmit(referralInput)}
              className={`bg-[#FFE07D] rounded-xl p-4 mb-2 ${referralInput.length !== 6 ? 'opacity-50' : ''}`}
              disabled={referralInput.length !== 6 || isSubmittingReferral}>
              <Text className="font-feather text-textPrimary text-center text-lg">
                {isSubmittingReferral ? 'Submitting...' : 'Confirm'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setReferralModalVisible(false)}
              className="bg-textPrimary/10 rounded-xl p-4">
              <Text className="font-din text-textPrimary text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reading Time Selection Modal */}
      <Modal
        visible={readingTimeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReadingTimeModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-surfaceCream rounded-2xl p-5 w-[85%] max-w-[350px]">
            {/* Title */}
            <Text className="font-feather text-xl text-textPrimary text-center mb-4">
              Daily Reading Time
            </Text>

            {/* Options */}
            <View className="mb-4 space-y-3">
              {[
                { id: '1-5', title: '3-6 mins (1 chapter)' },
                { id: '6-10', title: '7-10 mins (3-4 chapters)' },
                { id: '15-25', title: '11-15 mins (6-8 chapters)' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => {
                    setSelectedReadingTime(option.id);
                    handleReadingTimeSelection(option.id);
                  }}
                  className={`rounded-xl p-4 border-2 ${
                    selectedReadingTime === option.id
                      ? 'bg-[#FFE07D] border-[#F7B500]'
                      : 'bg-white border-[#FFE4A8]'
                  }`}>
                  <Text
                    className={`font-feather text-center ${
                      selectedReadingTime === option.id ? 'text-textPrimary' : 'text-textPrimary'
                    }`}>
                    {option.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setReadingTimeModalVisible(false)}
              className="bg-textPrimary/10 rounded-xl p-4">
              <Text className="font-din text-textPrimary text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        visible={cancellationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancellationModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-surfaceCream rounded-2xl p-5 w-[85%] max-w-[350px]">
            {/* Title */}
            <Text className="font-feather text-xl text-textPrimary text-center mb-4">
              Why are you cancelling?
            </Text>

            {/* Options */}
            <View className="mb-4 space-y-3">
              {[
                'Too expensive',
                'Technical Issues',
                'Missing features',
                'Missing language',
                'Missing Translation',
                'Not rewarding enough',
                'Bible is too boring',
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => toggleCancellationReason(reason)}
                  className={`rounded-xl p-4 border-2 ${
                    cancellationReasons.includes(reason)
                      ? 'bg-[#FFE07D] border-[#F7B500]'
                      : 'bg-white border-[#FFE4A8]'
                  }`}>
                  <Text
                    className={`font-feather text-center ${
                      cancellationReasons.includes(reason) ? 'text-textPrimary' : 'text-textPrimary'
                    }`}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Feedback Input */}
            <View className="mb-4">
              <Text className="font-din text-textPrimary mb-2">
                Please elaborate, we really want to improve 😢
              </Text>
              <TextInput
                className="bg-white rounded-xl px-4 py-3 text-lg font-din text-textPrimary border border-[#FFE4A8] min-h-[120px]"
                placeholder="Your feedback helps us improve..."
                placeholderTextColor="#B89B4C"
                value={cancellationFeedback}
                onChangeText={setCancellationFeedback}
                multiline
                numberOfLines={5}
                editable={!isSubmittingCancellation}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmitCancellation}
              className={`bg-[#FFE07D] rounded-xl p-4 mb-2 ${cancellationReasons.length === 0 ? 'opacity-50' : ''}`}
              disabled={cancellationReasons.length === 0 || isSubmittingCancellation}>
              <Text className="font-feather text-textPrimary text-center text-lg">
                {isSubmittingCancellation ? 'Submitting...' : 'Continue'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setCancellationModalVisible(false)}
              className="bg-textPrimary/10 rounded-xl p-4">
              <Text className="font-din text-textPrimary text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
    width: 40,
  },
  settingsContentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  settingsContent: {
    flex: 1,
    padding: 20,
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
  settingsTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18,
  },
  doneButton: {
    color: '#F7B500',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
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
  userIdContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  userIdText: {
    color: '#3C584A',
    flexShrink: 1,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    marginRight: 10,
  },
  copyButton: {
    padding: 5,
  },
  divider: {
    backgroundColor: '#FFE4A8',
    height: 1,
    marginVertical: 12,
  },
  translationSelector: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  translationText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF4D9',
    borderRadius: 16,
    maxHeight: '90%',
    maxWidth: 350,
    padding: 20,
    width: '85%',
  },
  modalTitle: {
    color: '#3C584A',
    fontFamily: 'Feather Bold',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  translationScrollView: {
    maxHeight: 450,
  },
  translationOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  selectedTranslation: {
    backgroundColor: 'rgba(247, 181, 0, 0.1)',
  },
  translationOptionText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  selectedTranslationText: {
    color: '#3C584A',
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.1)',
    borderRadius: 8,
    marginTop: 12,
    padding: 14,
  },
  cancelButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    padding: 5,
    width: 50,
  },
  toggleButtonActive: {
    backgroundColor: '#F7B500',
  },
  toggleKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 20,
    transform: [{ translateX: 0 }],
    width: 20,
  },
  toggleKnobActive: {
    // Remove transform from here, we'll handle it with Animated
  },
  timeSelector: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 12,
  },
  timeSelectorText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  timePickerContainer: {
    backgroundColor: 'rgba(255, 244, 217, 0.95)',
    borderColor: '#FFE4A8',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    overflow: 'hidden',
  },
  timePicker: {
    height: 180,
    width: '100%',
  },
  donePickingButton: {
    alignItems: 'center',
    backgroundColor: '#F7B500',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 8,
  },
  donePickingText: {
    color: '#FFFFFF',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  timeSelectorActive: {
    backgroundColor: 'rgba(247, 181, 0, 0.15)',
    borderColor: '#F7B500',
  },
  timePickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#FFE4A8',
    borderBottomWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
  },
  discordButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
    borderLeftColor: '#5865F2',
    borderLeftWidth: 4,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  discordButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  discordButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    marginLeft: 10,
  },
  developerToggleButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    borderLeftColor: '#3C584A',
    borderLeftWidth: 4,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 20,
    padding: 12,
  },
  developerToggleText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    fontWeight: '600',
  },
  developerPanel: {
    backgroundColor: 'rgba(60, 88, 74, 0.05)',
    borderRadius: 10,
    marginBottom: 20,
    padding: 15,
  },
  developerPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  developerPanelTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 16,
  },
  refreshButton: {
    padding: 5,
  },
  developerPanelSection: {
    borderBottomColor: 'rgba(60, 88, 74, 0.1)',
    borderBottomWidth: 1,
    marginBottom: 15,
    paddingBottom: 10,
  },
  developerPanelSectionTitle: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  developerDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  developerDataLabel: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 12,
    opacity: 0.8,
  },
  developerDataValue: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 12,
    fontWeight: '600',
  },
  developerPanelExpandButton: {
    alignItems: 'center',
    borderTopColor: 'rgba(60, 88, 74, 0.1)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 8,
  },
  developerExpandText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
  },
  forceCheckButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(247, 181, 0, 0.15)',
    borderRadius: 8,
    marginTop: 10,
    padding: 10,
  },
  forceCheckButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    fontWeight: '600',
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
  deleteAccountButton: {
    backgroundColor: 'rgba(223, 69, 51, 0.2)',
    borderLeftColor: '#DF4533',
    borderLeftWidth: 4,
    borderRadius: 12,
    marginBottom: 20,
    padding: 16,
  },
  deleteAccountText: {
    color: '#DF4533',
    fontFamily: 'Nunito-Black',
    fontSize: 16,
  },
  roadmapButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderLeftColor: '#22C55E',
    borderLeftWidth: 4,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 16,
  },
  roadmapButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  roadmapButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    marginLeft: 10,
  },
});

export default SettingsSheet;
