import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useUserStore } from '~/app/stores/userStore';
import useSubscriptionStore from '~/app/stores/subscriptionStore';
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
  const handlePurchase = useCallback((item: StoreItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Check if user has enough gems
    if (item.currency === 'gems' && userGems < item.price) {
      analytics.logEvent('Store_Purchase_Failed', { 
        item: item.id, 
        reason: 'insufficient_gems' 
      });
      return;
    }

    // Check if user meets level requirement
    if (item.unlockLevel && userLevel < item.unlockLevel) {
      analytics.logEvent('Store_Purchase_Failed', { 
        item: item.id, 
        reason: 'level_locked' 
      });
      return;
    }

    // Execute purchase
    analytics.logEvent('Store_Purchase_Success', { item: item.id });
    console.log('Purchase:', item.name);
  }, [userGems, userLevel]);

  // Render store item card
  const renderStoreItem = (item: StoreItem) => {
    const isLocked = item.unlockLevel && userLevel < item.unlockLevel;
    const canAfford = item.currency === 'gems' ? userGems >= item.price : true;
    
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
              ) : item.price === 0 ? (
                <PrimaryButton
                  title="Owned"
                  onPress={() => {}}
                  disabled={true}
                  buttonType="blue"
                  buttonHeight={40}
                  width="100%"
                  featherIcon="check"
                />
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
