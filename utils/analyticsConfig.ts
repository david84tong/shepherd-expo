import analytics from '@react-native-firebase/analytics';
import { init as initAmplitude, setOptOut } from '@amplitude/analytics-react-native';
import { Mixpanel } from 'mixpanel-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Analytics configuration constants
const MIXPANEL_TOKEN = '7178bfcd1e0972001d3e6c066e8fb18b';
const AMPLITUDE_API_KEY = 'd8184bec8ecc538cb1575e61b8ad2171';

// Age-related constants
const UNDER_13_AGE_RANGES = ['under-12', '13-17', 'under-18'];
const USER_AGE_KEY = 'user_age_range';
const ANALYTICS_ENABLED_KEY = 'analytics_enabled';

// Global instances
let mixpanelInstance: Mixpanel | null = null;
let isAnalyticsConfigured = false;

/**
 * Check if user is under 13 based on their age range
 */
export function isUserUnder13(ageRange: string): boolean {
  return UNDER_13_AGE_RANGES.includes(ageRange);
}

/**
 * Save user's age range to AsyncStorage
 */
export async function saveUserAgeRange(ageRange: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_AGE_KEY, ageRange);
    console.log('✅ User age range saved:', ageRange);
  } catch (error) {
    console.error('❌ Error saving user age range:', error);
  }
}

/**
 * Get user's age range from AsyncStorage
 */
export async function getUserAgeRange(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_AGE_KEY);
  } catch (error) {
    console.error('❌ Error getting user age range:', error);
    return null;
  }
}

/**
 * Configure analytics based on user data from Firebase/Firestore
 */
export async function configureAnalyticsFromUserData(userAgeRange?: string): Promise<void> {
  if (isAnalyticsConfigured) {
    console.log('📊 Analytics already configured, skipping...');
    return;
  }

  try {
    // First try to get age range from user data (Firebase)
    let ageRange = userAgeRange;
    
    // If no age range from user data, fall back to AsyncStorage
    if (!ageRange) {
      const storedAgeRange = await getUserAgeRange();
      ageRange = storedAgeRange || undefined;
    }
    
    const userIsUnder13 = ageRange ? isUserUnder13(ageRange) : false;

    console.log('📊 Configuring analytics for age range:', ageRange, 'Under 13:', userIsUnder13);

    if (userIsUnder13) {
      // Disable all analytics for users under 13
      await disableAllAnalytics();
      await AsyncStorage.setItem(ANALYTICS_ENABLED_KEY, 'false');
      console.log('🚫 Analytics disabled for user under 13');
    } else {
      // Enable analytics for users 13 and older
      await enableAllAnalytics();
      await AsyncStorage.setItem(ANALYTICS_ENABLED_KEY, 'true');
      console.log('✅ Analytics enabled for user 13+');
    }

    isAnalyticsConfigured = true;
  } catch (error) {
    console.error('❌ Error configuring analytics from user data:', error);
    // Default to disabled for safety
    await disableAllAnalytics();
    await AsyncStorage.setItem(ANALYTICS_ENABLED_KEY, 'false');
  }
}

/**
 * Configure analytics based on user age
 */
export async function configureAnalytics(): Promise<void> {
  return configureAnalyticsFromUserData();
}

/**
 * Disable all analytics services
 */
async function disableAllAnalytics(): Promise<void> {
  try {
    // Disable Firebase Analytics
    await analytics().setAnalyticsCollectionEnabled(false);
    console.log('🚫 Firebase Analytics disabled');

    // Disable Amplitude
    setOptOut(true);
    console.log('🚫 Amplitude disabled');

    // Disable Mixpanel
    if (mixpanelInstance) {
      mixpanelInstance.optOutTracking();
      console.log('🚫 Mixpanel disabled');
    }
  } catch (error) {
    console.error('❌ Error disabling analytics:', error);
  }
}

/**
 * Enable all analytics services
 */
async function enableAllAnalytics(): Promise<void> {
  try {
    // Enable Firebase Analytics
    await analytics().setAnalyticsCollectionEnabled(true);
    console.log('✅ Firebase Analytics enabled');

    // Initialize and enable Amplitude
    await initAmplitude(AMPLITUDE_API_KEY);
    setOptOut(false);
    console.log('✅ Amplitude enabled');

    // Initialize and enable Mixpanel
    if (!mixpanelInstance) {
      mixpanelInstance = new Mixpanel(MIXPANEL_TOKEN, false, true); // Enable native SDK
      await mixpanelInstance.init();
      
      // Set platform super properties immediately after init
      mixpanelInstance.registerSuperProperties({
        platform: Platform.OS,
        $os: Platform.OS === 'ios' ? 'iOS' : 'Android',
        $device: Platform.OS === 'ios' ? 'iPhone' : 'Android Phone'
      });
      console.log('Mixpanel platform super properties set with native SDK');
    }
    mixpanelInstance.optInTracking();
    console.log('✅ Mixpanel enabled');
  } catch (error) {
    console.error('❌ Error enabling analytics:', error);
  }
}

