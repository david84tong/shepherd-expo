import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

import { testimonials, Rating } from '../data/ratings';
import { FlatList } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.9;


const TestimonialCard = ({ item, index }: { item: Rating; index: number }) => {
  const [imageLoading, setImageLoading] = useState(true);



  return (
    <Animated.View
      style={{
        width: ITEM_WIDTH,
        borderRadius: 16,
      }}
      className="bg-[#FDF6E3] rounded-2xl p-5 border border-[#E9E2C7]"
    >
      <View className="flex-row items-center">
        <View className="relative w-12 h-12 justify-center items-center">
          <Image
            source={{ uri: item.avatar }}
            className="w-12 h-12 rounded-full"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View className="absolute inset-0 items-center justify-center bg-gray-200 rounded-full">
              <ActivityIndicator size="small" color="#6AA95A" />
            </View>
          )}
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-[#2D3720]">{item.name}</Text>
          <Text className="text-sm text-[#6AA95A]">{item.handle}</Text>
        </View>

        <View className="flex-row">
          {[...Array(5)].map((_, i) => (
            <FontAwesome
              key={i}
              name="star"
              size={16}
              color={i < item.rating ? '#FCD34D' : '#E9E2C7'}
              style={{ marginLeft: 2 }}
            />
          ))}
        </View>
      </View>

      <Text className="text-[#3B4632] text-base leading-6 italic mt-4">
        "{item.comment}"
      </Text>
    </Animated.View>
  );
};

export const TestimonialList = () => {
  return (
    <View className='flex-1 flex-col items-center justify-center w-full'>
     <FlatList
     data={testimonials}
     renderItem={({item,index}) => <TestimonialCard item={item} index={index} />}
     keyExtractor={(item) => item.id}
     showsVerticalScrollIndicator={false}
     contentContainerStyle={{
      gap: 6
     }}
     decelerationRate="fast"
     className="w-full"
     />
    </View>
  );
};
