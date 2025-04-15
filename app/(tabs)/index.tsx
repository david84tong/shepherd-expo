import { Redirect } from 'expo-router';

// This component redirects the user from the base route of the tabs
// navigator (e.g., /) to the desired default tab (e.g., /home).
export default function TabLayoutIndex() {
  return <Redirect href="/(tabs)/home" />;
} 