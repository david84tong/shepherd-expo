import { PostHog } from 'posthog-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { appLog } from '../app/helper/helper';

// PostHog configuration constants
const POSTHOG_API_KEY = 'phc_Lurx2XwAPPAqvzhBpMOZVNRqWsADywGwJwRJSo32u62'; // Your PostHog API key

// PostHog host configuration
// For PostHog Cloud: https://app.posthog.com
// For self-hosted: https://your-posthog-instance.com
const POSTHOG_HOST = 'https://app.posthog.com'; // PostHog Cloud instance

// Age-related constants (reusing from analyticsConfig)
const UNDER_13_AGE_RANGES = ['under-12', '13-17', 'under-18'];
const USER_AGE_KEY = 'user_age_range';
const ANALYTICS_ENABLED_KEY = 'analytics_enabled';

// Global PostHog instance
let posthogInstance: PostHog | null = null;
let isPostHogConfigured = false;

/**
 * Check if user is under 13 based on their age range
 */
export function isUserUnder13(ageRange: string): boolean {
  return UNDER_13_AGE_RANGES.includes(ageRange);
}

/**
 * Initialize PostHog instance
 */
export async function initializePostHog(): Promise<PostHog | null> {
  if (posthogInstance) {
    appLog('✅ PostHog already initialized');
    return posthogInstance;
  }

  try {
    appLog('🔧 Initializing PostHog...');
    
    // Check if analytics are enabled
    const analyticsEnabled = await AsyncStorage.getItem(ANALYTICS_ENABLED_KEY);
    if (analyticsEnabled === 'false') {
      appLog('🚫 Analytics disabled, skipping PostHog initialization');
      return null;
    }

    // Create PostHog instance
    posthogInstance = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      captureAppLifecycleEvents: true,
    });

    // Set platform super properties
    posthogInstance.register({
      platform: Platform.OS,
      $os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      app_version: Platform.Version,
    });

    appLog('✅ PostHog initialized successfully');
    return posthogInstance;
  } catch (error) {
    appLog('❌ Error initializing PostHog:', error);
    return null;
  }
}

/**
 * Configure PostHog based on user age range
 */
export async function configurePostHogFromUserData(userAgeRange?: string): Promise<void> {
  if (isPostHogConfigured) {
    appLog('📊 PostHog already configured, skipping...');
    return;
  }

  try {
    // Get age range from parameter or AsyncStorage
    let ageRange = userAgeRange;
    if (!ageRange) {
      ageRange = await AsyncStorage.getItem(USER_AGE_KEY) || undefined;
    }
    
    const userIsUnder13 = ageRange ? isUserUnder13(ageRange) : false;

    appLog('📊 Configuring PostHog for age range:', ageRange, 'Under 13:', userIsUnder13);

    if (userIsUnder13) {
      // Disable PostHog for users under 13
      await disablePostHog();
      appLog('🚫 PostHog disabled for user under 13');
    } else {
      // Enable PostHog for users 13 and older
      await enablePostHog();
      appLog('✅ PostHog enabled for user 13+');
    }

    isPostHogConfigured = true;
  } catch (error) {
    appLog('❌ Error configuring PostHog from user data:', error);
    // Default to disabled for safety
    await disablePostHog();
  }
}

/**
 * Enable PostHog tracking
 */
async function enablePostHog(): Promise<void> {
  try {
    if (!posthogInstance) {
      await initializePostHog();
    }
    
    if (posthogInstance) {
      posthogInstance.optIn();
      appLog('✅ PostHog enabled');
    }
  } catch (error) {
    appLog('❌ Error enabling PostHog:', error);
  }
}

/**
 * Disable PostHog tracking
 */
async function disablePostHog(): Promise<void> {
  try {
    if (posthogInstance) {
      posthogInstance.optOut();
      appLog('🚫 PostHog disabled');
    }
  } catch (error) {
    appLog('❌ Error disabling PostHog:', error);
  }
}

/**
 * Get PostHog instance
 */
export function getPostHogInstance(): PostHog | null {
  return posthogInstance;
}

/**
 * Check if PostHog is currently enabled
 */
export async function isPostHogEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(ANALYTICS_ENABLED_KEY);
    return enabled === 'true' && posthogInstance !== null;
  } catch (error) {
    appLog('❌ Error checking PostHog status:', error);
    return false;
  }
}

/**
 * Update PostHog configuration when user age changes
 */
export async function updatePostHogForAgeChange(newAgeRange: string): Promise<void> {
  try {
    appLog('🔄 Updating PostHog configuration for new age range:', newAgeRange);
    
    // Reset configuration flag to force reconfiguration
    isPostHogConfigured = false;
    
    // Reconfigure PostHog
    await configurePostHogFromUserData(newAgeRange);
  } catch (error) {
    appLog('❌ Error updating PostHog for age change:', error);
  }
}

/**
 * Initialize PostHog configuration on app start
 */
export async function initializePostHogConfig(): Promise<void> {
  try {
    appLog('🚀 Initializing PostHog configuration...');
    await configurePostHogFromUserData();
  } catch (error) {
    appLog('❌ Error initializing PostHog configuration:', error);
  }
}

/**
 * Handle user sign-in and configure PostHog based on user profile
 */
export async function handlePostHogUserSignIn(userAgeRange?: string): Promise<void> {
  try {
    appLog('🔐 User sign-in detected, configuring PostHog...');
    
    // Reset configuration to ensure fresh setup
    isPostHogConfigured = false;
    
    // Configure PostHog based on user age range
    await configurePostHogFromUserData(userAgeRange);
    
    appLog('✅ PostHog configured for signed-in user');
  } catch (error) {
    appLog('❌ Error configuring PostHog for signed-in user:', error);
    // Default to disabled for safety
    await disablePostHog();
  }
}

/**
 * Reset PostHog configuration (for testing or user logout)
 */
export async function resetPostHogConfig(): Promise<void> {
  try {
    appLog('🔄 Resetting PostHog configuration...');
    isPostHogConfigured = false;
    posthogInstance = null;
    appLog('✅ PostHog configuration reset');
  } catch (error) {
    appLog('❌ Error resetting PostHog configuration:', error);
  }
}

/**
 * Debug PostHog configuration
 */
export async function debugPostHogConfig(): Promise<void> {
  try {
    appLog('🔍 PostHog Configuration Debug:');
    appLog('- Instance:', posthogInstance ? 'Initialized' : 'Not initialized');
    appLog('- Configured:', isPostHogConfigured);
    appLog('- Enabled:', await isPostHogEnabled());
    
    const ageRange = await AsyncStorage.getItem(USER_AGE_KEY);
    appLog('- User age range:', ageRange);
    appLog('- User under 13:', ageRange ? isUserUnder13(ageRange) : 'Unknown');
  } catch (error) {
    appLog('❌ Error debugging PostHog configuration:', error);
  }
} 