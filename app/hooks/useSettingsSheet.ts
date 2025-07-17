// hooks/useSettingSheet.ts
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Alert, Linking, Platform, AppState } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Purchases from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import * as Application from 'expo-application';
import { useAnimatedStyle, withTiming, Easing, useSharedValue, withSequence, interpolate } from 'react-native-reanimated';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { syncWithFirestore } from '~/app/helper/firebaseHelper';
import { useHomeStore } from '~/app/stores/homeStore';
import { syncStreakDataToWidget } from '~/utils/widgetSync';
import dayjs from 'dayjs';
import { useLanguageStore } from '~/app/stores/languageStore';
import { hapticLight, hapticMedium, hapticSuccess } from '~/utils/haptics';
import { useUserStore } from '../stores/userStore';
import { useSoundStore } from '../stores/soundStore';
import analytics from '~/utils/analytics';
import { NOTIFICATION_IDS, useNotificationStore } from '../stores/notificationStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import { checkStreakAndApplyPenalties, getDateFromTimestamp, useStreakManager } from './streakHook';
import { saveFeedback } from '~/utils/firestore';
import { useIsFocused } from '@react-navigation/native';
import { useUIStore } from '../stores/uiStore';
import { usePathStore } from '../stores/pathStore';
import { useDevotionalStore } from '../stores/devotionalStore';
import { useCheckInStore } from '../stores/checkInStore';
import { usePrayerStore } from '../stores/prayerStore';
import { appLog } from '../helper/helper';

