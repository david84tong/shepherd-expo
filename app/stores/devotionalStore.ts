// inside here we will be generating a daily devotional for the user
// we will save old devotionals in a list
// we will be calling openAI API to generate a devotional based off user data, previous reflections.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore, { Timestamp } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import analytics from '../../utils/analytics';

interface Devotional {
    id: string;
    title: string;
    bibleVerse: string;
    bibleReference: string; // e.g., "John 3:16"
    context: string; // 3 paragraphs of context about verse and how it applies to user's life.
    prayer: string; // 1 paragraph of prayer for the user to pray.
    reflectionPrompt: string;
    createdAt: Timestamp;
    userId: string; 
    date: string; // YYYY-MM-DD format for easy querying
}

interface DevotionalStore {
  currentDevotional: Devotional | null;
  devotionals: Devotional[]; // List of past devotionals
  isGenerating: boolean;
  lastGeneratedDate: string | null; // Track when we last generated a devotional
  error: string | null;
  
  // Actions
  generateDailyDevotional: (userContext?: any) => Promise<Devotional | null>;
  fetchDevotionals: () => Promise<void>;
  fetchDevotionalByDate: (date: string) => Promise<Devotional | null>;
  getTodaysDevotional: () => Promise<Devotional | null>;
  clearError: () => void;
  resetStore: () => void;
}

export const useDevotionalStore = create<DevotionalStore>()(
  persist(
    (set, get) => ({
      currentDevotional: null,
      devotionals: [],
      isGenerating: false,
      lastGeneratedDate: null,
      error: null,

      generateDailyDevotional: async (userContext = {}) => {
        const currentUser = auth().currentUser;
        if (!currentUser) {
          set({ error: 'User not authenticated' });
          return null;
        }

        console.log('🔐 Debug - Current user:', {
          uid: currentUser.uid,
          email: currentUser.email,
          isAnonymous: currentUser.isAnonymous
        });

        // Check if we already have a devotional for today
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { devotionals } = get();

        // First check local state
        const existingDevotionalInMemory = devotionals.find(d => d.date === today);
        if (existingDevotionalInMemory) {
          console.log('📅 Debug - Devotional for today already exists in memory:', existingDevotionalInMemory.id);
          set({ currentDevotional: existingDevotionalInMemory });
          return existingDevotionalInMemory;
        }

        // Then check Firestore
        try {
          const existingDevotionalInFirestore = await get().fetchDevotionalByDate(today);
          if (existingDevotionalInFirestore) {
            console.log('📅 Debug - Devotional for today already exists in Firestore:', existingDevotionalInFirestore.id);
            set({ 
              currentDevotional: existingDevotionalInFirestore,
              devotionals: [existingDevotionalInFirestore, ...devotionals]
            });
            return existingDevotionalInFirestore;
          }
        } catch (error) {
          console.log('⚠️ Debug - Error checking for existing devotional:', error);
          // Continue with generation if we can't check Firestore
        }

        console.log('🆕 Debug - No existing devotional found for today, proceeding with generation');

        set({ isGenerating: true, error: null });

        try {
          // Track devotional generation start
          analytics.logEvent('Devotional_GenerationStarted', {
            userId: currentUser.uid,
            hasUserContext: !!userContext
          });

          // Get Firebase ID token
          const idToken = await auth().currentUser?.getIdToken();
          if (!idToken) {
            throw new Error('Failed to get authentication token');
          }

          // Get user's recent reflections and readings for context
          // const reflectionsSnapshot = await firestore()
          //   .collection('reflections')
          //   .where('userId', '==', currentUser.uid)
          //   .orderBy('createdAt', 'desc')
          //   .limit(5)
          //   .get();

          // const recentReflections = reflectionsSnapshot.docs.map(doc => doc.data());
          const recentReflections: any[] = []; // Temporarily empty for debugging

          console.log('📖 Debug - Skipping reflections query for debugging');

          // Prepare the prompt for OpenAI
          const systemPrompt = `You are a compassionate Christian devotional writer creating personalized daily devotionals. 
          Create a devotional that is encouraging, biblically sound, and personally relevant.
          The devotional should include:
          1. A meaningful title
          2. A Bible verse with reference
          3. Three paragraphs of context explaining the verse and its application
          4. A one paragraph prayer
          5. A reflection prompt for journaling`;

          const userPrompt = `Create a daily devotional for a user with the following context:
          ${JSON.stringify(userContext)}
          Recent reflections: ${JSON.stringify(recentReflections)}
          
          Please format the response as JSON with the following structure:
          {
            "title": "...",
            "bibleVerse": "The actual verse text",
            "bibleReference": "Book Chapter:Verse",
            "context": "Three paragraphs of context...",
            "prayer": "One paragraph prayer...",
            "reflectionPrompt": "A thoughtful question or prompt... (1 sentence)"
          }`;

          // Call OpenAI API
          const response = await fetch('https://shepherd-dev-api.skylar.gg/oai/gpt?model=gpt-3.5-turbo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ]
            })
          });

          const data = await response.json();

          if (!data || !data.content) {
            throw new Error('Invalid API response');
          }

          // Parse the JSON response
          const devotionalData = JSON.parse(data.content);
          
          // Create devotional object
          const devotional: Devotional = {
            id: `${currentUser.uid}_${today}_${Date.now()}`,
            title: devotionalData.title,
            bibleVerse: devotionalData.bibleVerse,
            bibleReference: devotionalData.bibleReference,
            context: devotionalData.context,
            prayer: devotionalData.prayer,
            reflectionPrompt: devotionalData.reflectionPrompt,
            createdAt: Timestamp.now(),
            userId: currentUser.uid,
            date: today
          };

          console.log('📝 Debug - Devotional to save:', {
            id: devotional.id,
            userId: devotional.userId,
            date: devotional.date,
            title: devotional.title,
            createdAt: devotional.createdAt
          });

          console.log('🔥 Debug - About to save to Firestore collection: devotionals');
          console.log('🔥 Debug - Document ID:', devotional.id);
          console.log('🔥 Debug - Full devotional data:', JSON.stringify(devotional, null, 2));

          // Save to Firestore
          await firestore()
            .collection('devotionals')
            .doc(devotional.id)
            .set(devotional);

          console.log('✅ Debug - Successfully saved to Firestore');

          // Update local state
          set({
            currentDevotional: devotional,
            devotionals: [devotional, ...get().devotionals],
            lastGeneratedDate: today,
            isGenerating: false
          });

          // Track successful generation
          analytics.logEvent('Devotional_Generated', {
            userId: currentUser.uid,
            devotionalId: devotional.id,
            title: devotional.title,
            bibleReference: devotional.bibleReference,
            date: today
          });

          return devotional;
        } catch (error) {
          console.error('Error generating devotional:', error);
          
          // Track generation error
          analytics.logEvent('Devotional_GenerationError', {
            userId: currentUser.uid,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          set({ 
            error: error instanceof Error ? error.message : 'Failed to generate devotional',
            isGenerating: false 
          });
          return null;
        }
      },

      fetchDevotionals: async () => {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        try {
          const snapshot = await firestore()
            .collection('devotionals')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(30)
            .get();

          const devotionals = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          })) as Devotional[];

          set({ devotionals });
        } catch (error) {
          console.error('Error fetching devotionals:', error);
          set({ error: 'Failed to fetch devotionals' });
        }
      },

      fetchDevotionalByDate: async (date: string) => {
        const currentUser = auth().currentUser;
        if (!currentUser) return null;

        try {
          const snapshot = await firestore()
            .collection('devotionals')
            .where('userId', '==', currentUser.uid)
            .where('date', '==', date)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const devotional = {
              ...snapshot.docs[0].data(),
              id: snapshot.docs[0].id
            } as Devotional;
            
            return devotional;
          }
          return null;
        } catch (error) {
          console.error('Error fetching devotional by date:', error);
          return null;
        }
      },

      getTodaysDevotional: async () => {
        const today = new Date().toISOString().split('T')[0];
        const { devotionals, lastGeneratedDate } = get();

        // Check if we already have today's devotional in memory
        const todaysDevotionalInMemory = devotionals.find(d => d.date === today);
        if (todaysDevotionalInMemory) {
          set({ currentDevotional: todaysDevotionalInMemory });
          
          // Track devotional viewed
          analytics.logEvent('Devotional_Viewed', {
            devotionalId: todaysDevotionalInMemory.id,
            source: 'memory',
            date: today
          });
          
          return todaysDevotionalInMemory;
        }

        // Try to fetch from Firestore
        const devotionalFromDb = await get().fetchDevotionalByDate(today);
        if (devotionalFromDb) {
          set({ currentDevotional: devotionalFromDb });
          
          // Track devotional viewed
          analytics.logEvent('Devotional_Viewed', {
            devotionalId: devotionalFromDb.id,
            source: 'firestore',
            date: today
          });
          
          return devotionalFromDb;
        }

        // If no devotional for today, generate one
        const newDevotional = await get().generateDailyDevotional();
        if (newDevotional) {
          // Track that a new devotional was generated on view
          analytics.logEvent('Devotional_GeneratedOnView', {
            devotionalId: newDevotional.id,
            date: today
          });
        }
        return newDevotional;
      },

      clearError: () => set({ error: null }),

      resetStore: () => set({
        currentDevotional: null,
        devotionals: [],
        isGenerating: false,
        lastGeneratedDate: null,
        error: null
      })
    }),
    {
      name: 'devotional-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentDevotional: state.currentDevotional,
        lastGeneratedDate: state.lastGeneratedDate,
        devotionals: state.devotionals.slice(0, 7) // Only persist last 7 devotionals
      })
    }
  )
);

