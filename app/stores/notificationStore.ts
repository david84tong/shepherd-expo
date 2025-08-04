import * as Notifications from 'expo-notifications';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import { useUserStore } from './userStore';
import { appLog } from '../helper/helper';

// Define notification IDs for easier management
export const NOTIFICATION_IDS = {
  STREAK_WARNING: 'streak-warning',
  STREAK_BROKEN: 'streak-broken',
  MISSED_REMINDER: 'missed-reminder',
  DAILY_REMINDER: 'daily-reminder',
  ADAPTIVE_REMINDER: 'adaptive-reminder',
  STREAK_FREEZE_REMINDER: 'streak-freeze-reminder',
};

// Type for the timestamp from Firestore
type FirestoreTimestamp = ReturnType<typeof firestore.Timestamp.now>;

// Type for notification preferences
export type NotificationTimeOption =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'none'
  | 'custom';

interface NotificationState {
  // Store the last date when notifications were scheduled
  lastScheduledDate: string | null;

  // Store whether the notifications are enabled
  notificationsEnabled: boolean;

  // Store the preferred notification time
  preferredNotificationTime: NotificationTimeOption | null;

  // Store the last adaptive notification time
  lastAdaptiveNotificationTime: Date | null;

  // Action: Schedule streak reminder notifications
  scheduleStreakReminders: (test?: boolean) => Promise<void>;

  // Action: Schedule daily reading reminder
  scheduleDailyReminder: (timeOption: NotificationTimeOption) => Promise<void>;

  // Action: Schedule adaptive notifications based on current usage time
  scheduleAdaptiveNotifications: () => Promise<void>;

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

  // Action: Schedule streak freeze reminder notification for 3 days after freeze is used
  scheduleStreakFreezeReminder: (freezesRemaining: number) => Promise<void>;

  // Action: Cancel streak freeze reminder notification
  cancelStreakFreezeReminder: () => Promise<void>;
}

