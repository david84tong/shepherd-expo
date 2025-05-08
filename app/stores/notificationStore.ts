import * as Notifications from 'expo-notifications';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';

// Define notification IDs for easier management
export const NOTIFICATION_IDS = {
  STREAK_WARNING: 'streak-warning',
  STREAK_BROKEN: 'streak-broken',
};

// Type for the timestamp from Firestore
type FirestoreTimestamp = ReturnType<typeof firestore.Timestamp.now>;

interface NotificationState {
  // Store the last date when notifications were scheduled
  lastScheduledDate: string | null;
  
  // Store whether the notifications are enabled
  notificationsEnabled: boolean;
  
  // Action: Schedule streak reminder notifications
  scheduleStreakReminders: (test?: boolean) => Promise<void>;
  
  // Action: Cancel all streak notifications
  cancelStreakNotifications: () => Promise<void>;
  
  // Action: Toggle notifications on/off
  setNotificationsEnabled: (enabled: boolean) => void;
  
  // Action: Update the last scheduled date (YYYY-MM-DD format)
  setLastScheduledDate: (date: string) => void;
  
  // Action: Check and reschedule notifications if needed
  checkAndRescheduleNotifications: (lastReadingDate: FirestoreTimestamp | null) => Promise<void>;
  
  // Action: Initialize notification system
  initializeNotifications: () => Promise<void>;
  
  // Helper function to list scheduled notifications for debugging
  listScheduledNotifications: () => Promise<void>;
}

