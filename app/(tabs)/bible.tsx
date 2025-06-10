import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native';

import { BibleReader } from '../bibleReader';
import { usePathStore } from '../stores/pathStore';

// Bible tab simply renders BibleReader. Reader selection now happens inside BibleReader.
export default function BibleTab() {
  const { savedBookId, savedChapter, setPathInProgress } = usePathStore();

  // Ensure tab bar shows by clearing path flag when entering tab
  useEffect(() => {
    setPathInProgress(false);
  }, []);

  return (

    <BibleReader initialBookId={savedBookId} initialChapter={savedChapter} />

  );
}
