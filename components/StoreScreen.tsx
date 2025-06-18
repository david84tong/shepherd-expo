import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useUserStore } from '~/app/stores/userStore';
import useSubscriptionStore from '~/app/stores/subscriptionStore';
import { useShopStore } from '~/app/stores/shopStore';
import { useHomeStore } from '~/app/stores/homeStore';
import i18n from '~/app/utils/i18n';
import analytics from '~/utils/analytics';
import PrimaryButton from './PrimaryButton';

// Import icons
import gemIcon from '~/assets/icons/greenGemIcon.png';

// Import lamb static images
import pinkLamb from '~/assets/lambStatic/pinkSkin.png';
import goldLamb from '~/assets/lambStatic/goldSkin.png';

// Define store item types
type StoreCategory = 'skins' | 'powerups' | 'hearts';

interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  description: string;
  price: number;
  currency: 'gems' | 'money';
  image: any;
  unlockLevel?: number;
  isPro?: boolean;
  isOwned?: boolean;
  skinNumber?: number;
}

interface StoreScreenProps {
  onClose?: () => void;
}

export default function StoreScreen({ onClose }: StoreScreenProps) {
  const router = useRouter();
  const { getLamb, getUser } = useUserStore();
  const { isProMember } = useSubscriptionStore();
  const { hasSkin, purchaseSkin, equipSkin, equippedSkin } = useShopStore();
  const riveRef = useHomeStore(state => state.riveRef);
  const setCurrentSkin = useHomeStore(state => state.setCurrentSkin);
  
  const lamb = getLamb();
  const user = getUser();
  const userGems = user?.gens || 0;
  const userLevel = lamb?.level || 1;
  
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory>('skins');

  // Store items with static images
  const storeItems: StoreItem[] = useMemo(() => [
    // Skins
    {
      id: 'skin_joseph_cloak',
      category: 'skins',
      name: "Joseph's Cloak",
      description: 'testing one two three has very cool meaning and spazz season',
      price: 109,
      currency: 'gems',
      image: pinkLamb,
      skinNumber: 3,
    },
    {
      id: 'skin_joseph_cloak_2',
      category: 'skins',
      name: "Joseph's Cloak",
      description: 'testing one two three has very cool meaning and spazz',
      price: 109,
      currency: 'gems',
      image: goldLamb,
      skinNumber: 99,
    },
    {
      id: 'skin_joseph_cloak_3',
      category: 'skins',
      name: "Joseph's Cloak",
      description: 'testing one two three has very cool meaning and spazz',
      price: 0,
      currency: 'gems',
      image: goldLamb,
      unlockLevel: 20,
      skinNumber: 3,
    },
  ], []);

  // Filter items by category
  const filteredItems = useMemo(() => 
    storeItems.filter(item => item.category === selectedCategory),
    [selectedCategory, storeItems]
  );

  // Handle item purchase
  const handlePurchase = useCallback(async (item: StoreItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Check if user has enough gems
    if (item.currency === 'gems' && userGems < item.price) {
      analytics.logEvent('Store_Purchase_Failed', { 
        item: item.id, 
        reason: 'insufficient_gems' 
      });
      // Show alert for insufficient gems
      Alert.alert(
        'Not Enough Gems',
        `You need ${item.price} gems to purchase ${item.name}. You currently have ${userGems} gems.`,
        [{ text: 'OK', style: 'default' }]
      );
      console.log('❌ Not enough gems to purchase:', item.name);
      return;
    }

    // Check if user meets level requirement
    if (item.unlockLevel && userLevel < item.unlockLevel) {
      analytics.logEvent('Store_Purchase_Failed', { 
        item: item.id, 
        reason: 'level_locked' 
      });
      // Show alert for level requirement
      Alert.alert(
        'Level Requirement',
        `${item.name} unlocks at level ${item.unlockLevel}. You are currently level ${userLevel}.`,
        [{ text: 'OK', style: 'default' }]
      );
      console.log('❌ Level requirement not met for:', item.name);
      return;
    }

    // Show confirmation alert before purchase
    Alert.alert(
      'Confirm Purchase',
      `Are you sure you want to purchase ${item.name} for ${item.price} gems?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log('❌ Purchase cancelled by user:', item.name);
            analytics.logEvent('Store_Purchase_Cancelled', { 
              item: item.id,
              price: item.price
            });
          }
        },
        {
          text: 'Purchase',
          style: 'default',
          onPress: async () => {
            // Execute purchase after confirmation
            try {
              const skinId = item.skinNumber?.toString() || item.id;
              const success = await purchaseSkin(skinId, item.price);
              
              if (success) {
                analytics.logEvent('Store_Purchase_Success', { 
                  item: item.id,
                  skinId: skinId,
                  price: item.price
                });
                console.log('✅ Successfully purchased skin:', item.name);
                
                // Haptic feedback for successful purchase
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                // Show success alert
                Alert.alert(
                  'Purchase Successful!',
                  `${item.name} has been added to your collection. You can now equip it!`,
                  [{ text: 'Great!', style: 'default' }]
                );
              } else {
                analytics.logEvent('Store_Purchase_Failed', { 
                  item: item.id, 
                  reason: 'purchase_failed' 
                });
                console.log('❌ Failed to purchase skin:', item.name);
                
                // Show failure alert
                Alert.alert(
                  'Purchase Failed',
                  'Something went wrong with your purchase. Please try again.',
                  [{ text: 'OK', style: 'default' }]
                );
              }
            } catch (error) {
              console.error('❌ Error during purchase:', error);
              analytics.logEvent('Store_Purchase_Failed', { 
                item: item.id, 
                reason: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              
              // Show error alert
              Alert.alert(
                'Purchase Error',
                'An unexpected error occurred. Please try again later.',
                [{ text: 'OK', style: 'default' }]
              );
            }
          }
        }
      ]
    );
  }, [userGems, userLevel, purchaseSkin]);

  // Handle item equip
  const handleEquip = useCallback((item: StoreItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const skinId = item.skinNumber?.toString() || item.id;
    
    // Update shop store (this handles the equipped skin state)
    equipSkin(skinId);
    
    // Update home store to persist the current skin
    setCurrentSkin(skinId);
    
    // Update Rive animation if ref is available
    if (riveRef && riveRef.current && riveRef.current.setInputState) {
      try {
        const skinNumber = item.skinNumber || 0;
        console.log('🎯 Setting Rive skin from store:', skinNumber);
        riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);
        console.log('✅ Successfully updated Rive skin to:', skinNumber);
      } catch (error) {
        console.error('❌ Error updating Rive skin:', error);
      }
    } else {
      console.log('⚠️ Rive ref not available for skin update');
    }
    
    analytics.logEvent('Store_Skin_Equipped', { 
      item: item.id,
      skinId: skinId,
      skinNumber: item.skinNumber
    });
    
    // Show success toast
    Toast.show({
      type: 'success',
      text1: 'Skin Equipped!',
      text2: `${item.name} is now active on your lamb`,
      position: 'top',
      visibilityTime: 3000,
    });
    
    console.log('✅ Equipped skin:', item.name, 'with skin number:', item.skinNumber);
  }, [equipSkin, setCurrentSkin, riveRef]);

  // Render store item card
  const renderStoreItem = (item: StoreItem) => {
    const isLocked = item.unlockLevel && userLevel < item.unlockLevel;
    const canAfford = item.currency === 'gems' ? userGems >= item.price : true;
    const skinId = item.skinNumber?.toString() || item.id;
    const isOwned = hasSkin(skinId);
    const isEquipped = equippedSkin === skinId;
    
    return (
      <View
        key={item.id}
        className="bg-surfaceCreamLight rounded-[24px] mb-4 shadow-card border border-brownBorder overflow-hidden h-48">
        
        <View className="flex-row p-4 h-48 justify-between">
          {/* Lamb Image - Full size, no background, clipped at bottom */}
          <View className="w-48 h-full absolute left-0 bottom-0 ml-2">
            <Image 
              source={item.image} 
              className="w-48 h-48 absolute bottom-[-20]" 
              resizeMode="contain"
            />
          </View>

          {/* Content - Add left padding to account for image */}
          <View className="flex-1 ml-44 pl-2 mr-2 my-2">
            {/* Name */}
            <Text className="font-feather text-lg text-textPrimary mb-1">
              {item.name}
            </Text>

            {/* Description */}
            <Text className="font-din text-sm text-description -mb-2 h-16" numberOfLines={3}>
              {item.description}
            </Text>

            {/* Button */}
            <View style={{marginBottom: 4, marginTop: -4}}>
              {isLocked ? (
                <PrimaryButton
                  title={`Unlocks lvl ${item.unlockLevel}`}
                  onPress={() => {}}
                  disabled={true}
                  buttonType="blue"
                  buttonHeight={40}
                  width="100%"
                  featherIcon="lock"
                />
              ) : isOwned ? (
                isEquipped ? (
                  <PrimaryButton
                    title="Equipped"
                    onPress={() => {}}
                    disabled={true}
                    buttonType="blue"
                    buttonHeight={40}
                    width="100%"
                    featherIcon="check"
                  />
                ) : (
                  <PrimaryButton
                    title="Equip"
                    onPress={() => handleEquip(item)}
                    disabled={false}
                    buttonType="blue"
                    buttonHeight={40}
                    width="100%"
                    featherIcon="check"
                  />
                )
              ) : (
                <PrimaryButton
                  title="Buy"
                  onPress={() => handlePurchase(item)}
                  disabled={!canAfford}
                  buttonType="blue"
                  buttonHeight={40}
                  width="100%"
                  reward={item.price.toString()}
                  icon={gemIcon}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDEBB8' }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View className="flex-row justify-center items-center px-6 pt-8 pb-4 relative">
        {/* Back button - positioned absolutely on the left */}
        <TouchableOpacity
          onPress={onClose || (() => router.back())}
          className="w-10 h-10 rounded-full bg-lightYellow items-center justify-center absolute left-6">
          <Feather name="x" size={20} color="#B89B4C" />
        </TouchableOpacity>
        
        {/* Store title - centered */}
        <Text className="font-feather text-h2 text-textPrimary">{i18n.t('store')}</Text>
        
        {/* Gems counter - positioned absolutely on the right */}
        <View className="flex-row items-center bg-lightYellow px-3 py-1.5 rounded-full absolute right-6">
          <Image source={gemIcon} className="w-5 h-5 mr-1" />
          <Text className="font-feather text-body text-textPrimary">{userGems}</Text>
        </View>
      </View>

      {/* Store Items List */}
      <ScrollView 
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}>
        {filteredItems.map(renderStoreItem)}
      </ScrollView>
    </SafeAreaView>
  );
}
