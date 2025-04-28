import React from 'react';
import { SafeAreaView } from 'react-native';
import { BibleReader } from '../bibleReader';
import { usePathStore } from '../stores/pathStore';

/**
 * Bible tab that uses the BibleReader component
 */
export default function BibleTab() {
  const { 
    savedBookId, 
    savedChapter,
    setPathInProgress,
  } = usePathStore();
  
  // When tab is activated, ensure tabbar visibility
  React.useEffect(() => {
    setPathInProgress(false);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-main-bg">
      <BibleReader 
        isEmbedded={true}
        initialBookId={savedBookId}
        initialChapter={savedChapter}
      />
    </SafeAreaView>
  );
}