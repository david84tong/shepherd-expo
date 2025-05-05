import { useCallback } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
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

// Check if user is authenticated
const isAuthenticated = () => {
  return auth().currentUser !== null;
};

// Sync local changes back to Firestore
const syncUserDataToFirestore = async () => {
  if (!isAuthenticated()) {
    console.log('User not authenticated, skipping Firestore sync');
    return false;
  }
  
  try {
    console.log('Syncing user data to Firestore');
    return await useUserStore.getState().syncWithFirestore();
  } catch (error) {
    console.error('Error syncing user data to Firestore:', error);
    return false;
  }
};

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

  // Check if lastReadingDate is more than 24 hours ago
  const isReadingMoreThan24HoursAgo = lastReadingDateObj ? 
    (now.getTime() - lastReadingDateObj.getTime() > 24 * 60 * 60 * 1000) : 
    false;
  
  // Reset streak immediately if reading is more than 24 hours ago
  if (isReadingMoreThan24HoursAgo && streakCount > 0) {
    if (debug) console.log(`🔄 Resetting streak to 0: reading > 24hrs ago = ${isReadingMoreThan24HoursAgo}`);
    setStreakCount(0);
  }

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
    console.log(`⚠️ Reading more than 24 hours ago: ${isReadingMoreThan24HoursAgo}`);
  }
  
  setLambMood(getLambMoodByHearts(lambHearts));
    
  // Skip if user was active today
  if (daysSinceActivity === 0) {
    return { 
      streakBroken: isReadingMoreThan24HoursAgo, 
      heartPenalty: 0, 
      daysMissed: 0 
    };
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
  if (heartPenalty > 0 || isReadingStreakBroken || isReadingMoreThan24HoursAgo) {
    let newHearts = lambHearts - heartPenalty;
    if (newHearts < 0) newHearts = 0;
    setLambHearts(newHearts);
    setLambMood(getLambMoodByHearts(newHearts));
    
    // Reset streak if reading streak is broken or more than 24 hours since last reading
    if ((isReadingStreakBroken || isReadingMoreThan24HoursAgo) && streakCount > 0) {
      if (debug) console.log(`🔄 Resetting streak to 0: streak broken = ${isReadingStreakBroken}, reading > 24hrs ago = ${isReadingMoreThan24HoursAgo}`);
      setStreakCount(0);
    }
    
    // Update lastActivityDate
    setLastActivityDate(firestore.Timestamp.now());
    
    // Update penalty dates for each activity that was penalized
    const nowTimestamp = firestore.Timestamp.now();
    if (applyReadingPenalty) setLastReadingPenaltyDate(nowTimestamp);
    if (applyPrayerPenalty) setLastPrayerPenaltyDate(nowTimestamp);
    if (applyReflectionPenalty) setLastReflectionPenaltyDate(nowTimestamp);
      
    // Sync with Firestore if authenticated
    if (isAuthenticated()) {
      syncUserDataToFirestore();
    }
      
    return {
      streakBroken: isReadingStreakBroken || isReadingMoreThan24HoursAgo,
      heartPenalty, 
      daysMissed: daysSinceActivity,
      readingPenalized: applyReadingPenalty,
      prayerPenalized: applyPrayerPenalty,
      reflectionPenalized: applyReflectionPenalty
    };
  } else {
    setLambMood(getLambMoodByHearts(lambHearts));
    return {
      streakBroken: isReadingMoreThan24HoursAgo,
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
    // First, try to fetch latest data from Firestore if user is authenticated
    if (isAuthenticated()) {
      try {
        console.log('User is authenticated, fetching latest data from Firestore before checking streak');
        await useUserStore.getState().fetchFromFirestore();
      } catch (fetchError) {
        console.error('Error fetching from Firestore, continuing with local data:', fetchError);
        // Continue with local data if fetch fails
      }
    }

    const userStore = useUserStore.getState();
    const homeStore = useHomeStore.getState();
    const now = new Date();
    
    // Validate that we have the required data from userStore
    if (!userStore.lamb || typeof userStore.lamb !== 'object') {
      console.error('Invalid lamb object in userStore:', userStore.lamb);
      return {
        streakBroken: false,
        heartPenalty: 0,
        daysMissed: 0,
        error: 'Invalid lamb data'
      };
    }
    
    // Do NOT update lastActivityDate here, only after penalty calculation
    const lambHearts = userStore.lamb.hearts;
    const streakCount = userStore.streakCount || 0;
    const lastActivityDate = userStore.lastActivityDate;
    const lastReadingDate = userStore.lastReadingDate;
    const lastPrayerDate = userStore.lastPrayerDate;
    const lastReflectionDate = userStore.lastReflectionDate;
    const lastReadingPenaltyDate = userStore.lastReadingPenaltyDate;
    const lastPrayerPenaltyDate = userStore.lastPrayerPenaltyDate;
    const lastReflectionPenaltyDate = userStore.lastReflectionPenaltyDate;
    
    const result = calculateStreakAndPenalties({
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
    
    // Sync changes back to Firestore if authenticated and there were significant changes
    if (isAuthenticated() && (result.heartPenalty > 0 || result.streakBroken)) {
      try {
        console.log('Syncing streak changes back to Firestore');
        await syncUserDataToFirestore();
      } catch (syncError) {
        console.error('Error syncing streak changes to Firestore:', syncError);
        // Continue even if sync fails - changes are still applied locally
      }
    }
    
    return result;
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
      // First, try to fetch latest data from Firestore if user is authenticated
      if (isAuthenticated()) {
        await userStore.fetchFromFirestore();
      }
      
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
      
      const result = calculateStreakAndPenalties({
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
      
      // Sync changes back to Firestore if authenticated and there were significant changes
      if (isAuthenticated() && (result.heartPenalty > 0 || result.streakBroken)) {
        console.log('Syncing streak changes back to Firestore');
        await userStore.syncWithFirestore();
      }
      
      return result;
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

// ─────────────── STREAK SUBTEXTS (1–21) ───────────────
export const STREAK_SUBTEXTS: Record<number, string> = {
  1: "Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come. (2 Cor 5:17)",
  2: "Faith as small as a mustard seed can move mountains. (Mt 17:20)",
  3: "The Lord is my shepherd; I shall not want. (Ps 23:1)",
  4: "Those who hope in the Lord will renew their strength. (Isa 40:31)",
  5: "Your word is a lamp to my feet and a light to my path. (Ps 119:105)",
  6: "Surpassed 50% of learners—keep shining your light!",
  7: "Be still, and know that I am God. (Ps 46:10)",
  8: "His mercies are new every morning. (Lam 3:23)",
  9: "Rejoice always, pray continually, give thanks. (1 Th 5:16-18)",
  10: "I can do all things through Christ who strengthens me. (Php 4:13)",
  11: "Seek first His kingdom and righteousness. (Mt 6:33)",
  12: "Give us today our daily bread. (Mt 6:11)",
  13: "The joy of the Lord is your strength. (Neh 8:10)",
  14: "Well done, good and faithful servant. (Mt 25:23)",
  15: "My grace is sufficient for you. (2 Co 12:9)",
  16: "Run with perseverance the race marked out. (Heb 12:1)",
  17: "The Lord goes before you and will be with you. (Dt 31:8)",
  18: "The steadfast love of the Lord never ceases. (Lam 3:22)",
  19: "Taste and see that the Lord is good. (Ps 34:8)",
  20: "Twenty days—you're ahead of 90% of learners! Keep the faith.",
  21: "Twenty-one days—habit formed; continue to abide in Him. (Jn 15:4)"
};

export const getStreakSubtext = (day: number): string => {
  return STREAK_SUBTEXTS[day] || "Keep going—one day at a time.";
};

