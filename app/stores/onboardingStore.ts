import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { OnboardingResponses, ONBOARDING_STORAGE_KEY } from '../models/Onboarding';
import analytics, { AnalyticsEvent, EventCategory } from '../../utils/analytics';

// Define specific response types for screens 8, 9, and 10
export interface PathResponse {
  id: string;
  title: string;
  subtitle: string;
  order: string[];
}

export interface NotificationResponse {
  enabled: boolean;
  time?: string; // Optional time in format "HH:MM" or preset like "morning"
}

export interface AuthResponse {
  signInMethod: "apple" | "anonymous" | "skip";
  completed: boolean;
}

// Extend OnboardingResponses with our new types
interface ExtendedOnboardingResponses extends Omit<OnboardingResponses, 'selectedPath'> {
  pathDetails?: PathResponse;
  selectedPath?: 'walk-in-light' | 'way-of-wisdom' | 'overcoming' | 'knowing-jesus';
  notificationEnabled?: boolean;
  notificationTime?: string | null;
  authMethod?: "apple" | "anonymous" | "skip";
  onboardingCompleted?: boolean;
}

// Extended OnboardingState interface with more specific typing for responses
interface OnboardingState {
  responses: ExtendedOnboardingResponses;
  currentScreen: string;
  
  // General methods
  setResponse: <T>(key: keyof ExtendedOnboardingResponses, value: T) => Promise<void>;
  setCurrentScreen: (screen: string) => Promise<void>;
  clearResponses: () => Promise<void>;
  
  // Specific methods for screens 8, 9, 10
  setPathSelection: (pathData: PathResponse) => Promise<void>;
  setNotificationPreference: (notificationData: NotificationResponse) => Promise<void>;
  setAuthMethod: (authData: AuthResponse) => Promise<void>;
  
  // Helper method to get all responses
  getAllResponses: () => ExtendedOnboardingResponses;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  responses: {},
  currentScreen: '1',
  
  // General methods
  setResponse: async (key, value) => {
    try {
      set((state) => ({
        responses: {
          ...state.responses,
          [key]: value,
        },
      }));
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          ...get().responses,
          currentScreen: get().currentScreen,
        })
      );
      
      console.log(`✅ Saved response for ${String(key)}:`, value);
    } catch (error) {
      console.error('❌ Error saving onboarding response:', error);
    }
  },
  
  // Specific method for path selection (Screen 8)
  setPathSelection: async (pathData) => {
    try {
      // Track analytics event
      analytics.logEvent(AnalyticsEvent.USER_PREFERENCE_CHANGE, {
        preference: 'selected_path',
        value: pathData.id,
        screen: 'OnboardingPathScreen',
        category: EventCategory.ONBOARDING
      });
      
      // Map the pathData.id to the correct enum type
      const selectedPathValue = pathData.id as 'walk-in-light' | 'way-of-wisdom' | 'overcoming' | 'knowing-jesus';
      
      // First update the state with typed data
      set((state) => {
        const newResponses: ExtendedOnboardingResponses = {
          ...state.responses,
          selectedPath: selectedPathValue,
          pathDetails: pathData
        };
        return { responses: newResponses };
      });
      
      // Then save to AsyncStorage
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          ...get().responses,
          currentScreen: get().currentScreen,
        })
      );
      
      console.log('✅ Saved path selection:', pathData.id);
    } catch (error) {
      console.error('❌ Error saving path selection:', error);
    }
  },
  
  // Specific method for notification preferences (Screen 9)
  setNotificationPreference: async (notificationData) => {
    try {
      // Track analytics event
      analytics.logEvent(AnalyticsEvent.USER_PREFERENCE_CHANGE, {
        preference: 'notifications',
        value: notificationData.enabled ? 'enabled' : 'disabled',
        time: notificationData.time || 'none',
        screen: 'NotificationPermissionScreen',
        category: EventCategory.ONBOARDING
      });
      
      // First update the state
      set((state) => {
        const newResponses: ExtendedOnboardingResponses = {
          ...state.responses,
          notificationEnabled: notificationData.enabled,
          notificationTime: notificationData.time || null,
        };
        return { responses: newResponses };
      });
      
      // Then save to AsyncStorage
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          ...get().responses,
          currentScreen: get().currentScreen,
        })
      );
      
      console.log('✅ Saved notification preferences:', notificationData);
    } catch (error) {
      console.error('❌ Error saving notification preferences:', error);
    }
  },
  
  // Specific method for auth method (Screen 10)
  setAuthMethod: async (authData) => {
    try {
      // Track analytics event
      analytics.logEvent(AnalyticsEvent.USER_PREFERENCE_CHANGE, {
        preference: 'auth_method',
        value: authData.signInMethod,
        completed: authData.completed,
        screen: 'SaveProgressScreen',
        category: EventCategory.ONBOARDING
      });
      
      // First update the state
      set((state) => {
        const newResponses: ExtendedOnboardingResponses = {
          ...state.responses,
          authMethod: authData.signInMethod,
          onboardingCompleted: authData.completed,
        };
        return { responses: newResponses };
      });
      
      // Then save to AsyncStorage
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          ...get().responses,
          currentScreen: get().currentScreen,
        })
      );
      
      console.log('✅ Saved auth method:', authData);
    } catch (error) {
      console.error('❌ Error saving auth method:', error);
    }
  },
  
  setCurrentScreen: async (screen) => {
    try {
      set({ currentScreen: screen });
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          ...get().responses,
          currentScreen: screen,
        })
      );
      console.log(`✅ Set current screen to ${screen}`);
    } catch (error) {
      console.error('❌ Error saving current screen:', error);
    }
  },
  
  clearResponses: async () => {
    try {
      set({ responses: {}, currentScreen: '1' });
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
      console.log('✅ Cleared all onboarding responses');
    } catch (error) {
      console.error('❌ Error clearing onboarding responses:', error);
    }
  },
  
  // Helper to get all responses
  getAllResponses: () => {
    return get().responses;
  },
}));

// Debug helper
export const debugOnboardingStorage = async () => {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    const parsedData = data ? JSON.parse(data) : null;
    console.log('📊 Onboarding storage:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('❌ Error reading onboarding storage:', error);
    return null;
  }
};
