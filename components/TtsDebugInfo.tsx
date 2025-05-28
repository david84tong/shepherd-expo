import React from 'react';
import { View, Text } from 'react-native';

interface TtsDebugInfoProps {
  audioCache: Record<string, string>;
  prefetchInProgress: Set<string>;
  isProMember: boolean;
  reachedTtsLimit: boolean;
  autoPlayTts: boolean;
  currentIndex: number;
  chapterData: any;
}

const TtsDebugInfo: React.FC<TtsDebugInfoProps> = ({
  audioCache,
  prefetchInProgress,
  isProMember,
  reachedTtsLimit,
  autoPlayTts,
  currentIndex,
  chapterData,
}) => {
  const cachedCount = Object.keys(audioCache).length;
  const inProgressCount = prefetchInProgress.size;
  
  return (
    <View style={{ 
      position: 'absolute', 
      top: 100, 
      right: 10, 
      backgroundColor: 'rgba(0,0,0,0.8)', 
      padding: 10, 
      borderRadius: 8,
      zIndex: 1000 
    }}>
      <Text style={{ color: 'white', fontSize: 12 }}>
        TTS Debug Info
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Cached: {cachedCount}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        In Progress: {inProgressCount}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Pro: {isProMember ? 'Yes' : 'No'}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Limit: {reachedTtsLimit ? 'Yes' : 'No'}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Auto: {autoPlayTts ? 'On' : 'Off'}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Index: {currentIndex}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Verses: {chapterData?.verses?.length || 0}
      </Text>
    </View>
  );
};

export default TtsDebugInfo; 