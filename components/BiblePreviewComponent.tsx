import { useAssets } from 'expo-asset';
import { router } from 'expo-router';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, AppState } from 'react-native';
import BackButton from './BackButton';
import PrimaryButton from './PrimaryButton';
import { Unit, SHORTER_BIBLE_PATHS_2, BIBLE_PATHS } from '../app/models/Path'; // Import both path constants
import { usePathStore } from '../app/stores/pathStore';
import { useUserStore } from '../app/stores/userStore'; // Import useUserStore
import analytics from '../utils/analytics';

interface BiblePreviewProps {
  /** Whether the preview overlay should be shown. */
  visible: boolean;
  /** Callback to close the preview */
  onClose: () => void;
}

/**
 * Full‑screen overlay that shows a placeholder "Bible Preview" screen.
 * Rendered only when `visible` is true.
 */
const BiblePreviewComponent: React.FC<BiblePreviewProps> = ({ visible, onClose }) => {
  const containerOpacity = useRef(new Animated.Value(0)).current; // Overall container opacity
  const cardAnim = useRef(new Animated.Value(-100)).current; // Y offset for entry
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Get user's reading time preference from userStore
  const frequencyGoal = useUserStore((state) => state.frequencyGoal);

  // Get saved reading & path in progress state from path store
  const {
    savedBook,
    savedChapter,
    setPathInProgress,
    savedBookId,
    completedUnitIds,
    setCurrentPath,
  } = usePathStore();

  // Use selectedPath to determine the correct order for BIBLE_PATHS
  const selectedPath = usePathStore((state) => state.selectedPath);
  const orderedPaths = useMemo(() => {
    // Determine which paths to use based on user's reading time preference
    const pathsToUse = frequencyGoal === '1-5' ? SHORTER_BIBLE_PATHS_2 : BIBLE_PATHS;

    if (selectedPath && Array.isArray(selectedPath.order) && selectedPath.order.length > 0) {
      const pathMap = Object.fromEntries(pathsToUse.map((p) => [p.id, p]));
      const ordered = selectedPath.order.map((id) => pathMap[id]).filter(Boolean);
      const remaining = pathsToUse.filter((p) => !selectedPath.order.includes(p.id));
      return [...ordered, ...remaining];
    }
    return pathsToUse;
  }, [selectedPath, frequencyGoal]); // Include frequencyGoal as dependency

  // Find the next uncompleted unit from the ordered paths
  const nextUnit = useMemo(() => {
    let nextUnitToComplete: Unit | null = null;
    console.log('Finding next uncompleted unit. Completed:', completedUnitIds);
    for (const path of orderedPaths) {
      for (const unit of path.units) {
        if (!completedUnitIds.includes(unit.id)) {
          console.log(
            `[BiblePreviewComponent] Found next uncompleted unit: ${unit.title} in path ${path.id}`
          );
          nextUnitToComplete = unit;
          break;
        }
      }
      if (nextUnitToComplete) break;
    }
    if (!nextUnitToComplete && orderedPaths.length > 0 && orderedPaths[0].units.length > 0) {
      console.log('[BiblePreviewComponent] No uncompleted units found, defaulting to first unit');
      nextUnitToComplete = orderedPaths[0].units[0];
    }
    return nextUnitToComplete;
  }, [completedUnitIds, orderedPaths]);

  // Helper to get a single BibleReference from nextUnit.reference
  const getFirstReference = (ref: Unit['reference']) => (Array.isArray(ref) ? ref[0] : ref);

  // Content for the preview card - either from nextUnit or fallbacks
  const title = useMemo(() => nextUnit?.title || 'The Good Shepherd', [nextUnit]);
  const subtitle = useMemo(() => {
    if (nextUnit) {
      const ref = getFirstReference(nextUnit.reference);
      return `Next: ${ref.bookName} ${ref.chapters[0]}`;
    }
    return `Today's Reading · ${savedBook} ${savedChapter}`;
  }, [nextUnit, savedBook, savedChapter]);
  const summary = useMemo(
    () =>
      nextUnit?.description ||
      (savedBook === 'John' && savedChapter === 3
        ? "Jesus teaches Nicodemus about being born again and God's love for the world."
        : 'Jesus describes Himself as the Good Shepherd who lays down His life for the sheep.'),
    [nextUnit, savedBook, savedChapter]
  );

  // Determine bookId and chapter for the "Start Reading" button
  const bookIdToLoad = useMemo(
    () => (nextUnit ? getFirstReference(nextUnit.reference).bookId : savedBookId),
    [nextUnit, savedBookId]
  );
  const chaptersToLoad = useMemo(
    () =>
      nextUnit
        ? getFirstReference(nextUnit.reference).chapters.join(',')
        : savedChapter?.toString(),
    [nextUnit, savedChapter]
  );

  // Animation values for the primary button
  const buttonAnim = useRef(new Animated.Value(60)).current; // Start 60 units below final position
  const buttonOpacity = useRef(new Animated.Value(0)).current; // Start fully transparent

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollViewRef = useRef(null);

  // Prepare for future Rive usage
  const [riveAssets] = useAssets([require('../assets/riveAnimations/homeLamb.riv')]);

  // Add state to track if component has been focused after navigation
  const [hasReturnedFromNavigation, setHasReturnedFromNavigation] = useState(false);

  useEffect(() => {
    if (visible) {
      console.log('📱 BiblePreviewComponent is now visible');
      console.log('📱 Component mounted with visible=true');

      // Reset the navigation return flag
      setHasReturnedFromNavigation(true);

      // First animate the container opacity and card entry
      Animated.parallel([
        Animated.timing(containerOpacity, {
          // Fade in container
          toValue: 1,
          duration: 400, // Faster fade-in
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Then animate the button with a delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(buttonAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);
    } else {
      console.log('📱 BiblePreviewComponent is now hidden');
      // Reset animations when component is hidden
      containerOpacity.setValue(0); // Reset container opacity
      cardAnim.setValue(-100);
      cardOpacity.setValue(0);
      buttonAnim.setValue(60);
      buttonOpacity.setValue(0);
      setHasReturnedFromNavigation(false);
    }
  }, [visible, containerOpacity, cardAnim, cardOpacity, buttonAnim, buttonOpacity]);

  // Monitor app state changes to detect when returning from navigation
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && visible) {
        console.log('📱 App became active while BiblePreview is visible');
        setHasReturnedFromNavigation(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [visible]);

  // We still return null immediately when not visible
  if (!visible) return null;

  const handleBack = () => {
    console.log('🔙 BiblePreview handleBack called');
    console.log('🔙 hasReturnedFromNavigation:', hasReturnedFromNavigation);
    console.log('🔙 visible:', visible);
    console.log('🔙 mode prop:', visible ? 'PREVIEW' : 'NOT PREVIEW');
    setPathInProgress(false);
    onClose();
  };

  const handleStart = () => {
    // Set up the path information if we have a nextUnit
    if (nextUnit) {
      // Find the path that contains this unit
      let pathId = '';
      let pathTitle = '';
      for (const path of SHORTER_BIBLE_PATHS_2) {
        if (path.units.some((u) => u.id === nextUnit.id)) {
          pathId = path.id;
          pathTitle = path.title;
          break;
        }
      }

      // Handle reference as BibleReference | BibleReference[]
      const ref = getFirstReference(nextUnit.reference);
      const startChapter = ref.chapters[0];
      const endChapter = ref.chapters[ref.chapters.length - 1];

      // Set the currentPath in the pathStore
      setPathInProgress(true); // Keep path progress active for Bible Reader
      setCurrentPath({
        pathId,
        pathTitle,
        unitId: nextUnit.id,
        unitTitle: nextUnit.title,
        bookId: ref.bookId,
        startChapter,
        endChapter,
        prayer: nextUnit.prayer,
        reflection: nextUnit.reflectionPrompt,
      });

      // Navigate to bibleReader with correct params
      router.push({
        pathname: '/bibleReader',
        params: {
          bookId: ref.bookId?.toString(),
          chapters: ref.chapters.join(','),
          title: nextUnit.title,
          source: 'preview',
          isFromDailyBread: 'true',
          timestamp: Date.now()?.toString(),
        },
      });
    } else {
      router.push({
        pathname: '/bibleReader',
        params: {
          bookId: savedBookId?.toString(),
          chapters: savedChapter?.toString(),
          title,
          source: 'preview',
          isFromStartReading: 'true',
          timestamp: Date.now()?.toString(),
        },
      });
    }
  };



  // Handler for "Finish Reading" button
  // const handleFinishReading = () => {
  //   // You can add your finish reading logic here
  //   alert('Finish Reading!');
  // };

  // Function to check if scrolled to bottom
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20; // px
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      setScrolledToBottom(true);
    } else {
      setScrolledToBottom(false);
    }
  };

  return (
    <Animated.View
      className="absolute inset-0 flex flex-col w-full h-full overflow-visible"
      style={{ opacity: containerOpacity, zIndex: 9999 }}
      pointerEvents={visible ? 'auto' : 'none'}>

      {/* Back Button - Already has absolute positioning built-in */}
      <BackButton
        onPress={handleBack}
        containerClassName="z-[100]"
      />

      {/* Content Area - Scrolls if needed, takes up available space */}
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: 120, // Increased padding to avoid back button
          paddingBottom: 150, // Provide space for the absolutely positioned buttons at the bottom
          alignItems: 'center', // Center content horizontally
        }}
        className="w-full flex-1"
        showsVerticalScrollIndicator={false}>
        {/* Animated Card Preview */}
        <Animated.View
          className="w-[90%] bg-surfaceCream rounded-[28px] py-8 px-6 items-center border-4 border-border mb-6 mt-8"
          style={{ opacity: cardOpacity, transform: [{ translateY: cardAnim }] }}>
          <Text className="text-h1 font-feather text-accentGold mb-2 text-center leading-tight ">
            {title}
          </Text>
          <Text className="text-body font-din text-[#B89B4C] mb-4">{subtitle}</Text>
          <View className="w-full bg-surfaceCream/50 rounded-[18px] p-4 mt-2 border border-border mb-2">
            <Text className="text-caption font-din text-[#B89B4C] text-center uppercase mb-1 tracking-wider">
              SUMMARY
            </Text>
            <Text className="text-body font-din text-textPrimary text-center">{summary}</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Absolutely Positioned Buttons Container at the bottom */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0 w-full px-5 pb-8 pt-4 items-center bg-transparent z-20"
        style={{ opacity: buttonOpacity, transform: [{ translateY: buttonAnim }] }}>
        <PrimaryButton
          title="Start Reading"
          onPress={() => {
            analytics.logEvent('BiblePreview_Tapped_StartReading', {
              unit: nextUnit?.id,
              unitName: nextUnit?.title,
            });
            handleStart();
          }}
        />
    
      </Animated.View>
    </Animated.View>
  );
};

export default BiblePreviewComponent;