// Configure notification behavior
export const configureNotifications = async () => {
  try {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    // Create the notifications channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('streak-reminders', {
        name: 'Streak Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF8E22',
        description: 'Notifications to remind you to maintain your reading streak',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error configuring notifications:', error);
    return false;
  }
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      lastScheduledDate: null,
      notificationsEnabled: true,
      
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      
      setLastScheduledDate: (date) => set({ lastScheduledDate: date }),
      
      // Initialize notification system
      initializeNotifications: async () => {
        try {
          // Configure notification behavior
          await configureNotifications();
          
          // Request notification permissions if not already granted
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          
          // Schedule notifications only if permissions are granted
          if (existingStatus === 'granted') {
            // Check if we should schedule notifications
            const today = new Date();
            const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (get().lastScheduledDate !== todayString) {
              await get().scheduleStreakReminders();
            }
          }
          
          // Return void instead of boolean
        } catch (error) {
          console.error('Failed to initialize notifications:', error);
        }
      },
      
      // Helper function to list scheduled notifications for debugging
      listScheduledNotifications: async () => {
        try {
          const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
          
          console.log(`--- Currently scheduled notifications: ${scheduledNotifications.length} ---`);
          scheduledNotifications.forEach((notification, index) => {
            // Safely extract trigger date if possible
            let triggerDate = 'unknown trigger';
            if (notification.trigger && 'date' in notification.trigger) {
              triggerDate = new Date(notification.trigger.date).toLocaleString();
            }
            
            console.log(`[${index + 1}] ID: ${notification.identifier}`);
            console.log(`    Title: ${notification.content.title}`);
            console.log(`    Trigger: ${triggerDate}`);
            console.log(`    Data: ${JSON.stringify(notification.content.data)}`);
          });
          console.log("--- End of scheduled notifications ---");
        } catch (error) {
          console.error('Failed to list scheduled notifications:', error);
        }
      },
      
      scheduleStreakReminders: async (test = false) => {
        try {
          if (!get().notificationsEnabled) {
            console.log('Notifications are disabled in the store');
            return;
          }
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            console.log('Notification permission not granted');
            return;
          }

          const now = new Date();
          const todayString = now.toISOString().split('T')[0];

          if (test) {
            const WARNING_DELAY_SEC = 60; // 1 minute
            const BROKEN_DELAY_SEC = 120; // 2 minutes

            const warningTimeTest = new Date(now.getTime() + WARNING_DELAY_SEC * 1000);
            const brokenStreakTimeTest = new Date(now.getTime() + BROKEN_DELAY_SEC * 1000);

            console.log(`[TEST] Scheduling streak warning notification in ${WARNING_DELAY_SEC}s → ${warningTimeTest.toLocaleTimeString()}`);
            console.log(`[TEST] Scheduling broken streak notification in ${BROKEN_DELAY_SEC}s → ${brokenStreakTimeTest.toLocaleTimeString()}`);

            await Notifications.cancelAllScheduledNotificationsAsync();
            console.log('[TEST] All existing notifications cleared. Scheduling test notifications...');

            const testTriggerWarning: Notifications.TimeIntervalNotificationTrigger = {
              type: 'timeInterval',
              seconds: WARNING_DELAY_SEC,
              repeats: false,
            };
            const testTriggerBroken: Notifications.TimeIntervalNotificationTrigger = {
              type: 'timeInterval',
              seconds: BROKEN_DELAY_SEC,
              repeats: false,
            };

            if (Platform.OS === 'android') {
              testTriggerWarning.channelId = 'streak-reminders';
              testTriggerBroken.channelId = 'streak-reminders';
            }

            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Your streak is gonna be broken! (Test)',
                body: "Don't forget to read your Bible today to maintain your streak.",
                data: { type: 'streak-warning', isTest: true },
                sound: true,
              },
              trigger: testTriggerWarning,
              identifier: `${NOTIFICATION_IDS.STREAK_WARNING}-test`,
            });

            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Your lamb is dying! (Test)',
                body: 'Be a good shepherd and come back.',
                subtitle: 'Feed your lamb and your soul',
                data: { type: 'streak-broken', isTest: true },
                sound: true,
              },
              trigger: testTriggerBroken,
              identifier: `${NOTIFICATION_IDS.STREAK_BROKEN}-test`,
            });

            console.log("[TEST] Verifying scheduled notifications (after test scheduling has completed)...");
            await get().listScheduledNotifications();
            set({ lastScheduledDate: todayString });
            
          } else {
            await get().cancelStreakNotifications();

            let warningTimeProd = new Date(now);
            warningTimeProd.setHours(21, 0, 0, 0); // 9:00 PM today
            if (warningTimeProd <= now || (warningTimeProd.getTime() - now.getTime()) < 60000) {
              warningTimeProd.setDate(warningTimeProd.getDate() + 1);
            }

            let brokenStreakTimeProd = new Date(now);
            brokenStreakTimeProd.setDate(brokenStreakTimeProd.getDate() + 1);
            brokenStreakTimeProd.setHours(12, 0, 0, 0); // Noon next day
            if (brokenStreakTimeProd <= now || (brokenStreakTimeProd.getTime() - now.getTime()) < 60000) {
              brokenStreakTimeProd.setDate(brokenStreakTimeProd.getDate() + 1);
            }

            console.log(`Scheduling streak warning notification for: ${warningTimeProd.toLocaleString()}`);
            console.log(`Scheduling broken streak notification for: ${brokenStreakTimeProd.toLocaleString()}`);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Your streak is gonna be broken!",
                body: "Don't forget to read your Bible today to maintain your streak.",
                data: { type: 'streak-warning', isTest: false },
                sound: true,
              },
              trigger: {
                date: warningTimeProd,
                repeats: false,
                channelId: 'streak-reminders',
              },
              identifier: NOTIFICATION_IDS.STREAK_WARNING,
            });
            console.log(`Scheduled streak warning notification for ${warningTimeProd.toLocaleString()}`);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Your lamb is dying!",
                body: "Be a good shepherd and come back.",
                subtitle: "Feed your lamb and your soul",
                data: { type: 'streak-broken', isTest: false },
                sound: true,
              },
              trigger: {
                date: brokenStreakTimeProd,
                repeats: false,
                channelId: 'streak-reminders',
              },
              identifier: NOTIFICATION_IDS.STREAK_BROKEN,
            });
            console.log(`Scheduled broken streak notification for ${brokenStreakTimeProd.toLocaleString()}`);

            set({ lastScheduledDate: todayString });
          }
        } catch (error) {
          console.error('Failed to schedule streak notifications:', error);
        }
      },
      
      cancelStreakNotifications: async () => {
        try {
          // Cancel specific streak notifications by their identifiers
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_WARNING);
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_BROKEN);
          console.log('Streak notifications canceled');
        } catch (error) {
          console.error('Failed to cancel streak notifications:', error);
        }
      },
      
      checkAndRescheduleNotifications: async (lastReadingDate) => {
        try {
          // If notifications are disabled, don't proceed
          if (!get().notificationsEnabled) return;
          
          // Get current date in YYYY-MM-DD format
          const today = new Date();
          const todayString = today.toISOString().split('T')[0];
          
          // Check if user has read today
          let hasReadToday = false;
          if (lastReadingDate && typeof lastReadingDate.toDate === 'function') {
            const lastReadingDateObj = lastReadingDate.toDate();
            const lastReadingDateString = lastReadingDateObj.toISOString().split('T')[0];
            hasReadToday = lastReadingDateString === todayString;
          }
          
          // Get the date when notifications were last scheduled
          const lastScheduledDate = get().lastScheduledDate;
          
          // If user has read today, cancel today's notifications and schedule for tomorrow
          if (hasReadToday) {
            console.log('User has read today - cancelling notifications and rescheduling for tomorrow');
            
            // Cancel existing notifications
            await get().cancelStreakNotifications();
            
            // Schedule new notifications for tomorrow
            await get().scheduleStreakReminders();
          } 
          // If notifications haven't been scheduled today yet, schedule them
          else if (lastScheduledDate !== todayString) {
            console.log('Scheduling streak notifications for today');
            await get().scheduleStreakReminders();
          }
        } catch (error) {
          console.error('Failed to check and reschedule notifications:', error);
        }
      },
    }),
    {
      name: 'notification-store',
      getStorage: () => AsyncStorage,
    }
  )
);
