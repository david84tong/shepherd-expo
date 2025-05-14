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
  DAILY_REMINDER: 'daily-reminder',
};

// Type for the timestamp from Firestore
type FirestoreTimestamp = ReturnType<typeof firestore.Timestamp.now>;

// Type for notification preferences
export type NotificationTimeOption = 'morning' | 'afternoon' | 'evening' | 'night' | 'none';

interface NotificationState {
  // Store the last date when notifications were scheduled
  lastScheduledDate: string | null;
  
  // Store whether the notifications are enabled
  notificationsEnabled: boolean;
  
  // Store the preferred notification time
  preferredNotificationTime: NotificationTimeOption | null;
  
  // Action: Schedule streak reminder notifications
  scheduleStreakReminders: (test?: boolean) => Promise<void>;
  
  // Action: Schedule daily reading reminder
  scheduleDailyReminder: (timeOption: NotificationTimeOption) => Promise<void>;
  
  // Action: Cancel all streak notifications
  cancelStreakNotifications: () => Promise<void>;
  
  // Action: Cancel daily reminder notification
  cancelDailyReminder: () => Promise<void>;
  
  // Action: Toggle notifications on/off
  setNotificationsEnabled: (enabled: boolean) => void;
  
  // Action: Set preferred notification time
  setPreferredNotificationTime: (time: NotificationTimeOption) => void;
  
  // Action: Update the last scheduled date (YYYY-MM-DD format)
  setLastScheduledDate: (date: string) => void;
  
  // Action: Check and reschedule notifications if needed
  checkAndRescheduleNotifications: (lastReadingDate: FirestoreTimestamp | null) => Promise<void>;
  
  // Action: Initialize notification system
  initializeNotifications: () => Promise<void>;
  
  // Helper function to list scheduled notifications for debugging
  listScheduledNotifications: () => Promise<void>;
  
  // Action: Specifically reschedule streak notifications for the next day (after streak completion)
  rescheduleStreakNotificationsForNextDay: () => Promise<boolean>;
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
      
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Reading Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7B2BFF',
        description: 'Notifications to remind you of your daily Bible reading',
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
      preferredNotificationTime: null,
      
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      
      setPreferredNotificationTime: (time) => set({ preferredNotificationTime: time }),
      
      setLastScheduledDate: (date) => set({ lastScheduledDate: date }),
      
