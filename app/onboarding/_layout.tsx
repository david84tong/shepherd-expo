import { Alert, View, Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Stack, usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useEffect } from 'react'

import { debugOnboardingStorage, useOnboardingStore } from '../stores/onboardingStore'
import {
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_PAGES,
  ONBOARDING_STORAGE_KEY,
} from '../models/Onboarding'
import ProgressBar from './components/ProgressBar'
import { useAppInitialization } from '../hooks/initHook'

export default function OnboardingLayout() {
  const pathname = usePathname()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { currentScreen, setCurrentScreen } = useOnboardingStore()
  
  // Initialize app and create user on first open
  const { isInitialized, isLoading } = useAppInitialization()

  // Update current screen based on pathname
  useEffect(() => {
    if (pathname) {
      const screen = pathname.split('/').pop() || '1'
      setCurrentScreen(screen)
    }
  }, [pathname, setCurrentScreen])

  // Log initialization status for debugging
  useEffect(() => {
    if (isInitialized) {
      console.log('🔍 App initialization complete, user data ready')
    }
  }, [isInitialized])

  const checkStorageAndDebug = async () => {
    try {
      const data = await debugOnboardingStorage()
      const allKeys = await AsyncStorage.getAllKeys()
      console.log('🔍 DEBUG: All keys in AsyncStorage:', allKeys)
      return data
    } catch (error) {
      console.error('❌ Error checking storage:', error)
      return null
    }
  }
 
   // sign up (skip with a button)
  // [x] lamb hatch 
  // [x] lamb name
     //[x] age range
    // what should we call you
    // [x] how many minutes per day can u read
  // explainer screen
  // gems + hearts
  // notification
  // rating
    // generating ur custom plan screen. 
  // pricing
  // if pro => join the community
  const handleDebug = () => {
    Alert.alert('Debug Info', '', [
      {
        text: 'Reload Data',
        onPress: async () => {
          await checkStorageAndDebug()
        },
      },
      {
        text: 'Reset Onboarding Completion Flag',
        onPress: async () => {
          await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY)
          await checkStorageAndDebug()
        },
      },
      {
        text: 'Reset Onboarding Data & Go to Welcome',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY)
            const { clearResponses } = useOnboardingStore.getState()
            await clearResponses()
            await AsyncStorage.setItem(
              ONBOARDING_STORAGE_KEY,
              JSON.stringify({ currentScreen: 'welcome' })
            )
            router.push('/onboarding/welcome' as any)
          } catch (error) {
            console.error('❌ Error resetting onboarding data:', error)
          }
        },
      },
      { text: 'OK' },
    ])
  }

  // If still initializing, could show a loading indicator here
  if (isLoading) {
    // We could return a loading screen, but for most cases
    // this will be very brief, so we just render the layout
  }

  return (
    <View style={{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        {ONBOARDING_PAGES.map((page: string) => (
          <Stack.Screen
            key={page}
            name={page}
            options={{
              contentStyle: {
                backgroundColor: 'transparent',
                marginTop: currentScreen === '1' ? 0 : 12
              },
              ...(page === '1' && {
                gestureEnabled: false,
                headerBackVisible: false,
              }),
            }}
          />
        ))}
      </Stack>

      {/* Conditional Progress Bar */}
      {pathname &&
        !pathname.startsWith('/onboarding/1') &&
        !pathname.includes('/onboarding/auth') && (
          <View 
            className="absolute top-0 left-0 right-0 bg-surfaceCream" 
            style={{ paddingTop: insets.top }}
          >
            <ProgressBar />
            <View className="h-0" />
          </View>
        )
      }

      {/* Debug button (keep commented out) */}
      {/* <Text
        onPress={handleDebug}
        className="absolute top-2.5 right-2.5 text-textPrimary/30 text-[10px] z-[1000]"
      >
        Debug
      </Text> */}
    </View>
  )
}
