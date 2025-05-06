import { useEffect } from 'react';
import analytics, { EventCategory, AnalyticsEvent } from '../../../utils/analytics';

/**
 * Helper functions for onboarding analytics
 * Provides consistent tracking across all onboarding screens
 */

// Screen name mapping
export const OnboardingScreenNames: Record<string, string> = {
  '1': 'Welcome',
  '2': 'Lamb Naming',
  '3': 'Intent Screen',
  '4': 'Spiritual Goal',
  '5': 'Frequency Goal',
  '6': 'Bible Versions',
  '7': 'Path Selection Intro',
  '8': 'Path Selection',
  '9': 'Notifications',
  '10': 'Lamb Customization',
  '11': 'Final Welcome',
  'lambFound': 'Lamb Found',
  'auth': 'Authentication',
  'LoadingScreen': 'Loading Screen',
};

/**
 * Track onboarding screen views
 * @param screenNumber The onboarding screen number
 */
export const useOnboardingScreenTracking = (screenNumber: number) => {
  useEffect(() => {
    const trackScreen = async () => {
      // Ensure analytics is initialized
      if (!analytics.isInitialized) {
        await analytics.init();
      }
      
      // Track screen view
      analytics.logScreenView(`OnboardingScreen${screenNumber}`, {
        screen_number: screenNumber,
      });
      
      // If this is screen 1, also track onboarding start
      if (screenNumber === 1) {
        analytics.logEvent(
          AnalyticsEvent.ONBOARDING_STARTED,
          EventCategory.ONBOARDING
        );
      }
    };
    
    trackScreen();
  }, [screenNumber]);
};

/**
 * Log button presses in onboarding screens
 * @param analytics The analytics instance
 * @param buttonId Identifier for the button
 * @param screenNumber Onboarding screen number
 * @param buttonText Text/label of the button
 * @param additionalParams Additional parameters to track
 */
export const logOnboardingButtonPress = (
  analyticsInstance: typeof analytics,
  buttonId: string,
  screenNumber: number,
  buttonText: string,
  additionalParams: Record<string, any> = {}
) => {
  analyticsInstance.logButtonPress(
    buttonId,
    `OnboardingScreen${screenNumber}`,
    {
      button_text: buttonText,
      screen_number: screenNumber,
      ...additionalParams,
    }
  );
};

/**
 * Track onboarding step completion
 * @param analytics The analytics instance
 * @param screenNumber The completed screen number
 * @param responseData The user's responses on the screen
 */
export const logOnboardingStepCompleted = (
  analyticsInstance: typeof analytics,
  screenNumber: number,
  responseData: Record<string, any> = {}
) => {
  analyticsInstance.logEvent(
    AnalyticsEvent.ONBOARDING_STEP_COMPLETED,
    EventCategory.ONBOARDING,
    {
      screen_number: screenNumber,
      responses: responseData,
    }
  );
};

/**
 * Track onboarding completion
 * @param analytics The analytics instance
 * @param totalScreensViewed Total number of screens viewed
 * @param totalTimeSpent Total time spent in onboarding (seconds)
 */
export const logOnboardingCompleted = (
  analyticsInstance: typeof analytics,
  totalScreensViewed: number,
  totalTimeSpent?: number
) => {
  analyticsInstance.logEvent(
    AnalyticsEvent.ONBOARDING_COMPLETED,
    EventCategory.ONBOARDING,
    {
      total_screens_viewed: totalScreensViewed,
      total_time_spent: totalTimeSpent,
    }
  );
};

export default {
  useOnboardingScreenTracking,
  logOnboardingButtonPress,
  logOnboardingStepCompleted,
  logOnboardingCompleted,
  OnboardingScreenNames,
}; 