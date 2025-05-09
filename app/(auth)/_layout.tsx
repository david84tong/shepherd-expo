import { Stack, Redirect } from 'expo-router';
import { isSignedIn } from '../hooks/authHook';

export default function AuthLayout() {
  const signedIn = isSignedIn();

  if (signedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
} 