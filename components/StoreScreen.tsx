import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { FontAwesome } from '@expo/vector-icons';
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
import goldLamb from '~/assets/lambStatic/goldSkin.png';
import normalLamb from '~/assets/lambStatic/normalSkin.png';
import babyLamb from '~/assets/lambStatic/babySkin.png';
import noahSkin from '~/assets/lambStatic/noahSkin.png';
import bananaSkin from '~/assets/lambStatic/bananaSkin.png';
import tenSkin from '~/assets/lambStatic/10Skin.png';
import appleSkin from '~/assets/lambStatic/appleSkin.png';
import lionSkin from '~/assets/lambStatic/lionSkin.png';
import josephsCoat from '~/assets/lambStatic/JosephsCoat.png';
import armorOfGod from '~/assets/lambStatic/armorOfGod.png';
import whale from '~/assets/lambStatic/whale.png';
import pinkSkin from '~/assets/lambStatic/pinkSkin.png';
import { hapticLight } from '~/utils/haptics';
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
  const { hasSkin, purchaseSkin, equipSkin, addSkin } = useShopStore();
  const equippedSkin = useShopStore(state => state.equippedSkin);
  const riveRef = useHomeStore(state => state.riveRef);
  const setCurrentSkin = useHomeStore(state => state.setCurrentSkin);

  const lamb = getLamb();
  const user = getUser();
  const userGems = user?.gens || 0;
  const userLevel = lamb?.level || 1;

  const [selectedCategory, setSelectedCategory] = useState<StoreCategory>('skins');

  // Ensure Pro users have the Annointed Lamb skin in their shop store
  useEffect(() => {
    if (isProMember && !hasSkin('99')) {
      console.log('🔄 Adding Annointed Lamb skin to Pro user\'s collection');
      addSkin('99');
    }
  }, [isProMember, hasSkin, addSkin]);

  // Store items with static images
  const storeItems: StoreItem[] = useMemo(() => [
    // Skins
    {
      id: 'skin_super',
      category: 'skins',
      name: "Anointed Lamb",
      description: 'For a limited time, all super users unlock this golden skin',
      price: 109,
      currency: 'gems',
      image: goldLamb,
      skinNumber: 99,
      isPro: true,
      isOwned: isProMember, // Pro users automatically own this skin
    },
    {
      id: 'skin_default',
      category: 'skins',
      name: "Normal Skin",
      description: 'The default skin for your lamb',
      price: 0,
      currency: 'gems',
      image: userLevel < 10 ? babyLamb : normalLamb,
      skinNumber: 0,
      isOwned: true, // Default skin is always owned
    },
    {
      id: 'skin_ten_commandments',
      category: 'skins',
      name: "10 Commandments",
      description: 'Blessed with the divine laws given to Moses',
      price: 1600,
      currency: 'gems',
      image: tenSkin,
      skinNumber: 5,
      unlockLevel: 14,
    },
    {
      id: 'skin_apple',
      category: 'skins',
      name: "Garden Apple",
      description: 'From the tree of knowledge in the Garden of Eden',
      price: 1800,
      currency: 'gems',
      image: appleSkin,
      skinNumber: 6,
      unlockLevel: 11,
    },
    {
      id: 'skin_lion',
      category: 'skins',
      name: "Den of Lions",
      description: 'A skin for those who are brave and fearless',
      price: 2200,
      currency: 'gems',
      image: lionSkin,
      skinNumber: 7,
      unlockLevel: 17,
    },
    {
      id: 'pink_skin',
      category: 'skins',
      name: "The Pink Lamb",
      description: 'Just a simple cute pink skin, limited to 1000',
      price: 2000,
      currency: 'gems',
      image: pinkSkin,
      skinNumber: 1,
      unlockLevel: 15,
    },
    {
      id: 'skin_noah',
      category: 'skins',
      name: "Noah's Ark",
      description: 'A faithful servant who built the ark and saved all creatures',
      price: 2700,
      currency: 'gems',
      image: noahSkin,
      skinNumber: 2,
      unlockLevel: 19,

    },
    {
      id: 'skin_banana',
      category: 'skins',
      name: "Banana Peel",
      description: 'A playful yellow skin that brings joy and laughter',
      price: 3000,
      currency: 'gems',
      image: bananaSkin,
      skinNumber: 4,
      unlockLevel: 21,
    },
    {
      id: 'skin_joseph_cloak',
      category: 'skins',
      name: "Joseph's Coat",
      description: 'The coat of many colors given by Jacob to his beloved son Joseph',
      price: 3600,
      currency: 'gems',
      image: josephsCoat,
      skinNumber: 3,
      unlockLevel: 22,
    },
    {
      id: 'skin_whale',
      category: 'skins',
      name: "Jonah's Whale",
      description: 'From the belly of the great fish that swallowed Jonah',
      price: 4200,
      currency: 'gems',
      image: whale,
      skinNumber: 8,
      unlockLevel: 24,
    },
    {
      id: 'skin_armor_of_god',
      category: 'skins',
      name: "Armor of God",
      description: 'Put on the full armor of God to stand against the schemes of the devil',
      price: 4400,
      currency: 'gems',
      image: armorOfGod,
      skinNumber: 9,
      unlockLevel: 24,
    },


  ], [userLevel]);

  // Filter items by category
  const filteredItems = useMemo(() =>
    storeItems.filter(item => item.category === selectedCategory),
    [selectedCategory, storeItems]
  );

  // Handle item purchase
  const handlePurchase = useCallback(async (item: StoreItem) => {
    hapticMedium();

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
                hapticSuccess()

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
    hapticLight();

    const skinId = item.skinNumber?.toString() || item.id;

    // Update shop store (this handles the equipped skin state)
    equipSkin(skinId);

    // Update home store to persist the current skin
    setCurrentSkin(skinId);

    console.log('🔄 Updated equipped skin to:', skinId);

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

  // Handle upgrade to pro (for Annointed Lamb)
  const handleUpgradeToProForLamb = useCallback(async () => {
    hapticMedium();

    // Set from screen for analytics
    useSubscriptionStore.getState().setFromScreen('store_annointed_lamb');

    // Present the paywall
    try {
      const result = await useSubscriptionStore.getState().presentFreeTrialPaywall();
      if (result === 'PURCHASED') {
        // Automatically give the user the Annointed Lamb skin
        const skinId = '99'; // Annointed Lamb skin number
        addSkin(skinId);

        analytics.logEvent('Store_AnointedLamb_Upgraded', {
          fromScreen: 'store'
        });
        console.log('✅ Successfully upgraded to pro from Annointed Lamb card');

        // Show success message
        Toast.show({
          type: 'success',
          text1: 'Welcome to Shepherd Super! 🎉',
          text2: 'The Annointed Lamb skin has been added to your collection',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    } catch (error) {
      console.error('❌ Error presenting paywall from Annointed Lamb:', error);
    }
  }, [addSkin]);

  // Render store item card
  const renderStoreItem = (item: StoreItem) => {
    const isLocked = item.unlockLevel && userLevel < item.unlockLevel;
    const canAfford = item.currency === 'gems' ? userGems >= item.price : true;
    const skinId = item.skinNumber?.toString() || item.id;
    const isOwned = item.isOwned || hasSkin(skinId); // Check both item property and shop store
    const isEquipped = equippedSkin === skinId;
    const isAnointedLamb = item.id === 'skin_super';

    // Debug logging for Annointed Lamb
    if (isAnointedLamb) {
      console.log('🔍 Annointed Lamb Debug:', {
        skinId,
        equippedSkin,
        isEquipped,
        skinNumber: item.skinNumber,
        itemId: item.id,
        isProMember,
        isOwned,
        userLevel,
        hasSkinResult: hasSkin(skinId)
      });
    }

    return (
      <View
        key={item.id}
        className={`${isAnointedLamb
          ? 'bg-lightYellow border-2 border-accentGold shadow-lg'
          : 'bg-surfaceCreamLight border border-brownBorder shadow-card'
          } rounded-[24px] mb-4 overflow-hidden h-48`}
        style={isAnointedLamb ? {
          shadowColor: '#FCD34D',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        } : {}}>

        <View className="flex-row p-4 h-48 justify-between">
          {/* Lamb Image - Full size, no background, clipped at bottom */}
          <View className="w-48 h-full absolute left-0 bottom-0 ml-2">
            {isAnointedLamb && (
              <View
                className="w-48 h-48 absolute bottom-[-20] rounded-full"
                style={{
                  backgroundColor: 'rgba(252, 211, 77, 0.2)',
                  shadowColor: '#FCD34D',
                  shadowOffset: { width: 0, height: 0 },
                  right: 4,
                  shadowOpacity: 0.6,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              />
            )}
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
            <View style={{ marginBottom: 4, marginTop: -4 }}>
              {isAnointedLamb ? (
                // Special handling for Annointed Lamb
                isProMember ? (
                  userLevel < 10 ? (
                    <PrimaryButton
                      title="Equip at LVL 10"
                      onPress={() => { }}
                      disabled={true}
                      buttonType="blue"
                      buttonHeight={40}
                      width="100%"
                    />
                  ) : isEquipped ? (
                    <PrimaryButton
                      title="Equipped"
                      onPress={() => { }}
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
                    title="Upgrade"
                    onPress={handleUpgradeToProForLamb}
                    disabled={false}
                    buttonType="orange"
                    buttonHeight={40}
                    width="100%"
                    featherIcon="zap"
                  />
                )
              ) : isLocked ? (
                <PrimaryButton
                  title={`Unlocks lvl ${item.unlockLevel}`}
                  onPress={() => { }}
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
                    onPress={() => { }}
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
      <View className="flex-row items-center justify-between px-6 pt-8 pb-4 relative">
        {/* Gems counter - left */}
        <View className="w-24 flex-row items-center bg-lightYellow px-3 py-1.5 rounded-full">
          <Image source={gemIcon} className="w-5 h-5 mr-1" />
          <Text className="font-feather text-body text-textPrimary">{userGems}</Text>
        </View>

        {/* Store title - center */}
        <Text className="font-feather text-h2 text-textPrimary">{i18n.t('store')}</Text>

        {/* Close button - right */}
        <View className="w-24 flex justify-end items-end pr-4">
          <TouchableOpacity
            className=" w-10 h-10 bg-black/30 rounded-full items-center justify-center z-10"
            onPress={() => {
              hapticLight();
              onClose ? onClose() : router.back();
            }}
            activeOpacity={0.7}>
            <FontAwesome name="times" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Store Items List */}
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}>
        {filteredItems.map(renderStoreItem)}
        <View className="flex h-24 bg-clear" />
      </ScrollView>
    </SafeAreaView>
  );
}
