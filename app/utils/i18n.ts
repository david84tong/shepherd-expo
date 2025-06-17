import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../../locales/en.json';
import es from '../../locales/es.json';
import pt from '../../locales/pt.json';
import nl from '../../locales/nl.json';
import fr from '../../locales/fr.json';
import de from '../../locales/de.json';

const i18n = new I18n({ en, es, pt, nl, fr, de });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Initialize language from storage or device locale
const initializeLanguage = async () => {
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

    // Fall back to device locale if no stored language
    const deviceLocale = Localization.locale;
    const baseLocale = deviceLocale.split('-')[0];
    if (i18n.translations[deviceLocale]) {
      i18n.locale = deviceLocale;
    } else if (i18n.translations[baseLocale]) {
      i18n.locale = baseLocale;
    } else {
      i18n.locale = 'en';
    }
  } catch (error) {
    console.error('Error initializing language:', error);
    i18n.locale = 'en';
  }
};

// Initialize language
initializeLanguage();

export default i18n; 