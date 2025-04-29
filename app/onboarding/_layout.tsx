import { Alert, View, Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Stack, usePathname, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { debugOnboardingStorage, useOnboardingStore } from '../stores/onboardingStore'
import {
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_PAGES,
  ONBOARDING_STORAGE_KEY,
} from '../models/Onboarding'
import ProgressBar from './components/ProgressBar'

export default function OnboardingLayout() {
  const pathname = usePathname()
  const router = useRouter()
  const insets = useSafeAreaInsets()

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
    // age range
    // what should we call you
    // 
    // how many minutes per day can u read
    // explainer screen
   // sign up (skip with a button)
  // lamb hatch
  // lamb name
  // gems + hearts
  // notification
  // rating
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

  return (
    <View className="flex-1">
      <View
        className="flex-1"
        style={{
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        {pathname &&
        (pathname === '/onboarding/1' ||
         /\/onboarding\/(1[7-9]|2[0-9]|3[0-1])/.test(pathname) ||
          pathname.includes('/onboarding/auth')) ? null : (
          <View className="absolute top-0 left-0 right-0 z-10" style={{ marginTop: insets.top }}>
            <ProgressBar />
          </View>
        )}

        {/* Debug button - uncomment for debugging */}
        {/* <Text
          onPress={handleDebug}
          className="absolute top-2.5 right-2.5 text-textPrimary/30 text-[10px] z-[1000]"
        >
          Debug
        </Text> */}

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
                },
                ...(page === '1' && {
                  gestureEnabled: false,
                  headerBackVisible: false,
                }),
              }}
            />
          ))}
        </Stack>
      </View>
    </View>
  )
}
