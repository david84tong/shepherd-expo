import { AntDesign } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../hooks/authHook';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';

const scheduleNotification = async (time: string) => {};
const completeOnboarding = async (router: ReturnType<typeof useRouter>) => {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    // Navigate to the next onboarding screen or home
    router.replace('/onboarding/11');
  } catch (error) {
    console.error('Error completing onboarding:', error);
  }
};

export default function SaveProgressScreen() {
  const router = useRouter();
  const setResponse = useOnboardingStore(state => state.setResponse);
  const responses = useOnboardingStore(state => state.responses);
  const setUser = useUserStore(state => state.setUser);
  const createUser = useUserStore(state => state.createUser);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(undefined);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Animation shared values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(40);
  const benefitsOpacity = useSharedValue(0);
  const benefitsTranslateY = useSharedValue(40);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(40);

  const { signInWithApple, signInAnonymously } = useAuth();

  useEffect(() => {
    // Reset animation values
    headerOpacity.value = 0;
    headerTranslateY.value = 40;
    benefitsOpacity.value = 0;
    benefitsTranslateY.value = 40;
    buttonsOpacity.value = 0;
    buttonsTranslateY.value = 40;

    // Staggered animations for each component
    const animateComponent = (opacity: typeof headerOpacity, translateY: typeof headerTranslateY, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(
        delay,
        withSpring(0, {
          damping: 20,
          stiffness: 90,
        })
      );
    };
    animateComponent(headerOpacity, headerTranslateY, 0);
    animateComponent(benefitsOpacity, benefitsTranslateY, 200);
    animateComponent(buttonsOpacity, buttonsTranslateY, 400);
  }, []);

  // Create animated styles
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const benefitsStyle = useAnimatedStyle(() => ({
    opacity: benefitsOpacity.value,
    transform: [{ translateY: benefitsTranslateY.value }],
  }));
  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const handleSelection = async (time: string) => {
    // Trigger light haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        console.log('Haptics not available');
      });
    } catch (error) {
      console.log('Haptics not available');
    }

    setSelectedOption(time);

    // Save to onboarding store
    await setResponse('notificationPreference', time);

    // Schedule the notification
    await scheduleNotification(time);

    // Navigate to the next screen
    router.push('/onboarding/11');
  };

  // Create user object from onboarding responses
  const createUserFromResponses = async (uid: string, displayName: string) => {
    try {
      // Create user object from onboarding responses
      const userData = {
        id: uid, // Use id consistently instead of uid
        displayName,
        spiritualGoal: responses.intent?.includes('read-bible')
          ? 'Understand'
          : responses.intent?.includes('talk-to-god')
            ? 'Overcome'
            : responses.intent?.includes('reflection-quiet-time')
              ? 'Explore'
              : 'Walk',
        experienceLevel:
          responses.bibleFamiliarity === 'never'
            ? 'new'
            : responses.bibleFamiliarity === 'a-little'
              ? 'new'
              : responses.bibleFamiliarity === 'a-lot'
                ? 'mature'
                : 'growing',
        frequencyGoal: 'daily',
        denomination: responses.religiousAffiliation,
        ageRange: responses.ageRange,
        lamb: {
          level: 1,
          xp: 0,
          mood: 'lamb-idle',
          hearts: 50,
          name: responses.lambName || '',
          skin: 'default',
        },
      };

      // Create user in Firestore
      const success = await createUser(uid, userData);
      if (!success) {
        throw new Error('Failed to create user document');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  function isErrorWithCodeAndMessage(err: unknown): err is { code?: string; name?: string; message?: string } {
    return typeof err === 'object' && err !== null && (
      'code' in err || 'name' in err || 'message' in err
    );
  }

  // Handle sign in with Apple
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithApple();
      if (user && user.uid) {
        await createUserFromResponses(user.uid, user.displayName || 'Anonymous User');
        await completeOnboarding(router);
      }
    } catch (error: unknown) {
      // Type guard para acessar propriedades do erro

      let code = '';
      let message = '';
      
      if (isErrorWithCodeAndMessage(error)) {
        code = error.code || error.name || '';
        message = error.message || '';
      }

      if (code === 'ERR_REQUEST_CANCELED') {
        Alert.alert(
          'Sign In Canceled',
          'You canceled the sign in process. If this was a mistake, please try again.',
          [{ text: 'OK' }]
        );
      } else if (code === 'ERR_INVALID_OPERATION') {
        Alert.alert(
          'Invalid Operation',
          'An invalid operation was performed during Apple Sign In. Please try again.',
          [{ text: 'OK' }]
        );
      } else if (code === 'ERR_INVALID_RESPONSE') {
        Alert.alert(
          'Invalid Response',
          'Received an invalid response from Apple. Please try again.',
          [{ text: 'OK' }]
        );
      } else if (code === 'ERR_INVALID_SCOPE') {
        Alert.alert(
          'Invalid Scope',
          'An invalid scope was requested during Apple Sign In. Please contact support.',
          [{ text: 'OK' }]
        );
      } else if (code === 'ERR_REQUEST_FAILED') {
        Alert.alert(
          'Request Failed',
          'The Apple Sign In request failed. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else if (code === 'ERR_REQUEST_NOT_HANDLED') {
        Alert.alert(
          'Request Not Handled',
          'The Apple Sign In request was not handled correctly. Please try again.',
          [{ text: 'OK' }]
        );
      } else if (code === 'ERR_REQUEST_NOT_INTERACTIVE') {
        Alert.alert(
          'Not Interactive',
          'The Apple Sign In request is not interactive. Please try again.',
          [{ text: 'OK' }]
        );
      } else if (code === 'ERR_REQUEST_UNKNOWN') {
        Alert.alert(
          'Unknown Error',
          'An unknown error occurred during Apple Sign In. Please try again.',
          [{ text: 'OK' }]
        );
      } else if (message.includes('Apple Authentication is not available')) {
        Alert.alert(
          'Apple Sign In Not Available',
          'Sign in with Apple is not supported on this device. Please try another sign-in method.',
          [{ text: 'OK' }]
        );
      } else if (message.includes('No identity token')) {
        Alert.alert(
          'Authentication Incomplete',
          'Could not complete sign in with Apple. Please try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sign In Failed',
          'There was a problem signing in with Apple. You can try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle anonymous sign in
  const handleSkip = async () => {
    Alert.alert(
      'Skip Sign In?',
      "Without an account, your progress won't be saved if you delete the app or change devices.",
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip Anyway',
          onPress: async () => {
            try {
              setLoading(true);
              const user = await signInAnonymously();
              if (user && user.uid) {
                await createUserFromResponses(user.uid, 'Anonymous User');
                await completeOnboarding(router);
              }
            } catch (error) {
              console.error('Anonymous sign in error:', error);
              Alert.alert(
                'Error',
                'There was a problem creating anonymous account. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-surfaceCream px-6 pt-16">
      {/* Question Text */}
      <Animated.View style={headerStyle}>
        <Text className="font-feather text-h1 text-center text-textPrimary mb-4">
          When would you like to be reminded to read?
        </Text>
        <Text className="font-din text-body text-center text-description mb-6">
          Sign in to keep your reading streak and Bible progress synced across devices.
        </Text>

        {/* Icon */}
        <View className="bg-white p-4 rounded-full mb-8 shadow-md">
          <Image
            source={require('../../assets/icon.png')}
            className="w-24 h-24"
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Benefits */}
      <Animated.View style={benefitsStyle} className="mb-8">
        <View className="flex-row items-center mb-4">
          <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
            <AntDesign name="check" size={18} color="#24CA17" />
          </View>
          <Text className="font-din text-body text-textPrimary flex-1">
            Save your reading progress
          </Text>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
            <AntDesign name="check" size={18} color="#24CA17" />
          </View>
          <Text className="font-din text-body text-textPrimary flex-1">
            Transfer between devices
          </Text>
        </View>

        <View className="flex-row items-center mb-4">
          <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
            <AntDesign name="check" size={18} color="#24CA17" />
          </View>
          <Text className="font-din text-body text-textPrimary flex-1">
            Keep your reading streak safe
          </Text>
        </View>
      </Animated.View>

      {/* Sign in button and Skip button */}
      <Animated.View style={buttonsStyle}>
        <View className="items-center mb-4">
          <TouchableOpacity
            className="flex-row items-center justify-center bg-black w-full py-4 px-6 rounded-[16px] mb-4"
            onPress={handleAppleSignIn}
            disabled={loading}>
            <AntDesign name="apple1" size={24} color="white" />
            <Text className="font-din text-white text-[18px] font-bold">
              {loading ? 'Signing in...' : 'Sign in with Apple'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skip button */}
        <TouchableOpacity onPress={handleSkip} className="items-center" disabled={loading}>
          <Text className="font-din text-description underline text-[16px]">
            {loading ? 'Please wait...' : 'Skip for now'}
          </Text>
        </TouchableOpacity>

        {/* Privacy note */}
        <Text className="font-din text-[12px] text-description text-center mt-6 px-8">
          We only use your Apple ID for authentication. Your email and personal details stay
          private.
        </Text>
      </Animated.View>
    </View>
  );
}
