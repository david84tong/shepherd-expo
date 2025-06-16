import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supportedLanguages, changeLanguage } from '~/app/i18n';
import { useTranslation } from '~/app/hooks/useTranslation';

interface LanguagePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onLanguageChange?: (languageCode: string) => void;
}

const LanguagePicker: React.FC<LanguagePickerProps> = ({
  isVisible,
  onClose,
  onLanguageChange,
}) => {
  const { t, currentLanguage } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Change language
      await changeLanguage(languageCode);
      setSelectedLanguage(languageCode);
      
      // Notify parent component
      onLanguageChange?.(languageCode);
      
      // Close modal
      onClose();
      
      // Success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('settings.selectLanguage', 'Select Language')}</Text>

          <ScrollView style={styles.languageScrollView} showsVerticalScrollIndicator={false}>
            {supportedLanguages.map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  selectedLanguage === language.code && styles.selectedLanguage,
                ]}
                onPress={() => handleLanguageSelect(language.code)}
              >
                <View style={styles.languageInfo}>
                  <Text
                    style={[
                      styles.languageName,
                      selectedLanguage === language.code && styles.selectedLanguageText,
                    ]}
                  >
                    {language.nativeName}
                  </Text>
                  <Text
                    style={[
                      styles.languageEnglishName,
                      selectedLanguage === language.code && styles.selectedLanguageText,
                    ]}
                  >
                    {language.name}
                  </Text>
                </View>
                {selectedLanguage === language.code && (
                  <Feather name="check" size={18} color="#F7B500" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 350,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Feather Bold',
    color: '#3C584A', // textPrimary
    textAlign: 'center',
    marginBottom: 16,
  },
  languageScrollView: {
    maxHeight: 400,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedLanguage: {
    backgroundColor: 'rgba(247, 181, 0, 0.1)', // accentGold with opacity
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#3C584A', // textPrimary
    marginBottom: 2,
  },
  languageEnglishName: {
    fontSize: 14,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#3C584A', // textPrimary
    opacity: 0.7,
  },
  selectedLanguageText: {
    color: '#3C584A', // textPrimary
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(60, 88, 74, 0.1)', // textPrimary with opacity
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#3C584A', // textPrimary
    fontWeight: '600',
  },
});

export default LanguagePicker; 