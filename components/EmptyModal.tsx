import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EmptyModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function EmptyModal({ visible, onClose, children }: EmptyModalProps) {
  const insets = useSafeAreaInsets();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Control whether modal is rendered at all - for proper unmounting
  const [isRendered, setIsRendered] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      // Slide up animation with natural spring effect
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isRendered) {
      // Slide down animation with ease-in
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
      });
    }
  }, [visible]);

  if (!visible && !isRendered) return null;

  return (
    <Modal transparent visible={isRendered} animationType="none">
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity }
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom,
              transform: [{ translateY: translateY }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: '#FEF3C7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%', // Slightly increased to ensure content fits
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
});