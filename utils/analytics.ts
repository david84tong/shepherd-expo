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
import { getMixpanelInstance, isAnalyticsEnabled } from './analyticsConfig';

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
  private initializationPromise: Promise<void> | null = null;
  private eventQueue: Array<{eventName: string, params: Record<string, any>}> = [];

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
    // If already initialized, return immediately
    if (this.isInitialized) return Promise.resolve();
    
    // If initialization is in progress, return the existing promise
    if (this.initializationPromise) return this.initializationPromise;

    // Create a new initialization promise
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      console.log("Initializing analytics ******************");
      
      // Check if analytics are enabled based on user age
      const ageBasedAnalyticsEnabled = await isAnalyticsEnabled();
      if (!ageBasedAnalyticsEnabled) {
        console.log("🚫 Analytics disabled for user under 13, skipping initialization");
        this.isInitialized = true;
        return;
      }

      // Get existing Mixpanel instance or create new one
      this.mixpanel = getMixpanelInstance();
      if (!this.mixpanel) {
        this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, false);
        await this.mixpanel.init();
      }
      
      // Always set platform as a super property (not just once)
      this.mixpanel.registerSuperProperties({ 
        platform: Platform.OS,
        $os: Platform.OS === 'ios' ? 'iOS' : 'Android'
      });

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

      // Set user identity in both Mixpanel and Amplitude
      if (this.userId && this.userId !== 'anonymous') {
        // User is already authenticated
        this.mixpanel?.identify(this.userId);
        amplitudeSetUserId(this.userId);
        console.log("✅ Both platforms: Authenticated user ID set:", this.userId);
      } else {
        // Create placeholder ID for anonymous user
        const placeholderId = await this.getOrCreatePlaceholderId();
        this.userId = placeholderId;
        
        // Set placeholder ID in both platforms
        this.mixpanel?.identify(placeholderId);
        amplitudeSetUserId(placeholderId);
        console.log("✅ Both platforms: Anonymous placeholder ID set:", placeholderId);
      }

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

      // Process any queued events
      this.processQueuedEvents();

      // Log app open event
      this.logEvent(AnalyticsEvent.APP_OPEN);
      this.logEvent("app_opening");

      console.log('✅ Analytics (Mixpanel + Amplitude) initialized successfully');
    } catch (error) {
      console.log('❌ Failed to initialize analytics:', error);
      this.isInitialized = false;
      this.initializationPromise = null; // Reset to allow retry
    }
  }


  /**
   * Log an event synchronously (queues if not initialized)
   * This is the original synchronous method that most of the app uses
   */
  public logEvent(eventName: string | AnalyticsEvent, params: Record<string, any> = {}): void {
    if (!this.isInitialized) {
      // Queue the event to be sent once initialized
      this.eventQueue.push({ eventName: eventName.toString(), params });
      
      // Try to initialize if not already in progress
      if (!this.initializationPromise) {
        this.init().then(() => {
          // Process queued events after initialization
          this.processQueuedEvents();
        });
      }
      return;
    }

    // If initialized, log immediately
    this.logEventAsync(eventName, params);
  }

  /**
   * The actual async implementation
   */
  private async logEventAsync(eventName: string | AnalyticsEvent, params: Record<string, any> = {}): Promise<void> {
    // This is the implementation from the previous logEvent
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
      }
    } catch (error) {
      console.log('Failed to log analytics event:', error);
    }
  }

  /**
   * Process any events that were queued before initialization
   */
  private processQueuedEvents(): void {
    if (this.eventQueue.length > 0) {
      console.log(`📊 Processing ${this.eventQueue.length} queued analytics events`);
      
      const queueCopy = [...this.eventQueue];
      this.eventQueue = []; // Clear the queue
      
      queueCopy.forEach(({ eventName, params }) => {
        this.logEventAsync(eventName, params);
      });
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
   * Set user ID for analytics (both Mixpanel and Amplitude)
   */
  public async setUserId(userId: string, isNewUser: boolean = false): Promise<void> {
    const previousUserId = this.userId;
    const wasAnonymous = previousUserId?.startsWith('anon_');
    
    console.log(`🔄 Setting user ID: ${userId} (isNewUser: ${isNewUser}, wasAnonymous: ${wasAnonymous})`);
    
    this.userId = userId;

    // Update identity in Mixpanel
    if (this.mixpanel && userId !== 'anonymous') {
      // If transitioning from anonymous to authenticated and it's a new user signup
      if (wasAnonymous && isNewUser) {
        // Use alias to link the anonymous user to the new authenticated user
        console.log(`🔗 Mixpanel: Aliasing anonymous user ${previousUserId} to authenticated user ${userId}`);
        this.mixpanel.alias(userId, previousUserId!);
      }
      
      // Always identify with the new user ID
      this.mixpanel.identify(userId);
      console.log("✅ Mixpanel: User ID updated:", userId);
    }

    // Update identity in Amplitude
    if (this.amplitudeInitialized && userId !== 'anonymous') {
      // For Amplitude, we handle the transition by setting user properties to link the anonymous session
      if (wasAnonymous && isNewUser) {
        console.log(`🔗 Amplitude: Transitioning from anonymous user ${previousUserId} to authenticated user ${userId}`);
        
        // Set a user property to track the transition
        const identify = new Identify();
        if (previousUserId) {
          identify.set('previous_anonymous_id', previousUserId);
        }
        identify.set('user_transition', 'anonymous_to_authenticated');
        identify.set('transition_timestamp', new Date().toISOString());
        amplitudeIdentify(identify);
        
        // Log a transition event for better tracking
        amplitudeTrack('user_identity_linked', {
          previous_user_id: previousUserId,
          new_user_id: userId,
          transition_type: 'anonymous_to_authenticated'
        });
      }
      
      // Set the new user ID
      amplitudeSetUserId(userId);
      console.log("✅ Amplitude: User ID updated:", userId);
    }

    // Clear the placeholder ID from storage since user is now authenticated
    if (userId !== 'anonymous' && !userId.startsWith('anon_')) {
      await AsyncStorage.removeItem('shepherd-analytics-placeholder-id');
      console.log("🗑️ Cleared placeholder ID from storage");
    }
  }

  /**
   * Set user properties for segmentation (both Mixpanel and Amplitude)
   */
  public setUserProperties(properties: Record<string, any>): void {
    if (!this.isInitialized || !this.isEnabled) return;

    try {
      console.log("🔧 Setting user properties for both platforms:", properties);
      
      // Set properties in Mixpanel
      if (this.mixpanel && this.userId) {
        // Always include platform in user properties
        const propertiesWithPlatform = {
          ...properties,
          platform: Platform.OS,
          $os: Platform.OS === 'ios' ? 'iOS' : 'Android'
        };
        this.mixpanel.getPeople().set(propertiesWithPlatform);
        console.log("✅ Mixpanel: User properties set");
      }

      // Set properties in Amplitude
      if (this.amplitudeInitialized) {
        const identify = new Identify();
        Object.entries(properties).forEach(([key, value]) => {
          identify.set(key, value);
        });
        // Also set platform for Amplitude
        identify.set('platform', Platform.OS);
        identify.set('os', Platform.OS === 'ios' ? 'iOS' : 'Android');
        amplitudeIdentify(identify);
        console.log("✅ Amplitude: User properties set");
      }
    } catch (error) {
      console.log('❌ Failed to set user properties:', error);
    }
  }

  /**
   * Reset the user (for logout) - handles both Mixpanel and Amplitude
   */
  public async resetUser(): Promise<void> {
    if (!this.isInitialized) return;

    const previousUserId = this.userId;
    console.log(`🔄 Resetting user analytics (previous ID: ${previousUserId})`);

    // Clear the stored placeholder ID to force creation of a new one
    await AsyncStorage.removeItem('shepherd-analytics-placeholder-id');
    
    // Create a new placeholder ID for the logged out user
    this.userId = await this.getOrCreatePlaceholderId();

    // Reset identity in Mixpanel
    if (this.mixpanel) {
      this.mixpanel.reset();
      // Identify with the new placeholder ID
      this.mixpanel.identify(this.userId);
      console.log("✅ Mixpanel: User reset and new placeholder ID set:", this.userId);
    }

    // Reset identity in Amplitude
    if (this.amplitudeInitialized) {
      amplitudeReset();
      // Set the new placeholder ID in Amplitude
      amplitudeSetUserId(this.userId);
      console.log("✅ Amplitude: User reset and new placeholder ID set:", this.userId);
    }

    console.log("🗑️ User reset complete, new placeholder ID:", this.userId);
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
   * Get or create a placeholder user ID for anonymous users
   */
  private async getOrCreatePlaceholderId(): Promise<string> {
    const storedPlaceholderId = await AsyncStorage.getItem('shepherd-analytics-placeholder-id');
    if (storedPlaceholderId) {
      return storedPlaceholderId;
    }

    // Create a new placeholder ID with a recognizable prefix
    const newPlaceholderId = `anon_${this.generateUUID()}`;
    await AsyncStorage.setItem('shepherd-analytics-placeholder-id', newPlaceholderId);
    return newPlaceholderId;
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