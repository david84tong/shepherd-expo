import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { OnboardingResponses, ONBOARDING_STORAGE_KEY } from '../models/Onboarding';

interface OnboardingState {
  responses: OnboardingResponses;
  currentScreen: string;
  setResponse: (key: keyof OnboardingResponses, value: any) => Promise<void>;
  setCurrentScreen: (screen: string) => Promise<void>;
  clearResponses: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  responses: {},
  currentScreen: '1',
  setResponse: async (key, value) => {
    try {
      set((state) => ({
        responses: {
          ...state.responses,
          [key]: value,
        },
      }));
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          ...useOnboardingStore.getState().responses,
          [key]: value,
          currentScreen: useOnboardingStore.getState().currentScreen
        })
      );
    } catch (error) {
      console.error('Error saving onboarding response:', error);
    }
  },
  setCurrentScreen: async (screen) => {
    try {
      set({ currentScreen: screen });
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({
          ...useOnboardingStore.getState().responses,
          currentScreen: screen
        })
      );
    } catch (error) {
      console.error('Error saving current screen:', error);
    }
  },
  clearResponses: async () => {
    try {
      set({ responses: {}, currentScreen: '1' });
      await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing onboarding responses:', error);
    }
  },
}));

export const debugOnboardingStorage = async () => {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    console.log('Onboarding storage:', data ? JSON.parse(data) : null);
  } catch (error) {
    console.error('Error reading onboarding storage:', error);
  }
};
