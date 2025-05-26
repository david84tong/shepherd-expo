import * as Haptics from 'expo-haptics';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, View, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSignedIn } from '../hooks/authHook';
import { useHomeStore } from '../stores/homeStore';
import { usePathStore } from '../stores/pathStore';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';
import { useOnboardingStore } from '../stores/onboardingStore';
import useSubscriptionStore from '../stores/subscriptionStore';

// Key for tracking first app launch
const FIRST_APP_LAUNCH_KEY = 'first_app_launch_completed';

// Helper component to center the icon
const CenteredIcon = ({ children }: { children: React.ReactNode }) => (
  // Use className for centering and ensure it doesn't expand unnecessarily
  <View className="flex items-center justify-center">{children}</View>
);

// Custom Tab Bar Button component with animation
function CustomTabBarButton(props: any) {
  const { children, onPress } = props;

  // Handle press with haptic feedback
  const handlePress = () => {
    // Trigger medium haptic feedback when tab is pressed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      // Silently fail if haptics don't work
      console.log('Haptics not available');
    });

    // Call the original onPress handler
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      // Apply base flex styling and only horizontal margin
      className="flex-1 items-center justify-center mx-1">
      {children}
    </Pressable>
  );
}

export default function TabsLayout() {
  // Hooks must be invoked in the same order on every render.
  // Move them all before any conditional early-returns.
  const signedIn = isSignedIn();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [isFirstAppLaunch, setIsFirstAppLaunch] = useState<boolean | null>(null);
  // Get isInitialized from the store to ensure savedScreenToNavigateTo is ready
  const { savedScreenToNavigateTo, isInitialized: isOnboardingStoreInitialized } = useOnboardingStore();
  
  // Get subscription status
  const { isProMember, getCustomerInfo } = useSubscriptionStore();

  // Check onboarding status from AsyncStorage
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        setOnboardingCompleted(completed === 'true');
        console.log(`[TabsLayout] Onboarding completed from AsyncStorage: ${completed}`);
      } catch (error) {
        console.error('[TabsLayout] Error checking onboarding status:', error);
        setOnboardingCompleted(false); // Assume not completed on error
      }
    };
    checkOnboarding();
  }, []);

  // Check if this is the first app launch
  useEffect(() => {
    const checkFirstAppLaunch = async () => {
      try {
        const firstLaunchCompleted = await AsyncStorage.getItem(FIRST_APP_LAUNCH_KEY);
        const isFirst = firstLaunchCompleted !== 'true';
        setIsFirstAppLaunch(isFirst);
        console.log(`[TabsLayout] Is first app launch: ${isFirst}`);
        
        // If this is the first launch, mark it as completed
        if (isFirst) {
          await AsyncStorage.setItem(FIRST_APP_LAUNCH_KEY, 'true');
        }
      } catch (error) {
        console.error('[TabsLayout] Error checking first app launch:', error);
        setIsFirstAppLaunch(false); // Assume not first launch on error
      }
    };
    checkFirstAppLaunch();
  }, []);

  // Get customer info when component mounts to ensure we have latest subscription status
  useEffect(() => {
    if (signedIn) {
      getCustomerInfo();
    }
  }, [signedIn, getCustomerInfo]);

  // Zustand selectors – always call, even if the user ends up being redirected.
  const mode = useHomeStore((state) => state.mode);
  const pathInProgress = usePathStore((state) => state.pathInProgress);

  // Ref that drives tab-bar show / hide animation
  const tabBarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(tabBarAnim, {
      toValue: mode === 'DEFAULT' && !pathInProgress ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [mode, pathInProgress]);

  // Wait for both onboarding status from AsyncStorage and onboardingStore to be initialized
  if (onboardingCompleted === null || !isOnboardingStoreInitialized || isFirstAppLaunch === null) {
    console.log(`[TabsLayout] Waiting for initialization: onboardingCompleted (${onboardingCompleted}), isOnboardingStoreInitialized (${isOnboardingStoreInitialized}), isFirstAppLaunch (${isFirstAppLaunch})`);
    return null; // Show nothing while loading critical states
  }

  console.log(`[TabsLayout] States evaluated: signedIn=${signedIn}, onboardingCompleted=${onboardingCompleted}, savedScreenToNavigateTo='${savedScreenToNavigateTo}' (Store initialized: ${isOnboardingStoreInitialized}), isFirstAppLaunch=${isFirstAppLaunch}, isProMember=${isProMember}`);

  // CASE 1: User is NOT signed in
  if (!signedIn) {
    // If onboarding is NOT completed AND they have a specific saved screen (that is not '1')
    // This means they started onboarding, didn't finish, and are not signed in. Resume onboarding.
    if (!onboardingCompleted && savedScreenToNavigateTo && savedScreenToNavigateTo !== '1') {
      console.log(`[TabsLayout] Case 1A: Not signed in, onboarding in progress (screen ${savedScreenToNavigateTo}). Redirecting to /onboarding/${savedScreenToNavigateTo}`);
      return <Redirect href={`/onboarding/${savedScreenToNavigateTo}` as any} />;
    }
    // Otherwise (brand new user, or user who only saw screen '1' and didn't sign in)
    // Send them to the auth screen to decide to log in or start fresh onboarding.
    console.log(`[TabsLayout] Case 1B: Not signed in, fresh start or onboarding not meaningfully started. Redirecting to /(auth)`);
    return <Redirect href="/(auth)" />;
  }

  // CASE 2: User IS signed in
  // Check if this is their first app launch and they're not pro - redirect to pricing
  if (isFirstAppLaunch && !isProMember && onboardingCompleted) {
    console.log("[TabsLayout] Case 2A: First app launch, user is signed in but not pro. Redirecting to PricingScreen.");
    return <Redirect href="/PricingScreen?fromLoading=true&animateFromBottom=true" />;
  }
  
  // If user is signed in, they should always go to the main app regardless of onboarding completion status
  // Being signed in means they've completed the necessary authentication/setup process
  console.log("[TabsLayout] Case 2B: User is signed in. Proceeding to main app (tabs).");
  
  // Proceed to the main app (tabs)
  console.log("[TabsLayout] Rendering Tabs.");
  
  // Using absolute positioning to prevent the "chin" gap
  const animatedTabBarStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FEE4A9',
    opacity: tabBarAnim,
    // Pull tab bar completely out of view when hidden
    transform: [
      {
        translateY: tabBarAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
    // Add shadow for better visual separation
    ...Platform.select({
      ios: {
        shadowColor: '#FFE4A8',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 5,
      },
    }),
    // Ensure a minimum height for the tab bar
    height: Platform.OS === 'ios' ? 90 : 70,
  } as ViewStyle; // Cast to ViewStyle for type safety

  return (
    <Tabs
      initialRouteName='index'
      screenOptions={{
        tabBarStyle: animatedTabBarStyle,
        tabBarActiveTintColor: '#3C584A',
        tabBarInactiveTintColor: '#3C584A80',
        headerShown: false,
        tabBarLabelStyle: {
          marginTop: 2,
          fontSize: 1, // Reset font size to be visible
        },
        // Use the custom button component for all tabs
        tabBarButton: (props) => <CustomTabBarButton {...props} />,
      }}>
      <Tabs.Screen
        name="map"
        options={{
          title: 'map',
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center relative mt-4">
              {focused && (
                <View 
                  className="absolute w-16 h-16 rounded-2xl"
                  style={{
                    backgroundColor: '#FFF5D9',
                    zIndex: -1,
                  }}
                />
              )}
              <Image source={require('../../assets/icons/trophyIcon.png')} className="w-12 h-12" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: 'heart',
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center relative mt-4">
              {focused && (
                <View 
                  className="absolute w-16 h-16 rounded-2xl"
                  style={{
                    backgroundColor: '#FFF5D9',
                    zIndex: -1,
                  }}
                />
              )}
              <Image source={require('../../assets/icons/heartIcon.png')} className="w-12 h-12" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'sheep',
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center relative mt-4">
              {focused && (
                <View 
                  className="absolute w-16 h-16 rounded-2xl"
                  style={{
                    backgroundColor: '#FFF5D9',
                    zIndex: -1,
                  }}
                />
              )}
              <Image source={require('../../assets/icons/sheepIcon.png')} className="w-16 h-16" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center relative mt-4">
              {focused && (
                <View 
                  className="absolute w-16 h-16 rounded-2xl"
                  style={{
                    backgroundColor: '#FFF5D9',
                    zIndex: -1,
                  }}
                />
              )}
              <Image source={require('../../assets/icons/bibleIcon.png')} className="w-14 h-14" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center relative mt-4">
              {focused && (
                <View 
                  className="absolute w-16 h-16 rounded-2xl"
                  style={{
                    backgroundColor: '#FFF5D9',
                    zIndex: -1,
                  }}
                />
              )}
              <Image source={require('../../assets/icons/profileIcon.png')} className="w-14 h-14" />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

