import { useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import { useUserStore } from '../stores/userStore';
import { useHomeStore } from '../stores/homeStore';

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

// Utility: Convert Firestore Timestamp/Date/serialized to Date
function getDateFromTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;
      try {
        if (timestamp instanceof Date) return timestamp;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (typeof timestamp === 'object' && timestamp.seconds) {
          return new firestore.Timestamp(
            timestamp.seconds, 
            timestamp.nanoseconds || 0
          ).toDate();
        }
        return null;
      } catch (error) {
        console.error('DEBUG - Error converting timestamp:', error);
        return null;
      }
}

// Utility: Set lamb mood based on hearts
export function getLambMoodByHearts(hearts: number): string {
  if (hearts < 1) return 'smoking';
  if (hearts < 10) return 'lamb-skinny dying';
  if (hearts < 20) return 'lamb-chubby dying';
  if (hearts < 30) return 'lamb-angry';
  if (hearts < 50) return 'lamb-sleepy';
  return 'lamb-idle';
}

// Utility: Core penalty/streak logic
function calculateStreakAndPenalties({
  lambHearts,
  streakCount,
  lastActivityDate,
  lastReadingDate,
  lastPrayerDate,
  lastReflectionDate,
  lastReadingPenaltyDate,
  lastPrayerPenaltyDate,
  lastReflectionPenaltyDate,
  now,
  setLambMood,
  setLambHearts,
  setStreakCount,
  setLastActivityDate,
  setLastReadingPenaltyDate,
  setLastPrayerPenaltyDate,
  setLastReflectionPenaltyDate,
  resetCompletionStates,
  debug = false,
}: {
  lambHearts: number,
  streakCount: number,
  lastActivityDate: any,
  lastReadingDate: any,
  lastPrayerDate: any,
  lastReflectionDate: any,
  lastReadingPenaltyDate: any,
  lastPrayerPenaltyDate: any,
  lastReflectionPenaltyDate: any,
  now: Date,
  setLambMood: (mood: string) => void,
  setLambHearts: (hearts: number) => void,
  setStreakCount: (count: number) => void,
  setLastActivityDate: (date: any) => void,
  setLastReadingPenaltyDate: (date: any) => void,
  setLastPrayerPenaltyDate: (date: any) => void,
  setLastReflectionPenaltyDate: (date: any) => void,
  resetCompletionStates: () => void,
  debug?: boolean,
}) {
  // Convert dates
  const lastActivityDateObj = getDateFromTimestamp(lastActivityDate) || now;
    const lastReadingDateObj = getDateFromTimestamp(lastReadingDate);
    const lastPrayerDateObj = getDateFromTimestamp(lastPrayerDate);
    const lastReflectionDateObj = getDateFromTimestamp(lastReflectionDate);
  const lastReadingPenaltyDateObj = getDateFromTimestamp(lastReadingPenaltyDate);
  const lastPrayerPenaltyDateObj = getDateFromTimestamp(lastPrayerPenaltyDate);
  const lastReflectionPenaltyDateObj = getDateFromTimestamp(lastReflectionPenaltyDate);

  // Calculate days since last activities
  const daysSinceActivity = lastActivityDateObj ? getDaysDifference(now, lastActivityDateObj) : 0;
  const daysSinceReading = lastReadingDateObj ? getDaysDifference(now, lastReadingDateObj) : daysSinceActivity;
  const daysSincePrayer = lastPrayerDateObj ? getDaysDifference(now, lastPrayerDateObj) : daysSinceActivity;
  const daysSinceReflection = lastReflectionDateObj ? getDaysDifference(now, lastReflectionDateObj) : daysSinceActivity;
  
  // Calculate days since last penalties were applied
  const daysSinceReadingPenalty = lastReadingPenaltyDateObj ? getDaysDifference(now, lastReadingPenaltyDateObj) : 0;
  const daysSincePrayerPenalty = lastPrayerPenaltyDateObj ? getDaysDifference(now, lastPrayerPenaltyDateObj) : 0;
  const daysSinceReflectionPenalty = lastReflectionPenaltyDateObj ? getDaysDifference(now, lastReflectionPenaltyDateObj) : 0;

  if (debug) {
    console.log('DEBUG - Converted date objects:', {
      lastActivityDateObj,
      lastReadingDateObj,
      lastPrayerDateObj,
      lastReflectionDateObj,
      lastReadingPenaltyDateObj,
      lastPrayerPenaltyDateObj,
      lastReflectionPenaltyDateObj
    });
    console.log(`⏰ Days since last activity: ${daysSinceActivity}`);
    console.log(`📚 Days since reading: ${daysSinceReading}, Days since reading penalty: ${daysSinceReadingPenalty}`);
    console.log(`🙏 Days since prayer: ${daysSincePrayer}, Days since prayer penalty: ${daysSincePrayerPenalty}`);
    console.log(`✍️ Days since reflection: ${daysSinceReflection}, Days since reflection penalty: ${daysSinceReflectionPenalty}`);
  }
  
  setLambMood(getLambMoodByHearts(lambHearts));
    
    // Skip if user was active today
    if (daysSinceActivity === 0) {
      return { streakBroken: false, heartPenalty: 0, daysMissed: 0 };
    }
    
  // Reset completion states if it's a new day
    if (daysSinceActivity > 0) {
    resetCompletionStates();
    }
    
    // Calculate total heart penalties (ignoring first day)
    let heartPenalty = 0;
  let applyReadingPenalty = false;
  let applyPrayerPenalty = false;
  let applyReflectionPenalty = false;
    
  // For each activity, check if we should apply a penalty
  if (daysSinceReading > 0 && daysSinceReadingPenalty > 0) {
    heartPenalty += (daysSinceReadingPenalty) * PENALTIES.READING;
    applyReadingPenalty = true;
    if (debug) console.log(`💔 Reading penalty applied: ${(daysSinceReading) * PENALTIES.READING} hearts`);
  } else if (debug) {
    console.log(`⏹️ No reading penalty: days since reading = ${daysSinceReading}, days since penalty = ${daysSinceReadingPenalty}`);
  }
  
  if (daysSincePrayer > 0 && daysSincePrayerPenalty > 0) {
    heartPenalty += (daysSincePrayerPenalty) * PENALTIES.PRAYER;
    applyPrayerPenalty = true;
    if (debug) console.log(`💔 Prayer penalty applied: ${(daysSincePrayer) * PENALTIES.PRAYER} hearts`);
  } else if (debug) {
    console.log(`⏹️ No prayer penalty: days since prayer = ${daysSincePrayer}, days since penalty = ${daysSincePrayerPenalty}`);
  }
  
  if (daysSinceReflection > 0 && daysSinceReflectionPenalty > 0) {
    heartPenalty += (daysSinceReflectionPenalty) * PENALTIES.REFLECTION;
    applyReflectionPenalty = true;
    if (debug) console.log(`💔 Reflection penalty applied: ${(daysSinceReflection) * PENALTIES.REFLECTION} hearts`);
  } else if (debug) {
    console.log(`⏹️ No reflection penalty: days since reflection = ${daysSinceReflection}, days since penalty = ${daysSinceReflectionPenalty}`);
  }
    
    // Check if Bible reading streak is broken (more than 1 day)
  const isReadingStreakBroken = daysSinceReading >= 1 && applyReadingPenalty;
    
    // Apply penalties and update streak
    if (heartPenalty > 0 || isReadingStreakBroken) {
    let newHearts = lambHearts - heartPenalty;
    if (newHearts < 0) newHearts = 0;
    setLambHearts(newHearts);
    setLambMood(getLambMoodByHearts(newHearts));
    if (isReadingStreakBroken) setStreakCount(0);
    
    // Update lastActivityDate
    setLastActivityDate(firestore.Timestamp.now());
    
    // Update penalty dates for each activity that was penalized
    const nowTimestamp = firestore.Timestamp.now();
    if (applyReadingPenalty) setLastReadingPenaltyDate(nowTimestamp);
    if (applyPrayerPenalty) setLastPrayerPenaltyDate(nowTimestamp);
    if (applyReflectionPenalty) setLastReflectionPenaltyDate(nowTimestamp);
      
      return {
        streakBroken: isReadingStreakBroken,
      heartPenalty, 
      daysMissed: daysSinceActivity,
      readingPenalized: applyReadingPenalty,
      prayerPenalized: applyPrayerPenalty,
      reflectionPenalized: applyReflectionPenalty
      };
    } else {
    setLambMood(getLambMoodByHearts(lambHearts));
      return {
        streakBroken: false,
        heartPenalty: 0,
      daysMissed: 0,
      readingPenalized: false,
      prayerPenalized: false,
      reflectionPenalized: false
    };
  }
}

