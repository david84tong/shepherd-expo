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

// Import icons
import gemIcon from '~/assets/icons/greenGemIcon.png';
import heartIcon from '~/assets/icons/heartIcon.png';

// Define store item types
type StoreCategory = 'skins' | 'powerups' | 'hearts';

interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  description: string;
  price: number;
  currency: 'gems' | 'money';
  image?: any;
  icon?: any;
  unlockLevel?: number;
  isPro?: boolean;
  isPopular?: boolean;
  discount?: number;
  action: () => void;
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
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Categories with icons
  const categories = [
    { id: 'skins', label: i18n.t('skins'), icon: '🎨' },
    { id: 'powerups', label: i18n.t('power_ups'), icon: '⚡' },
    { id: 'hearts', label: i18n.t('hearts'), icon: '❤️' },
  ];

  // Store items
  const storeItems: StoreItem[] = useMemo(() => [
    // Skins
    {
      id: 'golden_lamb',
      category: 'skins',
      name: i18n.t('golden_lamb'),
      description: i18n.t('golden_lamb_desc'),
      price: 500,
      currency: 'gems',
      unlockLevel: 10,
      isPopular: true,
      action: () => console.log('Purchase golden lamb'),
    },
    {
      id: 'rainbow_lamb',
      category: 'skins',
      name: i18n.t('rainbow_lamb'),
      description: i18n.t('rainbow_lamb_desc'),
      price: 300,
      currency: 'gems',
      action: () => console.log('Purchase rainbow lamb'),
    },
    {
      id: 'angel_lamb',
      category: 'skins',
      name: i18n.t('angel_lamb'),
      description: i18n.t('angel_lamb_desc'),
      price: 1000,
      currency: 'gems',
      unlockLevel: 20,
      isPro: true,
      action: () => console.log('Purchase angel lamb'),
    },
    {
      id: 'ninja_lamb',
      category: 'skins',
      name: i18n.t('ninja_lamb'),
      description: i18n.t('ninja_lamb_desc'),
      price: 750,
      currency: 'gems',
      unlockLevel: 15,
      action: () => console.log('Purchase ninja lamb'),
    },

    // Power-ups
    {
      id: 'streak_freeze',
      category: 'powerups',
      name: i18n.t('streak_freeze'),
      description: i18n.t('streak_freeze_desc'),
      price: 200,
      currency: 'gems',
      isPopular: true,
      action: () => console.log('Purchase streak freeze'),
    },
    {
      id: 'double_xp',
      category: 'powerups',
      name: i18n.t('double_xp'),
      description: i18n.t('double_xp_desc'),
      price: 150,
      currency: 'gems',
      discount: 25,
      action: () => console.log('Purchase double XP'),
    },
    {
      id: 'heart_shield',
      category: 'powerups',
      name: i18n.t('heart_shield'),
      description: i18n.t('heart_shield_desc'),
      price: 100,
      currency: 'gems',
      action: () => console.log('Purchase heart shield'),
    },

    // Hearts
    {
      id: 'hearts_refill',
      category: 'hearts',
      name: i18n.t('full_hearts'),
      description: i18n.t('full_hearts_desc'),
      price: 350,
      currency: 'gems',
      action: () => console.log('Purchase hearts refill'),
    },
    {
      id: 'hearts_10',
      category: 'hearts',
      name: i18n.t('hearts_10'),
      description: i18n.t('hearts_10_desc'),
      price: 50,
      currency: 'gems',
      action: () => console.log('Purchase 10 hearts'),
    },
    {
      id: 'unlimited_hearts',
      category: 'hearts',
      name: i18n.t('unlimited_hearts'),
      description: i18n.t('unlimited_hearts_desc'),
      price: 4.99,
      currency: 'money',
      isPro: true,
      action: () => console.log('Purchase unlimited hearts'),
    },
  ], []);

  // Filter items by category
  const filteredItems = useMemo(() => 
    storeItems.filter(item => item.category === selectedCategory),
    [selectedCategory, storeItems]
  );

  // Handle category change
  const handleCategoryChange = useCallback((category: StoreCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(category);
    analytics.logEvent('Store_Category_Changed', { category });
  }, []);

  // Handle item purchase
  const handlePurchase = useCallback((item: StoreItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Check if user has enough gems
    if (item.currency === 'gems' && userGems < item.price) {
      // Show not enough gems modal
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

    // Check if pro is required
    if (item.isPro && !isProMember) {
      analytics.logEvent('Store_Purchase_Failed', { 
        item: item.id, 
        reason: 'pro_required' 
      });
      router.push('/PricingScreen' as any);
      return;
    }

    // Execute purchase
    analytics.logEvent('Store_Purchase_Success', { item: item.id });
    item.action();
  }, [userGems, userLevel, isProMember, router]);

  // Calculate discounted price
  const getDiscountedPrice = (price: number, discount?: number) => {
    if (!discount) return price;
    return Math.round(price * (1 - discount / 100));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDEBB8' }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
        <TouchableOpacity
          onPress={onClose || (() => router.back())}
          className="w-10 h-10 rounded-full bg-lightYellow items-center justify-center">
          <Feather name="arrow-left" size={20} color="#B89B4C" />
        </TouchableOpacity>
        
        <Text className="font-feather text-h2 text-textPrimary">{i18n.t('store')}</Text>
        
        {/* Gems counter */}
        <View className="flex-row items-center bg-lightYellow px-3 py-1.5 rounded-full">
          <Image source={gemIcon} className="w-5 h-5 mr-1" />
          <Text className="font-feather text-body text-textPrimary">{userGems}</Text>
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="px-6 mb-4"
        contentContainerStyle={{ paddingRight: 24 }}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => handleCategoryChange(category.id as StoreCategory)}
            className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
              selectedCategory === category.id 
                ? 'bg-accentGold' 
                : 'bg-surfaceCreamLight border border-brownBorder'
            }`}>
            <Text className="text-lg mr-1">{category.icon}</Text>
            <Text className={`font-feather text-body ${
              selectedCategory === category.id 
                ? 'text-white' 
                : 'text-textPrimary'
            }`}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Store Items Grid */}
      <ScrollView 
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="flex-row flex-wrap justify-between">
          {filteredItems.map((item, index) => {
            const isLocked = item.unlockLevel && userLevel < item.unlockLevel;
            const needsPro = item.isPro && !isProMember;
            const canAfford = item.currency === 'gems' ? userGems >= item.price : true;
            
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handlePurchase(item)}
                disabled={isLocked || !canAfford}
                className={`bg-surfaceCreamLight rounded-[20px] p-4 shadow-card border border-brownBorder mb-4 ${
                  index % 2 === 0 ? 'mr-2' : ''
                }`}
                style={{ width: '48%' }}>
                
                {/* Popular Badge */}
                {item.isPopular && (
                  <View className="absolute -top-2 -right-2 bg-red px-3 py-1 rounded-full z-10">
                    <Text className="font-feather text-xs text-white">{i18n.t('popular')}</Text>
                  </View>
                )}

                {/* Discount Badge */}
                {item.discount && (
                  <View className="absolute -top-2 -left-2 bg-green px-3 py-1 rounded-full z-10">
                    <Text className="font-feather text-xs text-white">-{item.discount}%</Text>
                  </View>
                )}

                {/* Item Image/Icon */}
                <View className="h-24 items-center justify-center mb-3">
                  {item.category === 'skins' && (
                    <View className="w-20 h-20 bg-lightYellow rounded-full items-center justify-center">
                      <Text className="text-4xl">🐑</Text>
                    </View>
                  )}
                  {item.category === 'powerups' && (
                    <View className="w-20 h-20 bg-lightGreen/20 rounded-full items-center justify-center">
                      <Text className="text-4xl">⚡</Text>
                    </View>
                  )}
                  {item.category === 'hearts' && (
                    <View className="w-20 h-20 bg-red/10 rounded-full items-center justify-center">
                      <Image source={heartIcon} className="w-12 h-12" />
                    </View>
                  )}
                </View>

                {/* Item Name */}
                <Text className="font-feather text-body text-textPrimary mb-1" numberOfLines={1}>
                  {item.name}
                </Text>

                {/* Item Description */}
                <Text className="font-din text-sm text-description mb-3" numberOfLines={2}>
                  {item.description}
                </Text>

                {/* Lock Status */}
                {isLocked && (
                  <View className="flex-row items-center mb-2">
                    <Feather name="lock" size={14} color="#B89B4C" />
                    <Text className="font-din text-xs text-description ml-1">
                      {i18n.t('unlocks_at_level')} {item.unlockLevel}
                    </Text>
                  </View>
                )}

                {/* Pro Badge */}
                {needsPro && (
                  <View className="bg-lightYellow px-2 py-1 rounded-md mb-2">
                    <Text className="font-din text-xs text-accentGold text-center">
                      {i18n.t('pro_only')}
                    </Text>
                  </View>
                )}

                {/* Price */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    {item.currency === 'gems' && (
                      <Image source={gemIcon} className="w-4 h-4 mr-1" />
                    )}
                    {item.discount ? (
                      <View className="flex-row items-center">
                        <Text className="font-din text-sm text-description line-through mr-1">
                          {item.price}
                        </Text>
                        <Text className="font-feather text-body text-textPrimary">
                          {getDiscountedPrice(item.price, item.discount)}
                        </Text>
                      </View>
                    ) : (
                      <Text className="font-feather text-body text-textPrimary">
                        {item.currency === 'money' ? `$${item.price}` : item.price}
                      </Text>
                    )}
                  </View>
                  
                  {/* Purchase Button State */}
                  {!canAfford && item.currency === 'gems' && (
                    <Feather name="x-circle" size={16} color="#FF6B6B" />
                  )}
                  {canAfford && !isLocked && !needsPro && (
                    <Feather name="shopping-cart" size={16} color="#B89B4C" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Purchase Hint */}
      <View className="absolute bottom-0 left-0 right-0 bg-surfaceCream border-t border-brownBorder px-6 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image source={gemIcon} className="w-6 h-6 mr-2" />
            <Text className="font-din text-body text-textPrimary">
              {i18n.t('need_more_gems')}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/GemsScreen' as any)}
            className="bg-accentGold px-4 py-2 rounded-full">
            <Text className="font-feather text-sm text-white">{i18n.t('get_gems')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