// Example usage in a React component:
/*
import { useDevotionalStore } from './stores/devotionalStore';

function DailyDevotionalScreen() {
  const { 
    currentDevotional, 
    isGenerating, 
    error, 
    getTodaysDevotional,
    generateDailyDevotional,
    clearError 
  } = useDevotionalStore();

  useEffect(() => {
    // Fetch today's devotional when component mounts
    getTodaysDevotional();
  }, []);

  const handleGenerateNew = async () => {
    // Generate a new devotional with user context
    const userContext = {
      spiritualGoal: 'grow closer to God',
      currentChallenges: 'dealing with anxiety',
      preferredTopics: ['faith', 'peace', 'trust']
    };
    await generateDailyDevotional(userContext);
  };

  if (isGenerating) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <View>
        <Text>Error: {error}</Text>
        <Button onPress={clearError}>Try Again</Button>
      </View>
    );
  }

  if (!currentDevotional) {
    return (
      <View>
        <Text>No devotional for today</Text>
        <Button onPress={handleGenerateNew}>Generate Devotional</Button>
      </View>
    );
  }

  return (
    <ScrollView>
      <Text>{currentDevotional.title}</Text>
      <Text>{currentDevotional.bibleReference}</Text>
      <Text>{currentDevotional.bibleVerse}</Text>
      <Text>{currentDevotional.context}</Text>
      <Text>{currentDevotional.prayer}</Text>
      <Text>{currentDevotional.reflectionPrompt}</Text>
    </ScrollView>
  );
}
*/