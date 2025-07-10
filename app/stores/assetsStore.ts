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

// List of Rive assets used in the app
const riveAssetList = [
  require('../../assets/riveAnimations/new_shepherd.riv'),
  require('../../assets/riveAnimations/bg-green.riv'),
];

type AssetsState = {
  loaded: boolean;
  assets: any[] | null;
  riveAssets: any[] | null;
  riveLoaded: boolean;
  error: any;
  setLoaded: (loaded: boolean) => void;
  setAssets: (assets: any[] | null) => void;
  setRiveAssets: (assets: any[] | null) => void;
  setRiveLoaded: (loaded: boolean) => void;
  setError: (error: any) => void;
};

export const useAssetsStore = create<AssetsState>((set) => ({
  loaded: false,
  assets: null,
  riveAssets: null,
  riveLoaded: false,
  error: null,
  setLoaded: (loaded) => set({ loaded }),
  setAssets: (assets) => set({ assets }),
  setRiveAssets: (assets) => set({ riveAssets: assets }),
  setRiveLoaded: (loaded) => set({ riveLoaded: loaded }),
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

// Hook to load Rive assets once
export function usePreloadRiveAssets() {
  const [riveAssets, error] = useAssets(riveAssetList);
  const setRiveAssets = useAssetsStore((s) => s.setRiveAssets);
  const setRiveLoaded = useAssetsStore((s) => s.setRiveLoaded);
  const setError = useAssetsStore((s) => s.setError);

  useEffect(() => {
    if (riveAssets) {
      setRiveAssets(riveAssets);
      setRiveLoaded(true);
      console.log('🎬 Rive assets preloaded successfully');
    }
    if (error) {
      setError(error);
      console.error('❌ Error preloading Rive assets:', error);
    }
  }, [riveAssets, error]);
}

export { imageAssets, riveAssetList as riveAssets };

// Default export for Expo Router compatibility
export default {}