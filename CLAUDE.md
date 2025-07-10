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


## Rive Animations
 riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
| Number | State Name   |
| -----: | ------------ |
|     12 | Achievement  |
|     11 | Drinking     |
|     10 | Writing      |
|      9 | Reading      |
|      8 | Dead         |
|      7 | Dying Skinny |
|      6 | Dying Chubby |
|      5 | Angry        |
|      4 | Sleepy       |
|      3 | Full         |
|      2 | Eating       |
|      1 | Raising Hand |
|      0 | Idle         |

For skins 
riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);
| Number | Skin Name   |
| -----: | ----------- |
|      0 | Normal Skin |
|     99 | Gold Skin   |
|      1 | Pink Skin   |
|      2 | Noah Skin   |
|      3 | Cloak Skin  |
|      4 | Banana Skin |
|      5 | 10 Skin     |
|      6 | Apple Skin  |
|      7 | Lion Skin   |
|      8 | Whale Skin  |
|      9 | Armor Skin  |

if user is baby Level-Number to 1  
riveRef.current.setInputState('State Machine 1', 'Level-Number', 1);
if level is >= 33 set Wings ON/OFF  to true
riveRef.current.setInputState('State Machine 1', 'Wings ON/OFF', 1);


## Firebase
- Use react-native-firebase packages, not web implementations
- Single source of truth: User stats in root users/{uid} doc
- Activity history in activityDays/{YYYYMMDD}

## UI/UX
- Follow design tokens in tailwind.config.js
- Use Feather Bold for headers, DIN for everything else
- 8pt spacing system



# On First Load
- show splash animation in _layout.tsx
- onAppForegroundOrInit called on first initialize or from foreground in initHook in _layout.tsx
- useDevotionalStore.getState().fetchTodaysDevotional in index.tsx/tabs

