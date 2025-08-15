import { useEffect, useState } from 'react';
import { useFeatureGate, useConfig, useExperiment, logStatsigEvent, updateStatsigUser } from '../utils/statsig';
import { appLog } from '../helper/helper';

/**
 * Hook for feature gates with automatic re-evaluation
 */
export const useStatsigGate = (gateName: string) => {
  // Call the real hook at the top level to respect Rules of Hooks
  const gateResult = useFeatureGate(gateName);
  const [isEnabled, setIsEnabled] = useState<boolean>(!!gateResult);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      setIsEnabled(!!gateResult);
    } catch (error) {
      appLog(`Error checking gate ${gateName}:`, error);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, [gateResult, gateName]);

  return { isEnabled, isLoading };
};

/**
 * Hook for dynamic configs with automatic re-evaluation
 */
export const useStatsigConfig = (configName: string) => {
  const configValue = useConfig(configName);
  const [config, setConfig] = useState<any>(configValue ?? {});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      setConfig(configValue ?? {});
    } catch (error) {
      appLog(`Error getting config ${configName}:`, error);
      setConfig({});
    } finally {
      setIsLoading(false);
    }
  }, [configValue, configName]);

  return { config, isLoading };
};

/**
 * Hook for experiments with automatic re-evaluation
 */
export const useStatsigExperiment = (experimentName: string) => {
  const expValue = useExperiment(experimentName);
  const [experiment, setExperiment] = useState<any>(expValue ?? {});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Only update local state when the underlying value actually changes.
  // Our Statsig shim returns a new object each call, which would otherwise
  // retrigger this effect on every render and cause a render loop.
  useEffect(() => {
    try {
      const nextValue = expValue?.value;
      const prevValue = (experiment as any)?.value;
      if (nextValue !== prevValue) {
        setExperiment(expValue ?? {});
      }
    } catch (error) {
      appLog(`Error getting experiment ${experimentName}:`, error);
      setExperiment({});
    } finally {
      setIsLoading(false);
    }
    // Depend only on the primitive/serializable value to avoid ref churn
  }, [expValue?.value, experimentName]);

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