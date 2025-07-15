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
import { AntDesign, FontAwesome6 } from '@expo/vector-icons';
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
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import PrimaryButton from '../../components/PrimaryButton';
import { fetchFromFirestore } from '../helper/firebaseHelper';
import { useHomeStore } from '../stores/homeStore';
import i18n from '../utils/i18n';
import { appLog, RPH } from '../helper/helper';
import { AppFonts } from '../constants/appFonts';
import { hapticLight } from '~/utils/haptics';
import { COVENANT_STATES } from '../hooks/streakHook';

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

  const [isLoginMode, setIsLoginMode] = useState(params.isLogin === 'true');

  // Add effect to persist and restore login mode
  useEffect(() => {
    const persistLoginMode = async () => {
      // If no parameter, try to restore from storage
      const savedLoginMode = await AsyncStorage.getItem('isLoginMode');
      if (savedLoginMode === 'true') {
        setIsLoginMode(true);
      }
    };

    persistLoginMode();
  }, [params.isLogin]);

  // Log screen load analytics event
  useEffect(() => {
    analytics.logEvent('onboarding_screen_11_loaded', {
      isLoginMode: params.isLogin === 'true',
      timestamp: new Date().toISOString(),
    });
  }, []);

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
  appLog('hideGoogleLogin ==>', hideGoogleLogin);
  appLog('showEmailPassword ==>', showEmailPassword);

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
      // Mark first app launch as completed so TabsLayout won't treat this session as first launch
      await AsyncStorage.setItem('first_app_launch_completed', 'true');
      // Also mark today's daily first load as completed to avoid an extra redirect right after sign-up
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(`daily_first_load_${today}`, 'true');
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
      appLog('Error completing onboarding:', error);
    }
  };

  async function syncUser(user: FirebaseAuthTypes.User) {
    const { success, data: firestoreData } = await fetchFromFirestore({
      currentLoggedUser: user,
    });
    if (success && firestoreData) {
      await useUserStore.getState().syncFirestoreData(firestoreData);
      const prayerCompleted = useHomeStore.getState().prayerCompleted;
      const reflectionCompleted = useHomeStore.getState().reflectionCompleted;
      const readingCompleted = useHomeStore.getState().readingCompleted;
      if (firestoreData?.completedPrayers && !prayerCompleted) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const hasPrayedToday = firestoreData.completedPrayers.some((prayer) => {
          if (!prayer.date || !prayer.date.toDate) {
            return false;
          }
          const prayerDate = prayer.date.toDate();
          prayerDate.setHours(0, 0, 0, 0);
          return prayerDate.getTime() === today.getTime();
        });

        if (hasPrayedToday) {
          useHomeStore.getState().setPrayerCompleted(true);
        }
      }
      if (firestoreData?.completedReflections && !reflectionCompleted) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const hasReflectedToday = firestoreData.completedReflections.some((prayer) => {
          if (!prayer.date || !prayer.date.toDate) {
            return false;
          }
          const prayerDate = prayer.date.toDate();
          prayerDate.setHours(0, 0, 0, 0);
          return prayerDate.getTime() === today.getTime();
        });

        if (hasReflectedToday) {
          useHomeStore.getState().setReflectionCompleted(true);
        }
      }
      if (firestoreData?.completedReadings && !readingCompleted) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const hasReadToday = firestoreData.completedReadings.some((prayer) => {
          if (!prayer.date || !prayer.date.toDate) {
            return false;
          }
          const prayerDate = prayer.date.toDate();
          prayerDate.setHours(0, 0, 0, 0);
          return prayerDate.getTime() === today.getTime();
        });

        if (hasReadToday) {
          useHomeStore.getState().setReadingCompleted(true);
        }
      }
    }
  }

  // Create user object from onboarding responses
  const createUserFromResponses = async (uid: string, displayName: string) => {
    try {
      const isPremium = await checkPremiumStatus();
      const isProFromOnboarding = useUserStore.getState().isProFromOnboarding;
      // Get all responses from store to ensure we have latest data
      const allResponses = getAllResponses();
      appLog('Onboarding responses:', JSON.stringify(allResponses));

      // Get A/B test value from AsyncStorage (set in onboarding screen 1)
      let abTestValue = 0; // Default value
      try {
        const storedAbTest = await AsyncStorage.getItem('abTest');
        if (storedAbTest !== null) {
          abTestValue = parseInt(storedAbTest, 10);
          appLog('[OnboardingScreen11] Retrieved A/B test value:', abTestValue);
        } else {
          appLog('[OnboardingScreen11] No A/B test value found, using default:', abTestValue);
        }
      } catch (abTestError) {
        console.error('[OnboardingScreen11] Error retrieving A/B test value:', abTestError);
      }

      const spiritualGoal = allResponses.intent || 'Understand';
      const now = firestore.Timestamp.now();
      const userData: UserDoc = {
        id: uid,
        displayName,
        email: '', // Will be set from auth
        spiritualGoal,
        experienceLevel:
          allResponses.bibleFamiliarity === 'never'
            ? 'new'
            : allResponses.bibleFamiliarity === 'a-little'
              ? 'new'
              : allResponses.bibleFamiliarity === 'a-lot'
                ? 'mature'
                : 'growing',
        notificationTime: allResponses.notificationTime || '',
        notificationEnabled:
          allResponses.notificationEnabled !== undefined ? allResponses.notificationEnabled : false,
        setNotificationTime: async () => {}, // Default implementation
        frequencyGoal: allResponses.frequencyGoal || '',
        denomination: allResponses.religiousAffiliation,
        ageRange: allResponses.ageRange || '',
        username: allResponses.username || '',
        lamb: {
          level: 1,
          xp: 90,
          mood: 'lamb-idle',
          hearts: 50,
          name: allResponses.lambName || '',
          skin: 'default',
        },
        selectedPathId: allResponses.selectedPath || '',
        streakCount: 0,
        lastActivityDate: now,
        versesReadTotal: 0,
        chaptersReadTotal: 0,
        bibleVersion: 'NIV',
        proStatus: 'free',
        createdAt: now,
        updatedAt: now,
        gens: 0,
        lastReadingDate: now,
        lastPrayerDate: now,
        lastReflectionDate: now,
        lastReadingPenaltyDate: now,
        lastPrayerPenaltyDate: now,
        lastReflectionPenaltyDate: now,
        completedReflections: [],
        completedPrayers: [],
        completedReadings: [],
        isProFromOnboarding: false,
        hasSeenWidgetModal: false,
        hasSeenBibleReaderTutorial: false,
        skins: ['default'],
        checkIns: [],
        level: 1,
        xp: 90,
        streak: 0,
        isPro: false,
        isProWithReferral: false,
        completedMapPaths: [],
        covenantProgress: allResponses.covenantProgress || {
          currentStreak: 0,
          targetDays: 0,
          progress: 0,
          state: COVENANT_STATES.NOT_STARTED,
        },
        customDevotionals: [],
      };

      appLog('Creating user data:', JSON.stringify(userData));
      // We are checking if user have premium in this mobile also user if purchased before signup from onboarding or user restored from paywall in onboarding before signup.
      if (isPremium && isProFromOnboarding) {
        userData.isPro = true;
        userData.proExpiryDate = undefined;
        useUserStore.getState().setProStatus('pro');
      }
      // Identify user in Mixpanel
      // Pass isNewUser=true since this is called during user creation
      await analytics.setUserId(uid, true);
      analytics.setUserProperties({
        ...userData,
        $name: displayName,
        spiritual_goal: spiritualGoal,
        // streak_commit: userData.streakCommit,
        experience_level: userData.experienceLevel,
        denomination: userData.denomination,
        age_range: userData.ageRange,
        abTest: abTestValue,
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
      appLog('uid, userData =>', { uid, userData });

      if (!success) {
        throw new Error('Failed to create user document');
      }
    } catch (error) {
      appLog('Error creating user:', error);
      throw error;
    }
  };

  // Handle sign in with Apple
  const handleAppleSignIn = async () => {
    const eventName = isLoginMode ? 'Login_Tapped_Apple' : 'OnboardingSignUp_Tapped_Apple';
    analytics.logEvent(eventName);

    try {
      hapticLight();
      setLoading(true);
      appLog('Starting Apple sign in process...');

      // Pass the isLoginMode flag to the signInWithApple method
      const user = await signInWithApple(isLoginMode);

      if (user) {
        appLog('Apple sign in successful');

        if (isLoginMode) {
          const isPremium = await checkPremiumStatus();
          const isProFromOnboarding = useUserStore.getState().isProFromOnboarding;
          if (isPremium && isProFromOnboarding) {
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
          await syncUser(user);

          // Animate out all components before navigation using Reanimated
          headerOpacity.value = withTiming(0, { duration: 400 });
          benefitsOpacity.value = withTiming(0, { duration: 400 });
          buttonsOpacity.value = withTiming(0, { duration: 400 });
          // Check if user is pro before navigating
          const isProMember = useUserStore.getState().getProStatus() === 'pro';
          if (!isProMember) {
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 1000);
          } else {
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 1000);
          }
        } else {
          // In onboarding mode, create new user from responses
          appLog('Creating user...');
          await createUserFromResponses(user.uid, user.displayName || 'Anonymous User');
          appLog('User created from responses');
          await completeOnboarding();
          appLog('Onboarding completed');
        }
      }
    } catch (error: any) {
      appLog('Apple sign in error:', error);

      // Provide more specific feedback based on the error
      let errorMessage = 'There was a problem signing in with Apple.';

      if (error.message?.includes('Would you like to login instead?')) {
        Alert.alert('Account Exists', 'An account with this Apple ID already exists.', [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Login',
            onPress: () => {
              setIsLoginMode(true);
              AsyncStorage.setItem('isLoginMode', 'true');
            },
          },
        ]);
        return;
      } else if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
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
      } else if (error.message?.includes('Failed to fetch your account data')) {
        errorMessage = "We couldn't retrieve your account data. Please try again.";
      }

      const analyticsEventName = isLoginMode
        ? 'Login_Failed_Apple'
        : 'OnboardingSignUp_Failed_Apple';
      analytics.logEvent(analyticsEventName, {
        error: error.message,
      });

      if (!error.message?.includes('Would you like to login instead?')) {
        Alert.alert(
          'Sign In Failed',
          `${errorMessage} ${isLoginMode ? '' : 'You can try again or use the anonymous option to continue.'}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in with Google
  const handleGoogleSignIn = async () => {
    const eventName = isLoginMode ? 'Login_Tapped_Google' : 'OnboardingSignUp_Tapped_Google';
    analytics.logEvent(eventName);

    try {
      hapticLight();
      setLoading(true);
      appLog('Starting Google sign in process...');

      // Pass the isLoginMode flag to the signInWithGoogle method
      const user = await signInWithGoogle(isLoginMode);
      appLog('user ==>', user);

      if (user) {
        appLog('Google sign in successful');

        if (isLoginMode) {
          const isPremium = await checkPremiumStatus();
          const isProFromOnboarding = useUserStore.getState().isProFromOnboarding;
          if (isPremium && isProFromOnboarding) {
            useUserStore.getState().setProStatus('pro');
          }
          // User exists and data has been fetched in the auth hook
          // Just mark onboarding as completed and navigate to tabs
          await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          await syncUser(user);
          // Check if user is pro before navigating
          const isProMember = useUserStore.getState().getProStatus() === 'pro';
          if (!isProMember) {
            setTimeout(() => {
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 1000);
            }, 1000);
          } else {
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 1000);
          }
        } else {
          // In onboarding mode, create new user from responses
          appLog('Creating user...');
          await createUserFromResponses(user.uid, user.displayName || 'Anonymous User');
          appLog('User created from responses');
          await completeOnboarding();
          appLog('Onboarding completed');
        }
      }
    } catch (error: any) {
      appLog('Google sign in error:', error);

      // Provide more specific feedback based on the error
      let errorMessage = 'There was a problem signing in with Google.';

      if (error.message?.includes('Would you like to login instead?')) {
        Alert.alert('Account Exists', 'An account with this Google account already exists.', [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Login',
            onPress: () => {
              setIsLoginMode(true);
              AsyncStorage.setItem('isLoginMode', 'true');
            },
          },
        ]);
        return;
      } else if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
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

      if (!error.message?.includes('Would you like to login instead?')) {
        Alert.alert(
          'Sign In Failed',
          `${errorMessage} ${isLoginMode ? '' : 'You can try again or use the anonymous option to continue.'}`,
          [{ text: 'OK' }]
        );
      }
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
      hapticLight();
      setLoading(true);

      let user;
      if (isLoginMode) {
        try {
          user = await signInWithEmailPassword(email, password, true);
          analytics.logEvent('Login_Success_Email');
          await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          await syncUser(user);

          // After successful login
          await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          router.replace('/(tabs)');
        } catch (loginError: any) {
          appLog('Login error:', loginError.message);
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

          appLog("CALLED API");
          user = await signUpWithEmailPassword(email, password, displayName);
          appLog("user ====>", user);

          analytics.logEvent('OnboardingSignUp_Success_Email');

          await createUserFromResponses(user.uid, displayName);
          await completeOnboarding();
        } catch (signupError: any) {
          appLog('Signup error:', signupError.message);
          let errorMessage = 'Unable to create account. Please try again.';

          if (signupError.message?.includes('Would you like to login instead?')) {
            Alert.alert('Account Exists', 'An account with this email already exists.', [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Login',
                onPress: () => {
                  setIsLoginMode(true);
                  AsyncStorage.setItem('isLoginMode', 'true');
                },
              },
            ]);
            return;
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
      appLog('General auth error:', error.message);
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

  // Handle anonymous sign in - only available in onboarding mode
  const handleSkip = async (showConfirmation = true) => {
    if (isLoginMode) return; // Don't allow anonymous login in login mode

    hapticLight();
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
      appLog('Anonymous sign in error:', error);
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
              {isLoginMode ? i18n.t('onboarding_welcome_back') : i18n.t('onboarding_save_progress')}
            </Text>
            <Text className="font-din text-body text-center text-description mb-6">
              {isLoginMode
                ? i18n.t('onboarding_sign_in_existing')
                : i18n.t('onboarding_sign_in_sync')}
            </Text>

            {/* Icon */}
            <View style={{ width: RPH(27), height: RPH(25) }} className="mb-8 overflow-hidden  items-center justify-center">
              {riveAssets && riveAssets[0]?.uri && (
                <>
                  {IS_ANDROID ? (
                    <Rive
                      resourceName={'home_lamb'}
                      artboardName={'lamb-workout'}
                      autoplay={true}
                      fit={Fit.Contain}
                      alignment={Alignment.Center}
                      style={{ width: RPH(27), height: RPH(27) }}
                    />
                  ) : (
                    <Rive
                      url={riveAssets[0].uri!}
                      artboardName={'lamb-workout'}
                      autoplay={true}
                      fit={Fit.Contain}
                      alignment={Alignment.Center}
                      style={{ width: RPH(27), height: RPH(27) }}
                    />
                  )}
                </>
              )}
            </View>
          </Animated.View>

          {/* Benefits - only show in onboarding mode */}
          {!isLoginMode && (
            <Animated.View style={benefitsStyle} className="mb-8">
              <View className="flex-row items-center mb-4">
                <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
                  <FontAwesome6 name="check" size={18} color="#24CA17" />
                </View>
                <Text className="font-din text-body text-textPrimary flex-1">
                  {i18n.t('onboarding_benefit_save_progress')}
                </Text>
              </View>

              <View className="flex-row items-center mb-4">
                <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
                  <FontAwesome6 name="check" size={18} color="#24CA17" />
                </View>
                <Text className="font-din text-body text-textPrimary flex-1">
                  {i18n.t('onboarding_benefit_transfer_devices')}
                </Text>
              </View>

              <View className="flex-row items-center mb-4">
                <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
                  <FontAwesome6 name="check" size={18} color="#24CA17" />
                </View>
                <Text className="font-din text-body text-textPrimary flex-1">
                  {i18n.t('onboarding_benefit_keep_streak')}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Login message for login mode */}
          {isLoginMode && (
            <Animated.View style={benefitsStyle} className="mb-8">
              <Text className="font-din text-body text-center text-description mb-2">
                {IS_IOS
                  ? i18n.t('onboarding_sign_in_apple')
                  : i18n.t('onboarding_sign_in_google')}
              </Text>
            </Animated.View>
          )}

          {/* Email/Password Form - Always Visible */}
          {showEmailPassword && IS_ANDROID && (
            <Animated.View style={buttonsStyle} className="mb-6">
              <View className="w-full mb-4">
                <TextInput
                  className="font-feather text-2xl text-textPrimary bg-white px-6 py-5 rounded-2xl border-4 border-border"
                  placeholder={i18n.t('onboarding_email_placeholder')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  className="font-feather text-2xl text-textPrimary bg-white mt-1 px-6 py-5 rounded-2xl border-4 border-border"
                  placeholder={i18n.t('onboarding_password_placeholder')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholderTextColor="#9CA3AF"
                />
                <View className="mt-4">
                  <PrimaryButton
                    title={loading ? i18n.t('onboarding_please_wait') : isLoginMode ? i18n.t('onboarding_sign_in') : i18n.t('onboarding_sign_up')}
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
                        text1: i18n.t('please_go_through_onboarding'),
                        position: 'top',
                        visibilityTime: 3000,
                      });
                      setShowNoAccountToast(false);
                    }
                    router.replace('/(auth)');
                  }}
                  className="items-center mt-3"
                  disabled={loading}>
                  <Text className="font-din text-description underline text-[16px]">
                    {loading ? i18n.t('onboarding_please_wait') : i18n.t('onboarding_back_to_home')}
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
                  <Text className="font-din text-description mx-4">{i18n.t('or')}</Text>
                  <View className="flex-1 h-[1px] bg-gray-300" />
                </Animated.View>
              ) : null}

              {/* Social Sign In Buttons */}
              <Animated.View style={buttonsStyle}>
                {isSmaleAge && Platform.OS === 'android' ? null : (
                  <View className="items-center mb-4">
                    {Platform.OS === 'ios' ? (
                      <TouchableOpacity
                        style={{ height: RPH(6) }}
                        className="flex-row items-center justify-center bg-black w-full  px-6 rounded-[16px] mb-4 shadow-appleShadow"
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
                            size={RPH(3)}
                            color="white"
                            style={{ marginRight: 10 }}
                          />
                        )}
                        <Text style={{ fontSize: AppFonts[14] }} className="font-din text-white  font-bold">
                          {loading ? i18n.t('onboarding_signing_in') : i18n.t('onboarding_continue_with_apple')}
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
                            size={RPH(3)}
                            color="#4285F4"
                            style={{ marginRight: 10 }}
                          />
                        )}
                        <Text style={{ fontSize: AppFonts[14] }} className="font-din text-[#4285F4]  font-bold">
                          {loading ? i18n.t('onboarding_signing_in') : i18n.t('onboarding_continue_with_google')}
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
                      {loading ? i18n.t('onboarding_please_wait') : i18n.t('onboarding_skip_for_now')}
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
                          text1: i18n.t('please_go_through_onboarding'),
                          position: 'top',
                          visibilityTime: 3000,
                        });
                        setShowNoAccountToast(false);
                      }
                      router.replace('/(auth)');
                    }}
                    className="items-center"
                    disabled={loading}>
                    <Text className="font-din text-description underline text-[16px]">
                      {loading ? i18n.t('onboarding_please_wait') : i18n.t('onboarding_back_to_home')}
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