# Project Structure
── CLAUDE.md
├── Devotionals.md
├── GoogleService-Info.plist
├── README.md
├── Xcodeproj
│   ├── CHANGELOG.md
│   ├── Dangerfile
│   ├── Gemfile
│   ├── Gemfile.lock
│   ├── LICENSE
│   ├── README.md
│   ├── Rakefile
│   ├── bin
│   │   └── xcodeproj
│   ├── lib
│   │   ├── xcodeproj
│   │   └── xcodeproj.rb
│   ├── spec
│   │   ├── command
│   │   ├── config
│   │   ├── config_spec.rb
│   │   ├── constants_spec.rb
│   │   ├── differ_spec.rb
│   │   ├── fixtures
│   │   ├── helper_spec.rb
│   │   ├── plist_helper_spec.rb
│   │   ├── project
│   │   ├── project_spec.rb
│   │   ├── scheme
│   │   ├── scheme_spec.rb
│   │   ├── spec_helper
│   │   ├── spec_helper.rb
│   │   ├── workspace
│   │   ├── workspace_spec.rb
│   │   └── xcodebuild_helper_spec.rb
│   └── xcodeproj.gemspec
├── android
│   ├── app
│   │   ├── build.gradle
│   │   ├── debug.keystore
│   │   ├── google-services.json
│   │   ├── my-upload-key.keystore
│   │   ├── proguard-rules.pro
│   │   └── src
│   ├── build
│   │   └── generated
│   ├── build.gradle
│   ├── gradle
│   │   └── wrapper
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   └── settings.gradle
├── app
│   ├── (auth)
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── (tabs)
│   │   ├── _layout.tsx
│   │   ├── bible.tsx
│   │   ├── index.tsx
│   │   └── profile.tsx
│   ├── PricingScreen.tsx
│   ├── [...catchall].tsx
│   ├── _layout.tsx
│   ├── api
│   │   ├── ai.ts
│   │   └── bible.ts
│   ├── archive
│   ├── basicTestModal.tsx
│   ├── bibleCacheTest.tsx
│   ├── biblePreview.tsx
│   ├── bibleReader.tsx
│   ├── components
│   │   ├── BibleCacheTest.tsx
│   │   ├── BottomControls.tsx
│   │   ├── CustomAnimatedView.tsx
│   │   ├── FirebaseDebugScreen.tsx
│   │   ├── Shared
│   │   ├── map.tsx
│   │   └── stats.tsx
│   ├── constants
│   │   ├── appFonts.ts
│   │   └── theme.ts
│   ├── halfModal.tsx
│   ├── helper
│   │   ├── disableFontScaling.ts
│   │   ├── firebaseHelper.ts
│   │   └── helper.ts
│   ├── hooks
│   │   ├── authHook.ts
│   │   ├── initHook.ts
│   │   ├── streakHook.ts
│   │   ├── useAnalytics.ts
│   │   ├── useForceUpdateCheck.ts
│   │   ├── useHomeScreen.ts
│   │   ├── useLanguageDetection.ts
│   │   ├── useLocalAssets.ts
│   │   ├── useOnboarding.ts
│   │   ├── useRemoteConfig.ts
│   │   └── useRiveAnimation.ts
│   ├── login.tsx
│   ├── modal.tsx
│   ├── models
│   │   ├── Devotional.ts
│   │   ├── Onboarding.ts
│   │   ├── Path.ts
│   │   └── User.ts
│   ├── newBibleReader.tsx
│   ├── onboarding
│   │   ├── 0.tsx
│   │   ├── 1.tsx
│   │   ├── 10.tsx
│   │   ├── 11.tsx
│   │   ├── 2.tsx
│   │   ├── 3.tsx
│   │   ├── 4.tsx
│   │   ├── 5.tsx
│   │   ├── 6.tsx
│   │   ├── 7.tsx
│   │   ├── 8.tsx
│   │   ├── 9.tsx
│   │   ├── DebugButton.tsx
│   │   ├── FreeOffer.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── PricingScreen.tsx
│   │   ├── _layout.tsx
│   │   ├── components
│   │   ├── explainer.tsx
│   │   ├── explainerHearts.tsx
│   │   ├── lambFound.tsx
│   │   ├── pricing
│   │   ├── pricing.tsx
│   │   ├── rating.tsx
│   │   └── username.tsx
│   ├── sitemap.tsx
│   ├── stores
│   │   ├── assetsStore.ts
│   │   ├── authStore.ts
│   │   ├── devotionalStore.ts
│   │   ├── highlightStore.ts
│   │   ├── homeStore.ts
│   │   ├── languageStore.ts
│   │   ├── noteStore.ts
│   │   ├── notificationStore.ts
│   │   ├── onboardingStore.ts
│   │   ├── pathStore.ts
│   │   ├── prayerStore.ts
│   │   ├── readerSettingsStore.ts
│   │   ├── reflectionStore.ts
│   │   ├── shopStore.ts
│   │   ├── soundStore.ts
│   │   ├── store.ts
│   │   ├── subscriptionStore.ts
│   │   ├── uiStore.ts
│   │   └── userStore.ts
│   ├── streak.tsx
│   ├── success.tsx
│   ├── types
│   │   ├── images.d.ts
│   │   └── onboarding.ts
│   └── utils
│       ├── i18n.ts
│       ├── languageUtils.ts
│       ├── toBool.ts
│       ├── utils.ts
│       └── versesByChapter.ts
├── app-env.d.ts
├── app.json
├── assets
│   ├── adaptive-icon.png
│   ├── animations
│   │   └── confetti.lottie
│   ├── backgrounds
│   │   ├── Forest Clearing Background Apr 18 2025.png
│   │   ├── defaultBackground.png
│   │   ├── defaultBackgroundDark.png
│   │   ├── godBackground.png
│   │   ├── grassBackground1.png
│   │   ├── image 134.png
│   │   ├── mainBackground.png
│   │   ├── mainBackground2.png
│   │   ├── nightSky.png
│   │   ├── oldBarn.png
│   │   ├── path1Background.png
│   │   ├── spiralingBackground.png
│   │   └── waterBackground.png
│   ├── custom_splash_icon.png
│   ├── exampleHomeUI
│   ├── exampleHomeUI.png
│   ├── favicon.png
│   ├── fonts
│   │   ├── DIN Next Rounded LT W01 Regular.ttf
│   │   ├── Nunito-Black.ttf
│   │   ├── Nunito-BlackItalic.ttf
│   │   ├── Nunito-Bold.ttf
│   │   ├── Nunito-BoldItalic.ttf
│   │   ├── Nunito-ExtraBold.ttf
│   │   ├── Nunito-ExtraBoldItalic.ttf
│   │   ├── Nunito-Medium.ttf
│   │   ├── Nunito-MediumItalic.ttf
│   │   ├── Nunito-Regular.ttf
│   │   ├── Nunito-SemiBold.ttf
│   │   └── Nunito-SemiBoldItalic.ttf
│   ├── goldLamb.png
│   ├── icon.png
│   ├── icons
│   │   ├── apostlePaul.png
│   │   ├── bible.png
│   │   ├── bibleIcon.png
│   │   ├── bookmark.png
│   │   ├── breadIcon.png
│   │   ├── castle.png
│   │   ├── checkMini.png
│   │   ├── church.png
│   │   ├── epistles.png
│   │   ├── fireWidget.png
│   │   ├── flameIcon.png
│   │   ├── greenGemIcon.png
│   │   ├── heartIcon.png
│   │   ├── hell.png
│   │   ├── homeShadow.png
│   │   ├── jesus.png
│   │   ├── journalIcon.png
│   │   ├── map.png
│   │   ├── noahsArc.png
│   │   ├── oracle.png
│   │   ├── owlIcon.png
│   │   ├── profile.png
│   │   ├── profileIcon.png
│   │   ├── pyramids.png
│   │   ├── redGemIcon.png
│   │   ├── rocket.png
│   │   ├── scale.png
│   │   ├── share.png
│   │   ├── sheepIcon.png
│   │   ├── shepherd.png
│   │   ├── starIcon.png
│   │   ├── stats.png
│   │   ├── tabbar
│   │   ├── today.png
│   │   ├── trophyIcon.png
│   │   ├── waterIcon.png
│   │   ├── whiteCheck.png
│   │   └── wilderness.png
│   ├── images
│   │   ├── Ellipse.png
│   │   ├── adaptive-icon.png
│   │   ├── bible-reader-intro-1.png
│   │   ├── bible-reader-intro-2.png
│   │   ├── bible-reader-intro-3.png
│   │   ├── lambDance.png
│   │   ├── lambDanceDark.png
│   │   ├── mapIcon.png
│   │   ├── reviews.png
│   │   ├── sheep-widget-preview.png
│   │   ├── widget-step1.png
│   │   ├── widget-step2.png
│   │   ├── widget-step3.png
│   │   ├── widget-step4.png
│   │   ├── widgetPreviewStep.png
│   │   ├── widgetStep1.png
│   │   ├── widgetStep2.png
│   │   ├── widgetStep3.png
│   │   └── widgetStep4.png
│   ├── lambPresent.png
│   ├── lambStatic
│   │   ├── 10Skin.png
│   │   ├── JosephsCoat.png
│   │   ├── appleSkin.png
│   │   ├── armorOfGod.png
│   │   ├── babySkin.png
│   │   ├── bananaSkin.png
│   │   ├── cryingLamb.png
│   │   ├── goldSkin.png
│   │   ├── lionSkin.png
│   │   ├── noahSkin.png
│   │   ├── normalSkin.png
│   │   ├── pinkSkin.png
│   │   └── whale.png
│   ├── onboarding
│   │   ├── babyLamb.png
│   │   ├── chronological.png
│   │   ├── dailyWisdom.png
│   │   ├── lamb20.png
│   │   ├── lamb33.png
│   │   ├── lambWithWings.png
│   │   ├── leftReef.png
│   │   ├── overcomingFlesh.png
│   │   ├── reviews.png
│   │   ├── rightReef.png
│   │   ├── shepRatings.png
│   │   ├── shepReviews.png
│   │   ├── shepherdCommunity.png
│   │   ├── skins.png
│   │   └── walkingWithJesus.png
│   ├── redShadow.png
│   ├── riveAnimations
│   │   ├── babyLambWaking.riv
│   │   ├── bg-green.riv
│   │   ├── goldLamb.riv
│   │   ├── homeLamb.riv
│   │   ├── lamb-wings-idle.riv
│   │   ├── makeLamb.riv
│   │   ├── new_shepherd.riv
│   │   ├── shepherd-splash_screen.riv
│   │   ├── stars.json
│   │   └── successLamb.riv
│   ├── sounds
│   │   ├── Bread_Eating.m4a
│   │   ├── Chest_Opening.m4a
│   │   ├── Flame_Sound.m4a
│   │   ├── Journaling_Success.m4a
│   │   ├── Prayer_Success.m4a
│   │   ├── Shepherd_Background_Sound.m4a
│   │   ├── Shepherd_Button_Sound.m4a
│   │   └── Shepherd_Disable_Sound.m4a
│   ├── splash.png
│   └── yellowShadow.png
├── babel.config.js
├── cesconfig.json
├── components
│   ├── AppLoading.tsx
│   ├── BackButton.tsx
│   ├── BiblePreviewComponent.tsx
│   ├── BibleReaderTutorialSheet.tsx
│   ├── BibleVerseActionBar.tsx
│   ├── BookChapterSelectorSheet.tsx
│   ├── Button.tsx
│   ├── Container.tsx
│   ├── DebugModal.tsx
│   ├── DevotionalReader.tsx
│   ├── EditNameSheet.tsx
│   ├── EditScreenInfo.tsx
│   ├── EmptyModal.tsx
│   ├── ExplainerModal.tsx
│   ├── ForceUpdateModal.tsx
│   ├── FullScreenShareCard.tsx
│   ├── GlobalBookChapterSelectorSheet.tsx
│   ├── GlobalPrayerSheet.tsx
│   ├── GlobalStatsSheet.tsx
│   ├── GlobalStoreSheet.tsx
│   ├── HalfModalSheet.tsx
│   ├── HeaderButton.tsx
│   ├── HeartsExplainerModal.tsx
│   ├── HighlightColorPicker.tsx
│   ├── JournalComponent.tsx
│   ├── LanguageDetectionExample.tsx
│   ├── LanguageSelectionModal.tsx
│   ├── MapComponents
│   │   ├── PathNode.tsx
│   │   └── StickyPathHeader.tsx
│   ├── NewBibleReader.tsx
│   ├── NoteEditor.tsx
│   ├── OldReflectionSheet.tsx
│   ├── PrayerComponent.tsx
│   ├── PrayerSettingsModal.tsx
│   ├── PrayerView.tsx
│   ├── PrimaryButton.tsx
│   ├── ProgressPill.tsx
│   ├── RiveWrapper.tsx
│   ├── ScreenContent.tsx
│   ├── SecondaryButton.tsx
│   ├── SelectedPath.tsx
│   ├── SettingsSheet.tsx
│   ├── Shared
│   │   ├── BluePrimaryButton.tsx
│   │   ├── CircleButton.tsx
│   │   └── DailyVerseCard.tsx
│   ├── SideButton.tsx
│   ├── SpotlightOverlay.tsx
│   ├── StoreScreen.tsx
│   ├── StreakScreen.tsx
│   ├── SuccessAnimation.tsx
│   ├── SuccessMessage.tsx
│   ├── TabBarIcon.tsx
│   ├── VerseChatView.tsx
│   ├── WaterPrayerView.tsx
│   └── WidgetHowToSheet.tsx
├── documentation
│   ├── analytics-implementation.md
│   └── language-detection.md
├── eas.json
├── expo-env.d.ts
├── firebase.json
├── firestore.rules
├── functions
│   ├── firebase-debug.log
│   ├── package-lock.json
│   ├── package.json
│   ├── src
│   │   └── index.ts
│   └── tsconfig.json
├── global.css
├── google-services.json
├── index.js
├── ios