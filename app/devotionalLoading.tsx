import LoadingScreen from './onboarding/LoadingScreen';

// This is a standalone route for the devotional loading screen
// It bypasses the onboarding flow to prevent redirects
export default function DevotionalLoadingScreen() {
  return <LoadingScreen isOnboarding={false} />;
}