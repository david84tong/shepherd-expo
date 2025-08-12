import { useEffect, useState } from 'react';
import { useFeatureGate, useConfig, useExperiment, logStatsigEvent, updateStatsigUser } from '../utils/statsig';
import { appLog } from '../helper/helper';

/**
 * Hook for feature gates with automatic re-evaluation
 */
export const useStatsigGate = (gateName: string) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkGate = () => {
      try {
        const enabled = useFeatureGate(gateName);
        setIsEnabled(enabled);
        setIsLoading(false);
      } catch (error) {
        appLog(`Error checking gate ${gateName}:`, error);
        setIsEnabled(false);
        setIsLoading(false);
      }
    };

    checkGate();
  }, [gateName]);

  return { isEnabled, isLoading };
};

/**
 * Hook for dynamic configs with automatic re-evaluation
 */
export const useStatsigConfig = (configName: string) => {
  const [config, setConfig] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getConfig = () => {
      try {
        const configValue = useConfig(configName);
        setConfig(configValue);
        setIsLoading(false);
      } catch (error) {
        appLog(`Error getting config ${configName}:`, error);
        setConfig({});
        setIsLoading(false);
      }
    };

    getConfig();
  }, [configName]);

  return { config, isLoading };
};

/**
 * Hook for experiments with automatic re-evaluation
 */
export const useStatsigExperiment = (experimentName: string) => {
  const [experiment, setExperiment] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getExperiment = () => {
      try {
        const experimentValue = useExperiment(experimentName);
        setExperiment(experimentValue);
        setIsLoading(false);
      } catch (error) {
        appLog(`Error getting experiment ${experimentName}:`, error);
        setExperiment({});
        setIsLoading(false);
      }
    };

    getExperiment();
  }, [experimentName]);

  return { experiment, isLoading };
};

/**
 * Hook for logging events with convenience methods
 */
export const useStatsigEvents = () => {
  const logEvent = (eventName: string, value?: string | number, metadata?: Record<string, any>) => {
    logStatsigEvent(eventName, value, metadata);
  };

  // Convenience methods for common events
  const logButtonClick = (buttonName: string, screen?: string) => {
    logEvent('button_click', buttonName, { screen, timestamp: Date.now() });
  };

  const logScreenView = (screenName: string, duration?: number) => {
    logEvent('screen_view', screenName, { duration, timestamp: Date.now() });
  };

  const logFeatureUsage = (featureName: string, action: string) => {
    logEvent('feature_usage', featureName, { action, timestamp: Date.now() });
  };

  const logExperimentInteraction = (experimentName: string, variant: string, action: string) => {
    logEvent('experiment_interaction', experimentName, { 
      variant, 
      action, 
      timestamp: Date.now() 
    });
  };

  return {
    logEvent,
    logButtonClick,
    logScreenView,
    logFeatureUsage,
    logExperimentInteraction,
  };
};

/**
 * Hook for updating user context when user data changes
 */
export const useStatsigUserSync = () => {
  const syncUser = async () => {
    try {
      await updateStatsigUser();
    } catch (error) {
      appLog('Error syncing user to Statsig:', error);
    }
  };

  return { syncUser };
};