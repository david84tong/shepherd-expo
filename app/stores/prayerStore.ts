import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the interface for prayer topics with usage count
export interface PrayerTopic {
  name: string;
  count: number;
}

// Default prayer topics with initial count of 0
const DEFAULT_TOPICS = [
  'Health',
  'Repentance',
  'Patience',
  'Family',
  'Peace',
  'Forgiveness',
  'Strength',
  'Wisdom'
].map(name => ({ name, count: 0 }));

interface PrayerState {
  // Prayer topic state
  prayerTopics: PrayerTopic[];
  recentPrayers: string[];
  
  // Actions
  incrementTopicCount: (topicName: string) => void;
  addNewPrayerTopic: (topicName: string) => void;
  addRecentPrayer: (prayerText: string) => void;
  getOrderedTopics: () => PrayerTopic[];
  
  // Reset functionality
  resetStore: () => void;
}

export const usePrayerStore = create<PrayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      prayerTopics: DEFAULT_TOPICS,
      recentPrayers: [],
      
      // Increment the count for an existing topic
      incrementTopicCount: (topicName: string) => {
        set(state => {
          const topicExists = state.prayerTopics.some(topic => 
            topic.name.toLowerCase() === topicName.toLowerCase()
          );
          
          if (topicExists) {
            // Increment existing topic count
            return {
              prayerTopics: state.prayerTopics.map(topic => 
                topic.name.toLowerCase() === topicName.toLowerCase()
                  ? { ...topic, count: topic.count + 1 }
                  : topic
              )
            };
          } else {
            // Add as a new topic if it doesn't exist
            const newTopic = { name: topicName.trim(), count: 1 };
            return { 
              prayerTopics: [...state.prayerTopics, newTopic] 
            };
          }
        });
      },
      
      // Add a new prayer topic
      addNewPrayerTopic: (topicName: string) => {
        if (!topicName.trim()) return;
        
        const newTopic = { name: topicName.trim(), count: 1 };
        
        set(state => {
          // Check if topic already exists (case insensitive)
          const exists = state.prayerTopics.some(topic => 
            topic.name.toLowerCase() === topicName.toLowerCase()
          );
          
          if (!exists) {
            return { 
              prayerTopics: [...state.prayerTopics, newTopic] 
            };
          }
          return state; // No change if topic exists
        });
        
        return get().prayerTopics;
      },
      
      // Add a prayer to recent prayers list
      addRecentPrayer: (prayerText: string) => {
        if (!prayerText.trim()) return;
        
        set(state => {
          // Add to recent list, keeping only the last 10
          const updatedRecentPrayers = [
            prayerText,
            ...state.recentPrayers.filter(p => p !== prayerText)
          ].slice(0, 10);
          
          return { recentPrayers: updatedRecentPrayers };
        });
      },
      
      // Get topics ordered by usage count (most used first)
      getOrderedTopics: () => {
        const { prayerTopics } = get();
        return [...prayerTopics].sort((a, b) => b.count - a.count);
      },
      
      // Reset the store to initial state
      resetStore: () => {
        set({ 
          prayerTopics: DEFAULT_TOPICS,
          recentPrayers: []
        });
      }
    }),
    {
      name: 'shepherd-prayer-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
