import { create } from 'zustand';

interface UIState {
  isModalDimActive: boolean;
  setIsModalDimActive: (isActive: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isModalDimActive: false,
  setIsModalDimActive: (isActive) => {
    console.log(`[UIStore] Setting isModalDimActive to: ${isActive}`); // Log state changes
    set({ isModalDimActive: isActive });
  },
}));
