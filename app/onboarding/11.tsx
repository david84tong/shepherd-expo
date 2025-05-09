import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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

export default function SaveProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isLoginMode = params.isLogin === "true";
  
  const [loading, setLoading] = useState(false);
  const { signInWithApple, signInAnonymously } = useAuth();
  const { clearResponses, responses } = useOnboardingStore();
  const { createUser } = useUserStore();

  // Animation shared values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(40);
  
  const benefitsOpacity = useSharedValue(0);
  const benefitsTranslateY = useSharedValue(40);
  
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(40);

  // Load Rive assets
  const [riveAssets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

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
      translateY.value = withDelay(delay, 
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
    transform: [{ translateY: headerTranslateY.value }]
  }));

  const benefitsStyle = useAnimatedStyle(() => ({
    opacity: benefitsOpacity.value,
    transform: [{ translateY: benefitsTranslateY.value }]
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }]
  }));

  // Mark onboarding as completed and navigate to home
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      await clearResponses(); // Clear onboarding responses after completion
      router.replace('/onboarding/LoadingScreen');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  // Create user object from onboarding responses
  const createUserFromResponses = async (uid: string, displayName: string) => {
    try {
      // Get all responses from store to ensure we have latest data
      const allResponses = useOnboardingStore.getState().getAllResponses();
      
      // Map the stored path to a spiritual goal if available
      // Fallback to intent if no path selected
      const spiritualGoal = allResponses.intent || 'Understand';
      // Create user object from onboarding responses
      const userData = {
        id: uid, // Use id consistently instead of uid
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
        frequencyGoal: 'daily',
        denomination: allResponses.religiousAffiliation,
        ageRange: allResponses.ageRange,
        // Set notification preferences if provided
        notificationEnabled: allResponses.notificationEnabled !== undefined ? 
          allResponses.notificationEnabled : false,
        notificationTime: allResponses.notificationTime || undefined,
        // Set selected path details if available
        selectedPathId: allResponses.selectedPath || undefined,
        lamb: {
          level: 1,
          xp: 0,
          mood: 'lamb-idle',
          hearts: 50,
          name: allResponses.lambName || '',
          skin: 'default',
        },
      };

      analytics.logEvent("OnboardingSignUp_Completed");
      analytics.setUserId(uid);
      analytics.setUserProperties(userData);
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

  // Handle sign in with Apple
  const handleAppleSignIn = async () => {
    const eventName = isLoginMode ? "Login_Tapped_Apple" : "OnboardingSignUp_Tapped_Apple";
    analytics.logEvent(eventName);
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLoading(true);
      console.log("Starting Apple sign in process...");
      
      // Pass the isLoginMode flag to the signInWithApple method
      const user = await signInWithApple(isLoginMode);
      
      if (user) {
        console.log("Apple sign in successful");
        
        if (isLoginMode) {
          // User exists (verified in the auth hook), proceed to home screen
          await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          router.replace('/onboarding/LoadingScreen');
        } else {
          // In onboarding mode, create new user
          console.log("Creating user...");
          await createUserFromResponses(user.uid, user.displayName || 'Anonymous User');
          await completeOnboarding();
        }
      } else {
        console.error("Apple sign in returned no user");
        throw new Error("No user data returned from Apple");
      }
    } catch (error: any) {
      console.error("Apple sign in error:", error);

      // Provide more specific feedback based on the error
      let errorMessage = "There was a problem signing in with Apple.";
      
      if (error.message?.includes("canceled") || error.message?.includes("cancelled")) {
        errorMessage = "Sign in was canceled. Please try again.";
      } else if (error.message?.includes("network")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (error.message?.includes("configuration")) {
        errorMessage = "Authentication configuration error. Please try another method.";
      } else if (error.message?.includes("incomplete")) {
        errorMessage = "Sign in process was interrupted. Please try again.";
      } else if (error.message?.includes("operation couldn't be completed")) {
        errorMessage = "Sign in process could not be completed. Please try again.";
      } else if (error.message?.includes("No account found")) {
        errorMessage = "We couldn't find an account with this Apple ID. Please create a new account instead.";
      }
      
      const analyticsEventName = isLoginMode ? "Login_Failed_Apple" : "OnboardingSignUp_Failed_Apple";
      analytics.logEvent(analyticsEventName, {
        error: error.message,
      });

      Alert.alert(
        "Sign In Failed",
        `${errorMessage} ${isLoginMode ? "" : "You can try again or use the anonymous option to continue."}`,
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle anonymous sign in - only available in onboarding mode
  const handleSkip = async (showConfirmation = true) => {
    if (isLoginMode) return; // Don't allow anonymous login in login mode
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    analytics.logEvent("OnboardingSignUp_Tapped_Skip");
    if (showConfirmation) {
      Alert.alert(
        "Skip Sign In?",
        "Without an account, your progress won't be saved if you delete the app or change devices.",
        [
          { text: "Go Back", style: "cancel" },
          { 
            text: "Skip Anyway", 
            onPress: () => createAnonymousAccount()
          }
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
      console.error("Anonymous sign in error:", error);
      Alert.alert(
        "Error",
        "There was a problem creating anonymous account. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surfaceCream px-6">
      {/* Header */}
      <Animated.View style={headerStyle} className="items-center mt-16 mb-8">
        <Text className="font-feather text-h1 text-center text-textPrimary mb-3">
          {isLoginMode ? "Welcome Back" : "Save Your Progress"}
        </Text>
        <Text className="font-din text-body text-center text-description mb-6">
          {isLoginMode 
            ? "Sign in to your existing account to continue your journey." 
            : "Sign in to keep your reading streak and Bible progress synced across devices."}
        </Text>
        
        {/* Icon */}
        <View className="mb-8 overflow-hidden w-56 h-48 items-center justify-center">
          {riveAssets && riveAssets[0]?.localUri && (
            <Rive
              url={riveAssets[0].localUri}
              artboardName={"lamb-workout"}
              autoplay={true}
              fit={Fit.Contain}
              alignment={Alignment.Center}
              style={{ width: 200, height: 200 }}
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
            <Text className="font-din text-body text-textPrimary flex-1">Save your reading progress</Text>
          </View>
          
          <View className="flex-row items-center mb-4">
            <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
              <AntDesign name="check" size={18} color="#24CA17" />
            </View>
            <Text className="font-din text-body text-textPrimary flex-1">Transfer between devices</Text>
          </View>
          
          <View className="flex-row items-center mb-4">
            <View className="bg-lightGreen w-8 h-8 rounded-full items-center justify-center mr-3">
              <AntDesign name="check" size={18} color="#24CA17" />
            </View>
            <Text className="font-din text-body text-textPrimary flex-1">Keep your reading streak safe</Text>
          </View>
        </Animated.View>
      )}
      
      {/* Login message for login mode */}
      {isLoginMode && (
        <Animated.View style={benefitsStyle} className="mb-8">
          <Text className="font-din text-body text-center text-description mb-2">
            Please sign in with the same Apple ID you used to create your account.
          </Text>
        </Animated.View>
      )}
      
      {/* Sign in button and Skip button */}
      <Animated.View style={buttonsStyle}>
        <View className="items-center mb-4">
          <TouchableOpacity 
            className="flex-row items-center justify-center bg-black w-full py-4 px-6 rounded-[16px] mb-4 shadow-appleShadow"
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" style={{ marginRight: 10 }} />
            ) : (
              <AntDesign name="apple1" size={24} color="white" style={{ marginRight: 10 }} />
            )}
            <Text className="font-din text-white text-[18px] font-bold">
              {loading ? "Signing in..." : "Sign in with Apple"}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Skip button - only show in onboarding mode */}
        {!isLoginMode && (
          <TouchableOpacity 
            onPress={() => handleSkip(true)}
            className="items-center"
            disabled={loading}
          >
            <Text className="font-din text-description underline text-[16px]">
              {loading ? "Please wait..." : "Skip for now"}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Back button - only show in login mode */}
        {isLoginMode && (
          <TouchableOpacity 
            onPress={() => router.back()}
            className="items-center"
            disabled={loading}
          >
            <Text className="font-din text-description underline text-[16px]">
              {loading ? "Please wait..." : "Back to Home"}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Privacy note */}
        <Text className="font-din text-[12px] text-description text-center mt-6 px-8">
          We only use your Apple ID for authentication. Your email and personal details stay private.
        </Text>
      </Animated.View>
    </View>
  );
}