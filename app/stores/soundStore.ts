import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface SoundState {
  backgroundMusicEnabled: boolean;
  soundEffectsEnabled: boolean;
  hapticsEnabled: boolean;
  backgroundSound: Audio.Sound | null;
  breadEatingSound: Audio.Sound | null;
  isAudioConfigured: boolean;
  setBackgroundMusicEnabled: (enabled: boolean) => void;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  playBackgroundMusic: () => Promise<void>;
  stopBackgroundMusic: () => Promise<void>;
  playButtonSound: () => Promise<void>;
  playDisabledSound: () => Promise<void>;
  playBreadEatingSound: () => Promise<void>;
  stopBreadEatingSound: () => Promise<void>;
  playPrayerSuccessSound: () => Promise<void>;
  playJournalingSuccessSound: () => Promise<void>;
  playTrifectaCompleteSound: () => Promise<void>;
  playFlameSound: () => Promise<void>;
  playChestOpeningSound: () => Promise<void>;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      backgroundMusicEnabled: true,
      soundEffectsEnabled: true,
      hapticsEnabled: true,
      backgroundSound: null,
      breadEatingSound: null,
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

      setHapticsEnabled: (enabled) => {
        set({ hapticsEnabled: enabled });
      },

      playBackgroundMusic: async () => {
        console.log("START PLAYING MUSIC ======>")
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
              volume: 0.25,
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

      playBreadEatingSound: async () => {
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

          // Stop any existing bread eating sound
          const { breadEatingSound } = get();
          if (breadEatingSound) {
            await breadEatingSound.stopAsync();
            await breadEatingSound.unloadAsync();
          }

          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/Bread_Eating.m4a'),
            { 
              isLooping: true,
              volume: 0.3,
              androidImplementation: 'MediaPlayer',
            }
          );
          set({ breadEatingSound: sound });
          await sound.playAsync();
        } catch (error) {
          console.log('Error playing bread eating sound:', error);
        }
      },

      stopBreadEatingSound: async () => {
        try {
          const { breadEatingSound } = get();
          if (breadEatingSound) {
            await breadEatingSound.stopAsync();
            await breadEatingSound.unloadAsync();
            set({ breadEatingSound: null });
          }
        } catch (error) {
          console.log('Error stopping bread eating sound:', error);
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
              volume: 0.5,
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

      playPrayerSuccessSound: async () => {
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
            require('../../assets/sounds/Prayer_Success.m4a'),
            { 
              volume: 0.25,
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
          console.log('Error playing prayer success sound:', error);
        }
      },

      playJournalingSuccessSound: async () => {
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
            require('../../assets/sounds/Journaling_Success.m4a'),
            { 
              volume: 0.25,
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
          console.log('Error playing journaling success sound:', error);
        }
      },

      playTrifectaCompleteSound: async () => {
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
            require('../../assets/sounds/Chest_Opening.m4a'),
            { 
              volume: 0.25,
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
          console.log('Error playing trifecta complete sound:', error);
        }
      },

      playFlameSound: async () => {
        if (!get().soundEffectsEnabled) return;
        try {
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
            require('../../assets/sounds/Flame_Sound.m4a'),
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
          console.log('Error playing flame sound:', error);
        }
      },

      playChestOpeningSound: async () => {
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
            require('../../assets/sounds/Chest_Opening.m4a'),
            { 
              volume: 0.25,
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
          console.log('Error playing chest opening sound:', error);
        }
      },
    }),
    {
      name: 'shepherd-sound-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        backgroundMusicEnabled: state.backgroundMusicEnabled,
        soundEffectsEnabled: state.soundEffectsEnabled,
        hapticsEnabled: state.hapticsEnabled,
      }),
    }
  )
); 