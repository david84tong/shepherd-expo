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

## Code Style Guidelines
- **Package Manager**: Use yarn exclusively for all dependencies
- **Styling**: Use NativeWind (Tailwind for React Native) - avoid StyleSheet.create()
- **Imports**: Group imports by external/internal, alphabetize within groups
- **Components**: Follow React Native best practices with proper typing
- **Error Handling**: Use try/catch blocks with explicit error logging
- **State Management**: Use Zustand stores for app state
- **Offline-First**: Cache data in AsyncStorage, sync with Firestore when online
- **Typescript**: Use proper typing for all components and functions
- **Naming**: PascalCase for components, camelCase for functions/variables
- **File Structure**: Follow project structure in cursor_project_rules.mdc

## Firebase
- Use react-native-firebase packages, not web implementations
- Single source of truth: User stats in root users/{uid} doc
- Activity history in activityDays/{YYYYMMDD}

## UI/UX
- Follow design tokens in tailwind.config.js
- Use Feather Bold for headers, DIN for everything else
- 8pt spacing system