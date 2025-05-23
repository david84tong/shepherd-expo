import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants shared between both reader components
export const FONT_SIZE_KEY = 'userBibleFontSize';
export const LINE_HEIGHT_KEY = 'userBibleLineHeight';
export const THEME_COLOR_KEY = 'userBibleThemeColor';
export const READER_PREFERENCE_KEY = 'userDefaultReaderPreference';

export const DEFAULT_FONT_SIZE = 20;
export const MIN_FONT_SIZE = 14;
export const MAX_FONT_SIZE = 30;

// Set up line height presets
export const LINE_HEIGHT_PRESETS = {
  COMPACT: 1.2, // For default reader
  REGULAR: 1.4,
  RELAXED: 1.8,
} as const;

// For card view, we need specific pixel values
export const CARD_LINE_HEIGHT_PRESETS = {
  COMPACT: 20,
  REGULAR: 24,
  RELAXED: 32,
} as const;

export type LineHeightPreset = keyof typeof LINE_HEIGHT_PRESETS;

export type ThemeType = 'white' | 'light' | 'medium' | 'dark';

interface ReaderSettings {
  // State
  fontSize: number;
  lineHeightPreset: LineHeightPreset;
  theme: ThemeType;
  useCardView: boolean;
  initialized: boolean;

  // Actions
  setFontSize: (size: number) => Promise<void>;
  setLineHeightPreset: (preset: LineHeightPreset) => Promise<void>;
  setTheme: (theme: ThemeType) => Promise<void>;
  setCardView: (enabled: boolean) => Promise<void>;
  initializeSettings: () => Promise<void>;
}

export const useReaderSettingsStore = create<ReaderSettings>((set, get) => ({
  // Default settings
  fontSize: DEFAULT_FONT_SIZE,
  lineHeightPreset: 'REGULAR',
  theme: 'light',
  useCardView: true, // Default to card view as requested
  initialized: false,

  // Update font size and save to AsyncStorage
  setFontSize: async (size: number) => {
    if (size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
      set({ fontSize: size });
      try {
        await AsyncStorage.setItem(FONT_SIZE_KEY, size.toString());
        console.log(`📐 Font size saved: ${size}`);
      } catch (e) {
        console.error('Failed to save font size to AsyncStorage', e);
      }
    }
  },

  // Update line height preset and save to AsyncStorage
  setLineHeightPreset: async (preset: LineHeightPreset) => {
    set({ lineHeightPreset: preset });
    try {
      const lineHeight = LINE_HEIGHT_PRESETS[preset];
      await AsyncStorage.setItem(LINE_HEIGHT_KEY, lineHeight.toString());
      console.log(`📏 Line height preset saved: ${preset} (${lineHeight})`);
    } catch (e) {
      console.error('Failed to save line height to AsyncStorage', e);
    }
  },

  // Update theme and save to AsyncStorage
  setTheme: async (theme: ThemeType) => {
    set({ theme });
    try {
      await AsyncStorage.setItem(THEME_COLOR_KEY, theme);
      console.log(`🎨 Theme saved: ${theme}`);
    } catch (e) {
      console.error('Failed to save theme to AsyncStorage', e);
    }
  },

  // Toggle between card view and default reader
  setCardView: async (enabled: boolean) => {
    set({ useCardView: enabled });
    try {
      const value = enabled ? 'new' : 'default';
      await AsyncStorage.setItem(READER_PREFERENCE_KEY, value);
      console.log(`📱 Reader preference saved: ${value}`);
    } catch (e) {
      console.error('Failed to save reader preference to AsyncStorage', e);
    }
  },

  // Initialize settings from AsyncStorage
  initializeSettings: async () => {
    try {
      // Initialize font size
      const savedSize = await AsyncStorage.getItem(FONT_SIZE_KEY);
      if (savedSize !== null) {
        const size = parseInt(savedSize, 10);
        if (!isNaN(size) && size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
          set({ fontSize: size });
        }
      }

      // Initialize line height
      const savedLineHeight = await AsyncStorage.getItem(LINE_HEIGHT_KEY);
      if (savedLineHeight !== null) {
        const lineHeight = parseFloat(savedLineHeight);
        // Find the preset that matches this line height
        const preset = Object.entries(LINE_HEIGHT_PRESETS).find(
          ([_, value]) => Math.abs(value - lineHeight) < 0.1
        )?.[0] as LineHeightPreset | undefined;
        
        if (preset) {
          set({ lineHeightPreset: preset });
        }
      }

      // Initialize theme
      const savedTheme = await AsyncStorage.getItem(THEME_COLOR_KEY);
      if (savedTheme !== null && ['white', 'light', 'medium', 'dark'].includes(savedTheme)) {
        set({ theme: savedTheme as ThemeType });
      }

      // Initialize reader preference
      const readerPref = await AsyncStorage.getItem(READER_PREFERENCE_KEY);
      if (readerPref !== null) {
        set({ useCardView: readerPref === 'new' });
      }

      // Mark as initialized
      set({ initialized: true });
      console.log('✅ Reader settings initialized from AsyncStorage');
    } catch (e) {
      console.error('Failed to initialize settings from AsyncStorage', e);
    }
  },
}));

// Initialize settings on import
useReaderSettingsStore.getState().initializeSettings(); 