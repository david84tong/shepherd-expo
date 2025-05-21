import { NativeModules, Platform } from 'react-native';

const { StreakWidgetModule } = NativeModules;

if (Platform.OS === 'ios' && !StreakWidgetModule) {
  console.error('StreakWidgetModule is not available. Make sure it is properly linked.');
}

interface IStreakWidgetModule {
  updateStreak(streak: number): void;
}
export default StreakWidgetModule as IStreakWidgetModule; 
