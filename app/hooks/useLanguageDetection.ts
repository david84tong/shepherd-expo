import { useState, useEffect } from 'react';
import { detectDeviceLanguage, getSupportedLanguagesList, getLanguageDisplayName, SUPPORTED_LANGUAGES, SupportedLanguage } from '../utils/i18n';

export const useLanguageDetection = () => {
  const [detectedLanguage, setDetectedLanguage] = useState<SupportedLanguage>('en');
  const [isLanguageSupported, setIsLanguageSupported] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const detectLanguage = () => {
      const { language, isSupported } = detectDeviceLanguage();
      setDetectedLanguage(language);
      setIsLanguageSupported(isSupported);
      setIsLoading(false);
    };

    detectLanguage();
  }, []);

  return {
    detectedLanguage,
    isLanguageSupported,
    isLoading,
    supportedLanguages: getSupportedLanguagesList(),
    getLanguageDisplayName,
    SUPPORTED_LANGUAGES,
  };
};

// Default export for Expo Router compatibility
export default {}