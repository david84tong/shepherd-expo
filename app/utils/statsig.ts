// Expo-first Statsig bindings
import React, { PropsWithChildren, useEffect } from 'react';
let ExpoStatsig: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoStatsig = require('@statsig/expo-bindings');
} catch {}
import remoteConfig from '@react-native-firebase/remote-config';
import auth from '@react-native-firebase/auth';
import { appLog } from '../helper/helper';
import { useUserStore } from '../stores/userStore';

// Statsig configuration
const STATSIG_CLIENT_KEY = 'client-LAixqahMmfzNlU3BfjILljTL4KaWeGAG0lJhv2pxBAv';

// Toggle: allow Remote Config fallback when native bindings are unavailable (Expo/dev)
// Set to false to strictly require the native Statsig SDK and surface an error instead of fallback.
const ENABLE_STATSIG_RC_FALLBACK = false;

// For provider-based approach, we'll track initialization differently
let statsigClient: any = null;

// Create a lightweight fallback client that mimics a subset of Statsig's API
// and sources values from Firebase Remote Config. This enables experiments and
// gates to work in Expo/dev without the native Statsig SDK.
function createFallbackStatsigClient() {
  const rc = remoteConfig();
  appLog('🧪 [Statsig] Using fallback Remote Config client (native bindings unavailable)');

  function mapExperimentToObject(name: string) {
    try {
      switch (name) {
        case 'path_feature':
          return { path_shown: rc.getValue('path_feature_enabled').asBoolean() };
        case 'prayer_gen_on':
          return { generate_prayer_for_user: rc.getValue('prayer_gen_on').asBoolean() };
        case 'gpt-model':
          {
            const model = rc.getValue('gptModel').asString();
            appLog('🧪 [Statsig/Fallback] gpt-model → RC value:', model);
            return { gptModel: model };
          }
        case 'exp_streak_after_daily_reading':
          return { streak_after_reading_flag: rc.getValue('streak_after_reading_flag').asBoolean() };
        default: {
          // Best-effort: try boolean, else string
          const val = rc.getValue(name);
          const str = val?.asString?.();
          if (str === 'true' || str === 'false') return { value: str === 'true' };
          return { value: str };
        }
      }
    } catch {
      return { value: null };
    }
  }

  return {
    // Minimal gate check
    checkGate(gateName: string) {
      try {
        return rc.getValue(gateName).asBoolean();
      } catch {
        return false;
      }
    },

    // Minimal experiment API
    getExperiment(expName: string) {
      const obj = mapExperimentToObject(expName);
      return {
        get(key: string, defaultValue?: any) {
          // Reuse existing helper to read param consistently
          return getExperimentParamFromRC(expName, key, defaultValue);
        },
        getValue() {
          return obj;
        },
        // Debug fields to mimic RN SDK shape used in debug UI
        groupName: 'fallback-rc',
        ruleID: 'remote-config',
      } as any;
    },

    // No-op logging/user updates for parity with analytics integration
    logEvent(_name: string, _value?: any, _metadata?: Record<string, any>) {},
    updateUserSync(_user: any) {},
  } as const;
}

/**
 * Initialize Statsig with user context - now using provider approach
 */
export const initializeStatsig = async (): Promise<void> => {
  try {
    appLog('🧪 Statsig initialization will be handled by StatsigProviderRN');
    // With the provider approach, initialization happens automatically
    // We just need to make sure the provider is set up correctly
  } catch (error) {
    appLog('❌ Error with Statsig initialization:', error);
    throw error;
  }
};

/**
 * Update user context in Statsig (call when user data changes)
 */
export const updateStatsigUser = async (): Promise<void> => {
  try {
    appLog('🧪 User context updates will be handled by StatsigProviderRN automatically');
    // With the provider approach, user context is managed by the provider
  } catch (error) {
    appLog('❌ Error updating Statsig user:', error);
  }
};

/**
 * Helper to get user context for Statsig
 */
export const getStatsigUser = () => {
  const currentUser = auth().currentUser;
  const userStore = useUserStore.getState();
  const userData = userStore.getUser();

  return {
    userID: currentUser?.uid || 'anonymous',
    email: currentUser?.email || undefined,
    custom: {
      isAnonymous: currentUser?.isAnonymous || false,
      proStatus: userData?.proStatus || 'free',
      streakDays: userData?.streak || 0,
      totalXP: userData?.xp || 0,
      hearts: userData?.hearts || 0,
      currentLevel: userData?.level || 1,
      hasCompletedOnboarding: userData?.hasCompletedOnboarding || false,
      selectedPathId: userData?.selectedPathId || null,
      lambLevel: userData?.lambLevel || 1,
    },
  };
};

/**
 * Get a feature gate value (use this outside of React components)
 */
export const checkFeatureGate = (gateName: string): boolean => {
  try {
    // This will need to be used with the client from useStatsigClient hook
    appLog(`🧪 Feature gate "${gateName}" check requested - use useFeatureGate hook in components`);
    return false; // Default fallback
  } catch (error) {
    appLog(`❌ Error checking feature gate "${gateName}":`, error);
    return false;
  }
};

/**
 * Log a custom event to Statsig (use this outside of React components)
 */
export const logStatsigEvent = (eventName: string, value?: string | number, metadata?: Record<string, any>): void => {
  try {
    // For logging events outside components, we need access to the client
    appLog(`🧪 Event "${eventName}" logged`, { value, metadata });
    // This will be implemented when we have client access
  } catch (error) {
    appLog(`❌ Error logging event "${eventName}":`, error);
  }
};

