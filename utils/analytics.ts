import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../app/stores/userStore';
import { Mixpanel } from 'mixpanel-react-native';
import { 
  init as amplitudeInit, 
  track as amplitudeTrack, 
  setUserId as amplitudeSetUserId, 
  identify as amplitudeIdentify,
  Identify,
  reset as amplitudeReset
} from '@amplitude/analytics-react-native';

// schema for analytics
// Screenname: Verb
// eg: WelcomeScreen: Tapped Continue
// AgeScreen: Tapped Continue, params: { age: 25-35 }

// Event categories for better organization
export enum EventCategory {
  NAVIGATION = 'navigation',
  USER_ACTION = 'user_action',
  SPIRITUAL_ACTIVITY = 'spiritual_activity',
  ENGAGEMENT = 'engagement',
  ERROR = 'error',
  ONBOARDING = 'onboarding',
  IN_APP_PURCHASE = 'in_app_purchase',
}

// Common events for consistency
export enum AnalyticsEvent {
  // Navigation events
  SCREEN_VIEW = 'screen_view',
  TAB_SELECTED = 'tab_selected',

  // User action events
  BUTTON_PRESS = 'button_press',
  FEATURE_TOGGLE = 'feature_toggle',
  USER_PREFERENCE_CHANGE = 'user_preference_change',

  // Spiritual activity events
  BIBLE_READING_STARTED = 'bible_reading_started',
  BIBLE_READING_COMPLETED = 'bible_reading_completed',
  PRAYER_STARTED = 'prayer_started',
  PRAYER_COMPLETED = 'prayer_completed',
  REFLECTION_STARTED = 'reflection_started',
  REFLECTION_COMPLETED = 'reflection_completed',
  DAILY_BONUS_EARNED = 'daily_bonus_earned',
  STREAK_MILESTONE = 'streak_milestone',

  // Engagement events
  APP_OPEN = 'app_open',
  APP_BACKGROUND = 'app_background',
  NOTIFICATION_RECEIVED = 'notification_received',
  NOTIFICATION_OPENED = 'notification_opened',
  SHARE_CONTENT = 'share_content',

  // Error events
  APP_ERROR = 'app_error',

  // Onboarding events
  ONBOARDING_STARTED = 'onboarding_started',
  ONBOARDING_STEP_COMPLETED = 'onboarding_step_completed',
  ONBOARDING_COMPLETED = 'onboarding_completed',

  // In-app purchase events
  PURCHASE_INITIATED = 'purchase_initiated',
  PURCHASE_COMPLETED = 'purchase_completed',
  PURCHASE_CANCELLED = 'purchase_cancelled',
  PURCHASE_FAILED = 'purchase_failed',
  
  // Cancellation flow events
  CANCELLATION_FLOW_OPENED = 'cancellation_flow_opened',
  CANCELLATION_FEEDBACK_SUBMITTED = 'cancellation_feedback_submitted',
}

// Mixpanel token - replace with your project token
const MIXPANEL_TOKEN = '7178bfcd1e0972001d3e6c066e8fb18b'; // Replace with your actual Mixpanel token

// Amplitude API key - replace with your actual Amplitude API key
// Get this from: https://app.amplitude.com/login/norastudios?next=%2Fdata%2Fnorastudios%2FONG%2Fhome%2Fmain%2Flatest
// Go to Settings > Projects > [Your Project] > API Keys
const AMPLITUDE_API_KEY = 'd8184bec8ecc538cb1575e61b8ad2171'; // Replace with your actual Amplitude API key

/**
 * Analytics wrapper class for tracking user events
 * This provides a consistent interface for tracking events across the app
 * and abstracts the underlying analytics implementation
 */
class Analytics {
  private static instance: Analytics;
  public isInitialized: boolean = false;
  private sessionId: string = '';
  private defaultParams: Record<string, any> = {};
  private userId: string | null = null;
  private isEnabled: boolean = true;
  private mixpanel: Mixpanel | null = null;
  private amplitudeInitialized: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialization will be deferred to init() method
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  /**
   * Initialize the analytics system
   * Sets up device info and session tracking
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log("Initializing analytics ******************");
      // Initialize Mixpanel with trackAutomaticEvents explicitly set to false
      this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, false);
      await this.mixpanel.init();
      this.mixpanel.registerSuperPropertiesOnce({ platform: Platform.OS });

      // Initialize Amplitude
      await amplitudeInit(AMPLITUDE_API_KEY);
      this.amplitudeInitialized = true;

      // Get or create session ID
      this.sessionId = await this.getOrCreateSessionId();

      // Set up default parameters that will be included with all events
      this.defaultParams = {
        platformVersion: Platform.Version,
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        buildNumber:
          Constants.expoConfig?.ios?.buildNumber ??
          Constants.expoConfig?.android?.versionCode ??
          'unknown',
        sessionId: this.sessionId,
        deviceName: Constants.deviceName,
      };

      // Get user ID if available
      const user = useUserStore.getState().getUser?.();
      this.userId = user ? user.id || 'anonymous' : 'anonymous';

      // Set user identity in Mixpanel
      if (this.userId && this.userId !== 'anonymous') {
        this.mixpanel?.identify(this.userId);
      }

      // Set user identity in Amplitude
      if (this.userId && this.userId !== 'anonymous') {
        amplitudeSetUserId(this.userId);
      }
      this.mixpanel?.registerSuperPropertiesOnce({ platform: Platform.OS });

      // Set super properties for all events in Mixpanel
      this.mixpanel?.registerSuperProperties(this.defaultParams);

      // Set user properties in Amplitude using Identify
      if (this.amplitudeInitialized) {
        const identify = new Identify();
        Object.entries(this.defaultParams).forEach(([key, value]) => {
          identify.set(key, value);
        });
        amplitudeIdentify(identify);
      }

      // Check if analytics is enabled
      const analyticsEnabled = await AsyncStorage.getItem('shepherd-analytics-enabled');
      this.isEnabled = analyticsEnabled !== 'false';

      // Opt out of tracking if disabled
      if (!this.isEnabled) {
        this.mixpanel?.optOutTracking();
        // Amplitude doesn't have a direct opt-out method, but we can control tracking at the event level
      }

      this.isInitialized = true;

      // Log app open event
      this.logEvent(AnalyticsEvent.APP_OPEN);
      this.logEvent("app_opening");

      console.log('✅ Analytics (Mixpanel + Amplitude) initialized successfully');
    } catch (error) {
      console.log('❌ Failed to initialize analytics:', error);
    }
  }

  /**
   * Log an event with optional parameters
   */
  public logEvent(eventName: string | AnalyticsEvent, params: Record<string, any> = {}): void {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized. Call init() first.');
      return;
    }

