import { create } from 'zustand';

// Define the possible states/modes for the home screen
export type HomeMode = 'DEFAULT' | 'PREVIEW' | 'PRAYER' | 'REFLECTION';

interface HomeState {
  mode: HomeMode;
  setMode: (mode: HomeMode) => void;
}

/**
 * Zustand store to manage the current operational mode of the Home screen.
 * This helps decouple state logic from the component and allows other components
 * to react to or change the mode if necessary.
 */
export const useHomeStore = create<HomeState>((set) => ({
  mode: 'DEFAULT',
  setMode: (mode) => set({ mode }),
}));
