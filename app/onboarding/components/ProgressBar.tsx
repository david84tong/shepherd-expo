import React from 'react';
import { View } from 'react-native';
import { usePathname } from 'expo-router';

export default function ProgressBar() {
  const pathname = usePathname();
  const currentPage = parseInt(pathname?.split('/').pop() || '1', 10);
  const totalPages = 5; // Adjust based on your total number of pages
  const progress = Math.min((currentPage / totalPages) * 100, 100);

  return (
    <View className="w-full h-1 bg-gray-200">
      <View 
        className="h-full bg-accentGold"
        style={{ width: `${progress}%` }}
      />
    </View>
  );
}
