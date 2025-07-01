import { create } from 'zustand';
import { useAssets } from 'expo-asset';
import { useEffect } from 'react';

// List of assets used in the app (copied from HomeScreen)
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
  require('../../assets/backgrounds/defaultBackgroundDark.png'),
];

type AssetsState = {
  loaded: boolean;
  assets: any[] | null;
  error: any;
  setLoaded: (loaded: boolean) => void;
  setAssets: (assets: any[] | null) => void;
  setError: (error: any) => void;
};

export const useAssetsStore = create<AssetsState>((set) => ({
  loaded: false,
  assets: null,
  error: null,
  setLoaded: (loaded) => set({ loaded }),
  setAssets: (assets) => set({ assets }),
  setError: (error) => set({ error }),
}));

// Hook to load assets once
export function usePreloadAssets() {
  const [assets, error] = useAssets(imageAssets);
  const setLoaded = useAssetsStore((s) => s.setLoaded);
  const setAssets = useAssetsStore((s) => s.setAssets);
  const setError = useAssetsStore((s) => s.setError);

  useEffect(() => {
    if (assets) {
      setAssets(assets);
      setLoaded(true);
    }
    if (error) {
      setError(error);
    }
  }, [assets, error]);
}

export { imageAssets };

// Default export for Expo Router compatibility
export default {}