import { useAssets } from 'expo-asset';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// List of assets used in the app
const imageAssets = [
  require('../../assets/backgrounds/defaultBackground.png'),
  require('../../assets/backgrounds/waterBackground.png'),
  require('../../assets/backgrounds/path1Background.png'),
  require('../../assets/backgrounds/mainBackground.png'),
  require('../../assets/icons/breadIcon.png'),
  require('../../assets/icons/waterIcon.png'),
  require('../../assets/icons/journalIcon.png'),
  require('../../assets/icons/flameIcon.png'),
  require('../../assets/icons/greenGemIcon.png'),
  require('../../assets/icons/heartIcon.png'),
  require('../../assets/icons/starIcon.png'),
];

export function useLocalAssets() {
  const [assets, error] = useAssets(imageAssets);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (assets) {
      setIsLoaded(true);
    }
  }, [assets]);

  // Ensure all image URLs have proper protocol
  const getImageUrl = (uri: string) => {
    if (!uri) return '';
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    if (Platform.OS === 'android') {
      return `file://${uri}`;
    }
    return uri;
  };

  // Process assets to ensure proper URL formatting
  const processedAssets = assets?.map(asset => ({
    ...asset,
    uri: getImageUrl(asset.uri)
  }));

  return {
    assets: processedAssets,
    error,
    isLoaded,
    imageAssets
  };
} 