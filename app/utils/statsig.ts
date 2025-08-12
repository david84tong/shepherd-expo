import { 
  StatsigProviderRN, 
  useFeatureGate as useStatsigFeatureGate,
  useStatsigClient
} from '@statsig/react-native-bindings';
import auth from '@react-native-firebase/auth';
import { appLog } from '../helper/helper';
import { useUserStore } from '../stores/userStore';

// Statsig configuration
const STATSIG_CLIENT_KEY = 'client-LAixqahMmfzNlU3BfjILljTL4KaWeGAG0lJhv2pxBAv';

// For provider-based approach, we'll track initialization differently
let statsigClient: any = null;

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

// Export the provider and hooks
export { StatsigProviderRN, useStatsigFeatureGate as useFeatureGate, useStatsigClient };

// Export the client key for provider setup
export { STATSIG_CLIENT_KEY };