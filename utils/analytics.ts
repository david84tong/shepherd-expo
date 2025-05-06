import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../app/stores/userStore';
import { Mixpanel } from 'mixpanel-react-native';

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
}

// Mixpanel token - replace with your project token
const MIXPANEL_TOKEN = '12345abcdef'; // Replace with your actual Mixpanel token

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
      // Initialize Mixpanel with trackAutomaticEvents explicitly set to false
      this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, false);
      await this.mixpanel.init();

      // Get or create session ID
      this.sessionId = await this.getOrCreateSessionId();
      
      // Set up default parameters that will be included with all events
      this.defaultParams = {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        buildNumber: Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? 'unknown',
        sessionId: this.sessionId,
        deviceName: Constants.deviceName,
      };

      // Get user ID if available
      const user = useUserStore.getState().getUser();
      this.userId = user ? user.id || 'anonymous' : 'anonymous';
      
      // Set user identity in Mixpanel
      if (this.userId && this.userId !== 'anonymous') {
        this.mixpanel?.identify(this.userId);
      }
      
      // Set super properties for all events
      this.mixpanel?.registerSuperProperties(this.defaultParams);
      
      // Check if analytics is enabled
      const analyticsEnabled = await AsyncStorage.getItem('shepherd-analytics-enabled');
      this.isEnabled = analyticsEnabled !== 'false';
      
      // Opt out of tracking if disabled
      if (!this.isEnabled) {
        this.mixpanel?.optOutTracking();
      }
      
      this.isInitialized = true;
      
      // Log app open event
      this.logEvent(AnalyticsEvent.APP_OPEN, EventCategory.ENGAGEMENT);
      
      console.log('✅ Analytics (Mixpanel) initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize analytics:', error);
    }
  }

  /**
   * Log an event with optional parameters
   */
  public logEvent(
    eventName: string | AnalyticsEvent,
    category: string | EventCategory,
    params: Record<string, any> = {}
  ): void {
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
        category,
        timestamp: now.toISOString(),
        userId: this.userId || 'anonymous',
      };
      
      // Log to console in development
      if (__DEV__) {
        console.log(`📊 ANALYTICS [${category}]: ${eventName}`, eventParams);
      }
      
      // Track event in Mixpanel
      this.mixpanel?.track(eventName.toString(), eventParams);
        
    } catch (error) {
      console.error('Failed to log analytics event:', error);
    }
  }

  /**
   * Log a screen view event
   */
  public logScreenView(screenName: string, params: Record<string, any> = {}): void {
    this.logEvent(
      AnalyticsEvent.SCREEN_VIEW,
      EventCategory.NAVIGATION,
      {
        screenName,
        ...params,
      }
    );
  }

  /**
   * Log a button press event
   */
  public logButtonPress(buttonId: string, screenName: string, params: Record<string, any> = {}): void {
    this.logEvent(
      AnalyticsEvent.BUTTON_PRESS,
      EventCategory.USER_ACTION,
      {
        buttonId,
        screenName,
        ...params,
      }
    );
  }

  /**
   * Log a spiritual activity event
   */
  public logSpiritualActivity(
    activityType: AnalyticsEvent,
    details: Record<string, any> = {}
  ): void {
    this.logEvent(
      activityType,
      EventCategory.SPIRITUAL_ACTIVITY,
      details
    );
  }

  /**
   * Log an error event
   */
  public logError(
    errorMessage: string,
    errorCode?: string | number,
    additionalInfo: Record<string, any> = {}
  ): void {
    this.logEvent(
      AnalyticsEvent.APP_ERROR,
      EventCategory.ERROR,
      {
        errorMessage,
        errorCode,
        ...additionalInfo,
      }
    );
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
    } catch (error) {
      console.error('Failed to set user properties:', error);
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
  }

  /**
   * Check if analytics is enabled
   */
  public isAnalyticsEnabled(): boolean {
    return this.isEnabled;
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export a singleton instance
export const analytics = Analytics.getInstance();

// Export default for consistency
export default analytics; 