// Configure notification behavior
export const configureNotifications = async () => {
  try {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
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
      lastAdaptiveNotificationTime: null,

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setPreferredNotificationTime: (time) => set({ preferredNotificationTime: time }),

      setLastScheduledDate: (date) => set({ lastScheduledDate: date }),

      // Initialize notification system
      initializeNotifications: async () => {
        try {
          appLog('📱 Initializing notification system...');

          // Configure notification behavior
          await configureNotifications();

          // Request notification permissions if not already granted
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          appLog(`📱 Notification permission status: ${existingStatus}`);

          // Schedule notifications only if permissions are granted
          if (existingStatus === 'granted') {
            // Check if we should schedule notifications
            const today = new Date();
            const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const lastScheduled = get().lastScheduledDate;

            appLog(`📱 Last notification schedule date: ${lastScheduled || 'never'}`);
            appLog(`📱 Today's date: ${todayString}`);

            if (get().lastScheduledDate !== todayString) {
              appLog(
                "📱 Scheduling streak reminders because they haven't been scheduled today"
              );
              await get().scheduleStreakReminders();

              // Also schedule adaptive notifications if we don't have any yet
              const scheduledNotifications =
                await Notifications.getAllScheduledNotificationsAsync();
              const hasAdaptiveNotifications = scheduledNotifications.some(
                (n) =>
                  n.identifier === NOTIFICATION_IDS.ADAPTIVE_REMINDER ||
                  n.identifier.startsWith(`${NOTIFICATION_IDS.ADAPTIVE_REMINDER}-day-`)
              );

              if (!hasAdaptiveNotifications) {
                appLog('📱 No adaptive notifications found, scheduling them now');
                await get().scheduleAdaptiveNotifications();
              }
            } else {
              appLog('📱 Streak reminders already scheduled today, skipping');
            }

            // Re-schedule the daily reminder if needed
            const preferredTime = get().preferredNotificationTime;
            if (preferredTime && preferredTime !== 'none') {
              appLog(`📱 Scheduling daily reminder with preferred time: ${preferredTime}`);
              await get().scheduleDailyReminder(preferredTime);
            } else {
              appLog('📱 No preferred notification time set or notifications disabled');
            }
          } else {
            appLog(
              '📱 Notification permissions not granted, skipping notification scheduling'
            );
          }

          appLog('📱 Notification system initialization complete');
        } catch (error) {
          console.error('Failed to initialize notifications:', error);
        }
      },

      // Helper function to list scheduled notifications for debugging
      listScheduledNotifications: async () => {
        try {
          const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

          appLog(
            `--- Currently scheduled notifications: ${scheduledNotifications.length} ---`
          );
          scheduledNotifications.forEach((notification, index) => {
            // Safely extract trigger date if possible
            let triggerDate = 'unknown trigger';
            if (notification.trigger && 'date' in notification.trigger) {
              triggerDate = new Date(notification.trigger.date).toLocaleString();
            }

            appLog(`[${index + 1}] ID: ${notification.identifier}`);
            appLog(`    Title: ${notification.content.title}`);
            appLog(`    Trigger: ${triggerDate}`);
            appLog(`    Data: ${JSON.stringify(notification.content.data)}`);
          });
          appLog('--- End of scheduled notifications ---');
        } catch (error) {
          console.error('Failed to list scheduled notifications:', error);
        }
      },

      // Schedule daily reading reminder based on user's preferred time
      scheduleDailyReminder: async (timeOption: NotificationTimeOption) => {
        try {
          // Skip if user selected 'none'
          if (timeOption === 'none') {
            appLog('User opted out of daily reminders');
            await get().cancelDailyReminder();
            return;
          }

          // Get permission
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            appLog('Notification permission not granted');
            return;
          }

          // Cancel any existing daily reminder
          await get().cancelDailyReminder();

          // Get user's notification time from userStore
          const userStore = useUserStore.getState();
          const userNotificationTime = userStore.notificationTime;

          let hour = 8; // Default to 8 AM
          let minute = 0;

          // If timeOption is 'custom', use the time from userStore
          if (
            timeOption === 'custom' &&
            userNotificationTime &&
            userNotificationTime.includes(':')
          ) {
            const [hours, minutes] = userNotificationTime
              .split(':')
              .map((part) => parseInt(part, 10));
            hour = hours;
            minute = minutes;
            appLog(`📱 Using custom time from userStore: ${hour}:${minute}`);
          } else {
            // Parse time ranges into hours for notifications
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
                // If we get here with a custom time string (HH:MM), parse it
                if (typeof timeOption === 'string' && timeOption.includes(':')) {
                  const [hours, minutes] = timeOption.split(':').map((part) => parseInt(part, 10));
                  hour = hours;
                  minute = minutes;
                  appLog(`📱 Using provided custom time: ${hour}:${minute}`);
                } else {
                  hour = 8; // Default to 8 AM
                }
            }
          }

          // Set up scheduled time for today
          const now = new Date();
          const scheduledTime = new Date();
          scheduledTime.setHours(hour, minute, 0, 0);

          // If the scheduled time has already passed today, schedule for tomorrow
          if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }

          appLog(
            `📱 Scheduling daily reminder for ${timeOption} at ${scheduledTime.toLocaleString()}`
          );

          // Calculate hours until notification
          const hoursUntilNotification =
            (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          appLog(`📱 Daily reminder will fire in ${hoursUntilNotification.toFixed(1)} hours`);

          // Schedule daily notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Your lamb is bleating 🐑',
              body: 'Lead it to green pastures — tap for today’s Word.',
              sound: true,
              data: { type: 'daily-reminder' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
            },
            identifier: NOTIFICATION_IDS.DAILY_REMINDER,
          });

          appLog(
            `📱 Daily reminder notification scheduled for ${hour}:${minute?.toString?.().padStart(2, '0')}`
          );
          appLog(`📱 Notification ID: ${NOTIFICATION_IDS.DAILY_REMINDER}`);
          appLog(`📱 Notification trigger type: DAILY`);

          // Save the selected time preference
          set({ preferredNotificationTime: timeOption });

          // Verify the notification was scheduled
          const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
          const dailyReminder = scheduledNotifications.find(
            (n) => n.identifier === NOTIFICATION_IDS.DAILY_REMINDER
          );

          if (!dailyReminder) {
            console.error('Daily reminder was not scheduled properly');
            throw new Error('Failed to schedule notification');
          }
        } catch (error) {
          console.error('Failed to schedule daily reminder notification:', error);
          throw error;
        }
      },

      // Cancel daily reminder notification
      cancelDailyReminder: async () => {
        try {
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY_REMINDER);
          appLog('Daily reminder notification canceled');
        } catch (error) {
          console.error('Failed to cancel daily reminder notification:', error);
        }
      },

      scheduleStreakReminders: async (test = false) => {
        try {
          if (!get().notificationsEnabled) {
            appLog('Notifications are disabled in the store');
            return;
          }
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            appLog('Notification permission not granted');
            return;
          }

          const now = new Date();
          const todayString = now.toISOString().split('T')[0];

          if (test) {
            const WARNING_DELAY_SEC = 60; // 1 minute
            const BROKEN_DELAY_SEC = 120; // 2 minutes

            const warningTimeTest = new Date(now.getTime() + WARNING_DELAY_SEC * 1000);
            const brokenStreakTimeTest = new Date(now.getTime() + BROKEN_DELAY_SEC * 1000);

            appLog(
              `[TEST] Scheduling streak warning notification in ${WARNING_DELAY_SEC}s → ${warningTimeTest.toLocaleTimeString()}`
            );
            appLog(
              `[TEST] Scheduling broken streak notification in ${BROKEN_DELAY_SEC}s → ${brokenStreakTimeTest.toLocaleTimeString()}`
            );

            // Add more detailed logging about timing
            appLog(
              `[TEST] 🔔 Streak Warning test notification will fire in ${(WARNING_DELAY_SEC / 60).toFixed(1)} minutes`
            );
            appLog(
              `[TEST] ⚠️ Streak Broken test notification will fire in ${(BROKEN_DELAY_SEC / 60).toFixed(1)} minutes`
            );

            await Notifications.cancelAllScheduledNotificationsAsync();
            appLog(
              '[TEST] All existing notifications cleared. Scheduling test notifications...'
            );

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

            // Schedule missed reminder 1 day after broken streak (for test: 3 minutes)
            const MISSED_DELAY_SEC = 180; // 3 minutes for test
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Seat saved at the table 🍞 (Test)',
                body: "Catch yesterday's devotional — no lamb left behind.",
                data: { type: 'missed-reminder', isTest: true },
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: MISSED_DELAY_SEC,
              },
              identifier: `${NOTIFICATION_IDS.MISSED_REMINDER}-test`,
            });

            appLog(
              '[TEST] Verifying scheduled notifications (after test scheduling has completed)...'
            );
            await get().listScheduledNotifications();
            set({ lastScheduledDate: todayString });
          } else {
            await get().cancelStreakNotifications();

            const warningTimeProd = new Date(now);
            warningTimeProd.setHours(21, 0, 0, 0); // 9:00 PM today
            if (warningTimeProd <= now || warningTimeProd.getTime() - now.getTime() < 60000) {
              warningTimeProd.setDate(warningTimeProd.getDate() + 1);
            }

            const brokenStreakTimeProd = new Date(now);
            brokenStreakTimeProd.setDate(brokenStreakTimeProd.getDate() + 1);
            brokenStreakTimeProd.setHours(12, 0, 0, 0); // Noon next day
            if (
              brokenStreakTimeProd <= now ||
              brokenStreakTimeProd.getTime() - now.getTime() < 60000
            ) {
              brokenStreakTimeProd.setDate(brokenStreakTimeProd.getDate() + 1);
            }

            appLog(
              `Scheduling streak warning notification for: ${warningTimeProd.toLocaleString()}`
            );
            appLog(
              `Scheduling broken streak notification for: ${brokenStreakTimeProd.toLocaleString()}`
            );

            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Your streak is gonna be broken!',
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
            const warningHoursFromNow =
              (warningTimeProd.getTime() - now.getTime()) / (1000 * 60 * 60);
            appLog(
              `Scheduled streak warning notification for ${warningTimeProd.toLocaleString()}`
            );
            appLog(
              `🔔 Streak Warning scheduled in ${warningHoursFromNow.toFixed(1)} hours from now`
            );

            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Your lamb is starving!',
                body: 'Follow the Good Shepherd and feed your soul.',
                subtitle: 'Just 60 seconds with Jesus is all you need.',
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
            const brokenHoursFromNow =
              (brokenStreakTimeProd.getTime() - now.getTime()) / (1000 * 60 * 60);
            appLog(
              `Scheduled broken streak notification for ${brokenStreakTimeProd.toLocaleString()}`
            );
            appLog(
              `⚠️ Streak Broken scheduled in ${brokenHoursFromNow.toFixed(1)} hours from now`
            );

            // Schedule missed reminder notification 1 day after broken streak
            const missedReminderTimeProd = new Date(brokenStreakTimeProd);
            missedReminderTimeProd.setDate(missedReminderTimeProd.getDate() + 1); // 1 day after broken streak

            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Seat saved at the table 🍞',
                body: "Catch yesterday's devotional — no lamb left behind.",
                data: { type: 'missed-reminder', isTest: false },
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: missedReminderTimeProd,
              },
              identifier: NOTIFICATION_IDS.MISSED_REMINDER,
            });

            // Calculate and log hours from now for missed reminder
            const missedHoursFromNow =
              (missedReminderTimeProd.getTime() - now.getTime()) / (1000 * 60 * 60);
            appLog(
              `Scheduled missed reminder notification for ${missedReminderTimeProd.toLocaleString()}`
            );
            appLog(
              `🍞 Missed Reminder scheduled in ${missedHoursFromNow.toFixed(1)} hours from now`
            );

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
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.MISSED_REMINDER);
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_FREEZE_REMINDER);
          appLog('Streak notifications canceled');
        } catch (error) {
          console.error('Failed to cancel streak notifications:', error);
        }
      },

      checkAndRescheduleNotifications: async (lastReadingDate) => {
        try {
          // If notifications are disabled, don't proceed
          if (!get().notificationsEnabled) {
            appLog('📱 Notifications are disabled, skipping check and reschedule');
            return;
          }

          // Get current date in YYYY-MM-DD format
          const today = new Date();
          const todayString = today.toISOString().split('T')[0];
          appLog(`📱 Checking notifications status for today (${todayString})`);

          // Check if user has read today
          let hasReadToday = false;
          let lastReadingDateString = 'never';

          if (lastReadingDate && typeof lastReadingDate.toDate === 'function') {
            const lastReadingDateObj = lastReadingDate.toDate();
            lastReadingDateString = lastReadingDateObj.toISOString().split('T')[0];
            hasReadToday = lastReadingDateString === todayString;

            appLog(`📱 Last reading date: ${lastReadingDateString}`);
            appLog(`📱 User has read today: ${hasReadToday ? 'YES' : 'NO'}`);
          } else {
            appLog(`📱 No last reading date available`);
          }

          // Get the date when notifications were last scheduled
          const lastScheduledDate = get().lastScheduledDate;
          appLog(`📱 Last notifications scheduled date: ${lastScheduledDate || 'never'}`);

          // If user has read today, cancel today's notifications and schedule for tomorrow
          if (hasReadToday) {
            appLog(
              '📱 User has read today - cancelling streak notifications and rescheduling for tomorrow'
            );

            // Cancel existing notifications
            await get().cancelStreakNotifications();

            // Schedule new notifications for tomorrow
            await get().scheduleStreakReminders();
          }
          // If notifications haven't been scheduled today yet, schedule them
          else if (lastScheduledDate !== todayString) {
            appLog(
              "📱 Notifications haven't been scheduled today - scheduling streak notifications"
            );
            await get().scheduleStreakReminders();
          } else {
            appLog('📱 No action needed - streak notifications already scheduled for today');
          }
        } catch (error) {
          console.error('Failed to check and reschedule notifications:', error);
        }
      },

      // Schedule adaptive notifications based on current usage time
      scheduleAdaptiveNotifications: async () => {
        try {
          // Check if notifications are enabled
          if (!get().notificationsEnabled) {
            appLog('📱 Adaptive notifications: Notifications are disabled');
            return;
          }

          // Get permission
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            appLog('📱 Adaptive notifications: Permission not granted');
            return;
          }

          // Calculate time for tomorrow, 30 minutes earlier than current time
          const now = new Date();
          const adaptiveTime = new Date(now);
          adaptiveTime.setDate(adaptiveTime.getDate() + 1); // Set to tomorrow
          adaptiveTime.setMinutes(adaptiveTime.getMinutes() - 30); // 30 minutes earlier

          appLog(
            `📱 Adaptive notifications: Setting time to ${adaptiveTime.toLocaleString()}`
          );

          // Store this time for future reference
          set({ lastAdaptiveNotificationTime: adaptiveTime });

          // Cancel existing adaptive notifications
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.ADAPTIVE_REMINDER);

          // Cancel the daily reminder notifications (but not streak warnings)
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY_REMINDER);
          appLog('📱 Cancelled existing daily reminder notifications');

          // Schedule notification for tomorrow at the adaptive time
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "It's your perfect time for reflection",
              body: 'Take a moment to read scripture and connect with God.',
              sound: true,
              data: { type: 'adaptive-reminder' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: adaptiveTime,
            },
            identifier: NOTIFICATION_IDS.ADAPTIVE_REMINDER,
          });

          appLog(`📱 Adaptive notification scheduled for ${adaptiveTime.toLocaleString()}`);

          // Schedule notifications for the rest of the week at the same time
          const daysToSchedule = 6; // Schedule for the next 6 days (week total)
          for (let i = 1; i <= daysToSchedule; i++) {
            const futureDate = new Date(adaptiveTime);
            futureDate.setDate(futureDate.getDate() + i);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Pause by still waters 🕊️",
                body: 'Open today’s verse and breathe with God.',
                sound: true,
                data: { type: 'adaptive-reminder', dayOffset: i },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: futureDate,
              },
              identifier: `${NOTIFICATION_IDS.ADAPTIVE_REMINDER}-day-${i}`,
            });

            appLog(
              `📱 Adaptive notification scheduled for day ${i + 1}: ${futureDate.toLocaleString()}`
            );
          }

          // Verify the notifications were scheduled
          await get().listScheduledNotifications();
        } catch (error) {
          console.error('📱 Failed to schedule adaptive notifications:', error);
        }
      },

      // Update the rescheduleStreakNotificationsForNextDay function to also call scheduleAdaptiveNotifications
      rescheduleStreakNotificationsForNextDay: async () => {
        try {
          // Cancel current streak notifications
          await get().cancelStreakNotifications();

          // Schedule new streak notifications for the next day
          await get().scheduleStreakReminders();

          // Also schedule adaptive notifications based on current time
          // This will replace the daily reminders but keep streak warnings
          await get().scheduleAdaptiveNotifications();

          appLog(
            '📱 Streak notifications and adaptive notifications rescheduled for the next day'
          );
          return true;
        } catch (error) {
          console.error('Failed to reschedule streak notifications for the next day:', error);
          return false;
        }
      },

      // Schedule streak freeze reminder notification
      scheduleStreakFreezeReminder: async (freezesRemaining: number) => {
        try {
          // Check if notifications are enabled
          if (!get().notificationsEnabled) {
            appLog('📱 Notifications are disabled, skipping streak freeze reminder');
            return;
          }

          // Get permission
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            appLog('📱 Notification permission not granted, skipping streak freeze reminder');
            return;
          }

          // Calculate notification time: tomorrow morning at 9:00 AM
          const now = new Date();
          const notificationTime = new Date(now);
          notificationTime.setDate(notificationTime.getDate() + 1); // Tomorrow
          notificationTime.setHours(9, 0, 0, 0); // 9:00 AM

          // If the calculated time is in the past (edge case), add one more day
          if (notificationTime <= now) {
            notificationTime.setDate(notificationTime.getDate() + 1);
          }

          appLog(
            `📱 Scheduling streak freeze reminder for ${notificationTime.toLocaleString()}`
          );

          // Cancel any existing streak freeze notifications
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_FREEZE_REMINDER);

          // Schedule the notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Streak Freeze saved your lamb! 🐑❄️',
              body: `Got 1 minute for God? You have ${freezesRemaining} freeze(s) left!`,
              sound: true,
              data: { 
                type: 'streak-freeze-reminder',
                freezesRemaining 
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: notificationTime,
            },
            identifier: NOTIFICATION_IDS.STREAK_FREEZE_REMINDER,
          });

          const hoursFromNow = (notificationTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          appLog(
            `📱 Streak freeze reminder scheduled successfully in ${hoursFromNow.toFixed(1)} hours`
          );

        } catch (error) {
          console.error('📱 Failed to schedule streak freeze reminder:', error);
        }
      },

      // Cancel streak freeze reminder notification (when user becomes active again)
      cancelStreakFreezeReminder: async () => {
        try {
          await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_FREEZE_REMINDER);
          appLog('📱 Cancelled streak freeze reminder - user is active again');
        } catch (error) {
          console.error('📱 Failed to cancel streak freeze reminder:', error);
        }
      },
    }),
    {
      name: 'notification-store',
      getStorage: () => AsyncStorage,
    }
  )
);