    if (!this.isEnabled) {
      return; // Silently ignore if analytics is disabled
    }

    try {
      // Get current timestamp
      const now = new Date();

      // Combine default params with provided params
      const eventParams = {
        ...params,
        timestamp: now.toISOString(),
        userId: this.userId || 'anonymous',
      };

      // Log to console in development
      if (__DEV__) {
        console.log(`📊 ANALYTICS ${eventName}`, eventParams);
      }

      // Track event in Mixpanel
      this.mixpanel?.track(eventName?.toString(), eventParams);

      // Track event in Amplitude
      if (this.amplitudeInitialized) {
        
        amplitudeTrack(eventName?.toString(), eventParams);
        console.log("EVENT TRACK WITH AMPLITUDE");
      }
    } catch (error) {
      console.log('Failed to log analytics event:', error);
    }
  }

  /**
   * Log an error event
   */
  public logError(
    errorMessage: string,
    errorCode?: string | number,
    additionalInfo: Record<string, any> = {}
  ): void {
    this.logEvent(AnalyticsEvent.APP_ERROR, {
      errorMessage,
      errorCode,
      ...additionalInfo,
    });
  }

  /**
   * Set user ID for analytics
   */
  public setUserId(userId: string): void {
    this.userId = userId;

    // Update identity in Mixpanel
    if (this.mixpanel && userId !== 'anonymous') {
      this.mixpanel.identify(userId);
    }

    // Update identity in Amplitude
    if (this.amplitudeInitialized && userId !== 'anonymous') {
      amplitudeSetUserId(userId);
    }
  }

  /**
   * Set user properties for segmentation
   */
  public setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized || !this.isEnabled) return;

    try {
      if (this.mixpanel && this.userId) {
        this.mixpanel.getPeople().set(properties);
      }

      if (this.amplitudeInitialized) {
        const identify = new Identify();
        Object.entries(properties).forEach(([key, value]) => {
          identify.set(key, value);
        });
        amplitudeIdentify(identify);
      }
    } catch (error) {
      console.log('Failed to set user properties:', error);
    }
  }

  /**
   * Reset the user (for logout)
   */
  public resetUser(): void {
    if (!this.isInitialized) return;

    this.userId = 'anonymous';

    // Reset identity in Mixpanel
    if (this.mixpanel) {
      this.mixpanel.reset();
    }

    // Reset identity in Amplitude
    if (this.amplitudeInitialized) {
      amplitudeReset();
    }
  }

  /**
   * Enable or disable analytics
   */
  public async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await AsyncStorage.setItem('shepherd-analytics-enabled', enabled ? 'true' : 'false');

    // Update Mixpanel tracking
    if (this.mixpanel) {
      if (enabled) {
        this.mixpanel.optInTracking();
      } else {
        this.mixpanel.optOutTracking();
      }
    }

    // Amplitude doesn't have a direct enable/disable method, but we control it at the event level
    // The isEnabled flag will prevent events from being sent
  }

  /**
   * Check if analytics is enabled
   */
  public isAnalyticsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Test method to verify analytics integration
   * Call this method to send a test event to both Mixpanel and Amplitude
   */
  public testAnalytics(): void {
    this.logEvent('test_analytics_integration', {
      testParam: 'test_value',
      timestamp: new Date().toISOString(),
      source: 'manual_test',
    });
    console.log('🧪 Test analytics event sent to both Mixpanel and Amplitude');
  }

  /**
   * Get or create a unique session ID
   */
  private async getOrCreateSessionId(): Promise<string> {
    const storedSessionId = await AsyncStorage.getItem('shepherd-analytics-session-id');
    if (storedSessionId) {
      return storedSessionId;
    }

    // Create a new session ID
    const newSessionId = this.generateUUID();
    await AsyncStorage.setItem('shepherd-analytics-session-id', newSessionId);
    return newSessionId;
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v?.toString(16);
    });
  }
}

// Export a singleton instance
export const analytics = Analytics.getInstance();

// Export default for consistency
export default analytics;