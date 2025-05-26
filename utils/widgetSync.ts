import { Platform, NativeModules } from 'react-native';

// define the interface for our native module
interface WidgetDataSyncInterface {
  updateWidgetData: (data: { 
    currentStreak: number; 
    lastActivityDate: string | null;
  }) => void;
}

const WidgetDataSync = Platform.OS === 'ios' 
  ? NativeModules.WidgetDataSync as WidgetDataSyncInterface 
  : null;

/**
 * syncs streak data to the iOS widget
 */
export const syncStreakDataToWidget = async (
  currentStreak: number,
  lastActivityDate: Date | null
): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !WidgetDataSync) {
    console.log('Widget sync not available on this platform');
    return false;
  }

  try {
    const formattedDate = lastActivityDate 
      ? lastActivityDate.toISOString().split('T')[0] 
      : null;

    WidgetDataSync.updateWidgetData({
      currentStreak,
      lastActivityDate: formattedDate
    });
    
    console.log('Widget data synced successfully', { currentStreak, lastActivityDate: formattedDate });
    return true;
  } catch (error) {
    console.log('Failed to sync widget data:', error);
    return false;
  }
}; 