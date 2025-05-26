import * as Haptics from 'expo-haptics';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSignedIn } from '../hooks/authHook';
import { useHomeStore } from '../stores/homeStore';
import { usePathStore } from '../stores/pathStore';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';
import { useOnboardingStore } from '../stores/onboardingStore';

// Helper component to center the icon
const CenteredIcon = ({ children }: { children: React.ReactNode }) => (
  // Use className for centering and ensure it doesn't expand unnecessarily
  <View className="flex items-center justify-center">{children}</View>
);

// Custom Tab Bar Button component with animation
function CustomTabBarButton(props: any) {
  const { children, onPress, accessibilityState, style, ...rest } = props;
  const focused = accessibilityState?.selected;
  // Animated value for focus state (0 or 1)
  const focusAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  // Animate the value when focus changes
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 200, // Animation duration (milliseconds)
      useNativeDriver: true, // Use native driver for performance (opacity)
    }).start();
  }, [focused, focusAnim]);

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
      // Pass through the extra props & original style so RN can keep the layout logic intact
      {...rest}
      style={style}
      onPress={handlePress}
      // Apply base flex styling and only horizontal margin
      className="flex-1 items-center justify-center mx-1">
      {/* Container for content and animated background */}
      <View className="items-center justify-center p-4 mt-4">
        {/* Animated background View */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject, // Position behind content
            {
              backgroundColor: '#FFE4A8', // bg-black/5 equivalent
              borderRadius: 8, // rounded-lg equivalent
              opacity: focusAnim, // Apply animated opacity
            },
          ]}
        />
        {/* Actual tab content (icon/label) */}
        {children}
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  // Hooks must be invoked in the same order on every render.
  // Move them all before any conditional early-returns.
  const signedIn = isSignedIn();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  // Get isInitialized from the store to ensure savedScreenToNavigateTo is ready
  const { savedScreenToNavigateTo, isInitialized: isOnboardingStoreInitialized } = useOnboardingStore();

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
  if (onboardingCompleted === null || !isOnboardingStoreInitialized) {
    console.log(`[TabsLayout] Waiting for initialization: onboardingCompleted (${onboardingCompleted}), isOnboardingStoreInitialized (${isOnboardingStoreInitialized})`);
    return null; // Show nothing while loading critical states
  }

  console.log(`[TabsLayout] States evaluated: signedIn=${signedIn}, onboardingCompleted=${onboardingCompleted}, savedScreenToNavigateTo='${savedScreenToNavigateTo}' (Store initialized: ${isOnboardingStoreInitialized})`);

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
  // If user is signed in, they should always go to the main app regardless of onboarding completion status
  // Being signed in means they've completed the necessary authentication/setup process
  console.log("[TabsLayout] Case 2: User is signed in. Proceeding to main app (tabs).");
  
  // Proceed to the main app (tabs)
  console.log("[TabsLayout] Rendering Tabs.");
  
  // Using absolute positioning to prevent the "chin" gap
  const animatedTabBarStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF4D9',
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
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/trophyIcon.png')} className="w-12 h-12" />
            </CenteredIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: 'heart',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/heartIcon.png')} className="w-12 h-12" />
            </CenteredIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'sheep',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/sheepIcon.png')} className="w-16 h-16" />
            </CenteredIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/bibleIcon.png')} className="w-14 h-14" />
            </CenteredIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/profileIcon.png')} className="w-14 h-14" />
            </CenteredIcon>
          ),
        }}
      />
    </Tabs>
  );
}

