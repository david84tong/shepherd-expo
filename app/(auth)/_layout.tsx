import { Stack, Redirect } from 'expo-router';
import { isSignedIn } from '../hooks/authHook';

export default function AuthLayout() {
  const signedIn = isSignedIn();

  if (signedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
} 