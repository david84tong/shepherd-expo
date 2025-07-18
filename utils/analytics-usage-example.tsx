/**
 * PostHog Analytics Usage Examples
 * 
 * This file demonstrates how to use PostHog analytics in the Shepherd app.
 * PostHog is now integrated alongside Mixpanel and Amplitude.
 */

import analytics, { AnalyticsEvent } from './analytics';

/**
 * Example: Track a screen view
 */
export const trackScreenView = (screenName: string, additionalParams?: Record<string, any>) => {
  analytics.logEvent(AnalyticsEvent.SCREEN_VIEW, {
    screen_name: screenName,
    ...additionalParams
  });
};

/**
 * Example: Track user engagement with Bible reading
 */
export const trackBibleReadingStarted = (book: string, chapter: number, translation: string) => {
  analytics.logEvent(AnalyticsEvent.BIBLE_READING_STARTED, {
    book,
    chapter,
    translation,
    timestamp: new Date().toISOString()
  });
};

/**
 * Example: Track prayer completion
 */
export const trackPrayerCompleted = (prayerType: string, duration: number) => {
  analytics.logEvent(AnalyticsEvent.PRAYER_COMPLETED, {
    prayer_type: prayerType,
    duration_seconds: duration,
    timestamp: new Date().toISOString()
  });
};

/**
 * Example: Track streak milestone
 */
export const trackStreakMilestone = (streakDays: number, milestoneType: string) => {
  analytics.logEvent(AnalyticsEvent.STREAK_MILESTONE, {
    streak_days: streakDays,
    milestone_type: milestoneType,
    timestamp: new Date().toISOString()
  });
};

/**
 * Example: Track onboarding progress
 */
export const trackOnboardingStep = (stepNumber: number, stepName: string, completed: boolean) => {
  analytics.logEvent(AnalyticsEvent.ONBOARDING_STEP_COMPLETED, {
    step_number: stepNumber,
    step_name: stepName,
    completed,
    timestamp: new Date().toISOString()
  });
};

/**
 * Example: Track in-app purchase
 */
export const trackPurchase = (productId: string, price: number, currency: string, success: boolean) => {
  const eventName = success ? AnalyticsEvent.PURCHASE_COMPLETED : AnalyticsEvent.PURCHASE_FAILED;
  
  analytics.logEvent(eventName, {
    product_id: productId,
    price,
    currency,
    timestamp: new Date().toISOString()
  });
};

/**
 * Example: Track user preferences
 */
export const trackUserPreferenceChange = (preferenceKey: string, oldValue: any, newValue: any) => {
  analytics.logEvent(AnalyticsEvent.USER_PREFERENCE_CHANGE, {
    preference_key: preferenceKey,
    old_value: oldValue,
    new_value: newValue,
    timestamp: new Date().toISOString()
  });
};

/**
 * Example: Track feature usage
 */
export const trackFeatureUsage = (featureName: string, action: string, additionalData?: Record<string, any>) => {
  analytics.logEvent('feature_used', {
    feature_name: featureName,
    action,
    ...additionalData,
    timestamp: new Date().toISOString()
  });
};

/**
 * Example: Track error events
 */
export const trackError = (errorMessage: string, errorCode?: string, context?: Record<string, any>) => {
  analytics.logError(errorMessage, errorCode, context);
};

/**
 * Example: Set user properties for segmentation
 */
export const setUserProperties = (properties: Record<string, any>) => {
  analytics.setUserProperties(properties);
};

/**
 * Example: Test analytics integration
 */
export const testAnalyticsIntegration = () => {
  analytics.testAnalytics();
};

/**
 * Usage in React components:
 * 
 * import { trackScreenView, trackBibleReadingStarted } from '~/utils/analytics-usage-example';
 * 
 * // In your component
 * useEffect(() => {
 *   trackScreenView('HomeScreen');
 * }, []);
 * 
 * const handleBibleReading = () => {
 *   trackBibleReadingStarted('John', 3, 'NIV');
 *   // ... rest of your logic
 * };
 */ 