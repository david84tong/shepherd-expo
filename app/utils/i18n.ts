import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../../locales/en.json';
import es from '../../locales/es.json';
import pt from '../../locales/pt.json';
import nl from '../../locales/nl.json';
import fr from '../../locales/fr.json';
import de from '../../locales/de.json';
import { appLog } from '../helper/helper';

// Define supported languages with their display names
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  nl: 'Nederlands',
  fr: 'Français',
  de: 'Deutsch',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

const i18n = new I18n({ en, es, pt, nl, fr, de });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

/**
 * Detects the best language to use based on device locale
 * @returns The detected language code and whether it's supported
 */
export const detectDeviceLanguage = (): { language: SupportedLanguage; isSupported: boolean } => {
  const deviceLocale = Localization.locale;
  appLog("deviceLocale ===>",deviceLocale);
  
  const baseLocale = deviceLocale.split('-')[0];
  appLog("baseLocale ==>",baseLocale);
  
  
  // Check if full locale is supported (e.g., "en-US")
  if (i18n.translations[deviceLocale]) {
    appLog("i18n.translations[deviceLocale] ==>",i18n.translations[deviceLocale]);
    
    return { language: deviceLocale as SupportedLanguage, isSupported: true };
  }
  
  // Check if base locale is supported (e.g., "en")
  if (i18n.translations[baseLocale]) {
    appLog("i18n.translations[baseLocale] ==>",i18n.translations[baseLocale]);
    
    return { language: baseLocale as SupportedLanguage, isSupported: true };
  }
  
  // Return English as fallback
  return { language: 'en', isSupported: false };
};

/**
 * Gets the display name for a language code
 */
export const getLanguageDisplayName = (languageCode: string): string => {
  return SUPPORTED_LANGUAGES[languageCode as SupportedLanguage] || languageCode;
};

/**
 * Gets all supported languages as an array for selection UI
 */
export const getSupportedLanguagesList = () => {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
    code: code as SupportedLanguage,
    name,
  }));
};

// Initialize language from storage or device locale
export const initializeLanguage = async () => {
  appLog("initializeLanguage called====>");
  
  try {
    // Try to get language from storage first
    const storedLanguage = await AsyncStorage.getItem('shepherd-language-storage');
    if (storedLanguage) {
      const parsedStorage = JSON.parse(storedLanguage);
      const language = parsedStorage.state?.language;
      if (language && i18n.translations[language]) {
        i18n.locale = language;
        return;
      }
    }

    // Fall back to device locale detection
    const { language } = detectDeviceLanguage();
    appLog("language =====>",language);
    
    i18n.locale = language;
    
    // Store the detected language for future use
    await AsyncStorage.setItem('shepherd-language-storage', JSON.stringify({
      state: { language }
    }));
  } catch (error) {
    console.error('Error initializing language:', error);
    i18n.locale = 'en';
  }
};

// Initialize language
initializeLanguage();

export default i18n; 