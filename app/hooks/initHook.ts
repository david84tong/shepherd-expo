import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '../stores/userStore';
import { Timestamp } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getUserDocument } from '../../utils/firestore';

// Key to check if app has been initialized
const APP_INITIALIZED_KEY = 'shepherd-app-initialized';

// Generate a unique UUID for anonymous users
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper function to safely format timestamp
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return 'Not set';
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleString();
  }
  return 'Invalid timestamp';
};

export const useAppInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get user store actions and getters
  const resetUserStore = useUserStore(state => state.resetUserStore);
  const getUser = useUserStore(state => state.getUser);
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
        console.log('🚀 Initializing app french...');
      try {
        setIsLoading(true);
        
        // Check if app has been initialized before
        const hasInitialized = await AsyncStorage.getItem(APP_INITIALIZED_KEY);
        
        if (!hasInitialized) {
          console.log('🚀 First app open, initializing user...');
          
          // Generate anonymous user ID
          const anonymousUserId = generateUUID();
          
          // Create timestamp for user creation
          const currentTime = Timestamp.now();
          
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
          
          // Get current user data
          const userData = getUser();
          const firebaseUser = auth().currentUser;
          
          // Log user state
          console.log('📊 Current User Data:', {
            // Auth Status
            isAuthenticated: !!firebaseUser,
            firebaseUID: firebaseUser?.uid || 'Not authenticated',
            firebaseEmail: firebaseUser?.email || 'Not available',
            
            // User Profile
            displayName: userData.displayName || 'Not set',
            spiritualGoal: userData.spiritualGoal || 'Not set',
            experienceLevel: userData.experienceLevel || 'Not set',
            frequencyGoal: userData.frequencyGoal || 'Not set',
            
            // Stats
            streakCount: userData.streakCount || 0,
            versesReadTotal: userData.versesReadTotal || 0,
            chaptersReadTotal: userData.chaptersReadTotal || 0,
            
            // Timestamps
            createdAt: formatTimestamp(userData.createdAt),
            lastActivityDate: formatTimestamp(userData.lastActivityDate),
            
            // Lamb Status
            lambLevel: userData?.lamb?.level || 1,
            lambXp: userData?.lamb?.xp || 0,
            lambMood: userData?.lamb?.mood || 'lamb-idle',
            lambHearts: userData?.lamb?.hearts || 50,
            lambName: userData?.lamb?.name || 'Not set'
          });

          // Fetch user from Firestore and set to userStore
          try {
            const firestoreUser = await getUserDocument();
            if (firestoreUser && typeof firestoreUser === 'object' && firestoreUser !== null) {
              // Check if we have a valid user object before setting it
              if (firestoreUser.id) {
                // Update individual fields instead of the whole object at once
                if (firestoreUser.displayName) setDisplayName(firestoreUser.displayName);
                if (firestoreUser.createdAt) setCreatedAt(firestoreUser.createdAt);
                if (firestoreUser.updatedAt) setUpdatedAt(firestoreUser.updatedAt);
                // Add other important fields if needed
                
                console.log('✅ User loaded from Firestore:', firestoreUser.id);
              } else {
                console.error('❌ Invalid user document structure (missing ID)');
              }
            }
          } catch (firestoreError) {
            console.error('❌ Error fetching user from Firestore:', firestoreError);
          }
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
