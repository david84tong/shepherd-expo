import React from 'react';
import {
  View,
  FlatList,
  Image,
  Text,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { testimonials, Rating } from '../data/ratings';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.85;
const _spacing = 10;

const TestimonialCard = ({ item }: { item: Rating }) => {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <View 
      className="bg-black rounded-xl p-6" 
      style={{ width: ITEM_WIDTH }}
    >
      <View className="flex-row items-center mb-3">
        <View className="relative w-12 h-12 justify-center items-center">
          <Image
            source={{ uri: item.avatar }}
            className="w-12 h-12 rounded-full"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View className="absolute inset-0 items-center justify-center bg-gray-100 rounded-full">
              <ActivityIndicator size="small" color="#4B5563" />
            </View>
          )}
        </View>
        
        <View className="ml-3 flex-1">
          <Text className="font-['nunito-black'] text-base text-white">{item.name}</Text>
          <Text className="font-['nunito-regular'] text-sm text-gray-300">{item.handle}</Text>
        </View>

        <View className="flex-row">
          {[...Array(5)].map((_, index) => (
            <FontAwesome
              key={index}
              name="star"
              size={16}
              color={index < item.rating ? '#FFD700' : '#E5E7EB'}
              style={{ marginLeft: 2 }}
            />
          ))}
        </View>
      </View>

      <Text className="font-['nunito-regular'] text-gray-300 text-base mb-2 leading-6">
        "{item.comment}"
      </Text>
    </View>
  );
};

export const TestimonialList = () => {
  return (
     <View className='items-center justify-center gap-3'>
        {
            testimonials.map((item, index) => (
                <TestimonialCard key={index} item={item} />
            ))
        }
     </View>
  );
}; 