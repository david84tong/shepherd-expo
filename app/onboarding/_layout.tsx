import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ONBOARDING_COMPLETED_KEY, ONBOARDING_STORAGE_KEY } from '../models/Onboarding';
import ProgressBar from './components/ProgressBar';
import { useAppInitialization } from '../hooks/initHook';
import { debugOnboardingStorage, useOnboardingStore } from '../stores/onboardingStore';

// Define the actual screens we have implemented - MOVED HERE
const IMPLEMENTED_SCREENS = [
  '1',
  '2',
  'username',
  '3',
  '4',
  '5',
  '6',
  '7',
  'explainerHearts',
  'explainer',
  '9',
  '10', // Ensure 10 is included
  'rating',
  '11',
  'auth',
  'lambFound',
  'pathAffinity',
];

export default function OnboardingLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentScreen,
    setCurrentScreen,
    isInitialized,
    needsNavigationToSavedScreen,
    savedScreenToNavigateTo,
    clearSavedScreenNavigation,
  } = useOnboardingStore();
  const [previousScreen, setPreviousScreen] = useState('');
  const progressOpacity = useSharedValue(1);

  // Initialize app and create user on first open
  const { isInitialized: appIsInitialized } = useAppInitialization();

  // IMPORTANT: All hooks must be declared before any conditional returns
  // Animated style for progress bar
  const progressStyle = useAnimatedStyle(() => ({
    opacity: progressOpacity.value,
  }));

  // --- DEBUG LOGGING START ---
  const shouldShowProgressBar =
    pathname &&
    pathname !== '/onboarding/1' &&
    pathname !== '/onboarding/11' &&
    !pathname.includes('Loading') &&
    !pathname.includes('/onboarding/auth');

  console.log(
    `[OnboardingLayout] Path: ${pathname}, Should show progress bar: ${shouldShowProgressBar}`
  );
  // --- DEBUG LOGGING END ---

  // Update current screen based on pathname with smoother transitions
  useEffect(() => {
    // Only update screen from pathname if store is initialized
    // This prevents overriding the saved screen during app startup
    if (pathname && isInitialized) {
      const screen = pathname.split('/').pop() || '1';

      console.log(
        `[OnboardingLayout] Pathname changed to: ${pathname}, extracted screen: ${screen}, current screen: ${currentScreen}`
      );

      // Only update if the screen is actually different from what's saved
      // This prevents unnecessary updates during navigation
      if (screen !== currentScreen) {
        console.log(
          `[OnboardingLayout] Screen changed from ${currentScreen} to ${screen}, saving...`
        );

        // Save previous screen for transition handling
        if (currentScreen && currentScreen !== screen) {
          setPreviousScreen(currentScreen);
        }

        // Animate progress bar opacity during transition
        if (screen !== '1' && currentScreen !== screen) {
          // Briefly fade out progress bar during transition
          progressOpacity.value = withTiming(0.4, { duration: 150 }, () => {
            // Then fade it back in with the new value
            progressOpacity.value = withTiming(1, { duration: 250 });
          });
        }

        // Await the screen saving to ensure it completes
        (async () => {
          try {
            await setCurrentScreen(screen);
            console.log(`[OnboardingLayout] ✅ Successfully saved screen: ${screen}`);
          } catch (error) {
            console.error(`[OnboardingLayout] ❌ Failed to save screen: ${screen}`, error);
          }
        })();
      }
    }
  }, [pathname, setCurrentScreen, progressOpacity, isInitialized, currentScreen]);

  // Log initialization status for debugging
  useEffect(() => {
    if (appIsInitialized) {
      console.log('🔍 App initialization complete, user data ready');
    }
  }, [appIsInitialized]);

  // Handle navigation to saved screen after mounting (backup - tabs layout should handle this)
  useEffect(() => {
    console.log(
      `[OnboardingLayout] Navigation effect triggered - isInitialized: ${isInitialized}, needsNavigation: ${needsNavigationToSavedScreen}, savedScreen: ${savedScreenToNavigateTo}`
    );

    // This is now mainly a backup since tabs layout should handle the redirect
    if (isInitialized && needsNavigationToSavedScreen && savedScreenToNavigateTo) {
      console.log(`🚀 Backup navigation to saved screen: ${savedScreenToNavigateTo}`);

      // Shorter delay since this is backup navigation
      const timeoutId = setTimeout(() => {
        try {
          console.log(
            `[OnboardingLayout] 🔄 Backup navigation executing: /onboarding/${savedScreenToNavigateTo}`
          );
          router.replace(`/onboarding/${savedScreenToNavigateTo}` as any);
          clearSavedScreenNavigation();
          console.log(`[OnboardingLayout] ✅ Backup navigation completed`);
        } catch (error) {
          console.error('[OnboardingLayout] ❌ Error in backup navigation:', error);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      console.log(
        `[OnboardingLayout] ⏸️ Backup navigation skipped - tabs layout should handle this`
      );
    }
  }, [
    isInitialized,
    needsNavigationToSavedScreen,
    savedScreenToNavigateTo,
    router,
    clearSavedScreenNavigation,
  ]);

  const checkStorageAndDebug = async () => {
    try {
      const data = await debugOnboardingStorage();
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🔍 DEBUG: All keys in AsyncStorage:', allKeys);
      return data;
    } catch (error) {
      console.log('❌ Error checking storage:', error);
      return null;
    }
  };

  const handleDebug = () => {
    Alert.alert('Debug Info', '', [
      {
        text: 'Reload Data',
        onPress: async () => {
          await checkStorageAndDebug();
        },
      },
      {
        text: 'Reset Onboarding Completion Flag',
        onPress: async () => {
          await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
          await checkStorageAndDebug();
        },
      },
      {
        text: 'Reset Onboarding Data & Go to Welcome',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
            const { clearResponses } = useOnboardingStore.getState();
            await clearResponses();
            await AsyncStorage.setItem(
              ONBOARDING_STORAGE_KEY,
              JSON.stringify({ currentScreen: '1' })
            );
            router.push('/onboarding/1' as any);
          } catch (error) {
            console.log('❌ Error resetting onboarding data:', error);
          }
        },
      },
      { text: 'OK' },
    ]);
  };

  // If still initializing, could show a loading indicator here
  if (!appIsInitialized) {
    // Return a minimal loading component instead of continuing to render
    return <View style={{ flex: 1, backgroundColor: '#FDEBB8' }} />;
  }

  return (
    <View
      style={{
        flex: 1,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        backgroundColor: '#FDEBB8',
      }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
          contentStyle: {
            backgroundColor: '#FDEBB8',
          },
          animationTypeForReplace: 'push',
          gestureEnabled: false,
        }}>
        {IMPLEMENTED_SCREENS.map((screen) => (
          <Stack.Screen
            key={screen}
            name={screen}
            options={{
              contentStyle: {
                backgroundColor: '#FDEBB8',
                marginTop: screen === '1' ? 0 : insets.top > 20 ? 48 : 0,
              },
              ...(screen === '1' && {
                gestureEnabled: false,
                headerBackVisible: false,
              }),
            }}
          />
        ))}
      </Stack>

      {/* Animated Progress Bar */}
      {pathname &&
        !(pathname == '/onboarding/1') &&
        !(pathname == '/onboarding/11') &&
        !pathname.includes('/onboarding/LoadingScreen') &&
        !pathname.includes('/onboarding/auth') && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: '#FDEBB8',
                paddingTop: insets.top,
                zIndex: 100,
              },
              progressStyle,
            ]}>
            <ProgressBar />
            <View className="h-0" />
          </Animated.View>
        )}

      {/* Debug button (keep commented out) */}
      {__DEV__ && (
        <Text
          onPress={handleDebug}
          className="absolute top-2.5 right-2.5 text-textPrimary/30 text-[10px] z-[1000]">
          Debug
        </Text>
      )}
    </View>
  );
}
