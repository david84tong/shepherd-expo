import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../stores/userStore';
import firestore from '@react-native-firebase/firestore';

// Key to check if app has been initialized
const APP_INITIALIZED_KEY = 'shepherd-app-initialized';

// Generate a unique UUID for anonymous users
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get user store actions
  const resetUserStore = useUserStore(state => state.resetUserStore);
  const setDisplayName = useUserStore(state => state.setDisplayName);
  const setCreatedAt = useUserStore(state => state.setCreatedAt);
  const setUpdatedAt = useUserStore(state => state.setUpdatedAt);
  const setLastActivityDate = useUserStore(state => state.setLastActivityDate);
  const setLastReadingDate = useUserStore(state => state.setLastReadingDate);
  const setLastPrayerDate = useUserStore(state => state.setLastPrayerDate);
  const setLastReflectionDate = useUserStore(state => state.setLastReflectionDate);
  const setLastReadingPenaltyDate = useUserStore(state => state.setLastReadingPenaltyDate);
  const setLastPrayerPenaltyDate = useUserStore(state => state.setLastPrayerPenaltyDate);
  const setLastReflectionPenaltyDate = useUserStore(state => state.setLastReflectionPenaltyDate);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        
        // Check if app has been initialized before
        const hasInitialized = await AsyncStorage.getItem(APP_INITIALIZED_KEY);
        
        if (!hasInitialized) {
          console.log('🚀 First app open, initializing user...');
          
          // Reset to initial state first
          resetUserStore();
          
          // Generate anonymous user ID
          const anonymousUserId = generateUUID();
          
          // Create timestamp for user creation
          const currentTime = firestore.Timestamp.now();
          
          // Set up user with timestamps and anonymous ID
          await AsyncStorage.setItem('shepherd-anonymous-user-id', anonymousUserId);
          setDisplayName('Anonymous User');
          setCreatedAt(currentTime);
          setUpdatedAt(currentTime);
          
          // Set all activity dates to now
          setLastActivityDate(currentTime);
          setLastReadingDate(currentTime);
          setLastPrayerDate(currentTime);
          setLastReflectionDate(currentTime);
          setLastReadingPenaltyDate(currentTime);
          setLastPrayerPenaltyDate(currentTime);
          setLastReflectionPenaltyDate(currentTime);
          
          // Mark app as initialized
          await AsyncStorage.setItem(APP_INITIALIZED_KEY, 'true');
          console.log('✅ User initialized with ID:', anonymousUserId);
        } else {
          console.log('📱 App already initialized');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
  }, []);
  
  return { isInitialized, isLoading };
};