// Lightweight provider and hooks that safely no-op on web/Expo without native module
export const StatsigProviderRN: React.FC<PropsWithChildren<{ clientKey?: string }>> = ({ children }) => {
  // If Expo bindings are missing and fallback enabled, provide RC client. Otherwise error.
  if (!ExpoStatsig || !(ExpoStatsig as any).StatsigProviderExpo) {
    if (ENABLE_STATSIG_RC_FALLBACK) {
      // Create and expose fallback client once
      if (!statsigClient) {
        statsigClient = createFallbackStatsigClient();
        (global as any).statsigClient = statsigClient;
      }
      return (children as unknown) as React.ReactElement | null;
    }
    // Strict mode: no fallback, surface missing SDK
    appLog('❌ [Statsig] Native bindings not available and RC fallback disabled. Experiments unavailable.');
    // Clear any stale global client (e.g., from a previous hot reload)
    try {
      (global as any).statsigClient = null;
    } catch {}
    statsigClient = null;
    return (children as unknown) as React.ReactElement | null;
  }

  const Provider = (ExpoStatsig as any).StatsigProviderExpo;
  appLog('🧪 [Statsig] Using native provider: StatsigProviderExpo');
  const UseClient = (ExpoStatsig as any).useStatsigClient || (() => ({ client: null }));
  const Wrapper: React.FC<PropsWithChildren> = ({ children: c }) => {
    const { client } = UseClient();
    useEffect(() => {
      if (client) {
        statsigClient = client;
        (global as any).statsigClient = client;
      }
      return () => void 0;
    }, [client]);
    return c as unknown as React.ReactElement;
  };
  // Avoid JSX in .ts file – use React.createElement
  return React.createElement(
    Provider,
    { sdkKey: STATSIG_CLIENT_KEY, user: getStatsigUser(), loadingComponent: null },
    React.createElement(Wrapper, null, children as unknown as React.ReactElement)
  );
};

export const useStatsigClient = () => {
  if (ExpoStatsig && (ExpoStatsig as any).useStatsigClient) return (ExpoStatsig as any).useStatsigClient();
  return { client: statsigClient };
};

export const useFeatureGate = (gate: string): boolean => {
  if (ExpoStatsig && (ExpoStatsig as any).useStatsigClient) {
    const { client } = (ExpoStatsig as any).useStatsigClient();
    try {
      return !!client?.checkGate?.(gate);
    } catch {
      return false;
    }
  }
  try {
    const rc = remoteConfig();
    return rc.getValue(gate).asBoolean();
  } catch {
    return false;
  }
};

// Map Statsig experiment/key names -> Remote Config keys
function readExperimentValue(name: string): any {
  const rc = remoteConfig();
  switch (name) {
    case 'path_feature':
      return rc.getValue('path_feature_enabled').asBoolean();
    case 'prayer_gen_on':
      return rc.getValue('prayer_gen_on').asBoolean();
    case 'gpt-model':
      return rc.getValue('gptModel').asString();
    case 'exp_streak_after_daily_reading':
      return rc.getValue('streak_after_reading_flag').asBoolean();
    default:
      // Fallback: try to read as boolean, then string
      const boolVal = rc.getValue(name).asBoolean();
      if (typeof boolVal === 'boolean' && (rc.getValue(name).source !== 'static')) return boolVal;
      return rc.getValue(name).asString();
  }
}

// Export helpers so non-hook code (e.g., Debug UI) can read values safely
export function getExperimentValueFromRC(name: string): any {
  try {
    return readExperimentValue(name);
  } catch {
    return null;
  }
}

export function getExperimentParamFromRC(name: string, key: string, defaultValue?: any): any {
  try {
    const rc = remoteConfig();
    if (name === 'path_feature' && (key === 'path_shown' || key === 'path_feature_enabled')) {
      return rc.getValue('path_feature_enabled').asBoolean();
    }
    if (name === 'prayer_gen_on' && (key === 'generate_prayer_for_user' || key === 'prayer_gen_on')) {
      return rc.getValue('prayer_gen_on').asBoolean();
    }
    if (name === 'gpt-model' && key === 'gptModel') {
      return rc.getValue('gptModel').asString();
    }
    if (name === 'exp_streak_after_daily_reading' && key === 'streak_after_reading_flag') {
      return rc.getValue('streak_after_reading_flag').asBoolean();
    }
    // Default best-effort
    const normalizedKey = `${name}_${key}`.replace(/[^A-Za-z0-9_\-]/g, '');
    const val = rc.getValue(normalizedKey);
    const s = val?.asString?.();
    if (s === 'true' || s === 'false') return s === 'true';
    return s ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export const useExperiment = (name: string) => {
  if (ExpoStatsig && (ExpoStatsig as any).useStatsigClient) {
    const { client } = (ExpoStatsig as any).useStatsigClient();
    const exp = client?.getExperiment?.(name);
    return {
      get: (key: string, defaultValue?: any) => exp?.get?.(key, defaultValue),
      value: exp?.getValue?.(),
    } as const;
  }
  const value = readExperimentValue(name);
  return {
    get: (key: string, defaultValue?: any) => getExperimentParamFromRC(name, key, defaultValue),
    value,
  } as const;
};

export const useConfig = (name: string) => {
  if (ExpoStatsig && (ExpoStatsig as any).useStatsigClient) {
    const { client } = (ExpoStatsig as any).useStatsigClient();
    return client?.getConfig?.(name) ?? {};
  }
  return {} as any;
};

// No re-export; useFeatureGate above normalizes to boolean

// Export the client key for provider setup
export { STATSIG_CLIENT_KEY };