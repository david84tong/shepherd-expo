import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { appLog } from '../helper/helper';
import analytics from '../../utils/analytics';

class NotificationService {
  private fcmToken: string | null = null;

  /**
   * Initialize Firebase Cloud Messaging
   * Request permissions and get FCM token
   */
  async initialize(): Promise<void> {
    try {
      // Request permission for iOS
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          appLog('FCM permission not granted on iOS');
          return;
        }
      }

      // Get FCM token
      const token = await messaging().getToken();
      this.fcmToken = token;
      
      appLog(`FCM Token obtained: ${token}`);

      // Save token to user document
      await this.saveFCMTokenToFirestore(token);

      // Listen for token refresh
      messaging().onTokenRefresh(async (newToken) => {
        appLog(`FCM Token refreshed: ${newToken}`);
        this.fcmToken = newToken;
        await this.saveFCMTokenToFirestore(newToken);
      });

      // Set up notification handlers
      this.setupNotificationHandlers();

    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }

  /**
   * Save FCM token to user's Firestore document
   */
  private async saveFCMTokenToFirestore(token: string): Promise<void> {
    try {
      const user = auth().currentUser;
      if (!user) {
        appLog('No authenticated user, cannot save FCM token');
        return;
      }

      await firestore().collection('users').doc(user.uid).update({
        fcmToken: token,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      appLog('FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token to Firestore:', error);
    }
  }

  /**
   * Set up notification event handlers
   */
  private setupNotificationHandlers(): void {
    // Handle notification when app is in foreground
    messaging().onMessage(async (remoteMessage) => {
      appLog('Received foreground notification:', remoteMessage);
      
      // Handle prayer buddy nudge notifications
      if (remoteMessage.data?.type === 'prayer_buddy_nudge') {
        this.handlePrayerBuddyNudge(remoteMessage);
      }
    });

    // Handle notification when app is opened from background/quit state
    messaging().onNotificationOpenedApp((remoteMessage) => {
      appLog('App opened from notification:', remoteMessage);
      
      if (remoteMessage.data?.type === 'prayer_buddy_nudge') {
        this.handlePrayerBuddyNudge(remoteMessage);
      }
    });

    // Handle initial notification when app is opened from quit state
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        appLog('App opened from initial notification:', remoteMessage);
        
        if (remoteMessage.data?.type === 'prayer_buddy_nudge') {
          this.handlePrayerBuddyNudge(remoteMessage);
        }
      }
    });
  }

  /**
   * Handle prayer buddy nudge notification
   */
  private handlePrayerBuddyNudge(remoteMessage: any): void {
    const { senderName, senderUserId, timestamp } = remoteMessage.data || {};
    
    appLog(`Received prayer buddy nudge from ${senderName} (${senderUserId})`);
    
    // Show in-app notification
    this.showPrayerBuddyNudgeAlert(senderName || 'Your prayer buddy');
    
    // Navigate to prayer section if app is opened from nudge
    // This could trigger navigation to the prayer/home screen
    
    // Track analytics for nudge received
    try {
      analytics.logEvent('prayer_buddy_nudge_received', {
        senderUserId,
        senderName,
        timestamp,
        receivedAt: new Date().toISOString()
      });
    } catch (error) {
      appLog('Failed to track nudge received analytics:', error);
    }
  }

  /**
   * Show in-app alert/toast for prayer buddy nudge
   */
  private showPrayerBuddyNudgeAlert(senderName: string): void {
    const message = `🐑 ${senderName} sent you a gentle nudge to join them in prayer!`;
    appLog(message);
    
    // Show native alert for immediate visibility
    // This works cross-platform and doesn't require additional UI store integration
    Alert.alert(
      '🐑 Prayer Buddy Nudge',
      `${senderName} sent you a gentle nudge to join them in prayer!`,
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Pray Now', 
          style: 'default',
          onPress: () => {
            // Navigate to prayer/home screen
            // This could be enhanced to use navigation
            appLog('User tapped Pray Now from nudge notification');
          }
        }
      ]
    );
  }

  /**
   * Get current FCM token
   */
  getFCMToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Clear FCM token (e.g., on logout)
   */
  async clearFCMToken(): Promise<void> {
    try {
      const user = auth().currentUser;
      if (user) {
        await firestore().collection('users').doc(user.uid).update({
          fcmToken: firestore.FieldValue.delete(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
      
      this.fcmToken = null;
      appLog('FCM token cleared');
    } catch (error) {
      console.error('Error clearing FCM token:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;