# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Shepherd Development Guidelines

## Build Commands
- `yarn start` - Start Expo development server with dev client
- `yarn ios` - Run on iOS simulator  
- `yarn android` - Run on Android
- `yarn lint` - Run ESLint and Prettier checks
- `yarn format` - Automatically fix ESLint and Prettier issues
- `yarn build:dev` - Create development build with EAS
- `yarn build:preview` - Create preview build with EAS
- `yarn build:prod` - Create production build with EAS
- `eas submit --platform ios` - Submit iOS build to App Store

## High-Level Architecture

Shepherd is a React Native app built with Expo that helps users build daily Bible reading habits through gamification. The app features:

- **Tech Stack**: React Native 0.76.9, Expo SDK 52, TypeScript, NativeWind (Tailwind), Zustand
- **Backend**: Firebase (Auth, Firestore, Functions), RevenueCat/Adapty for subscriptions
- **Key Features**: Daily devotionals, Bible reader, prayer tracking, gamified progress (XP, streaks, lamb pet)

### Core Navigation Structure
- `/app/(auth)` - Authentication screens
- `/app/(tabs)` - Main app tabs (Home, Bible, Profile)
- `/app/onboarding` - Multi-step onboarding flow
- Global sheets/modals managed in `_layout.tsx`

### State Management with Zustand

The app uses 20+ Zustand stores for different domains:

**Primary Stores:**
- `userStore` - User data, progress, lamb stats, syncs with Firestore
- `devotionalStore` - Daily devotional content, AI devotionals, Bible caching
- `homeStore` - Home screen UI state, completion tracking
- `subscriptionStore` - Premium features via Adapty
- `pathStore` - Bible reading plans and progress

**Store Patterns:**
```typescript
// Persistence with AsyncStorage
persist((set, get) => ({ ... }), {
  name: 'store-name',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ ... }) // Only persist needed fields
})

// Firebase sync pattern
set({ field: value });
if (isAuthenticated()) {
  updateFirebaseField('field', value);
}
```

### Key Implementation Details

**Offline-First Architecture:**
- All data cached locally with AsyncStorage
- Firebase sync when online
- Bible chapters cached for offline reading

**Daily Reset Logic:**
- XP resets at midnight (300 daily limit)
- Completion states reset for new day
- Streak tracking with timezone-aware date comparisons

**Widget Integration:**
- iOS widgets share data via app groups
- Fallback to AsyncStorage if native modules unavailable

## Code Style Guidelines
- **Package Manager**: Use yarn exclusively for all dependencies
- **Styling**: Use NativeWind (Tailwind for React Native) - avoid StyleSheet.create()
- **Imports**: Group imports by external/internal, alphabetize within groups
- **Components**: Follow React Native best practices with proper typing
- **Error Handling**: Use try/catch blocks with explicit error logging
- **State Management**: Use Zustand stores for app state
- **Offline-First**: Cache data in AsyncStorage, sync with Firestore when online
- **TypeScript**: Use proper typing for all components and functions
- **Naming**: PascalCase for components, camelCase for functions/variables
- **File Structure**: Follow existing patterns in /app directory

## Rive Animations
Control lamb animations via state machine:
```typescript
riveRef.current.setInputState('State Machine 1', 'Action-Number', stateNumber);
```
States: 0=Idle, 1=Raising Hand, 2=Eating, 3=Full, 4=Sleepy, 5=Angry, 6=Dying Chubby, 7=Dying Skinny, 8=Dead, 9=Reading, 10=Writing, 11=Drinking, 12=Achievement



## Firebase Integration
- Use react-native-firebase packages, not web SDK
- Single source of truth: User stats in root users/{uid} doc
- Activity history in activityDays/{YYYYMMDD} subcollection
- Firestore rules enforce data validation

## UI/UX Design System
- Follow design tokens in tailwind.config.js
- Typography: Feather Bold (Nunito-Black) for headers, DIN for body text
- Colors: Main brand colors are #FFF4D9 (background), #FBCA71 (gold), #FDEBB8 (cream)
- Spacing: 8pt system
- Shadows: Custom button shadows defined in Tailwind config

## Testing & Development
- Test on real devices when possible (expo run:ios --device)
- Use development builds for testing native features
- Check streak/XP reset logic across timezones
- Test offline functionality thoroughly

## Common Development Tasks
- **Add new devotional path**: Update Path.ts model, add to pathStore
- **Modify lamb animations**: Update Rive state machine numbers
- **Add new subscription feature**: Update subscriptionStore and gate features
- **Debug Firebase sync**: Check userStore sync methods and error logs
- **Add new daily activity**: Update homeStore completion tracking

## Important Files & Locations
- `/app/_layout.tsx` - Root layout with global sheets and navigation
- `/app/stores/` - All Zustand stores
- `/app/hooks/initHook.ts` - App initialization logic
- `/app/models/` - TypeScript models (User, Devotional, Path, etc.)
- `/components/` - Reusable components
- `/assets/riveAnimations/` - Rive animation files