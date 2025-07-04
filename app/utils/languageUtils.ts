import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { SupportedLanguage, SUPPORTED_LANGUAGES, detectDeviceLanguage } from './i18n';

/**
 * Sets the app language and stores it in AsyncStorage
 */
export const setAppLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    // Validate that the language is supported
    if (!SUPPORTED_LANGUAGES[language]) {
      throw new Error(`Language ${language} is not supported`);
    }

    // Set the language in i18n
    i18n.locale = language;

    // Store the language preference
    await AsyncStorage.setItem('shepherd-language-storage', JSON.stringify({
      state: { language }
    }));
  } catch (error) {
    console.error('Error setting app language:', error);
    throw error;
  }
};

/**
 * Gets the current app language from storage
 */
export const getCurrentAppLanguage = async (): Promise<SupportedLanguage | null> => {
  try {
    const storedLanguage = await AsyncStorage.getItem('shepherd-language-storage');
    // Defensive JSON.parse: Prevents crashes from empty or malformed JSON in language storage.
    if (storedLanguage && typeof storedLanguage === 'string' && storedLanguage.trim().length > 0 && (storedLanguage.trim().startsWith('{') || storedLanguage.trim().startsWith('['))) {
      try {
        const parsedStorage = JSON.parse(storedLanguage);
        const language = parsedStorage.state?.language as SupportedLanguage;
        if (language && SUPPORTED_LANGUAGES[language]) {
          return language;
        }
      } catch (e) {
        console.log('Failed to parse storedLanguage as JSON:', storedLanguage);
        return null;
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting current app language:', error);
    return null;
  }
};

/**
 * Resets the language to device default
 */
export const resetToDeviceLanguage = async (): Promise<void> => {
  try {
    // Remove stored language preference
    await AsyncStorage.removeItem('shepherd-language-storage');
    
    // Re-initialize i18n (this will detect device language)
    const { language } = detectDeviceLanguage();
    i18n.locale = language;
  } catch (error) {
    console.error('Error resetting to device language:', error);
    throw error;
  }
}; 