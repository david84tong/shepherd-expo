import React, { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { BibleReader } from '../bibleReader';
import { usePathStore } from '../stores/pathStore';
import useSubscriptionStore from '../stores/subscriptionStore';

// Bible tab simply renders BibleReader. Reader selection now happens inside BibleReader.
export default function BibleTab() {
  const { savedBookId, savedChapter, setPathInProgress } = usePathStore();
  const params = useLocalSearchParams();
  const { presentFreeTrialPaywall } = useSubscriptionStore();

  // Parse URL parameters for navigation from other screens
  const urlBookId = params.bookId ? parseInt(params.bookId as string, 10) : undefined;
  const urlChapters = params.chapters
    ? (params.chapters as string).split(',').map((c) => parseInt(c, 10))
    : undefined;
  const initialChapter = urlChapters && urlChapters.length > 0 ? urlChapters[0] : undefined;

  // Use URL parameters if available, otherwise fall back to saved state
  const bookIdToLoad = urlBookId || savedBookId;
  const chapterToLoad = initialChapter || savedChapter;

  // Create a unique key that always changes when parameters are present
  // This ensures the component always re-renders with new parameters
  const bibleReaderKey = urlBookId && initialChapter 
    ? `bible-${bookIdToLoad}-${chapterToLoad}-${params.timestamp || Date.now()}`
    : 'bible-default';

  // Ensure tab bar shows by clearing path flag when entering tab
  useEffect(() => {
    setPathInProgress(false);
  }, []);

  // Check if we need to trigger the paywall
  useEffect(() => {
    if (params.triggerPaywall === 'true') {
      // Small delay to ensure the screen is fully loaded
      const timer = setTimeout(() => {
        presentFreeTrialPaywall();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [params.triggerPaywall, presentFreeTrialPaywall]);

  return (
    <BibleReader 
      key={bibleReaderKey}
      initialBookId={bookIdToLoad} 
      initialChapter={chapterToLoad} 
    />
  );
}