      // Initialize notification system
      initializeNotifications: async () => {
        try {
          console.log('📱 Initializing notification system...');
          
          // Configure notification behavior
          await configureNotifications();
          
          // Request notification permissions if not already granted
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          console.log(`📱 Notification permission status: ${existingStatus}`);
          
          // Schedule notifications only if permissions are granted
          if (existingStatus === 'granted') {
            // Check if we should schedule notifications
            const today = new Date();
            const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const lastScheduled = get().lastScheduledDate;
            
            console.log(`📱 Last notification schedule date: ${lastScheduled || 'never'}`);
            console.log(`📱 Today's date: ${todayString}`);
            
            if (get().lastScheduledDate !== todayString) {
              console.log('📱 Scheduling streak reminders because they haven\'t been scheduled today');
              await get().scheduleStreakReminders();
            } else {
              console.log('📱 Streak reminders already scheduled today, skipping');
            }
            
            // Re-schedule the daily reminder if needed
            const preferredTime = get().preferredNotificationTime;
            if (preferredTime && preferredTime !== 'none') {
              console.log(`📱 Scheduling daily reminder with preferred time: ${preferredTime}`);
              await get().scheduleDailyReminder(preferredTime);
            } else {
              console.log('📱 No preferred notification time set or notifications disabled');
            }
          } else {
            console.log('📱 Notification permissions not granted, skipping notification scheduling');
          }
          
          console.log('📱 Notification system initialization complete');
          
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
      
      // Schedule daily reading reminder based on user's preferred time
      scheduleDailyReminder: async (timeOption: NotificationTimeOption) => {
        try {
          // Skip if user selected 'none'
          if (timeOption === 'none') {
            console.log('User opted out of daily reminders');
            await get().cancelDailyReminder();
            return;
          }
          
          // Get permission
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            console.log('Notification permission not granted');
            return;
          }
          
          // Cancel any existing daily reminder
          await get().cancelDailyReminder();
          
          // Parse time ranges into hours for notifications
          let hour = 8; // Default to 8 AM
          
          switch (timeOption) {
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
            default:
              hour = 8; // Default to 8 AM
          }
          
          // Set up scheduled time for today
          const now = new Date();
          const scheduledTime = new Date();
          scheduledTime.setHours(hour, 0, 0, 0);
          
          // If the scheduled time has already passed today, schedule for tomorrow
          if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }
          
          console.log(`Scheduling daily reminder for ${timeOption} at ${scheduledTime.toLocaleString()}`);
          
          // Calculate hours until notification
          const hoursUntilNotification = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          console.log(`📱 Daily reminder will fire in ${hoursUntilNotification.toFixed(1)} hours`);
          
          // Schedule daily notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Time to talk with the Shepherd",
              body: "Take a moment to read scripture and connect with God.",
              sound: true,
              data: { type: 'daily-reminder' }
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute: 0,
            },
            identifier: NOTIFICATION_IDS.DAILY_REMINDER
          });
          
          console.log(`📱 Daily reminder notification scheduled for ${hour}:00`);
          console.log(`📱 Notification ID: ${NOTIFICATION_IDS.DAILY_REMINDER}`);
          console.log(`📱 Notification trigger type: DAILY`);
          
          // Save the selected time preference
          set({ preferredNotificationTime: timeOption });
          
        } catch (error) {
          console.error('Failed to schedule daily reminder notification:', error);
        }
      },
      
      // Cancel daily reminder notification
      cancelDailyReminder: async () => {
        try {
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY_REMINDER);
          console.log('Daily reminder notification canceled');
        } catch (error) {
          console.error('Failed to cancel daily reminder notification:', error);
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

            // Add more detailed logging about timing 
            console.log(`[TEST] 🔔 Streak Warning test notification will fire in ${(WARNING_DELAY_SEC / 60).toFixed(1)} minutes`);
            console.log(`[TEST] ⚠️ Streak Broken test notification will fire in ${(BROKEN_DELAY_SEC / 60).toFixed(1)} minutes`);

            await Notifications.cancelAllScheduledNotificationsAsync();
            console.log('[TEST] All existing notifications cleared. Scheduling test notifications...');

            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Your streak is gonna be broken! (Test)',
                body: "Don't forget to read your Bible today to maintain your streak.",
                data: { type: 'streak-warning', isTest: true },
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: WARNING_DELAY_SEC,
              },
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
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: BROKEN_DELAY_SEC,
              },
              identifier: `${NOTIFICATION_IDS.STREAK_BROKEN}-test`,
            });

            console.log("[TEST] Verifying scheduled notifications (after test scheduling has completed)...");
            await get().listScheduledNotifications();
            set({ lastScheduledDate: todayString });
            
          } else {
            await get().cancelStreakNotifications();

            const warningTimeProd = new Date(now);
            warningTimeProd.setHours(21, 0, 0, 0); // 9:00 PM today
            if (warningTimeProd <= now || (warningTimeProd.getTime() - now.getTime()) < 60000) {
              warningTimeProd.setDate(warningTimeProd.getDate() + 1);
            }

            const brokenStreakTimeProd = new Date(now);
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
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: warningTimeProd,
            },
              identifier: NOTIFICATION_IDS.STREAK_WARNING,
            });

            // Calculate and log hours from now
            const warningHoursFromNow = (warningTimeProd.getTime() - now.getTime()) / (1000 * 60 * 60);
            console.log(`Scheduled streak warning notification for ${warningTimeProd.toLocaleString()}`);
            console.log(`🔔 Streak Warning scheduled in ${warningHoursFromNow.toFixed(1)} hours from now`);

          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Your lamb is dying!",
              body: "Be a good shepherd and come back.",
              subtitle: "Feed your lamb and your soul",
                data: { type: 'streak-broken', isTest: false },
              sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: brokenStreakTimeProd,
            },
              identifier: NOTIFICATION_IDS.STREAK_BROKEN,
            });

            // Calculate and log hours from now
            const brokenHoursFromNow = (brokenStreakTimeProd.getTime() - now.getTime()) / (1000 * 60 * 60);
            console.log(`Scheduled broken streak notification for ${brokenStreakTimeProd.toLocaleString()}`);
            console.log(`⚠️ Streak Broken scheduled in ${brokenHoursFromNow.toFixed(1)} hours from now`);

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
          if (!get().notificationsEnabled) {
            console.log('📱 Notifications are disabled, skipping check and reschedule');
            return;
          }
          
          // Get current date in YYYY-MM-DD format
          const today = new Date();
          const todayString = today.toISOString().split('T')[0];
          console.log(`📱 Checking notifications status for today (${todayString})`);
          
          // Check if user has read today
          let hasReadToday = false;
          let lastReadingDateString = 'never';
          
          if (lastReadingDate && typeof lastReadingDate.toDate === 'function') {
            const lastReadingDateObj = lastReadingDate.toDate();
            lastReadingDateString = lastReadingDateObj.toISOString().split('T')[0];
            hasReadToday = lastReadingDateString === todayString;
            
            console.log(`📱 Last reading date: ${lastReadingDateString}`);
            console.log(`📱 User has read today: ${hasReadToday ? 'YES' : 'NO'}`);
          } else {
            console.log(`📱 No last reading date available`);
          }
          
          // Get the date when notifications were last scheduled
          const lastScheduledDate = get().lastScheduledDate;
          console.log(`📱 Last notifications scheduled date: ${lastScheduledDate || 'never'}`);
          
          // If user has read today, cancel today's notifications and schedule for tomorrow
          if (hasReadToday) {
            console.log('📱 User has read today - cancelling streak notifications and rescheduling for tomorrow');
            
            // Cancel existing notifications
            await get().cancelStreakNotifications();
            
            // Schedule new notifications for tomorrow
            await get().scheduleStreakReminders();
          } 
          // If notifications haven't been scheduled today yet, schedule them
          else if (lastScheduledDate !== todayString) {
            console.log('📱 Notifications haven\'t been scheduled today - scheduling streak notifications');
            await get().scheduleStreakReminders();
          } else {
            console.log('📱 No action needed - streak notifications already scheduled for today');
          }
        } catch (error) {
          console.error('Failed to check and reschedule notifications:', error);
        }
      },
      
      // Action: Specifically reschedule streak notifications for the next day (after streak completion)
      rescheduleStreakNotificationsForNextDay: async () => {
        try {
          // Cancel current streak notifications
          await get().cancelStreakNotifications();
          
          // Schedule new streak notifications for the next day
          await get().scheduleStreakReminders();
          
          console.log('📱 Streak notifications rescheduled for the next day');
          return true;
        } catch (error) {
          console.error('Failed to reschedule streak notifications for the next day:', error);
          return false;
        }
      },
    }),
    {
      name: 'notification-store',
      getStorage: () => AsyncStorage,
    }
  )
);
