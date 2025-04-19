import '../global.css';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Feather Bold': require('../assets/fonts/Feather Bold.ttf'),
    'DIN Next Rounded LT W01 Regular': require('../assets/fonts/DIN Next Rounded LT W01 Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false, 
          // Explicitly set the desired animation for entering the tabs group
          animation: 'slide_from_right', 
        }} 
      />
      <Stack.Screen 
        name="bibleReader" 
        options={{
          // Override animation to ensure slide transition
          animation: "slide_from_right",
          // Custom animation duration for smoother feel
          animationDuration: 350, // ms
          // Hide header for full-screen experience
          headerShown: false 
        }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
