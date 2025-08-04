import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { hapticLight } from '~/utils/haptics';
import { appLog } from '~/app/helper/helper';

interface BackButtonProps {
  onPress: () => void;
  disabled?: boolean;
  containerClassName?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  disabled = false,
  containerClassName = '',
}) => {
  // Track pressed state
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    // Trigger light haptic feedback
    hapticLight();
    onPress();
  };

  return (
    <View
      className={`${Platform.OS === 'ios' ? 'pt-[60px]' : 'pt-[40px]'} px-5 w-full absolute top-0 left-0 z-[100] ${containerClassName}`}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        className={`
          w-[42px] h-[42px] rounded-full bg-[rgba(255,244,217,0.95)] 
          items-center justify-center border-2 border-border
          ${!isPressed ? 'shadow-backButton' : ''}
          transform ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}
        `}
        style={({ pressed }) => [{ elevation: pressed ? 2 : 5 }]}
        onPressIn={() => {
          appLog('🔘 BackButton onPressIn');
          setIsPressed(true);
        }}
        onPressOut={() => {
          appLog('🔘 BackButton onPressOut');
          setIsPressed(false);
        }}>
        <Ionicons
          name="chevron-back"
          size={22}
          color="#2D3720"
          style={{ opacity: disabled ? 0.5 : 1 }}
        />
      </Pressable>
    </View>
  );
};

export default BackButton;
