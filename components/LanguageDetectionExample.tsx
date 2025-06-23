import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useLanguageDetection } from '../app/hooks/useLanguageDetection';
import { setAppLanguage, resetToDeviceLanguage } from '../app/utils/languageUtils';
import i18n from '../app/utils/i18n';

export const LanguageDetectionExample: React.FC = () => {
  const { 
    detectedLanguage, 
    isLanguageSupported, 
    isLoading, 
    supportedLanguages,
    getLanguageDisplayName 
  } = useLanguageDetection();

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await setAppLanguage(languageCode as any);
      Alert.alert('Success', `Language changed to ${getLanguageDisplayName(languageCode)}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to change language');
    }
  };

  const handleResetToDevice = async () => {
    try {
      await resetToDeviceLanguage();
      Alert.alert('Success', 'Language reset to device default');
    } catch (error) {
      Alert.alert('Error', 'Failed to reset language');
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Detecting language...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold mb-4">Language Detection</Text>
      
      <View className="mb-6">
        <Text className="text-lg mb-2">Device Language: {getLanguageDisplayName(detectedLanguage)}</Text>
        <Text className="text-sm text-gray-600">
          {isLanguageSupported 
            ? '✅ This language is supported by the app' 
            : '❌ This language is not supported, using English as fallback'
          }
        </Text>
      </View>

      <View className="mb-6">
        <Text className="text-lg font-semibold mb-3">Current App Language:</Text>
        <Text className="text-base">{getLanguageDisplayName(i18n.locale)}</Text>
      </View>

      <View className="mb-6">
        <Text className="text-lg font-semibold mb-3">Supported Languages:</Text>
        {supportedLanguages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            className={`p-3 mb-2 rounded-lg border ${
              i18n.locale === lang.code 
                ? 'bg-blue-100 border-blue-500' 
                : 'bg-gray-50 border-gray-300'
            }`}
            onPress={() => handleLanguageChange(lang.code)}
          >
            <Text className={`font-medium ${
              i18n.locale === lang.code ? 'text-blue-700' : 'text-gray-700'
            }`}>
              {lang.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        className="bg-orange-500 p-3 rounded-lg"
        onPress={handleResetToDevice}
      >
        <Text className="text-white text-center font-semibold">
          Reset to Device Language
        </Text>
      </TouchableOpacity>
    </View>
  );
}; 