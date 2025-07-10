import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from './userStore';
import { appLog } from '../helper/helper';

interface ShopState {
  // User's owned skins
  ownedSkins: string[];
  
  // Currently equipped skin
  equippedSkin: string;
  
  // Actions
  purchaseSkin: (skinId: string, price: number) => Promise<boolean>;
  equipSkin: (skinId: string) => void;
  hasSkin: (skinId: string) => boolean;
  addSkin: (skinId: string) => void;
  setOwnedSkins: (skins: string[]) => void;
  setEquippedSkin: (skinId: string) => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      // Initial state
      ownedSkins: ['0'], // User starts with default skin (skinNumber 0)
      equippedSkin: '0',
      
      // Purchase a skin
      purchaseSkin: async (skinId: string, price: number) => {
        const userStore = useUserStore.getState();
        const currentGems = userStore.getGens();
        
        // Check if user has enough gems
        if (currentGems < price) {
          appLog('❌ Not enough gems to purchase skin:', skinId);
          return false;
        }
        
        // Check if user already owns the skin
        if (get().ownedSkins.includes(skinId)) {
          appLog('❌ User already owns skin:', skinId);
          return false;
        }
        
        try {
          // Deduct gems from user
          const newGemCount = currentGems - price;
          userStore.setGens(newGemCount);
          
          // Add skin to owned skins
          const newOwnedSkins = [...get().ownedSkins, skinId];
          set({ ownedSkins: newOwnedSkins });
          
          // Update user's skins array in userStore
          const currentUserSkins = userStore.getSkins ? userStore.getSkins() : [];
          const updatedUserSkins = [...currentUserSkins, skinId];
          if (userStore.setSkins) {
            userStore.setSkins(updatedUserSkins);
          }
          
          appLog('✅ Successfully purchased skin:', skinId, 'for', price, 'gems');
          appLog('💎 Remaining gems:', newGemCount);
          
          return true;
        } catch (error) {
          console.error('❌ Error purchasing skin:', error);
          return false;
        }
      },
      
      // Equip a skin
      equipSkin: (skinId: string) => {
        const ownedSkins = get().ownedSkins;
        
        // Default skin (skinId '0') is always owned
        const isDefaultSkin = skinId === '0';
        
        if (!isDefaultSkin && !ownedSkins.includes(skinId)) {
          appLog('❌ Cannot equip skin that is not owned:', skinId);
          return;
        }
        
        // Ensure default skin is in owned skins if not already there
        if (isDefaultSkin && !ownedSkins.includes('0')) {
          set({ ownedSkins: [...ownedSkins, '0'] });
        }
        
        // Set equipped skin in shop store
        set({ equippedSkin: skinId });
        
        // Update lamb skin in user store
        const userStore = useUserStore.getState();
        userStore.setLambSkin(skinId);
        
        appLog('✅ Equipped skin:', skinId);
      },
      
      // Check if user owns a skin
      hasSkin: (skinId: string) => {
        // Default skin (skinId '0') is always owned
        if (skinId === '0') return true;
        return get().ownedSkins.includes(skinId);
      },
      
      // Add a skin (for admin/debug purposes)
      addSkin: (skinId: string) => {
        const currentSkins = get().ownedSkins;
        if (!currentSkins.includes(skinId)) {
          set({ ownedSkins: [...currentSkins, skinId] });
        }
      },
      
      // Set owned skins
      setOwnedSkins: (skins: string[]) => {
        set({ ownedSkins: skins });
      },
      
      // Set equipped skin
      setEquippedSkin: (skinId: string) => {
        set({ equippedSkin: skinId });
      },
    }),
    {
      name: 'shepherd-shop-storage',
      storage: createJSONStorage(() => AsyncStorage as any),
    }
  )
);