/**
 * Check if analytics are currently enabled
 */
export async function isAnalyticsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(ANALYTICS_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('❌ Error checking analytics status:', error);
    return false;
  }
}

/**
 * Update analytics configuration when user age changes
 */
export async function updateAnalyticsForAgeChange(newAgeRange: string): Promise<void> {
  try {
    console.log('🔄 Updating analytics configuration for new age range:', newAgeRange);
    
    // Save the new age range
    await saveUserAgeRange(newAgeRange);
    
    // Reset configuration flag to force reconfiguration
    isAnalyticsConfigured = false;
    
    // Reconfigure analytics
    await configureAnalytics();
  } catch (error) {
    console.error('❌ Error updating analytics for age change:', error);
  }
}

/**
 * Get Mixpanel instance (for use in analytics.ts)
 */
export function getMixpanelInstance(): Mixpanel | null {
  // Ensure platform properties are set on the instance
  if (mixpanelInstance) {
    mixpanelInstance.registerSuperProperties({
      platform: Platform.OS,
      $os: Platform.OS === 'ios' ? 'iOS' : 'Android',
      $device: Platform.OS === 'ios' ? 'iPhone' : 'Android Phone'
    });
  }
  return mixpanelInstance;
}

/**
 * Initialize analytics configuration on app start
 */
export async function initializeAnalyticsConfig(): Promise<void> {
  try {
    console.log('🚀 Initializing analytics configuration...');
    await configureAnalytics();
  } catch (error) {
    console.error('❌ Error initializing analytics configuration:', error);
  }
}

/**
 * Handle user sign-in and configure analytics based on user profile
 */
export async function handleUserSignIn(userAgeRange?: string): Promise<void> {
  try {
    console.log('🔐 User sign-in detected, configuring analytics...');
    
    // Reset configuration to ensure fresh setup
    isAnalyticsConfigured = false;
    
    // Configure analytics based on user age range
    await configureAnalyticsFromUserData(userAgeRange);
    
    console.log('✅ Analytics configured for signed-in user');
  } catch (error) {
    console.error('❌ Error configuring analytics for signed-in user:', error);
    // Default to disabled for safety
    await disableAllAnalytics();
    await AsyncStorage.setItem(ANALYTICS_ENABLED_KEY, 'false');
  }
}

/**
 * Reset analytics configuration (for testing or user logout)
 */
export async function resetAnalyticsConfig(): Promise<void> {
  try {
    console.log('🔄 Resetting analytics configuration...');
    isAnalyticsConfigured = false;
    mixpanelInstance = null;
    await AsyncStorage.removeItem(USER_AGE_KEY);
    await AsyncStorage.removeItem(ANALYTICS_ENABLED_KEY);
    console.log('✅ Analytics configuration reset');
  } catch (error) {
    console.error('❌ Error resetting analytics configuration:', error);
  }
}

/**
 * Get current user's age range from the user store
 */
export function getCurrentUserAgeRange(): string | undefined {
  try {
    // Import here to avoid circular dependencies
    const { useUserStore } = require('../app/stores/userStore');
    return useUserStore.getState().getAgeRange();
  } catch (error) {
    console.error('❌ Error getting current user age range:', error);
    return undefined;
  }
}

/**
 * Debug function to check current analytics configuration status
 */
export async function debugAnalyticsConfig(): Promise<void> {
  try {
    const userAgeRange = await getUserAgeRange();
    const currentUserAgeRange = getCurrentUserAgeRange();
    const analyticsEnabled = await isAnalyticsEnabled();
    const isUnder13 = userAgeRange ? isUserUnder13(userAgeRange) : false;
    
    console.log('🔍 Analytics Configuration Debug:');
    console.log('  - AsyncStorage Age Range:', userAgeRange || 'Not set');
    console.log('  - Current User Age Range:', currentUserAgeRange || 'Not set');
    console.log('  - Is Under 13:', isUnder13);
    console.log('  - Analytics Enabled:', analyticsEnabled);
    console.log('  - Configuration Flag:', isAnalyticsConfigured);
    console.log('  - Mixpanel Instance:', mixpanelInstance ? 'Exists' : 'None');
  } catch (error) {
    console.error('❌ Error debugging analytics configuration:', error);
  }
} 