// Refactored: Non-hook version for use outside React components
export const checkStreakAndApplyPenalties = async () => {
  try {
    const userStore = useUserStore.getState();
    const homeStore = useHomeStore.getState();
    const now = new Date();
    // Do NOT update lastActivityDate here, only after penalty calculation
    const lambHearts = userStore.lamb.hearts;
    const streakCount = userStore.streakCount;
    const lastActivityDate = userStore.lastActivityDate;
    const lastReadingDate = userStore.lastReadingDate;
    const lastPrayerDate = userStore.lastPrayerDate;
    const lastReflectionDate = userStore.lastReflectionDate;
    const lastReadingPenaltyDate = userStore.lastReadingPenaltyDate;
    const lastPrayerPenaltyDate = userStore.lastPrayerPenaltyDate;
    const lastReflectionPenaltyDate = userStore.lastReflectionPenaltyDate;
    
    return calculateStreakAndPenalties({
      lambHearts,
      streakCount,
      lastActivityDate,
      lastReadingDate,
      lastPrayerDate,
      lastReflectionDate,
      lastReadingPenaltyDate,
      lastPrayerPenaltyDate,
      lastReflectionPenaltyDate,
      now,
      setLambMood: userStore.setLambMood,
      setLambHearts: userStore.setLambHearts,
      setStreakCount: userStore.setStreakCount,
      setLastActivityDate: userStore.setLastActivityDate,
      setLastReadingPenaltyDate: userStore.setLastReadingPenaltyDate,
      setLastPrayerPenaltyDate: userStore.setLastPrayerPenaltyDate,
      setLastReflectionPenaltyDate: userStore.setLastReflectionPenaltyDate,
      resetCompletionStates: homeStore.resetCompletionStates,
      debug: true,
    });
  } catch (error) {
    console.error('❌ Error checking streak and applying penalties:', error);
    console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('❌ Error stack:', (error as Error).stack);
    return {
      error,
      streakBroken: false,
      heartPenalty: 0,
      daysMissed: 0
    };
  }
};

