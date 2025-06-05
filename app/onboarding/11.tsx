import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../hooks/authHook';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import analytics from '../../utils/analytics';
import Rive, { Fit, Alignment } from 'rive-react-native';
import { useAssets } from 'expo-asset';
import Toast from 'react-native-toast-message';
import { useUIStore } from '../stores/uiStore';
import { adapty } from 'react-native-adapty';
import { IS_ANDROID, IS_IOS } from '../utils/utils';
import { UserDoc } from '../models/User';
import firestore from '@react-native-firebase/firestore';
import PrimaryButton from '../../components/PrimaryButton';
import { useRemoteConfig } from '../hooks/useRemoteConfig';

// Add this near the top of the file, after imports

// Helper function to check premium status from Adapty
const checkPremiumStatus = async () => {
  try {
    const profile = await adapty.getProfile();
    const accessLevel = profile.accessLevels?.['premium'];
    return accessLevel?.isActive || false;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

export default function SaveProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isLoginMode = params.isLogin === 'true';

  const [loading, setLoading] = useState(false);
  const {
    signInWithApple,
    signInWithGoogle,
    signInAnonymously,
    signInWithEmailPassword,
    signUpWithEmailPassword,
  } = useAuth();
  // const { showEmailPassword, hideGoogleLogin } = useRemoteConfig();
  const showEmailPassword = (global as any).showEmailPassword;
  const hideGoogleLogin = (global as any).hideGoogleLogin;
  console.log('hideGoogleLogin ==>', hideGoogleLogin);
  console.log('showEmailPassword ==>', showEmailPassword);

  const { clearResponses, responses, getAllResponses } = useOnboardingStore();
  const { createUser } = useUserStore();
  const [showNoAccountToast, setShowNoAccountToast] = useState(false);
  const ageRange = useOnboardingStore.getState().getAllResponses().ageRange;
  const isSmaleAge = ageRange === 'under-18';
  // Animation shared values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(40);

  const benefitsOpacity = useSharedValue(0);
  const benefitsTranslateY = useSharedValue(40);

  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(40);

  // Load Rive assets
  const [riveAssets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

  // Add new state for email auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    // Reset animation values
    headerOpacity.value = 0;
    headerTranslateY.value = 40;
    benefitsOpacity.value = 0;
    benefitsTranslateY.value = 40;
    buttonsOpacity.value = 0;
    buttonsTranslateY.value = 40;

    // Staggered animations for each component
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(
        delay,
        withSpring(0, {
          damping: 20,
          stiffness: 90,
        })
      );
    };

    // Start animations with delays
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

  // Mark onboarding as completed and navigate to home
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      await clearResponses(); // Clear onboarding responses after completion

      // Animate out all components before navigation using Reanimated
      headerOpacity.value = withTiming(0, { duration: 400 });
      benefitsOpacity.value = withTiming(0, { duration: 400 });
      buttonsOpacity.value = withTiming(0, { duration: 400 });

      // Navigate after animation duration
      setTimeout(() => {
        router.replace('/(tabs)');

        // After a short delay, show the widget prompt
        setTimeout(() => {
          const uiStore = useUIStore.getState();
          if (uiStore.showWidgetPrompt) {
            uiStore.showWidgetPrompt();
          }
        }, 2000);
      }, 400);
    } catch (error) {
      console.log('Error completing onboarding:', error);
    }
  };

  // Create user object from onboarding responses
  const createUserFromResponses = async (uid: string, displayName: string) => {
    try {
      const isPremium = await checkPremiumStatus();
      const isProFromOnboarding = useUserStore.getState().isProFromOnboarding;
      // Get all responses from store to ensure we have latest data
      const allResponses = getAllResponses();
      console.log('Onboarding responses:', JSON.stringify(allResponses));

      const spiritualGoal = allResponses.intent || 'Understand';
      const userData: UserDoc = {
        id: uid,
        displayName,
        spiritualGoal,
        experienceLevel:
          allResponses.bibleFamiliarity === 'never'
            ? 'new'
            : allResponses.bibleFamiliarity === 'a-little'
              ? 'new'
              : allResponses.bibleFamiliarity === 'a-lot'
                ? 'mature'
                : 'growing',
        frequencyGoal: allResponses.frequencyGoal || '',
        denomination: allResponses.religiousAffiliation,
        ageRange: allResponses.ageRange || '',
        notificationEnabled:
          allResponses.notificationEnabled !== undefined ? allResponses.notificationEnabled : false,
        notificationTime: allResponses.notificationTime || '',
        selectedPathId: allResponses.selectedPath || '',
        lamb: {
          level: 1,
          xp: 90,
          mood: 'lamb-idle',
          hearts: 50,
          name: allResponses.lambName || '',
          skin: 'default',
        },
        username: allResponses.username || '',
      };

      console.log('Creating user data:', JSON.stringify(userData));
      // We are checking if user have premium in this mobile also user if purchased before signup from onboarding or user restored from paywall in onboarding before signup.
      if (isPremium && !isProFromOnboarding) {
        userData.isPro = true;
        userData.proExpiryDate = null;
        useUserStore.getState().setProStatus('pro');
      }
      // Identify user in Mixpanel
      analytics.setUserId(uid);
      analytics.setUserProperties({
        ...userData,
        $name: displayName,
        spiritual_goal: spiritualGoal,
        experience_level: userData.experienceLevel,
        denomination: userData.denomination,
        age_range: userData.ageRange,
        notification_enabled: userData.notificationEnabled,
        notification_time: userData.notificationTime,
        selected_path: userData.selectedPathId,
        lamb_level: userData.lamb.level,
        lamb_xp: userData.lamb.xp,
        lamb_name: userData.lamb.name,
      });

      // Identify user in Adapty
      try {
        await adapty.identify(uid);

        // Prepare custom attributes, filtering out undefined/null values
        const customAttributes: Record<string, string | number | boolean> = {};

        if (userData.ageRange) customAttributes.age_range = userData.ageRange;

        await adapty.updateProfile({
          codableCustomAttributes: customAttributes,
        });
      } catch (adaptyError) {
        console.error('Error identifying user in Adapty:', adaptyError);
      }

      analytics.logEvent('OnboardingSignUp_Completed');

      // Create user in Firestore
      const success = await createUser(uid, userData);
      console.log('uid, userData =>', { uid, userData });

      if (!success) {
        throw new Error('Failed to create user document');
      }
    } catch (error) {
      console.log('Error creating user:', error);
      throw error;
    }
  };

  // Handle sign in with Apple
  const handleAppleSignIn = async () => {
    const eventName = isLoginMode ? 'Login_Tapped_Apple' : 'OnboardingSignUp_Tapped_Apple';
    analytics.logEvent(eventName);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLoading(true);
      console.log('Starting Apple sign in process...');

      // Pass the isLoginMode flag to the signInWithApple method
      const user = await signInWithApple(isLoginMode);

      if (user) {
        console.log('Apple sign in successful');

        if (isLoginMode) {
          const isPremium = await checkPremiumStatus();
          const isProFromOnboarding = useUserStore.getState().isProFromOnboarding;
          if (isPremium && !isProFromOnboarding) {
            useUserStore.getState().setProStatus('pro');
            await firestore().collection('users').doc(user.uid).set(
              {
                isPro: true,
                proExpiryDate: null,
              },
              { merge: true }
            );
          }
          // User exists and data has been fetched in the auth hook
          // Just mark onboarding as completed and navigate to tabs
          await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');

          // Animate out all components before navigation using Reanimated
          headerOpacity.value = withTiming(0, { duration: 400 });
          benefitsOpacity.value = withTiming(0, { duration: 400 });
          buttonsOpacity.value = withTiming(0, { duration: 400 });

          // Navigate after animation duration
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 400);
        } else {
          // In onboarding mode, create new user from responses
          console.log('Creating user...');
          await createUserFromResponses(user.uid, user.displayName || 'Anonymous User');
          await completeOnboarding();
        }
      } else {
        console.log('Apple sign in returned no user');
        throw new Error('No user data returned from Apple');
      }
    } catch (error: any) {
      console.log('Apple sign in error:', error);

      // Provide more specific feedback based on the error
      let errorMessage = 'There was a problem signing in with Apple.';

      if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
        errorMessage = 'Sign in was canceled. Please try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('configuration')) {
        errorMessage = 'Authentication configuration error. Please try another method.';
      } else if (error.message?.includes('incomplete')) {
        errorMessage = 'Sign in process was interrupted. Please try again.';
      } else if (error.message?.includes("operation couldn't be completed")) {
        errorMessage = 'Sign in process could not be completed. Please try again.';
      } else if (error.message?.includes('No account found')) {
        errorMessage =
          "We couldn't find an account with this Apple ID. Please create a new account instead.";
        setShowNoAccountToast(true);
      } else if (error.message?.includes('Failed to fetch your account data')) {
        errorMessage = "We couldn't retrieve your account data. Please try again.";
      }

      const analyticsEventName = isLoginMode
        ? 'Login_Failed_Apple'
        : 'OnboardingSignUp_Failed_Apple';
      analytics.logEvent(analyticsEventName, {
        error: error.message,
      });

      Alert.alert(
        'Sign In Failed',
        `${errorMessage} ${isLoginMode ? '' : 'You can try again or use the anonymous option to continue.'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in with Google
  const handleGoogleSignIn = async () => {
    const eventName = isLoginMode ? 'Login_Tapped_Google' : 'OnboardingSignUp_Tapped_Google';
    analytics.logEvent(eventName);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLoading(true);
      console.log('Starting Google sign in process...');

      // Pass the isLoginMode flag to the signInWithGoogle method
      const user = await signInWithGoogle(isLoginMode);
      console.log('user ==>', user);

      if (user) {
        console.log('Google sign in successful');

        if (isLoginMode) {
          const isPremium = await checkPremiumStatus();
          const isProFromOnboarding = useUserStore.getState().isProFromOnboarding;
          if (isPremium && !isProFromOnboarding) {
            useUserStore.getState().setProStatus('pro');
          }
          // User exists and data has been fetched in the auth hook
          // Just mark onboarding as completed and navigate to tabs
          await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          // Navigate directly to the main app tabs
          router.replace('/(tabs)');
        } else {
          // In onboarding mode, create new user from responses
          console.log('Creating user...');
          await createUserFromResponses(user.uid, user.displayName || 'Anonymous User');
          console.log('User created from responses');
          await completeOnboarding();
          console.log('Onboarding completed');
        }
      } else {
        console.log('Google sign in returned no user');
        throw new Error('No user data returned from Google');
      }
    } catch (error: any) {
      console.log('Google sign in error:', error);

      // Provide more specific feedback based on the error
      let errorMessage = 'There was a problem signing in with Google.';

      if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
        errorMessage = 'Sign in was canceled. Please try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('configuration')) {
        errorMessage = 'Authentication configuration error. Please try another method.';
      } else if (error.message?.includes('incomplete')) {
        errorMessage = 'Sign in process was interrupted. Please try again.';
      } else if (error.message?.includes('No account found')) {
        errorMessage =
          "We couldn't find an account with this Google account. Please create a new account instead.";
      }

      const analyticsEventName = isLoginMode
        ? 'Login_Failed_Google'
        : 'OnboardingSignUp_Failed_Google';
      analytics.logEvent(analyticsEventName, {
        error: error.message,
      });

      Alert.alert(
        'Sign In Failed',
        `${errorMessage} ${isLoginMode ? '' : 'You can try again or use the anonymous option to continue.'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Add new handler for email/password auth
  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password to continue.', [
        { text: 'OK' },
      ]);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.', [{ text: 'OK' }]);
      return;
    }

    // Basic password validation
    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.', [
        { text: 'OK' },
      ]);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLoading(true);

      let user;
      if (isLoginMode) {
        try {
          user = await signInWithEmailPassword(email, password, true);
          analytics.logEvent('Login_Success_Email');

          // After successful login
          await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          router.replace('/(tabs)');
        } catch (loginError: any) {
          console.log('Login error:', loginError.message);
          let errorMessage = 'Unable to sign in. Please try again.';

          if (loginError.code === 'auth/user-not-found') {
            errorMessage =
              'No account found with this email. Please check your email or create a new account.';
          } else if (loginError.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again or reset your password.';
          } else if (loginError.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
          } else if (loginError.code === 'auth/user-disabled') {
            errorMessage = 'This account has been disabled. Please contact support.';
          } else if (loginError.code === 'auth/too-many-requests') {
            errorMessage =
              'Too many failed attempts. Please try again later or reset your password.';
          }

          Alert.alert('Sign In Failed', errorMessage, [
            {
              text: 'OK',
              style: 'default',
            },
          ]);

          analytics.logEvent('Login_Failed_Email', {
            error: loginError.code || loginError.message,
          });
          return;
        }
      } else {
        // Signup mode
        try {
          const allResponses = getAllResponses();
          const displayName = allResponses.username || 'Anonymous User';

          user = await signUpWithEmailPassword(email, password, displayName);
          analytics.logEvent('OnboardingSignUp_Success_Email');

          await createUserFromResponses(user.uid, displayName);
          await completeOnboarding();
        } catch (signupError: any) {
          console.log('Signup error:', signupError.message);
          let errorMessage = 'Unable to create account. Please try again.';

          if (signupError.code === 'auth/email-already-in-use') {
            errorMessage = 'An account already exists with this email. Please sign in instead.';
          } else if (signupError.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
          } else if (signupError.code === 'auth/operation-not-allowed') {
            errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          } else if (signupError.code === 'auth/weak-password') {
            errorMessage =
              'Please choose a stronger password. It should be at least 6 characters long.';
          }

          Alert.alert('Sign Up Failed', errorMessage, [
            {
              text: 'OK',
              style: 'default',
            },
          ]);

          analytics.logEvent('OnboardingSignUp_Failed_Email', {
            error: signupError.code || signupError.message,
          });
          return;
        }
      }
    } catch (error: any) {
      console.log('General auth error:', error.message);
      Alert.alert(
        isLoginMode ? 'Sign In Failed' : 'Sign Up Failed',
        'An unexpected error occurred. Please try again later.',
        [{ text: 'OK' }]
      );

      analytics.logEvent(isLoginMode ? 'Login_Failed_Email' : 'OnboardingSignUp_Failed_Email', {
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  console.log('isSmaleAge ==>', isSmaleAge);

  // Handle anonymous sign in - only available in onboarding mode
  const handleSkip = async (showConfirmation = true) => {
    if (isLoginMode) return; // Don't allow anonymous login in login mode

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent('OnboardingSignUp_Tapped_Skip');
    if (showConfirmation) {
      Alert.alert(
        'Skip Sign In?',
        "Without an account, your progress won't be saved if you delete the app or change devices.",
        [
          { text: 'Go Back', style: 'cancel' },
          {
            text: 'Skip Anyway',
            onPress: () => createAnonymousAccount(),
          },
        ]
      );
    } else {
      // Skip confirmation if coming from a failed Apple sign in
      createAnonymousAccount();
    }
  };

  // Function to create anonymous account (extracted to avoid duplication)
  const createAnonymousAccount = async () => {
    try {
      setLoading(true);
      const user = await signInAnonymously();
      if (user) {
        await createUserFromResponses(user.uid, 'Anonymous User');
        await completeOnboarding();
      }
    } catch (error) {
      console.log('Anonymous sign in error:', error);
      Alert.alert('Error', 'There was a problem creating anonymous account. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 49 : 20}>
      <ScrollView
        className="flex-1 bg-surfaceCream"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled">
        <View className="px-6 pb-6">
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

          {/* Header */}
          <Animated.View style={headerStyle} className="items-center mt-16 mb-8">
            <Text className="font-feather text-h1 text-center text-textPrimary mb-3">
              {isLoginMode ? 'Welcome Back' : 'Save Your Progress'}
            </Text>
            <Text className="font-din text-body text-center text-description mb-6">
              {isLoginMode
                ? 'Sign in to your existing account to continue your journey.'
                : 'Sign in to keep your reading streak and Bible progress synced across devices.'}
            </Text>

            {/* Icon */}
            <View className="mb-8 overflow-hidden w-64 h-64 items-center justify-center">
              {riveAssets && riveAssets[0]?.uri && (
                <Rive
                  url={IS_IOS ? riveAssets[0].uri! : undefined}
                  resourceName={IS_ANDROID ? 'home_lamb' : undefined}
                  artboardName={'lamb-workout'}
                  autoplay={true}
                  fit={Fit.Contain}
                  alignment={Alignment.Center}
                  style={{ width: 240, height: 240 }}
                />
              )}
            </View>
          </Animated.View>

          {/* Benefits - only show in onboarding mode */}
          {!isLoginMode && (
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
          )}

          {/* Login message for login mode */}
          {isLoginMode && (
            <Animated.View style={benefitsStyle} className="mb-8">
              <Text className="font-din text-body text-center text-description mb-2">
                {IS_IOS
                  ? 'Please sign in with the same Apple ID you used to create your account.'
                  : 'Please sign in with the same Google account you used to create your account.'}
              </Text>
            </Animated.View>
          )}

          {/* Email/Password Form - Always Visible */}
          {showEmailPassword && IS_ANDROID && (
            <Animated.View style={buttonsStyle} className="mb-6">
              <View className="w-full mb-4">
                <TextInput
                  className="font-feather text-2xl text-textPrimary bg-white px-6 py-5 rounded-2xl border-4 border-border"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  className="font-feather text-2xl text-textPrimary bg-white mt-1 px-6 py-5 rounded-2xl border-4 border-border"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="#9CA3AF"
                />
                <View className="mt-4">
                  <PrimaryButton
                    title={loading ? 'Please wait...' : isLoginMode ? 'Sign In' : 'Sign Up'}
                    onPress={handleEmailAuth}
                    disabled={loading}
                    buttonType="default"
                    buttonHeight={60}
                  />
                </View>
              </View>
              {isLoginMode && IS_ANDROID && hideGoogleLogin && (
                <TouchableOpacity
                  onPress={() => {
                    if (showNoAccountToast) {
                      Toast.show({
                        type: 'error',
                        text1: 'Please go through onboarding.',
                        position: 'top',
                        visibilityTime: 3000,
                      });
                      setShowNoAccountToast(false);
                    }
                    router.back();
                  }}
                  className="items-center mt-3"
                  disabled={loading}>
                  <Text className="font-din text-description underline text-[16px]">
                    {loading ? 'Please wait...' : 'Back to Home'}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {!hideGoogleLogin || IS_IOS ? (
            <>
              {/* OR Separator */}
              {showEmailPassword && IS_ANDROID ? (
                <Animated.View
                  style={buttonsStyle}
                  className="flex-row items-center justify-center mb-6">
                  <View className="flex-1 h-[1px] bg-gray-300" />
                  <Text className="font-din text-description mx-4">OR</Text>
                  <View className="flex-1 h-[1px] bg-gray-300" />
                </Animated.View>
              ) : null}

              {/* Social Sign In Buttons */}
              <Animated.View style={buttonsStyle}>
                {isSmaleAge && Platform.OS === 'android' ? null : (
                  <View className="items-center mb-4">
                    {Platform.OS === 'ios' ? (
                      <TouchableOpacity
                        className="flex-row items-center justify-center bg-black w-full py-4 px-6 rounded-[16px] mb-4 shadow-appleShadow"
                        onPress={handleAppleSignIn}
                        disabled={loading}>
                        {loading ? (
                          <ActivityIndicator
                            color="white"
                            size="small"
                            style={{ marginRight: 10 }}
                          />
                        ) : (
                          <AntDesign
                            name="apple1"
                            size={24}
                            color="white"
                            style={{ marginRight: 10 }}
                          />
                        )}
                        <Text className="font-din text-white text-[18px] font-bold">
                          {loading ? 'Signing in...' : 'Continue with Apple'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        className="flex-row items-center justify-center bg-white w-full py-4 px-6 rounded-[16px] mb-4 shadow-appleShadow border-2 border-gray-200"
                        onPress={handleGoogleSignIn}
                        disabled={loading}>
                        {loading ? (
                          <ActivityIndicator
                            color="#4285F4"
                            size="small"
                            style={{ marginRight: 10 }}
                          />
                        ) : (
                          <AntDesign
                            name="google"
                            size={24}
                            color="#4285F4"
                            style={{ marginRight: 10 }}
                          />
                        )}
                        <Text className="font-din text-[#4285F4] text-[18px] font-bold">
                          {loading ? 'Signing in...' : 'Continue with Google'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Skip/Back button */}
                {!isLoginMode && (
                  <TouchableOpacity
                    onPress={() => handleSkip(true)}
                    className="items-center"
                    style={{
                      marginTop:
                        isSmaleAge && Platform.OS === 'android'
                          ? Dimensions.get('window').height * 0.05
                          : 0,
                    }}
                    disabled={loading}>
                    <Text className="font-din text-description underline text-[16px]">
                      {loading ? 'Please wait...' : 'Skip for now'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Back button - only show in login mode */}
                {isLoginMode && (
                  <TouchableOpacity
                    onPress={() => {
                      if (showNoAccountToast) {
                        Toast.show({
                          type: 'error',
                          text1: 'Please go through onboarding.',
                          position: 'top',
                          visibilityTime: 3000,
                        });
                        setShowNoAccountToast(false);
                      }
                      router.back();
                    }}
                    className="items-center"
                    disabled={loading}>
                    <Text className="font-din text-description underline text-[16px]">
                      {loading ? 'Please wait...' : 'Back to Home'}
                    </Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