export const useSettingSheet = (settingsSheetRef: React.RefObject<any>) => {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('Anonymous user');
  const [isUserSignedIn, setIsUserSignedIn] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const setIsModalDimActive = useUIStore((state) => state.setIsModalDimActive);
  const [translationModalVisible, setTranslationModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const selectedLanguage = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Get user store data
  const notificationTime = useUserStore((state) => state.notificationTime);
  const setNotificationTime = useUserStore((state) => state.setNotificationTime);
  const frequencyGoal = useUserStore((state) => state.frequencyGoal);
  const setFrequencyGoal = useUserStore((state) => state.setFrequencyGoal);

  // Get notification store data
  const notificationsEnabled = useNotificationStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useNotificationStore((state) => state.setNotificationsEnabled);
  const scheduleStreakReminders = useNotificationStore((state) => state.scheduleStreakReminders);
  const cancelStreakNotifications = useNotificationStore((state) => state.cancelStreakNotifications);
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
  const isInReview = (global as any).is_In_Review;

  // Get path store functions
  const savedTranslation = usePathStore((state) => state.savedTranslation);
  const setSavedTranslation = usePathStore((state) => state.setSavedTranslation);

  // Add state for temporary translation selection
  const [tempSelectedTranslation, setTempSelectedTranslation] = useState<string>(savedTranslation);
  const [isSavingTranslation, setIsSavingTranslation] = useState(false);

  // Available translations
  const translations = [
    { id: 'WEB', name: 'World English Bible (WEB)' },
    { id: 'KJV', name: 'King James Version (KJV)' },
    { id: 'NIV', name: 'New International Version (NIV)' },
    { id: 'ESV', name: 'English Standard Version (ESV)' },
    { id: 'ICB', name: "International Children's Bible (ICB)" },
    { id: 'BDS_FR', name: '🇫🇷 La Bible du Semeur (BDS)' },
    { id: 'HTB_NL', name: '🇳🇱 Het Boek (HTB)' },
    { id: 'LUT_DE', name: '🇩🇪 Lutherbibel 1912 (LUT)' },
    { id: 'NVI_ES', name: '🇪🇸 NUEVA VERSIÓN INTERNACIONAL (NVI_ES)' },
    { id: 'NVI_PT', name: '🇵🇹 Bíblia Sagrada, Nova Versão Internacional (NVI_PT)' },
  ];

  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<any>(null);

  // Initialize selectedTime based on notificationTime on mount
  useEffect(() => {
    if (!notificationTime || notificationTime === 'none') {
      const date = new Date();
      date.setHours(19);
      date.setMinutes(0);
      setSelectedTime(date);
      return;
    }

    if (notificationTime.includes(':')) {
      const [hours, minutes] = notificationTime.split(':').map((part) => parseInt(part, 10));
      const date = new Date();
      date.setHours(hours);
      date.setMinutes(minutes);
      setSelectedTime(date);
      return;
    }

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
  }, []);

  // Check notification permissions on mount
  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  // Check notification permissions
  const checkNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        setNotificationsEnabled(true);
      } else {
        setNotificationsEnabled(false);
      }
    } catch (error) {
      appLog('Error checking notification permissions:', error);
    }
  };

  // Update isVisible when sheet is shown
  useEffect(() => {
    if (bottomSheetRef.current) {
      setIsVisible(true);
    }
  }, []);

  // Update this to properly show the sheet
  const prepareAndShow = useCallback(() => {
    let currentUserId = 'Not authenticated';
    let isUserSignedIn = false;

    const currentUser = auth().currentUser;
    if (currentUser?.uid) {
      currentUserId = currentUser.uid;
      isUserSignedIn = true;
    } else {
      const user = useUserStore.getState().getUser?.();
      currentUserId = user?.id || 'Not authenticated';
      isUserSignedIn = !!user?.id;
    }

    setUserId(currentUserId);
    setIsUserSignedIn(isUserSignedIn);
    setIsVisible(true);
    bottomSheetRef.current?.snapToIndex(0);
    hapticMedium();
  }, []);

  // Handle sheet changes
  const handleSettingsChange = useCallback((index: number) => {
    if (index === -1) {
      setIsVisible(false);
    }
  }, []);

  // Close the settings sheet
  const handleClose = useCallback(() => {
    hapticLight();
    setIsVisible(false);
    bottomSheetRef.current?.close();
  }, []);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    analytics.logEvent('Settings_Tapped_SignOut', {
      userId: userId,
    });

    try {
      hapticMedium();

      const currentUser = auth().currentUser;
      const isAnonymous = currentUser?.isAnonymous ?? false;
      const providerId = currentUser?.providerData[0]?.providerId;

      await auth().signOut();

      useSoundStore.getState().stopBackgroundMusic();

      if (Platform.OS === 'android' && !isAnonymous) {
        if (providerId === 'google.com') {
          await GoogleSignin.revokeAccess?.().catch((err) => {
            console.warn('Google revokeAccess error:', err);
          });
        }
      }

      useUserStore.getState().resetUserStore();
      useHomeStore.getState().resetCompletionStates();
      syncStreakDataToWidget(0, dayjs()?.toDate());

      await AsyncStorage.clear();
      appLog('✅ All AsyncStorage data cleared on sign out');

      bottomSheetRef.current?.close();
      setIsModalDimActive(false);

      router.replace({ pathname: '/(auth)' });
    } catch (error) {
      const msg = (typeof error === 'object' && error && 'message' in error) ? (error as any).message : '';

      const isExpectedLogoutError =
        msg.includes('[auth/no-current-user]') ||
        msg.includes('apiClient is null') ||
        msg.includes('signOut:') ||
        msg.includes('signOut error');

        if (isExpectedLogoutError) {
          console.warn('Sign-out error ignored:', error);
        } else {
          console.error('Unexpected sign-out error:', error);
        }

      useSoundStore.getState().stopBackgroundMusic();
      bottomSheetRef.current?.close();
      setIsModalDimActive(false);
      router.replace({ pathname: '/(auth)' });
    } finally {
      try {
        await AsyncStorage.clear();
        appLog('✅ AsyncStorage cleared in finally block');
      } catch (clearError) {
        console.error('❌ Error clearing AsyncStorage:', clearError);
      }

      useUserStore.getState().resetUserStore();
      useHomeStore.getState().resetCompletionStates();
    }
  }, [router, setIsModalDimActive, userId]);

  // Handle copying the user ID
  const handleCopyUserId = useCallback(() => {
    Clipboard.setString(userId);
    hapticSuccess();
    Alert.alert('Copied!', 'User ID copied to clipboard');
  }, [userId]);

  // Handle temporary translation selection
  const handleTempTranslationSelect = useCallback((translation: string) => {
    hapticLight();
    setTempSelectedTranslation(translation);
  }, []);

  // Handle saving the translation
  const handleSaveTranslation = useCallback(async () => {
    setIsSavingTranslation(true);

    try {
      setSavedTranslation(tempSelectedTranslation);
      const devotionalStore = useDevotionalStore.getState();
      devotionalStore.setBibleVersion(tempSelectedTranslation);

      if (devotionalStore.currentDevotional || devotionalStore.dailyDevotional) {
        appLog('🔄 Translation changed, refetching devotional with new translation:', tempSelectedTranslation);
        try {
          await devotionalStore.fetchTodaysDevotional();
        } catch (error) {
          console.error('Error refetching devotional with new translation:', error);
        }
      }

      setTranslationModalVisible(false);
      hapticSuccess();
      analytics.logEvent('Settings_Tapped_TranslationChange', {
        translation: tempSelectedTranslation,
      });
    } catch (error) {
      console.error('Error saving translation:', error);
    } finally {
      setIsSavingTranslation(false);
    }
  }, [setSavedTranslation, tempSelectedTranslation]);

  // Handle opening translation modal
  const handleOpenTranslationModal = useCallback(() => {
    setTempSelectedTranslation(savedTranslation);
    setTranslationModalVisible(true);
  }, [savedTranslation]);

  // Function to get display text for notification time
  const getNotificationTimeDisplay = useCallback(() => {
    if (!notificationTime || notificationTime === 'none') {
      return 'No notifications';
    }

    if (notificationTime.includes(':')) {
      const [hours, minutes] = notificationTime.split(':').map((part) => parseInt(part, 10));
      const time = new Date();
      time.setHours(hours);
      time.setMinutes(minutes);
      return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
        return notificationTime;
    }
  }, [notificationTime]);

  // Toggle notifications on/off
  const toggleNotifications = async (enableNotifications: boolean) => {
    hapticLight();

    if (enableNotifications) {
      const { status } = await Notifications.getPermissionsAsync();
      appLog(`Current notification permission status: ${status}`);

      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        appLog(`New notification permission status after request: ${newStatus}`);

        if (newStatus !== 'granted') {
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

      setNotificationsEnabled(true);
      await scheduleStreakReminders();

      setShowTimePicker(true);

      if (notificationTime === 'none') {
        setNotificationTime('19:00');
      }

      const onboardingStore = useOnboardingStore.getState();
      await onboardingStore.setNotificationPreference({
        enabled: true,
        time: notificationTime || '19:00',
      });

      const user = auth().currentUser;
      if (user) {
        await firestore().collection('users').doc(user.uid).update({
          notificationsEnabled: true,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      await cancelStreakNotifications();
      await cancelDailyReminder();
      setNotificationsEnabled(false);

      const onboardingStore = useOnboardingStore.getState();
      await onboardingStore.setNotificationPreference({
        enabled: false,
        time: 'none',
      });

      const user = auth().currentUser;
      if (user) {
        await firestore().collection('users').doc(user.uid).update({
          notificationsEnabled: false,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

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

    analytics.logEvent('Settings_Changed_Notifications', {
      enabled: enableNotifications,
      userId: userId,
    });
  };

  // Toggle time picker visibility
  const toggleTimePicker = () => {
    hapticLight();
    toggleScale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 100, easing: Easing.inOut(Easing.quad) })
    );

    if (Platform.OS === 'android') {
      setShowAndroidPicker(true);
    } else {
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
    hapticLight();
    const finalSelectedTime = Platform.OS === 'android' ? selectedDate : selectedTime;

    if (finalSelectedTime) {
      const hours = finalSelectedTime.getHours();
      const minutes = finalSelectedTime.getMinutes();
      const timeString = `${hours?.toString().padStart(2, '0')}:${minutes?.toString().padStart(2, '0')}`;

      try {
        await setNotificationTime(timeString);
        await cancelDailyReminder();

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

        const notificationStore = useNotificationStore.getState();
        notificationStore.setPreferredNotificationTime('custom');
        await notificationStore.scheduleDailyReminder('custom');

        const onboardingStore = useOnboardingStore.getState();
        await onboardingStore.setNotificationPreference({
          enabled: true,
          time: timeString,
        });

        setNotificationsEnabled(true);

        analytics.logEvent('Settings_Changed_NotificationTime', {
          time: timeString,
          isCustomTime: true,
        });

        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const dailyReminder = scheduledNotifications.find(
          (n) => n.identifier === NOTIFICATION_IDS.DAILY_REMINDER
        );

        if (!dailyReminder) {
          appLog('Daily reminder was not scheduled properly');
          throw new Error('Failed to schedule notification');
        }

        const userStore = useUserStore.getState();
        if (userStore.getUser?.()) {
          await syncWithFirestore();
        }

        if (Platform.OS === 'android') {
          setShowAndroidPicker(false);
        } else {
          timePickerHeight.value = withTiming(0, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });
          setTimeout(() => {
            setShowTimePicker(false);
          }, 200);
        }

        hapticSuccess();
      } catch (error) {
        appLog('Failed to update notification time:', error);
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
    hapticLight();
    setTranslationModalVisible(false);
  }, []);

  // Open Discord link
  const handleOpenDiscord = useCallback(() => {
    hapticLight();
    Linking.openURL('https://discord.gg/W9MZdVaKBs').catch((err) => {
      appLog('Error opening Discord link:', err);
      Alert.alert('Could not open link', 'Please check your internet connection and try again.');
    });
  }, []);

  // Open roadmap link
  const handleOpenRoadmap = useCallback(() => {
    hapticLight();
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
              const currentUser = auth().currentUser;
              if (!currentUser) {
                Alert.alert('Error', 'No user is currently signed in');
                return;
              }

              const userId = currentUser.uid;
              appLog('Attempting to delete user:', userId);

              useUserStore.getState().resetUserStore();
              useDevotionalStore.getState().reset();
              useCheckInStore.getState().resetCheckInData();
              useHomeStore.getState().resetCompletionStates();
              useSubscriptionStore.getState().logoutAdaptyUser();
              usePrayerStore.getState().resetStore();
              await useOnboardingStore.getState().clearResponses();
              useOnboardingStore.getState().clearSavedScreenNavigation();
              useSoundStore.getState().stopBackgroundMusic();
              appLog('✅ All stores reset before deletion');

              try {
                const batch = firestore().batch();
                batch.delete(firestore().collection('users').doc(userId));
                
                const customDevotionals = await firestore()
                  .collection('customDevotionals')
                  .where('userId', '==', userId)
                  .get();
                customDevotionals.docs.forEach((doc) => {
                  batch.delete(doc.ref);
                });
                
                const savedDevotionals = await firestore()
                  .collection('savedDevotionals')
                  .where('userId', '==', userId)
                  .get();
                savedDevotionals.docs.forEach((doc) => {
                  batch.delete(doc.ref);
                });
                
                await batch.commit();
                appLog('✅ All user data deleted from Firestore');
              } catch (firestoreError) {
                appLog('❌ Error deleting Firestore data:', firestoreError);
                Alert.alert(
                  'Firestore Error',
                  'Failed to delete Firestore data. Continuing with other deletion steps.'
                );
              }

              try {
                await AsyncStorage.clear();
                appLog('✅ Local storage cleared successfully');
              } catch (storageError) {
                appLog('❌ Error clearing AsyncStorage:', storageError);
                Alert.alert(
                  'Storage Error',
                  'Failed to clear local storage. Continuing with other deletion steps.'
                );
              }

              syncStreakDataToWidget(0, dayjs().toDate());

              try {
                if (currentUser) {
                  await currentUser.delete();
                  appLog('✅ User auth account deleted');
                  await auth().signOut();
                  appLog('✅ User signed out after account deletion');
                  useSoundStore.getState().stopBackgroundMusic();
                }
              } catch (authError: any) {
                appLog('❌ Error with auth operations:', authError);

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
                            useSoundStore.getState().stopBackgroundMusic();
                            bottomSheetRef.current?.close();
                            router.replace({ pathname: '/(auth)' });
                          } catch (e) {
                            appLog('Failed to sign out:', e);
                          }
                        },
                      },
                      { text: 'No', style: 'cancel' },
                    ]
                  );
                  return;
                } else {
                  Alert.alert('Auth Error', `Error: ${authError.message || 'Unknown auth error'}`);
                }
              }

              bottomSheetRef.current?.close();
              router.replace({ pathname: '/(auth)' });
              
              setTimeout(() => {
                Alert.alert(
                  'Account Deleted',
                  'Your account and all associated data have been successfully deleted.'
                );
              }, 500);
            } catch (error) {
              appLog('❌ Unhandled error in account deletion:', error);
              Alert.alert(
                'Error',
                'Something went wrong during account deletion. The app will try to sign you out anyway.',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      try {
                        await auth().signOut();
                        useSoundStore.getState().stopBackgroundMusic();
                        bottomSheetRef.current?.close();
                        router.replace({ pathname: '/(auth)' });
                      } catch (e) {
                        appLog('Final error handler signout failed:', e);
                      }
                    },
                  },
                ]
              );
            } finally {
              appLog('Account deletion process completed');
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
    hapticMedium();
    await presentPaywall();
  }, [presentPaywall]);

  // Handle promo code redemption
  const handlePromoCodePress = useCallback(async () => {
    try {
      hapticMedium();
      analytics.logEvent('Settings_Tapped_PromoCode');
      await Purchases.presentCodeRedemptionSheet();
      await getCustomerInfo();
    } catch (error) {
      appLog('Error presenting promo code sheet:', error);
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

    if (newState) {
      refreshStreakData();
    }

    hapticMedium();
  }, [showDevPanel]);

  // Refresh streak data
  const refreshStreakData = useCallback(async () => {
    setDevPanelLoading(true);
    try {
      const result = await checkStreakAndApplyPenalties();
      setStreakData(result);
    } catch (error) {
      appLog('Error fetching streak data:', error);
      Alert.alert('Error', 'Failed to fetch streak data');
    } finally {
      setDevPanelLoading(false);
    }
  }, []);

  // Toggle expand/collapse of developer panel
  const toggleDevPanelExpanded = useCallback(() => {
    setDevPanelExpanded(!devPanelExpanded);
    hapticLight();
  }, [devPanelExpanded]);

  // Function to get display text for reading time
  const getReadingTimeDisplay = useCallback(() => {
    switch (frequencyGoal) {
      case '1-5':
        return '1-5 mins (1 chapter)';
      case '6-10':
        return '6-10 mins (3-4 chapters)';
      case '15-25':
      case '11-15':
        return '11-15 mins (6-8 chapters)';
      default:
        return '5-10 mins';
    }
  }, [frequencyGoal]);

  // Handle navigation to reading time selection
  const handleEditReadingTime = useCallback(() => {
    hapticLight();
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
      // Check if user entered "PINKKK" to unlock the Pink skin
      if (selectedCode.toUpperCase() === 'PINKKK') {
        appLog('🎀 User entered PINKKK code, unlocking Pink skin');
        
        // Import shopStore
        const { useShopStore } = await import('../stores/shopStore');
        const { addSkin, hasSkin } = useShopStore.getState();
        
        // Check if user already has the Pink skin
        if (hasSkin('1')) { // Pink skin has skinNumber: 1
          Alert.alert('Already Owned', 'You already own the Pink Lamb skin!', [
            { text: 'OK', onPress: () => setReferralModalVisible(false) },
          ]);
        } else {
          // Add the Pink skin to user's collection
          addSkin('1');
          hapticSuccess();
          
          analytics.logEvent('Store_Skin_Unlocked', {
            skinId: '1',
            skinName: 'Pink Lamb',
            method: 'secret_code',
            code: 'PINKKK'
          });
          
          Alert.alert(
            '🎉 Pink Lamb Unlocked!',
            'The Pink Lamb skin has been added to your collection! You can equip it from the Store.',
            [{ text: 'Awesome!', onPress: () => setReferralModalVisible(false) }]
          );
        }
        setIsSubmittingReferral(false);
        return;
      }
      
      // Normal referral code handling
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
        hapticLight();
        setFrequencyGoal(duration);

        const user = auth().currentUser;
        if (user) {
          await firestore().collection('users').doc(user.uid).update({
            frequencyGoal: duration,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
          appLog('Updated frequency goal in Firestore');
        }

        setReadingTimeModalVisible(false);
        hapticSuccess();
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
        const today = new Date().toISOString().split('T')[0];
        const dailyCancelKey = `cancellation_used_${today}`;
        const cancelledToday = await AsyncStorage.getItem(dailyCancelKey);
        setHasCancelledToday(cancelledToday === 'true');
        appLog(
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
    hapticMedium();

    if (hasCancelledToday) {
      appLog('🚫 User already cancelled today, redirecting to Apple subscriptions');
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
    appLog('🔄 Starting cancellation submission...');
    appLog('📝 Cancellation reasons:', cancellationReasons);
    appLog('💬 Cancellation feedback:', cancellationFeedback);
    appLog('👤 User ID:', userId);

    if (cancellationReasons.length === 0) {
      Alert.alert('Please select a reason', 'Please select at least one reason for cancelling.');
      return;
    }

    setIsSubmittingCancellation(true);

    try {
      appLog('💾 Attempting to save feedback to Firestore...');
      const result = await saveFeedback({
        type: 'cancellation',
        reasons: cancellationReasons,
        feedback: cancellationFeedback,
        userId: userId,
        timestamp: new Date().toISOString(),
      });

      appLog('✅ Feedback save result:', result);

      const today = new Date().toISOString().split('T')[0];
      const dailyCancelKey = `cancellation_used_${today}`;
      await AsyncStorage.setItem(dailyCancelKey, 'true');
      setHasCancelledToday(true);
      appLog(`✅ Marked cancellation as used for today: ${today}`);

      appLog('📊 Logging analytics event...');
      analytics.logEvent('Settings_Submitted_CancellationFeedback', {
        reasons: cancellationReasons,
        hasFeedback: cancellationFeedback.length > 0,
        userId: userId,
        reasonCount: cancellationReasons.length,
        feedbackLength: cancellationFeedback.length,
      });

      cancellationReasons.forEach((reason) => {
        analytics.logEvent('Settings_CancellationReason_Selected', {
          reason: reason,
          userId: userId,
          totalReasonsSelected: cancellationReasons.length,
        });
      });

      setCancellationModalVisible(false);

      if (!isInReview) {
        appLog('🎯 Showing half-off paywall...');
        const paywallResult = await presentHalfOffPaywall();

        if (paywallResult === PAYWALL_RESULT.CANCELLED || paywallResult === PAYWALL_RESULT.ERROR) {
          appLog('💔 User cancelled paywall, redirecting to Apple subscriptions...');
        } else if (
          paywallResult === PAYWALL_RESULT.PURCHASED ||
          paywallResult === PAYWALL_RESULT.RESTORED
        ) {
          appLog('🎉 User purchased or restored subscription!');
        }
      } else {
        appLog('ℹ️ In review mode – skipping half-off paywall presentation');
      }

      hapticSuccess();
    } catch (error) {
      console.error('❌ Error submitting cancellation feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingCancellation(false);
      appLog('🏁 Cancellation submission completed');
    }
  }, [cancellationReasons, cancellationFeedback, userId, presentHalfOffPaywall, isInReview]);

  const backgroundMusicEnabled = useSoundStore((state) => state.backgroundMusicEnabled);
  const soundEffectsEnabled = useSoundStore((state) => state.soundEffectsEnabled);
  const hapticsEnabled = useSoundStore((state) => state.hapticsEnabled);
  const setBackgroundMusicEnabled = useSoundStore((state) => state.setBackgroundMusicEnabled);
  const setSoundEffectsEnabled = useSoundStore((state) => state.setSoundEffectsEnabled);
  const setHapticsEnabled = useSoundStore((state) => state.setHapticsEnabled);

  // Add app state ref
  const appState = useRef(AppState.currentState);
  const isFocused = useIsFocused();

  // Add effect to initialize notification state
  useEffect(() => {
    const initializeNotificationState = async () => {
      try {
        const user = auth().currentUser;

        if (user) {
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          const userData = userDoc.data();

          if (userData) {
            setNotificationsEnabled(userData.notificationsEnabled ?? false);

            if (userData.notificationsEnabled) {
              await scheduleStreakReminders();
            } else {
              await cancelStreakNotifications();
              await cancelDailyReminder();
            }
          }
        } else {
          const onboardingStore = useOnboardingStore.getState();
          const notificationEnabled = onboardingStore.responses.notificationEnabled ?? false;
          setNotificationsEnabled(notificationEnabled);
        }
      } catch (error) {
        console.error('Error initializing notification state:', error);
      }
    };

    initializeNotificationState();
  }, []);

  const handleLanguageChange = async (lang: string) => {
    appLog(`[SettingsSheet] Language changed to: ${lang}`);
    setLanguage(lang);
    setLanguageModalVisible(false);

    try {
      const chatLanguageSet = await AsyncStorage.getItem('shepherd_bible_chat_language_set');
      appLog(`[SettingsSheet] Chat language set flag: ${chatLanguageSet}`);

      await AsyncStorage.removeItem('shepherd_bible_chat_language_set');
      await AsyncStorage.setItem('shepherd_bible_chat_language', lang);
      appLog(`[SettingsSheet] Synced chat language with app language: ${lang}`);
    } catch (error) {
      console.error('Error syncing chat language with app language:', error);
    }
  };

  // Expose all the necessary values and functions
  return {
    // Refs
    bottomSheetRef,
    
    // States
    isVisible,
    translationModalVisible,
    showTimePicker,
    showAndroidPicker,
    selectedLanguage,
    languageModalVisible,
    userId,
    isUserSignedIn,
    savedTranslation,
    tempSelectedTranslation,
    isSavingTranslation,
    notificationsEnabled,
    selectedTime,
    referralModalVisible,
    referralInput,
    isSubmittingReferral,
    cancellationModalVisible,
    cancellationReasons,
    cancellationFeedback,
    isSubmittingCancellation,
    hasCancelledToday,
    readingTimeModalVisible,
    selectedReadingTime,
    showDevPanel,
    devPanelExpanded,
    streakData,
    devPanelLoading,
    userData,
    backgroundMusicEnabled,
    soundEffectsEnabled,
    hapticsEnabled,
    isProMember,
    
    // Functions
    prepareAndShow,
    handleSettingsChange,
    handleClose,
    handleSignOut,
    handleCopyUserId,
    handleTempTranslationSelect,
    handleSaveTranslation,
    handleOpenTranslationModal,
    getNotificationTimeDisplay,
    toggleNotifications,
    toggleTimePicker,
    handleTimeConfirm,
    animateToggle,
    handleCancelTranslation,
    handleOpenDiscord,
    handleOpenRoadmap,
    handleDeleteAccount,
    handleSubscriptionPress,
    handlePromoCodePress,
    toggleDevPanel,
    refreshStreakData,
    toggleDevPanelExpanded,
    formatDate,
    getReadingTimeDisplay,
    handleEditReadingTime,
    handleOpenReferralModal,
    handleReferralSubmit,
    handleReadingTimeSelection,
    handleOpenCancellationModal,
    toggleCancellationReason,
    handleSubmitCancellation,
    setBackgroundMusicEnabled,
    setSoundEffectsEnabled,
    setHapticsEnabled,
    setLanguageModalVisible,
    handleLanguageChange,
    setSelectedTime,
    setShowAndroidPicker,
    setReferralModalVisible,
    setReferralInput,
    setReadingTimeModalVisible,
    setSelectedReadingTime,
    setCancellationModalVisible,
    setCancellationFeedback,
    setIsVisible,
    
    // Animated styles
    timePickerAnimatedStyle,
    selectorButtonStyle,
    
    // Constants
    translations,
    appVersion,
    buildNumber,
    isInReview,
  };
};