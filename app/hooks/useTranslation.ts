import { useTranslation as useI18nTranslation } from 'react-i18next';

export const useTranslation = () => {
  const { t, i18n: i18nInstance } = useI18nTranslation();

  const changeLanguage = async (language: string) => {
    try {
      await i18nInstance.changeLanguage(language);
    } catch (error) {
      console.log('Error changing language:', error);
    }
  };

  const getCurrentLanguage = () => {
    return i18nInstance.language || 'en';
  };

  const getSupportedLanguages = () => {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
    ];
  };

  return {
    t,
    changeLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    isReady: i18nInstance.isInitialized,
  };
};

export default useTranslation; 