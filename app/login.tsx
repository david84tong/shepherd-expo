import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './hooks/authHook';
import { useUserStore } from './stores/userStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithApple, signInAnonymously } = useAuth();
  const setUser = useUserStore((state) => state.setUser);
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState('');

  // Apple login
  const handleAppleLogin = async () => {
    setLoading(true);
    setLoadingProvider('apple');
    try {
      const user = await signInWithApple();
      if (user) {
        setUser({
          id: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
        });
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Apple Sign In failed', 'Please try again or use another method.');
    } finally {
      setLoading(false);
      setLoadingProvider('');
    }
  };

  // Anonymous login
  const handleAnonymousLogin = async () => {
    setLoading(true);
    setLoadingProvider('anon');
    try {
      const user = await signInAnonymously();
      if (user) {
        setUser({
          id: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
        });
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Anonymous Sign In failed', 'Please try again.');
    } finally {
      setLoading(false);
      setLoadingProvider('');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF3D9] justify-center px-6">
      <View className="items-center mb-10">
        <Image source={require('../assets/icon.png')} className="w-20 h-20 mb-4 rounded-full" />
        <Text className="text-base font-din text-slate-600 text-center">Welcome back! Please sign in to continue.</Text>
      </View>
      <View className="mb-6">
        <TouchableOpacity
          className="bg-black rounded-full p-4 items-center flex-row justify-center mb-4"
          onPress={handleAppleLogin}
          disabled={loading}
        >
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color="white" style={{ marginRight: 10 }} />
          ) : (
            <AntDesign name="apple1" size={24} color="white" style={{ marginRight: 10 }} />
          )}
          <Text className="text-white font-din-bold text-base">Sign in with Apple</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="border border-gray-300 rounded-full p-4 items-center flex-row justify-center"
          onPress={handleAnonymousLogin}
          disabled={loading}
        >
          {loadingProvider === 'anon' ? (
            <ActivityIndicator color="#3C584A" style={{ marginRight: 10 }} />
          ) : null}
          <Text className="text-slate-700 font-din-bold text-base">Continue as guest</Text>
        </TouchableOpacity>
      </View>
      <View className="items-center mt-6">
        <Text className="font-din text-slate-500 text-center text-xs">By signing in, you agree to our Terms of Use and Privacy Policy.</Text>
      </View>
    </SafeAreaView>
  );
} 