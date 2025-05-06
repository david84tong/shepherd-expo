# Analytics Implementation Guide

This document provides guidelines for implementing analytics throughout the Shepherd app.

## Analytics Architecture

The app uses a custom analytics wrapper that sends events to Firebase Firestore. The analytics system consists of:

1. **Core Analytics Class** (`utils/analytics.ts`) - The foundation that handles analytics initialization and event logging
2. **React Hook** (`app/hooks/useAnalytics.ts`) - Makes analytics easy to use in React components
3. **Onboarding Helpers** (`app/onboarding/components/analytics-helper.ts`) - Special utilities for consistent onboarding analytics

## Event Naming Convention

We follow a consistent naming pattern for events:

- **Screen Views**: `[ScreenName]Screen` (e.g., `HomeScreen`, `BibleReaderScreen`)
- **Button Presses**: `[buttonId]` should be descriptive (e.g., `startReading`, `completeReflection`)
- **Spiritual Activities**: Use predefined event types from `AnalyticsEvent` enum

## Required Analytics Events

### For All Screens

1. **Screen View** - Log when the component mounts:
   ```tsx
   const { logScreenView } = useAnalytics();
   
   useEffect(() => {
     logScreenView('MyScreen', { customParam: 'value' });
   }, [logScreenView]);
   ```

2. **Button Presses** - Log all significant user interactions:
   ```tsx
   const { logButtonPress } = useAnalytics();
   
   const handleButtonPress = () => {
     logButtonPress('buttonId', 'MyScreen', { additionalData: 'value' });
     // rest of handler code
   };
   ```

### For Onboarding Screens

Onboarding screens should use the specialized helpers:

```tsx
import { useOnboardingScreenTracking, logOnboardingButtonPress } from './components/analytics-helper';

export default function OnboardingScreen() {
  const analytics = useAnalytics();
  
  // Automatically logs screen view on mount
  useOnboardingScreenTracking(screenNumber);
  
  const handleButtonPress = () => {
    logOnboardingButtonPress(
      analytics,
      'buttonId',
      screenNumber,
      'Action Name',
      { customData: 'value' }
    );
    
    // rest of handler code
  };
}
```

### For Spiritual Disciplines

When tracking Bible reading, prayer, or reflection activities:

```tsx
const { logSpiritualActivity, AnalyticsEvent } = useAnalytics();

// When starting activity
logSpiritualActivity(AnalyticsEvent.BIBLE_READING_STARTED, { 
  bookName: 'Genesis',
  chapter: 1
});

// When completing activity
logSpiritualActivity(AnalyticsEvent.BIBLE_READING_COMPLETED, {
  bookName: 'Genesis',
  chapter: 1,
  timeSpent: 120, // in seconds
  versesRead: 31
});
```

### For Errors

Log significant errors to help troubleshoot issues:

```tsx
const { logError } = useAnalytics();

try {
  // risky code
} catch (error: any) {
  logError(
    'Failed to perform action',
    'ERROR_CODE',
    { errorDetails: error.message }
  );
}
```

## Standard Parameters

Include these parameters when relevant:

- **Screen view events**:
  - `screenName`: String name of the screen
  - `currentPath`: Current Bible path the user is on (provided automatically by the hook)

- **Button press events**:
  - `buttonId`: ID of the button pressed
  - `screenName`: Screen where the button is located
  - `action`: Description of the action (e.g., 'Continue', 'Skip', 'Select')

- **Spiritual activity events**:
  - `bookName`: Bible book name (for reading)
  - `chapter`: Chapter number (for reading)
  - `category`: Prayer or reflection category
  - `timeSpent`: Duration in seconds

## Implementation Examples

See these files for implementation examples:

- `app/onboarding/2.tsx` - Simple screen with standard button
- `app/onboarding/1.tsx` - Complex screen with multiple interaction points
- `app/onboarding/8.tsx` - Screen with selection options
- `utils/analytics-usage-example.tsx` - Comprehensive example component

## Adding Analytics to New Features

1. Import the analytics hook:
   ```tsx
   import { useAnalytics } from '../hooks/useAnalytics';
   ```

2. Initialize it in your component:
   ```tsx
   const { logScreenView, logButtonPress, logSpiritualActivity, AnalyticsEvent } = useAnalytics();
   ```

3. Log the screen view on mount:
   ```tsx
   useEffect(() => {
     logScreenView('FeatureScreen', { featureSpecificParam: 'value' });
   }, [logScreenView]);
   ```

4. Log button presses in handlers:
   ```tsx
   const handleAction = () => {
     logButtonPress('actionButton', 'FeatureScreen', { actionDetail: 'value' });
     // rest of handler code
   };
   ```

5. For complex interactions, use the generic logEvent:
   ```tsx
   const { logEvent, EventCategory } = useAnalytics();
   
   logEvent('custom_event_name', EventCategory.USER_ACTION, { 
     detail1: 'value1',
     detail2: 'value2'
   });
   ```

## Debugging Analytics

When developing, all analytics events are logged to the console in development mode.
You can see these logs in the Expo/React Native console with prefix `📊 ANALYTICS`.

## Firestore Data Structure

Analytics events are stored in Firestore in the 'analytics' collection, with each document containing:
- Event name and category
- Timestamp
- User ID (anonymous if not logged in)
- Device and platform information
- Custom parameters for the specific event 