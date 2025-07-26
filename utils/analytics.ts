import { Platform } from 'react-native';
import { Mixpanel } from 'mixpanel-react-native';
import Constants from 'expo-constants';
import {
  init as amplitudeInit,
  track as amplitudeTrack,
  setUserId as amplitudeSetUserId,
  identify as amplitudeIdentify,
  Identify,
  reset as amplitudeReset,
} from '@amplitude/analytics-react-native';

// NOTE: keep the same tokens currently used in the project
const MIXPANEL_TOKEN = '7178bfcd1e0972001d3e6c066e8fb18b';
const AMPLITUDE_API_KEY = 'd8184bec8ecc538cb1575e61b8ad2171';

/**
 * Unified analytics wrapper around Mixpanel & Amplitude.
 * This mirrors the lightweight service used in the reference code while
 * preserving the old public API (logEvent / setUserId / setUserProperties)
 * so existing screens do not break.
 */
class Analytics {
  private static _instance: Analytics | null = null;

  private mixpanel: Mixpanel | null = null;
  private amplitudeReady = false;
  private ready = false;

  private constructor() {}

  static get instance(): Analytics {
    if (!Analytics._instance) {
      Analytics._instance = new Analytics();
    }
    return Analytics._instance;
  }

  /** Initialise both SDKs. Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.ready) return;

    try {
      // Mixpanel
      this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, false);
      await this.mixpanel.init();
      this.mixpanel.registerSuperPropertiesOnce({ platform: Platform.OS });

      // Amplitude
      await amplitudeInit(AMPLITUDE_API_KEY);
      this.amplitudeReady = true;

      this.ready = true;
      console.log('✅ Analytics (Mixpanel + Amplitude) initialised');
    } catch (err) {
      console.error('❌ Failed to initialise analytics:', err);
    }
  }

  /** Track an event with optional properties */
  trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.ready) {
      console.warn('[Analytics] trackEvent called before init');
      return;
    }

    try {
      this.mixpanel?.track(eventName, properties);
      if (this.amplitudeReady) {
        amplitudeTrack(eventName, properties);
      }
    } catch (err) {
      console.error('❌ Failed to track event:', eventName, err);
    }
  }

  /** Identify the current user */
  identifyUser(userId: string, userProperties: Record<string, any> = {}): void {
    if (!this.ready) {
      console.warn('[Analytics] identifyUser called before init');
      return;
    }

    try {
      // Mixpanel
      this.mixpanel?.identify(userId);
      if (Object.keys(userProperties).length) {
        this.mixpanel?.getPeople().set(userProperties);
      }

      // Amplitude
      amplitudeSetUserId(userId);
      if (this.amplitudeReady && Object.keys(userProperties).length) {
        const identify = new Identify();
        Object.entries(userProperties).forEach(([k, v]) => identify.set(k, v));
        amplitudeIdentify(identify);
      }
    } catch (err) {
      console.error('❌ Failed to identify user:', err);
    }
  }

  /** Update user properties **after** the user has been identified */
  setUserProperties(userProperties: Record<string, any>): void {
    if (!this.ready) return;
    this.identifyUser('', userProperties); // Will just set properties on the existing identity
  }

  /** Reset the current user (e.g., on logout) */
  reset(): void {
    if (!this.ready) return;
    this.mixpanel?.reset();
    amplitudeReset();
  }

  /** Utility to expose readiness */
  get isReady() {
    return this.ready;
  }

  /** LEGACY API BRIDGE – maintain compatibility with existing calls */
  logEvent(eventName: string, properties: Record<string, any> = {}) {
    this.trackEvent(eventName, properties);
  }

  /** LEGACY: maintain existing logError helper */
  logError(
    errorMessage: string,
    errorCode?: string | number,
    additionalInfo: Record<string, any> = {}
  ) {
    this.trackEvent(AnalyticsEvent.APP_ERROR, {
      errorMessage,
      errorCode,
      ...additionalInfo,
    });
  }

  setUserId(userId: string) {
    this.identifyUser(userId);
  }
}

// Create the singleton immediately so other modules can import it directly.
export const analytics = Analytics.instance;

// Convenience named exports mirroring reference-style helpers
export const initAnalytics = () => analytics.init();
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => analytics.trackEvent(eventName, properties);
export const identifyUser = (
  userId: string,
  userProperties?: Record<string, any>
) => analytics.identifyUser(userId, userProperties);
export const setUserProperties = (props: Record<string, any>) =>
  analytics.setUserProperties(props);

// --- Legacy enum exports (retained for backwards-compatibility) ---------------
export enum EventCategory {
  NAVIGATION = 'navigation',
  USER_ACTION = 'user_action',
  SPIRITUAL_ACTIVITY = 'spiritual_activity',
  ENGAGEMENT = 'engagement',
  ERROR = 'error',
  ONBOARDING = 'onboarding',
  IN_APP_PURCHASE = 'in_app_purchase',
}

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
// -----------------------------------------------------------------------------

export default analytics;