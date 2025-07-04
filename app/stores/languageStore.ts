import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '../utils/i18n';

type LanguageState = {
  language: string;
  setLanguage: (lang: string) => void;
};

// Initialize language from storage or device locale
const initializeLanguage = async () => {
  try {
    const storedLanguage = await AsyncStorage.getItem('shepherd-language-storage');
    // Defensive JSON.parse: Prevents crashes from empty or malformed JSON in language storage.
    if (storedLanguage && typeof storedLanguage === 'string' && storedLanguage.trim().length > 0 && (storedLanguage.trim().startsWith('{') || storedLanguage.trim().startsWith('['))) {
      try {
        const parsedStorage = JSON.parse(storedLanguage);
        const language = parsedStorage.state?.language;
        if (language && i18n.translations[language]) {
          return language;
        }
      } catch (e) {
        console.log('Failed to parse storedLanguage as JSON:', storedLanguage);
        return null;
      }
    } else {
      return null;
    }

    // Fall back to device locale if no stored language
    const deviceLocale = Localization.locale;
    const baseLocale = deviceLocale.split('-')[0];
    if (i18n.translations[deviceLocale]) {
      return deviceLocale;
    } else if (i18n.translations[baseLocale]) {
      return baseLocale;
    }
    return 'en';
  } catch (error) {
    console.error('Error initializing language:', error);
    return 'en';
  }
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en', // Default value, will be updated by initializeLanguage
      setLanguage: (lang: string) => {
        i18n.locale = lang;
        set({ language: lang });
      },
    }),
    {
      name: 'shepherd-language-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }), // Only persist the language field
    }
  )
);

// Initialize language on store creation
initializeLanguage().then((lang) => {
  useLanguageStore.getState().setLanguage(lang);
}); 