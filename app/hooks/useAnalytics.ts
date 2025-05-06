import { useEffect, useCallback } from 'react';
import analytics, { AnalyticsEvent, EventCategory } from '../../utils/analytics';
import { usePathStore } from '../stores/pathStore';

/**
 * React hook for using analytics in components
 * Provides convenient methods for logging events
 * and automatically initializes analytics on mount
 */
export const useAnalytics = () => {
  const currentPath = usePathStore(state => state.currentPath);

  // Initialize analytics on first use
  useEffect(() => {
    const initializeAnalytics = async () => {
      if (!analytics.isInitialized) {
        await analytics.init();
      }
    };
    
    initializeAnalytics();
  }, []);

  // Log screen view - call this in useEffect when component mounts
  const logScreenView = useCallback((screenName: string, params?: Record<string, any>) => {
    analytics.logScreenView(screenName, {
      currentPath: currentPath?.pathTitle || 'none',
      ...params
    });
  }, [currentPath]);

  // Log button press with current context
  const logButtonPress = useCallback((buttonId: string, screenName: string, params?: Record<string, any>) => {
    analytics.logButtonPress(buttonId, screenName, {
      currentPath: currentPath?.pathTitle || 'none',
      ...params
    });
  }, [currentPath]);

  // Log spiritual activity
  const logSpiritualActivity = useCallback((
    activityType: AnalyticsEvent,
    details?: Record<string, any>,
  ) => {
    analytics.logSpiritualActivity(activityType, {
      currentPath: currentPath?.pathTitle || 'none',
      ...details
    });
  }, [currentPath]);

  // Log error
  const logError = useCallback((
    errorMessage: string,
    errorCode?: string | number,
    additionalInfo?: Record<string, any>
  ) => {
    analytics.logError(errorMessage, errorCode, {
      currentPath: currentPath?.pathTitle || 'none',
      ...additionalInfo
    });
  }, [currentPath]);

  // Generic event logger
  const logEvent = useCallback((
    eventName: string | AnalyticsEvent,
    category: string | EventCategory,
    params?: Record<string, any>
  ) => {
    analytics.logEvent(eventName, category, {
      currentPath: currentPath?.pathTitle || 'none',
      ...params
    });
  }, [currentPath]);

  return {
    logScreenView,
    logButtonPress,
    logSpiritualActivity,
    logError,
    logEvent,
    
    // Expose event enums for convenience
    AnalyticsEvent,
    EventCategory,
  };
};

export default useAnalytics; 