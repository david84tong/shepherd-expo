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

    <BibleReader initialBookId={savedBookId} initialChapter={savedChapter} />

  );
}
