import React, { useState, useEffect } from 'react';
import { SafeAreaView, AppState, AppStateStatus, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BibleReader } from '../bibleReader';
import NewBibleReader from '../../components/NewBibleReader';
import { usePathStore } from '../stores/pathStore';

// Use the same key defined in NewBibleReader.tsx
const READER_PREFERENCE_KEY = 'userDefaultReaderPreference';

/**
 * Bible tab that conditionally renders either the new or default Bible reader
 * based on user preference stored in AsyncStorage
 */
export default function BibleTab() {
  const { savedBookId, savedChapter, savedTranslation, setPathInProgress } = usePathStore();
  const [useDefaultReader, setUseDefaultReader] = useState<boolean | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load user preference for reader type - only once at component mount
  useEffect(() => {
    const loadReaderPreference = async () => {
      try {
        const readerPref = await AsyncStorage.getItem(READER_PREFERENCE_KEY);
        console.log(`Initial reader preference: ${readerPref}`);
        setUseDefaultReader(readerPref === 'default');
      } catch (error) {
        console.error('Failed to load reader preference:', error);
        setUseDefaultReader(false); // Default to new reader if preference can't be loaded
      }
    };
    
    loadReaderPreference();
  }, []);

  // Set up a listener for reader preference changes
  useEffect(() => {
    const checkForPreferenceChange = async () => {
      try {
        const readerPref = await AsyncStorage.getItem(READER_PREFERENCE_KEY);
        const shouldUseDefault = readerPref === 'default';
        
        if (useDefaultReader !== shouldUseDefault && useDefaultReader !== null) {
          console.log(`Reader preference changed to: ${shouldUseDefault ? 'Default' : 'Card View'}`);
          
          // Show transition indicator
          setIsTransitioning(true);
          
          // Set a timeout to ensure the transition indicator shows before switching
          setTimeout(() => {
            setUseDefaultReader(shouldUseDefault);
            
            // Give time for the new reader to load before hiding the indicator
            setTimeout(() => {
              setIsTransitioning(false);
            }, 500);
          }, 100);
        }
      } catch (error) {
        console.error('Error checking for preference change:', error);
      }
    };

    // Set up event listener for app becoming active
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkForPreferenceChange();
      }
    });

    // Check for preference changes after modal closing
    const intervalId = setInterval(() => {
      checkForPreferenceChange();
    }, 3000); // Check every 3 seconds (much less frequently)

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [useDefaultReader]);

  // When tab is activated, ensure tabbar visibility
  useEffect(() => {
    setPathInProgress(false);
  }, []);

  // Show loading state while determining preference or during transition
  if (useDefaultReader === null || isTransitioning) {
    return (
      <SafeAreaView className="flex-1 bg-main-bg justify-center items-center">
        <ActivityIndicator size="large" color="#F7B500" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-main-bg">
      {useDefaultReader ? (
        // Render the default Bible reader
        <BibleReader 
          isEmbedded 
          initialBookId={savedBookId} 
          initialChapter={savedChapter} 
        />
      ) : (
        // Render the new Bible reader
        <NewBibleReader 
          bookId={savedBookId} 
          chapter={savedChapter}
          translation={savedTranslation}
        />
      )}
    </SafeAreaView>
  );
}
