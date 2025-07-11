import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './hooks/authHook';
import { useUserStore } from './stores/userStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_KEY } from './types/onboarding';
import { hapticLight } from '~/utils/haptics';
import { appLog } from './helper/helper';

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

  // Begin journey handler
  const handleBeginJourney = async () => {
    try {
      // Trigger haptic feedback
      hapticLight();
      // Remove the onboarding completed key
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      // Navigate to onboarding
      router.replace('/onboarding/1');
    } catch (error) {
      appLog('Error starting journey:', error);
      Alert.alert('Error', 'Could not start journey. Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDEBB8] justify-center px-6">
      <View className="items-center mb-10">
        <Image source={require('../assets/icon.png')} className="w-20 h-20 mb-4 rounded-full" />
        <Text className="text-base font-din text-slate-600 text-center">
          Welcome to Shepherd! Choose how you&apos;d like to begin.
        </Text>
      </View>
      <View className="mb-6">
        <TouchableOpacity
          className="flex-row items-center justify-center bg-black w-full py-4 px-6 rounded-[16px] mb-4 shadow-appleShadow"
          onPress={handleAppleLogin}
          disabled={loading}>
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color="white" size="small" style={{ marginRight: 10 }} />
          ) : (
            <AntDesign name="apple1" size={24} color="white" style={{ marginRight: 10 }} />
          )}
          <Text className="font-din text-white text-[18px] font-bold">
            {loadingProvider === 'apple' ? 'Signing in...' : 'Sign in with Apple'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center justify-center bg-[#F7B500] w-full py-4 px-6 rounded-[16px] mb-4 shadow-buttonShadow"
          onPress={handleBeginJourney}
          disabled={loading}>
          <Text className="font-din text-white text-[18px] font-bold">Begin Your Journey</Text>
        </TouchableOpacity>
      </View>
      <View className="items-center mt-6">
        <Text className="font-din text-slate-500 text-center text-xs">
          By signing in, you agree to our Terms of Use and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}
