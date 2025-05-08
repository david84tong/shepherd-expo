import { Stack, Redirect } from 'expo-router';
import { isSignedIn } from '../hooks/authHook';

export default function AuthLayout() {
  const signedIn = isSignedIn();

  // Se já está logado, redireciona para o grupo protegido
  if (signedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
} 