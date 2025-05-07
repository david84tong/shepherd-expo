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
  scheduleStreakReminders: () => Promise<void>;
  
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
}

// Configure notification behavior
export const configureNotifications = async () => {
  try {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        // Add required properties
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
      
      scheduleStreakReminders: async () => {
        try {
          // First, check if notifications are enabled in the store
          if (!get().notificationsEnabled) {
            console.log('Notifications are disabled in the store');
            return;
          }
          
          // Get permission status
          const { status } = await Notifications.getPermissionsAsync();
          if (status !== 'granted') {
            console.log('Notification permission not granted');
            return;
          }
          
          // Cancel existing streak notifications before scheduling new ones
          await get().cancelStreakNotifications();
          
          // Get current date
          const today = new Date();
          const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Set the time for the first warning (7 PM today)
          const warningTime = new Date(today);
          warningTime.setHours(19, 0, 0, 0); // 7:00 PM
          
          // If it's already past 7 PM, schedule for tomorrow
          if (today.getHours() >= 19) {
            warningTime.setDate(warningTime.getDate() + 1);
          }
          
          // Schedule the streak warning notification (7 PM)
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Your streak is gonna be broken!",
              body: "Don't forget to read your Bible today to maintain your streak.",
              data: { type: 'streak-warning' },
              sound: true,
            },
            trigger: {
              date: warningTime,
              repeats: true,
              channelId: 'streak-reminders',
            },
            identifier: NOTIFICATION_IDS.STREAK_WARNING,
          });
          
          console.log(`Scheduled streak warning notification for ${warningTime.toLocaleString()}`);
          
          // Set the time for the broken streak notification (next day)
          const brokenStreakTime = new Date(today);
          brokenStreakTime.setDate(brokenStreakTime.getDate() + 1);
          brokenStreakTime.setHours(12, 0, 0, 0); // Noon the next day
          
          // Schedule the broken streak notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Your lamb is dying!",
              body: "Be a good shepherd and come back.",
              subtitle: "Feed your lamb and your soul",
              data: { type: 'streak-broken' },
              sound: true,
            },
            trigger: {
              date: brokenStreakTime,
              repeats: true,
              channelId: 'streak-reminders',
            },
            identifier: NOTIFICATION_IDS.STREAK_BROKEN,
          });
          
          console.log(`Scheduled broken streak notification for ${brokenStreakTime.toLocaleString()}`);
          
          // Save the date when notifications were scheduled
          set({ lastScheduledDate: todayString });
          
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
          
          if (lastReadingDate) {
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
