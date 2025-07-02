import * as Haptics from 'expo-haptics';
import { useSoundStore } from '../app/stores/soundStore';

// Wrapper functions that check if haptics are enabled before triggering
export const triggerHapticImpact = (style: Haptics.ImpactFeedbackStyle) => {
  const hapticsEnabled = useSoundStore.getState().hapticsEnabled;
  if (hapticsEnabled) {
    Haptics.impactAsync(style).catch(() => {});
  }
};

export const triggerHapticNotification = (type: Haptics.NotificationFeedbackType) => {
  const hapticsEnabled = useSoundStore.getState().hapticsEnabled;
  if (hapticsEnabled) {
    Haptics.notificationAsync(type).catch(() => {});
  }
};

// Convenience functions for common haptic patterns
export const hapticLight = () => triggerHapticImpact(Haptics.ImpactFeedbackStyle.Light);
export const hapticMedium = () => triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium);
export const hapticHeavy = () => triggerHapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
export const hapticRigid = () => triggerHapticImpact(Haptics.ImpactFeedbackStyle.Rigid);
export const hapticSoft = () => triggerHapticImpact(Haptics.ImpactFeedbackStyle.Soft);

export const hapticSuccess = () => triggerHapticNotification(Haptics.NotificationFeedbackType.Success);
export const hapticWarning = () => triggerHapticNotification(Haptics.NotificationFeedbackType.Warning);
export const hapticError = () => triggerHapticNotification(Haptics.NotificationFeedbackType.Error); 