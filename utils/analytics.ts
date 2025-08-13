import * as Sentry from '@sentry/react-native';
import { Mixpanel } from 'mixpanel-react-native';
import {
  init as amplitudeInit,
  track as amplitudeTrack,
  setUserId as amplitudeSetUserId,
  identify as amplitudeIdentify,
  Identify,
  reset as amplitudeReset,
} from '@amplitude/analytics-react-native';
import { Platform } from 'react-native';
import { adapty } from 'react-native-adapty';

// Import Statsig event logging
let statsigClient: any = null;

// Function to set Statsig client (called from components that have access to the hook)
export const setStatsigClient = (client: any) => {
  statsigClient = client;
};

// Function to get Statsig client (for accessing experiment data in debug components)
export const getStatsigClient = () => {
  return statsigClient;
};

// Function to log events to Statsig
const logToStatsig = (eventName: string, value?: any, metadata?: Record<string, any>) => {
  try {
    if (statsigClient) {
      statsigClient.logEvent(eventName, value, metadata);
      console.log(`🧪 Logged to Statsig: ${eventName}`, { value, metadata });
    } else {
      console.log(`🧪 Statsig client not available for event: ${eventName}`);
    }
  } catch (error) {
    console.error('❌ Error logging to Statsig:', error);
  }
};

// Mixpanel token
const MIXPANEL_TOKEN = '7178bfcd1e0972001d3e6c066e8fb18b';

// Amplitude API key
const AMPLITUDE_API_KEY = 'd8184bec8ecc538cb1575e61b8ad2171';

// Enable analytics in all environments
const disableAnalytics = false;

class Analytics {
  private mixpanel: Mixpanel | null = null;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) {
      console.log('✅ Analytics already initialized');
      return;
    }

    try {
      // Initialize Mixpanel
      this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, false);
      await this.mixpanel.init();
      console.log('✅ Mixpanel initialized successfully');
      this.mixpanel.track('first_app_open');
      // Initialize Amplitude
      await amplitudeInit(AMPLITUDE_API_KEY);
      console.log('✅ Amplitude initialized successfully');

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing analytics:', error);
      Sentry.captureException(error);
    }
  }

  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (disableAnalytics) {
      console.log(
        `🐾 Tracking event: ${eventName}${properties ? `, ${JSON.stringify(properties)}` : ''} 🙈 Analytics DISABLED in dev`
      );
      return;
    }

    try {
      // Ensure every event includes platform for clean breakdowns
      const mergedProperties: Record<string, any> = {
        ...(properties || {}),
        platform: properties?.platform ?? Platform.OS,
      };
      console.log(
        `🐾 Tracking event: ${eventName}${mergedProperties ? `, ${JSON.stringify(mergedProperties)}` : ''}`
      );

      if (this.mixpanel) {
        this.mixpanel.track(eventName, mergedProperties);
      }

      amplitudeTrack(eventName, mergedProperties);
      
      // Also log to Statsig
      logToStatsig(eventName, eventName, mergedProperties);
    } catch (error) {
      console.error('❌ Error tracking event:', eventName, error);
      Sentry.captureException(error);
    }
  }

  // Backwards-compat alias used in some components
  logEvent(eventName: string, properties?: Record<string, any>) {
    this.trackEvent(eventName, properties);
  }

  async identifyUser(userId: string, userProperties?: Record<string, any>) {
    if (disableAnalytics) {
      console.log('🙈 Analytics DISABLED in dev - would identify user:', userId);
      return;
    }

    try {
      console.log('🔐 Identifying user:', userId);

      // Mixpanel
      if (this.mixpanel) {
        this.mixpanel.identify(userId);
        if (userProperties) {
          this.mixpanel.getPeople().set(userProperties);
        }
      }

      // Amplitude
      amplitudeSetUserId(userId);
      if (userProperties) {
        const identify = new Identify();
        const mergedUserProps: Record<string, any> = {
          ...userProperties,
          platform: userProperties.platform ?? Platform.OS,
        };
        Object.entries(mergedUserProps).forEach(([key, value]) => {
          identify.set(key, value);
        });
        amplitudeIdentify(identify);
      }

      // Adapty integration with Mixpanel user ID
      try {
        await adapty.updateAttribution({ mixpanel_user_id: userId }, 'custom');
        console.log('✅ Adapty integration with Mixpanel user ID set successfully');
      } catch (adaptyError) {
        console.error('❌ Error setting Adapty integration identifier:', adaptyError);
      }

      // Statsig user identification
      try {
        if (statsigClient && statsigClient.updateUserSync) {
          statsigClient.updateUserSync({ userID: userId, ...userProperties });
          console.log('✅ Statsig user identified successfully:', userId);
        } else {
          console.log('🧪 Statsig client not available for user identification');
        }
      } catch (statsigError) {
        console.error('❌ Error identifying user in Statsig:', statsigError);
      }

      console.log('✅ User identified successfully');
    } catch (error) {
      console.error('❌ Error identifying user:', userId, error);
      Sentry.captureException(error);
    }
  }

  async reset() {
    if (disableAnalytics) {
      console.log('🙈 Analytics DISABLED in dev - would reset user');
      return;
    }

    try {
      console.log('🔄 Resetting analytics user');

      // Mixpanel
      if (this.mixpanel) {
        this.mixpanel.reset();
      }

      // Amplitude
      amplitudeReset();

      console.log('✅ Analytics reset successfully');
    } catch (error) {
      console.error('❌ Error resetting analytics:', error);
      Sentry.captureException(error);
    }
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Helper functions for backward compatibility
export const initializeAnalytics = () => analytics.init();
export const trackEvent = (eventName: string, properties?: Record<string, any>) =>
  analytics.trackEvent(eventName, properties);
export const identifyUser = (userId: string, userProperties?: Record<string, any>) =>
  analytics.identifyUser(userId, userProperties);
export const reset = () => analytics.reset();

// For backward compatibility with old imports
export default {
  init: () => analytics.init(),
  trackEvent: (eventName: string, properties?: Record<string, any>) =>
    analytics.trackEvent(eventName, properties),
  logEvent: (eventName: string, properties?: Record<string, any>) =>
    analytics.trackEvent(eventName, properties),
  identifyUser: (userId: string, userProperties?: Record<string, any>) =>
    analytics.identifyUser(userId, userProperties),
  reset: () => analytics.reset(),
  isInitialized: true, // Always return true since we handle initialization internally
};
