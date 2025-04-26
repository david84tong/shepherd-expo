import { useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useUserStore } from '../stores/userStore';

// Penalties for missing activities (hearts lost per day)
const PENALTIES = {
  READING: 3,   // -3 hearts per day missing Bible reading
  PRAYER: 2,    // -2 hearts per day missing prayer
  REFLECTION: 1 // -1 heart per day missing reflection
};

/**
 * Calculates days between two dates, ignoring time
 */
const getDaysDifference = (date1: Date, date2: Date): number => {
  const date1Midnight = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const date2Midnight = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  
  const diffTime = Math.abs(date1Midnight.getTime() - date2Midnight.getTime());
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Non-hook version for use outside React components (like in app initialization)
 */
export const checkStreakAndApplyPenalties = async () => {
  try {
    console.log('🔥 Checking streak and applying penalties...');
    
    // Get store outside of hook context
    const userStore = useUserStore.getState();
    
    // Get current data from store
    const lambHearts = userStore.lamb.hearts;
    const streakCount = userStore.streakCount;
    const lastActivityDate = userStore.lastActivityDate;
    
    // Firebase expects timestamp objects, but our store might have them as fields
    const lastReadingDate = userStore.lastReadingDate;
    const lastPrayerDate = userStore.lastPrayerDate;
    const lastReflectionDate = userStore.lastReflectionDate;
    
    // Current date
    const now = new Date();
    
    // If no previous activity, this is a new user
    if (!lastActivityDate) {
      console.log('👤 No previous activity found - new user or missing data');
      return { streakBroken: false, heartPenalty: 0, daysMissed: 0 };
    }
    
    // Calculate days since last activities
    const daysSinceActivity = lastActivityDate ? 
      getDaysDifference(now, lastActivityDate.toDate()) : 0;
      
    const daysSinceReading = lastReadingDate ? 
      getDaysDifference(now, lastReadingDate.toDate()) : daysSinceActivity;
      
    const daysSincePrayer = lastPrayerDate ? 
      getDaysDifference(now, lastPrayerDate.toDate()) : daysSinceActivity;
      
    const daysSinceReflection = lastReflectionDate ? 
      getDaysDifference(now, lastReflectionDate.toDate()) : daysSinceActivity;
    
    // Skip if user was active today
    if (daysSinceActivity === 0) {
      console.log('🎯 User was active today, no penalties needed');
      return { streakBroken: false, heartPenalty: 0, daysMissed: 0 };
    }
    
    console.log(`⏰ Days since last activity: ${daysSinceActivity}`);
    console.log(`📚 Days since reading: ${daysSinceReading}`);
    console.log(`🙏 Days since prayer: ${daysSincePrayer}`);
    console.log(`✍️ Days since reflection: ${daysSinceReflection}`);
    
    // Calculate total heart penalties (ignoring first day)
    let heartPenalty = 0;
    
    // Only penalize if more than 1 day has passed
    if (daysSinceReading > 1) {
      // Subtract 1 from days since we don't penalize for the first day
      heartPenalty += (daysSinceReading - 1) * PENALTIES.READING;
    }
    
    if (daysSincePrayer > 1) {
      heartPenalty += (daysSincePrayer - 1) * PENALTIES.PRAYER;
    }
    
    if (daysSinceReflection > 1) {
      heartPenalty += (daysSinceReflection - 1) * PENALTIES.REFLECTION;
    }
    
    // Check if Bible reading streak is broken (more than 1 day)
    const isReadingStreakBroken = daysSinceReading > 1;
    
    // Apply penalties and update streak
    if (heartPenalty > 0 || isReadingStreakBroken) {
      console.log(`💔 Applying heart penalty: -${heartPenalty} hearts`);
      
      // Calculate new heart value, don't go below 0
      const newHearts = Math.max(0, lambHearts - heartPenalty);
      userStore.setLambHearts(newHearts);
      
      // Set lamb mood to sad if hearts were deducted
      if (heartPenalty > 0) {
        userStore.setLambMood('sad');
      }
      
      // Reset streak only if Bible reading streak is broken
      if (isReadingStreakBroken) {
        console.log('🔥 Bible reading streak broken! Resetting from', streakCount, 'to 0');
        userStore.setStreakCount(0);
      }
      
      // Create a current timestamp for activity date
      // @ts-ignore - Firestore type issue workaround
      const now = firestore.Timestamp.now();
      userStore.setLastActivityDate(now);
      
      return {
        streakBroken: isReadingStreakBroken,
        heartPenalty: heartPenalty,
        daysMissed: daysSinceActivity
      };
    } else {
      console.log('✅ No streak broken, no penalties applied');
      return {
        streakBroken: false,
        heartPenalty: 0,
        daysMissed: 0
      };
    }
  } catch (error) {
    console.error('❌ Error checking streak and applying penalties:', error);
    return {
      error: error,
      streakBroken: false,
      heartPenalty: 0,
      daysMissed: 0
    };
  }
};

/**
 * Hook for managing user streaks and penalties
 */
export const useStreakManager = () => {
  const userStore = useUserStore();
  
  const checkAndApplyPenalties = useCallback(async () => {
    try {
      console.log('🔥 Checking streak and applying penalties...');
      
      // Get current data from store
      const lambHearts = userStore.getLambHearts();
      const streakCount = userStore.getStreakCount();
      const lastActivityDate = userStore.getLastActivityDate();
      
      // Firebase expects timestamp objects, but our store might have them as fields
      const lastReadingDate = userStore.lastReadingDate;
      const lastPrayerDate = userStore.lastPrayerDate;
      const lastReflectionDate = userStore.lastReflectionDate;
      
      // Current date
      const now = new Date();
      
      // If no previous activity, this is a new user
      if (!lastActivityDate) {
        console.log('👤 No previous activity found - new user or missing data');
        return;
      }
      
      // Calculate days since last activities
      const daysSinceActivity = lastActivityDate ? 
        getDaysDifference(now, lastActivityDate.toDate()) : 0;
        
      const daysSinceReading = lastReadingDate ? 
        getDaysDifference(now, lastReadingDate.toDate()) : daysSinceActivity;
        
      const daysSincePrayer = lastPrayerDate ? 
        getDaysDifference(now, lastPrayerDate.toDate()) : daysSinceActivity;
        
      const daysSinceReflection = lastReflectionDate ? 
        getDaysDifference(now, lastReflectionDate.toDate()) : daysSinceActivity;
      
      // Skip if user was active today
      if (daysSinceActivity === 0) {
        console.log('🎯 User was active today, no penalties needed');
        return;
      }
      
      console.log(`⏰ Days since last activity: ${daysSinceActivity}`);
      console.log(`📚 Days since reading: ${daysSinceReading}`);
      console.log(`🙏 Days since prayer: ${daysSincePrayer}`);
      console.log(`✍️ Days since reflection: ${daysSinceReflection}`);
      
      // Calculate total heart penalties (ignoring first day)
      let heartPenalty = 0;
      
      // Only penalize if more than 1 day has passed
      if (daysSinceReading > 1) {
        // Subtract 1 from days since we don't penalize for the first day
        heartPenalty += (daysSinceReading - 1) * PENALTIES.READING;
      }
      
      if (daysSincePrayer > 1) {
        heartPenalty += (daysSincePrayer - 1) * PENALTIES.PRAYER;
      }
      
      if (daysSinceReflection > 1) {
        heartPenalty += (daysSinceReflection - 1) * PENALTIES.REFLECTION;
      }
      
      // Check if Bible reading streak is broken (more than 1 day)
      const isReadingStreakBroken = daysSinceReading > 1;
      
      // Apply penalties and update streak
      if (heartPenalty > 0 || isReadingStreakBroken) {
        console.log(`💔 Applying heart penalty: -${heartPenalty} hearts`);
        
        // Calculate new heart value, don't go below 0
        const newHearts = Math.max(0, lambHearts - heartPenalty);
        userStore.setLambHearts(newHearts);
        
        // Set lamb mood to sad if hearts were deducted
        if (heartPenalty > 0) {
          userStore.setLambMood('sad');
        }
        
        // Reset streak only if Bible reading streak is broken
        if (isReadingStreakBroken) {
          console.log('🔥 Bible reading streak broken! Resetting from', streakCount, 'to 0');
          userStore.setStreakCount(0);
        }
        
        // Create a current timestamp for activity date
        // @ts-ignore - Firestore type issue workaround
        const now = firestore.Timestamp.now();
        userStore.setLastActivityDate(now);
        
        return {
          streakBroken: isReadingStreakBroken,
          heartPenalty: heartPenalty,
          daysMissed: daysSinceActivity
        };
      } else {
        console.log('✅ No streak broken, no penalties applied');
        return {
          streakBroken: false,
          heartPenalty: 0,
          daysMissed: 0
        };
      }
    } catch (error) {
      console.error('❌ Error checking streak and applying penalties:', error);
      return {
        error: error,
        streakBroken: false,
        heartPenalty: 0,
        daysMissed: 0
      };
    }
  }, [userStore]);
  
  return {
    checkStreakAndApplyPenalties: checkAndApplyPenalties
  };
};
