import { useRouter, usePathname } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { useEffect } from 'react';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Log the attempted route for debugging
    console.warn('[404] Unmatched route:', pathname);
  }, [pathname]);

  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Text className="text-4xl font-bold text-white mb-4">Page Not Found</Text>
      <Text className="text-lg text-gray-400 mb-8">Sorry, we could not find that page.</Text>
      <Text className="text-base text-yellow-400 mb-8">Attempted route: {pathname}</Text>
      <Pressable
        className="bg-yellow-400 px-6 py-3 rounded-full"
        onPress={() => router.replace('/(tabs)')}
      >
        <Text className="text-black font-bold text-lg">Go Home</Text>
      </Pressable>
    </View>
  );
} 