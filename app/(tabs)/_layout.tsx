import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, Text, View, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';


import { isSignedIn } from '../hooks/authHook';
import { useHomeStore } from '../stores/homeStore';
import { usePathStore } from '../stores/pathStore';
import { useUIStore } from '../stores/uiStore';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';
import { useOnboardingStore } from '../stores/onboardingStore';
import useSubscriptionStore from '../stores/subscriptionStore';
import { useCheckInStore } from '../stores/checkInStore';
import { RPH, RPW } from '../helper/helper';
import i18n from '../utils/i18n';
import { AppFonts } from '../constants/appFonts';
import { hapticMedium } from '~/utils/haptics';

// Key for tracking first app launch
const FIRST_APP_LAUNCH_KEY = 'first_app_launch_completed';
// Key for tracking daily first load
const DAILY_FIRST_LOAD_KEY = 'daily_first_load_';

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
    hapticMedium();

    // Call the original onPress handler
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      // Apply base flex styling, horizontal margin, and horizontal padding for spacing
      className="flex-1  items-center justify-center">
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
  const [isDailyFirstLoad, setIsDailyFirstLoad] = useState<boolean | null>(null);
  // Get isInitialized from the store to ensure savedScreenToNavigateTo is ready
  const { savedScreenToNavigateTo, isInitialized: isOnboardingStoreInitialized } = useOnboardingStore();

  // Get subscription status
  const { isProMember, getCustomerInfo, presentFreeTrialPaywall } = useSubscriptionStore();

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

  // Check if this is the first load of the day
  useEffect(() => {
    const checkDailyFirstLoad = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
        const dailyKey = DAILY_FIRST_LOAD_KEY + today;
        const dailyFirstLoadCompleted = await AsyncStorage.getItem(dailyKey);
        const isDailyFirst = dailyFirstLoadCompleted !== 'true';
        setIsDailyFirstLoad(isDailyFirst);
        console.log(`[TabsLayout] Is daily first load for ${today}: ${isDailyFirst}`);

        // Note: We don't mark it as completed here anymore
        // The PricingScreen will mark it as completed when it loads
      } catch (error) {
        console.error('[TabsLayout] Error checking daily first load:', error);
        setIsDailyFirstLoad(false); // Assume not daily first load on error
      }
    };
    checkDailyFirstLoad();
  }, []);

  // Get customer info when component mounts to ensure we have latest subscription status
  useEffect(() => {
    if (signedIn) {
      getCustomerInfo();
    }
  }, [signedIn, getCustomerInfo]);

  // Handle free trial paywall presentation
  useEffect(() => {
    if (signedIn && onboardingCompleted && !isProMember && (isFirstAppLaunch || isDailyFirstLoad)) {
      // Check if user has completed today's check-in
      const hasCompletedTodaysCheckIn = useCheckInStore.getState().hasCompletedTodaysCheckIn();
      
      if (hasCompletedTodaysCheckIn) {
        const reason = isFirstAppLaunch ? "First app launch" : "Daily first load";
        console.log(`[TabsLayout] ${reason}, user is signed in but not pro. Showing free trial paywall.`);
        presentFreeTrialPaywall();
      } else {
        console.log(`[TabsLayout] User has not completed today's check-in. Skipping free trial paywall.`);
      }
    }
  }, [signedIn, onboardingCompleted, isProMember, isFirstAppLaunch, isDailyFirstLoad, presentFreeTrialPaywall]);

  // Zustand selectors – always call, even if the user ends up being redirected.}
  const mode = useHomeStore((state) => state.mode);
  const devotionalReaderVisible = useUIStore((state) => state.devotionalReaderVisible);
  const prayerViewVisible = useHomeStore((state) => state.prayerViewVisible);
  const journalViewVisible = useHomeStore((state) => state.journalViewVisible);
  const pathInProgress = usePathStore((state) => state.pathInProgress);
  const isTabBarVisible = !devotionalReaderVisible && !prayerViewVisible && !journalViewVisible;

  // Ref that drives tab-bar show / hide animation
  const tabBarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const shouldShowTabBar = mode === 'DEFAULT' && !pathInProgress && !devotionalReaderVisible && !prayerViewVisible && !journalViewVisible;

    Animated.timing(tabBarAnim, {
      toValue: shouldShowTabBar ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [mode, pathInProgress, devotionalReaderVisible, prayerViewVisible, journalViewVisible]);

  // Wait for both onboarding status from AsyncStorage and onboardingStore to be initialized
  if (onboardingCompleted === null || !isOnboardingStoreInitialized || isFirstAppLaunch === null || isDailyFirstLoad === null) {
    console.log(`[TabsLayout] Waiting for initialization: onboardingCompleted (${onboardingCompleted}), isOnboardingStoreInitialized (${isOnboardingStoreInitialized}), isFirstAppLaunch (${isFirstAppLaunch}), isDailyFirstLoad (${isDailyFirstLoad})`);
    return null; // Show nothing while loading critical states
  }

  console.log(`[TabsLayout] States evaluated: signedIn=${signedIn}, onboardingCompleted=${onboardingCompleted}, savedScreenToNavigateTo='${savedScreenToNavigateTo}' (Store initialized: ${isOnboardingStoreInitialized}), isFirstAppLaunch=${isFirstAppLaunch}, isDailyFirstLoad=${isDailyFirstLoad}, isProMember=${isProMember}`);

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
  // Free trial paywall is now handled in useEffect above

  // If user is signed in, they should always go to the main app regardless of onboarding completion status
  // Being signed in means they've completed the necessary authentication/setup process
  console.log("[TabsLayout] Case 2B: User is signed in. Proceeding to main app (tabs).");

  // Proceed to the main app (tabs)
  console.log("[TabsLayout] Rendering Tabs.");

  // Using absolute positioning to prevent the "chin" gap
  const animatedTabBarStyle = {
    display: isTabBarVisible ? 'flex' : 'none',
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FDEBB8',
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
        shadowOffset: { width: 0, height: -0.9 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 5,
      },
    }),
    // Ensure a minimum height for the tab bar
    height: Platform.OS === 'ios' ? RPH(9.5) : 70,
    paddingHorizontal: 32,
    gap: 16,
  } as ViewStyle; // Cast to ViewStyle for type safety

  // Function to determine if tab bar should be visible for a given route
  const isRouteAllowed = (routeName: string) => {
    // Implement the logic to determine if a route is allowed to show the tab bar
    // This is a placeholder and should be replaced with the actual implementation
    return true; // Placeholder return, actual implementation needed
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: animatedTabBarStyle,
        tabBarLabelStyle: {
          marginTop: 2,
          fontSize: 1, // Reset font size to be visible
        },
        tabBarScrollEnabled: false, // Disable scrolling to prevent arrows
        tabBarShowLabel: false, // Hide labels since we're using custom icons with text
        // Use the custom button component for all tabs
        tabBarButton: (props: BottomTabBarButtonProps) => <CustomTabBarButton {...props} />,
      })}>



      <Tabs.Screen
        name="index"
        options={{
          title: 'sheep',
          tabBarButton: (props: BottomTabBarButtonProps) => <CustomTabBarButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: RPW(14) }} className="items-center justify-center  mt-6">
              <Image tintColor={focused ? "orange" : ""} source={require('../../assets/icons/today.png')} style={{ width: RPH(2.5), height: RPH(2.5) }} />
              <Text className={`mt-1 text-[12px] font-normal ${focused ? 'text-orange' : 'text-brown/70'}`} style={{ fontFamily: 'din' }}>{i18n.t('bottom_home_title')}</Text>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarButton: (props: BottomTabBarButtonProps) => <CustomTabBarButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: RPW(14) }} className="items-center justify-center  mt-6">
              <Image tintColor={focused ? "orange" : ""} source={require('../../assets/icons/bible.png')} style={{ width: RPH(2.5), height: RPH(2.5) }} />
              <Text className={`mt-1 text-[12px] font-normal ${focused ? 'text-orange' : 'text-brown/70'}`} style={{ fontFamily: 'din' }}>{i18n.t('bottom_bible_title')}</Text>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarButton: (props: BottomTabBarButtonProps) => <CustomTabBarButton {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: RPW(14) }} className="items-center justify-center  mt-6">
              <Image resizeMode='contain' tintColor={focused ? "orange" : ""} source={require('../../assets/icons/profile.png')} style={{ width: RPH(2.5), height: RPH(2.5) }} />
              <Text className={`mt-1 font-normal ${focused ? 'text-orange' : 'text-brown/70'}`} style={{ fontFamily: 'din', fontSize: AppFonts[11] }}>{i18n.t('bottom_profile_title')}</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

