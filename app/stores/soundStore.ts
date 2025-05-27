import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface SoundState {
  backgroundMusicEnabled: boolean;
  soundEffectsEnabled: boolean;
  backgroundSound: Audio.Sound | null;
  isAudioConfigured: boolean;
  setBackgroundMusicEnabled: (enabled: boolean) => void;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  playBackgroundMusic: () => Promise<void>;
  stopBackgroundMusic: () => Promise<void>;
  playButtonSound: () => Promise<void>;
  playDisabledSound: () => Promise<void>;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      backgroundMusicEnabled: true,
      soundEffectsEnabled: true,
      backgroundSound: null,
      isAudioConfigured: false,

      setBackgroundMusicEnabled: async (enabled) => {
        if (enabled) {
          set({ backgroundMusicEnabled: true });
          await get().playBackgroundMusic();
        } else {
          set({ backgroundMusicEnabled: false });
          
          await get().stopBackgroundMusic()
          
        }
      },

      setSoundEffectsEnabled: (enabled) => {
        set({ soundEffectsEnabled: enabled });
      },

      playBackgroundMusic: async () => {
        try {
          // Configure audio if not already configured
          if (!get().isAudioConfigured) {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
            set({ isAudioConfigured: true });
          }

          const { backgroundSound } = get();
          if (backgroundSound) {
            await backgroundSound.stopAsync();
            await backgroundSound.unloadAsync();
          }

          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/Shepherd_Background_Sound.m4a'),
            { 
              isLooping: true, 
              volume: 0.5,
              progressUpdateIntervalMillis: 100,
              shouldPlay: true,
              androidImplementation: 'MediaPlayer',
            }
          );
          set({ backgroundSound: sound });
          await sound.playAsync();
        } catch (error) {
          console.log('Error playing background music:', error);
        }
      },

      stopBackgroundMusic: async () => {
        try {
          const { backgroundSound } = get();
          if (backgroundSound) {
            await backgroundSound.stopAsync();
            await backgroundSound.unloadAsync();
            
            set({ backgroundSound: null });
          }
        } catch (error) {
          console.log('Error stopping background music:', error);
        }
      },

      playButtonSound: async () => {
        if (!get().soundEffectsEnabled) return;
        try {
          // Configure audio if not already configured
          if (!get().isAudioConfigured) {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
            set({ isAudioConfigured: true });
          }

          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/Shepherd_Button_Sound.m4a'),
            { 
              volume: 0.7,
              androidImplementation: 'MediaPlayer',
            }
          );
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate(async (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              await sound.unloadAsync();
            }
          });
        } catch (error) {
          console.log('Error playing button sound:', error);
        }
      },

      playDisabledSound: async () => {
        if (!get().soundEffectsEnabled) return;
        try {
          // Configure audio if not already configured
          if (!get().isAudioConfigured) {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
            set({ isAudioConfigured: true });
          }

          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/Shepherd_Disable_Sound.m4a'),
            { 
              volume: 0.7,
              androidImplementation: 'MediaPlayer',
            }
          );
          await sound.playAsync();
          sound.setOnPlaybackStatusUpdate(async (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              await sound.unloadAsync();
            }
          });
        } catch (error) {
          console.log('Error playing disabled sound:', error);
        }
      },
    }),
    {
      name: 'shepherd-sound-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        backgroundMusicEnabled: state.backgroundMusicEnabled,
        soundEffectsEnabled: state.soundEffectsEnabled,
      }),
    }
  )
); 