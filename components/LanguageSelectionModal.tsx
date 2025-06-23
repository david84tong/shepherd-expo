import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../app/utils/i18n';
import i18n from '../app/utils/i18n';

interface LanguageSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onLanguageSelect: (language: SupportedLanguage) => void;
  selectedLanguage: SupportedLanguage;
  title?: string;
}

const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  visible,
  onClose,
  onLanguageSelect,
  selectedLanguage,
  title
}) => {
  const insets = useSafeAreaInsets();

  const handleLanguageSelect = (language: SupportedLanguage) => {
    onLanguageSelect(language);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center">
        <Reanimated.View 
          entering={FadeInUp.duration(300)}
          className="bg-surfaceCream  rounded-2xl w-[85%] max-w-[350px] max-h-[80%]"
          style={{ marginBottom: insets.bottom }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-5 border-b border-[#FFE4A8]">
            <Text className="font-feather text-xl text-textPrimary flex-1 text-center">
              {title || i18n.t('select_chat_language')}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="absolute right-5 z-10"
              activeOpacity={0.7}
            >
              <Feather name="x" size={24} color="#3C584A" />
            </TouchableOpacity>
          </View>

          {/* Language Options */}
          <ScrollView 
            className="p-5"
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
              <TouchableOpacity
                key={code}
                onPress={() => handleLanguageSelect(code as SupportedLanguage)}
                className={`flex-row items-center justify-between p-4 mb-3 rounded-xl border-2 ${
                  selectedLanguage === code
                    ? 'bg-[#FFE07D] border-[#F7B500]'
                    : 'bg-white border-[#FFE4A8]'
                }`}
                activeOpacity={0.8}
              >
                <Text className={`font-feather text-lg ${
                  selectedLanguage === code ? 'text-textPrimary' : 'text-textPrimary'
                }`}>
                  {name}
                </Text>
                {selectedLanguage === code && (
                  <Feather name="check" size={20} color="#F7B500" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cancel Button */}
          <View className="p-5 border-t border-[#FFE4A8]">
            <TouchableOpacity
              onPress={onClose}
              className="bg-textPrimary/10 rounded-xl p-4"
              activeOpacity={0.8}
            >
              <Text className="font-din text-textPrimary text-center text-lg">
                {i18n.t('cancel_button')}
              </Text>
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </View>
    </Modal>
  );
};

export default LanguageSelectionModal; 