// Refactored: Hook for managing user streaks and penalties
export const useStreakManager = () => {
  const userStore = useUserStore();
  const homeStore = useHomeStore();
  
  const checkAndApplyPenalties = useCallback(async () => {
    try {
      const lambHearts = userStore.getLambHearts();
      const streakCount = userStore.getStreakCount();
      const lastActivityDate = userStore.getLastActivityDate();
      const lastReadingDate = userStore.lastReadingDate;
      const lastPrayerDate = userStore.lastPrayerDate;
      const lastReflectionDate = userStore.lastReflectionDate;
      const lastReadingPenaltyDate = userStore.getLastReadingPenaltyDate();
      const lastPrayerPenaltyDate = userStore.getLastPrayerPenaltyDate();
      const lastReflectionPenaltyDate = userStore.getLastReflectionPenaltyDate();
      const now = new Date();
      // Do NOT update lastActivityDate here, only after penalty calculation
      return calculateStreakAndPenalties({
        lambHearts,
        streakCount,
        lastActivityDate,
        lastReadingDate,
        lastPrayerDate,
        lastReflectionDate,
        lastReadingPenaltyDate,
        lastPrayerPenaltyDate,
        lastReflectionPenaltyDate,
        now,
        setLambMood: userStore.setLambMood,
        setLambHearts: userStore.setLambHearts,
        setStreakCount: userStore.setStreakCount,
        setLastActivityDate: userStore.setLastActivityDate,
        setLastReadingPenaltyDate: userStore.setLastReadingPenaltyDate,
        setLastPrayerPenaltyDate: userStore.setLastPrayerPenaltyDate,
        setLastReflectionPenaltyDate: userStore.setLastReflectionPenaltyDate,
        resetCompletionStates: homeStore.resetCompletionStates,
        debug: true,
      });
    } catch (error) {
      console.error('❌ Error checking streak and applying penalties:', error);
      console.error('❌ Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      console.error('❌ Error stack:', (error as Error).stack);
      return {
        error,
        streakBroken: false,
        heartPenalty: 0,
        daysMissed: 0
      };
    }
  }, [userStore, homeStore]);
  
  return {
    checkStreakAndApplyPenalties: checkAndApplyPenalties
  };
};

