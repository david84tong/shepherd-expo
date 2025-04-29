import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { OnboardingResponse, ONBOARDING_STORAGE_KEY } from '../models/Onboarding';

interface OnboardingState {
  responses: OnboardingResponse;
  setResponse: (key: keyof OnboardingResponse, value: any) => Promise<void>;
  clearResponses: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  responses: {},
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
        })
      );
    } catch (error) {
      console.error('Error saving onboarding response:', error);
    }
  },
  clearResponses: async () => {
    try {
      set({ responses: {} });
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
