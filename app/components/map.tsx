import { useAssets } from 'expo-asset';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  SafeAreaView,
  SectionList,
  Text,
  View,
  ViewToken,
  StatusBar,
} from 'react-native';

import PathNode, { NodeStatus } from '../../components/MapComponents/PathNode';
import StickyPathHeader from '../../components/MapComponents/StickyPathHeader';
import BackButton from '../../components/BackButton';
import { BIBLE_BOOK_IDS, SHORTER_BIBLE_PATHS_2, Unit } from '../models/Path';
import { PathInfo, usePathStore } from '../stores/pathStore';
import { useUserStore } from '../stores/userStore';
import { heightScreen } from '~/utils/dimensions';
import useSubscriptionStore from '../stores/subscriptionStore';
import { useHomeStore } from '../stores/homeStore';
import { hapticMedium } from '~/utils/haptics';

// Define our custom section type
type BibleSection = {
  title: string;
  pathId: string;
  index: number;
  data: Unit[];
  icon?: string;
  color?: string;
  description?: string;
  image?: ImageSourcePropType;
  riveName?: string;
  artboardName?: string;
};



// Optimize NextNodeIndicator with memo
// const NextNodeIndicator = React.memo(({ alignment }: { alignment: 'start' | 'center' | 'end' }) => {
//   // Load Rive assets
//   const [riveAssets] = useAssets([require('../../assets/riveAnimations/homeLamb.riv')]);

//   // Only render on non-center alignments (left or right of path)
//   if (alignment === 'center') return null;

//   // Show loading indicator if assets aren't loaded yet
//   if (!riveAssets) {
//     return (
//       <View className="absolute right-1 top-4 w-28 h-28 bg-yellow-300 rounded-full items-center justify-center border-4 border-white">
//         <ActivityIndicator size="small" color="#3C584A" />
//       </View>
//     );
//   }

//   // More visible wrapper with bright colors
//   return (
//     <View
//       className={`absolute ${alignment === 'start' ? 'right-1' : 'left-1'} top-4 w-28 h-28 bg-yellow-300 rounded-full items-center justify-center border-4 border-white`}
//       style={{ zIndex: 50 }}>
//       <Rive
//         url={riveAssets[0].uri!}
//         artboardName="lamb-idle"
//         autoplay
//         style={{ width: '100%', height: '100%' }}
//       />
//       {/* Text indicator to make it obvious */}
//       <Text className="absolute bottom-0 font-bold text-xs bg-white px-1 rounded">NEXT</Text>
//     </View>
//   );
// });

// Hook to get unit status based on global state and current section order
const useUnitStatus = (sections: BibleSection[]) => {
  const completedUnitIds = usePathStore((state) => state.completedUnitIds);
  const completedMapPaths = useUserStore((state) => state.completedMapPaths);

  const getStatus = (pathId: string, unitId: string): NodeStatus => {
    // Check if this unit is in completedMapPaths
    const isCompletedInMapPaths = completedMapPaths?.some(
      (path) => path.pathId === pathId && path.unitId === unitId
    );

    // If it's completed in MapPaths, return completed status
    if (isCompletedInMapPaths) {
      return 'completed';
    }

    // 1. Check if the current unit is completed in completedUnitIds
    if (completedUnitIds.includes(unitId)) {
      return 'completed';
    }

    // Find the section and unit indices based on the current order
    const sectionIndex = sections.findIndex((s) => s.pathId === pathId);
    const currentSection = sections[sectionIndex];
    if (!currentSection) return 'locked';
    const unitIndex = currentSection.data.findIndex((u) => u.id === unitId);
    if (unitIndex === -1) return 'locked';

    // 2. If this is the very first unit in the first section, it's active
    if (sectionIndex === 0 && unitIndex === 0) {
      return 'active';
    }

    // 3. If previous unit in the same section is completed, it's active
    if (unitIndex > 0) {
      const previousUnitId = currentSection.data[unitIndex - 1].id;
      if (
        completedUnitIds.includes(previousUnitId) ||
        completedMapPaths?.some((path) => path.pathId === pathId && path.unitId === previousUnitId)
      ) {
        return 'active';
      }
    }

    // 4. If first unit in a later section and last unit of previous section is completed, it's active
    if (unitIndex === 0 && sectionIndex > 0) {
      const previousSection = sections[sectionIndex - 1];
      if (previousSection && previousSection.data.length > 0) {
        const lastUnitOfPreviousSectionId =
          previousSection.data[previousSection.data.length - 1].id;
        if (
          completedUnitIds.includes(lastUnitOfPreviousSectionId) ||
          completedMapPaths?.some(
            (path) =>
              path.pathId === previousSection.pathId && path.unitId === lastUnitOfPreviousSectionId
          )
        ) {
          return 'active';
        }
      }
    }

    // 5. Otherwise, locked
    return 'locked';
  };

  // Function to check if a section is unlocked
  const isSectionUnlocked = (pathId: string): boolean => {
    // First section is always unlocked
    const sectionIndex = sections.findIndex((s) => s.pathId === pathId);
    if (sectionIndex === 0) return true;

    // For other sections, check if the last unit of the previous section is completed
    const previousSection = sections[sectionIndex - 1];
    if (previousSection && previousSection.data.length > 0) {
      const lastUnitOfPreviousSectionId = previousSection.data[previousSection.data.length - 1].id;
      return (
        completedUnitIds.includes(lastUnitOfPreviousSectionId) ||
        completedMapPaths?.some(
          (path) =>
            path.pathId === previousSection.pathId && path.unitId === lastUnitOfPreviousSectionId
        )
      );
    }

    return false;
  };

  return { getStatus, isSectionUnlocked };
};

// Define a rough constant height for each node item (including margins)
const ITEM_HEIGHT = 180; // adjust if needed

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Check if we're coming from home screen
  const fromHome = params.fromHome === 'true';
  const targetUnitId = params.targetUnitId as string;

  // Get user reading time preference
  const frequencyGoal = useUserStore((state) => state.frequencyGoal);

  // Get selectedPath from the store inside the component
  const selectedPath = usePathStore((state) => state.selectedPath);

  // Get reading completion status from the home store
  const readingCompleted = useHomeStore((state) => state.readingCompleted);

  // Calculate sections inside the component using useMemo
  const sections = useMemo(() => {
    // Always use SHORTER_BIBLE_PATHS_2 to ensure units have at most 1-2 chapters
    const pathsToUse = SHORTER_BIBLE_PATHS_2;

    let orderedPaths = pathsToUse;
    if (selectedPath && Array.isArray(selectedPath.order) && selectedPath.order.length > 0) {
      console.log('[MapScreen Component] Reordering paths based on selectedPath:', selectedPath.id);
      const pathMap = Object.fromEntries(pathsToUse.map((p) => [p.id, p]));
      orderedPaths = selectedPath.order.map((id) => pathMap[id]).filter(Boolean);
      const remaining = pathsToUse.filter((p) => !selectedPath.order.includes(p.id));
      orderedPaths = [...orderedPaths, ...remaining];
    } else {
      console.log('[MapScreen Component] Using default path order.');
    }

    return orderedPaths.map((path, index) => ({
      title: path.title,
      pathId: path.id,
      index,
      data: path.units,
      icon: path.icon,
      color: path.color,
      description: path.description,
      image: path.image,
      riveName: path.riveName,
      artboardName: path.artboardName,
    }));
  }, [selectedPath]); // Removed frequencyGoal as dependency since we always use SHORTER_BIBLE_PATHS_2

  const [currentSectionTitle, setCurrentSectionTitle] = useState(sections[0]?.title || 'Map');
  const [currentSectionIcon, setCurrentSectionIcon] = useState(sections[0]?.icon || 'book');
  const [currentSectionColor, setCurrentSectionColor] = useState(sections[0]?.color || 'green');
  const [currentSectionDescription, setCurrentSectionDescription] = useState(
    sections[0]?.description || ''
  );
  const [currentSectionIndex, setCurrentSectionIndex] = useState(sections[0]?.index || 0);
  const sectionListRef = useRef<SectionList<Unit, BibleSection>>(null);

  // Get path store functions
  const { setPathInProgress, setSelectedBookChapter, setCurrentPath } = usePathStore();
  const { getStatus, isSectionUnlocked } = useUnitStatus(sections); // Pass the calculated sections to the hook
  const completedUnitIds = usePathStore((state) => state.completedUnitIds);

  // Update initial state based on calculated sections
  useEffect(() => {
    if (sections.length > 0) {
      setCurrentSectionTitle(sections[0].title);
      setCurrentSectionIcon(sections[0].icon || 'book');
      setCurrentSectionColor(sections[0].color || 'green');
      setCurrentSectionDescription(sections[0].description || '');
      setCurrentSectionIndex(sections[0].index || 0);
    }
  }, [sections]);

  // Get pro status from subscription store
  const isProMember = useSubscriptionStore((state) => state.isProMember);
  const { presentFreeTrialPaywall } = useSubscriptionStore();
  const subscriptionStore = useSubscriptionStore();

  // Handle subscription button press using the store action
  const handleSubscriptionPress = async () => {
    hapticMedium();
    subscriptionStore.setFromScreen('map');
    presentFreeTrialPaywall();
  };

  // Track if we need to suppress haptic feedback (e.g., on first render)
  const isFirstRender = useRef(true);
  
  // Scroll to target unit when coming from home
  useEffect(() => {
    if (fromHome && targetUnitId && sectionListRef.current) {
      // Find the section and item index for the target unit
      let sectionIndex = -1;
      let itemIndex = -1;
      
      sections.forEach((section, sIdx) => {
        const idx = section.data.findIndex(unit => unit.id === targetUnitId);
        if (idx !== -1) {
          sectionIndex = sIdx;
          itemIndex = idx;
        }
      });
      
      if (sectionIndex !== -1 && itemIndex !== -1) {
        // Small delay to ensure the list is rendered
        setTimeout(() => {
          sectionListRef.current?.scrollToLocation({
            sectionIndex,
            itemIndex,
            animated: true,
            viewOffset: 100, // Offset from top
          });
        }, 300);
      }
    }
  }, [fromHome, targetUnitId, sections]);

  // Load all Rive assets needed for sections
  const [riveAssets] = useAssets([
    require('../../assets/riveAnimations/homeLamb.riv'),
    require('../../assets/riveAnimations/successLamb.riv'),
  ]);

  const handleNodePress = (unit: Unit, isLastUnitInSection: boolean) => {
    console.log('Pressed unit:', unit.title, unit.reference);
    console.log('Reference details:', JSON.stringify(unit.reference));
    console.log('unit selected', unit);

    // Get the current section/path information
    const currentPath = sections.find((section) => section.data.some((u) => u.id === unit.id));

    if (!currentPath) {
      console.warn('Path not found for unit:', unit.id);
      return;
    }

    // Get chapter range - handle both single reference and array of references
    let bookId, chapters;

    if (Array.isArray(unit.reference)) {
      // If it's an array of references, use the first one
      bookId = unit.reference[0].bookId;
      chapters = unit.reference[0].chapters;
    } else {
      // It's a single reference
      bookId = unit.reference.bookId;
      chapters = unit.reference.chapters;
    }

    const startChapter = Array.isArray(chapters) && chapters.length > 0 ? chapters[0] : 1;
    const endChapter =
      Array.isArray(chapters) && chapters.length > 1 ? chapters[chapters.length - 1] : startChapter;

    // Create the book name lookup based on bookId
    // Use BIBLE_BOOK_IDS from Path.ts to generate a reverse mapping
    const bookNames: Record<number, string> = Object.fromEntries(
      Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => [id, name])
    );
    const bookName = bookNames[bookId] || `Book ${bookId}`;

    // Set the selected book chapter
    const bookChapterText = `${bookName} ${startChapter}`;
    setSelectedBookChapter(bookChapterText);

    // Save path selection to store (legacy way - keep for compatibility)
    // setSelectedPath call removed (legacy)

    // Set the complete current path object
    const pathInfo: PathInfo = {
      pathId: currentPath.pathId,
      pathTitle: currentPath.title,
      unitId: unit.id,
      unitTitle: unit.title,
      bookId,
      startChapter,
      endChapter,
      prayer: unit.prayer,
      reflection: unit.reflectionPrompt,
    };

    // Check for verse-level divisions (verse ranges)
    // Units with verse ranges have IDs like "gen-24b-v12-27" where "v12-27" indicates verses 12-27
    if (unit.id.includes('-v')) {
      try {
        // Extract verse range from the unit ID
        const verseMatch = unit.id.match(/-v(\d+)-(\d+)$/);
        if (verseMatch && verseMatch.length === 3) {
          const startVerse = parseInt(verseMatch[1], 10);
          const endVerse = parseInt(verseMatch[2], 10);

          if (!isNaN(startVerse) && !isNaN(endVerse)) {
            console.log(`Found verse range in unit ID: ${startVerse}-${endVerse}`);
            pathInfo.startVerse = startVerse;
            pathInfo.endVerse = endVerse;
          }
        }
      } catch (error) {
        console.error('Error parsing verse range from unit ID:', error);
      }
    }

    // Fallback: if unit object already has startVerse/endVerse properties, use them
    // Note: Unit type doesn't have startVerse/endVerse properties by default

    setCurrentPath(pathInfo);

    // Navigate to Bible preview screen
    router.push({
      pathname: '/biblePreview',
      params: {
        fromMap: 'true',
      }
    });
  };

  // This function handles viewability change for section headers
  const onViewableItemsChanged = useCallback(
    ({ viewableItems, changed }: { viewableItems: ViewToken[]; changed: ViewToken[] }) => {
      // No debouncing to improve responsiveness
      // Determine currently focused section (closest to top) by taking the first visible section (smallest index)
      const visibleSections = viewableItems
        .filter((token) => token.isViewable && token.section)
        .map((token) => token.section);

      if (visibleSections.length > 0) {
        const focusedSection = visibleSections.reduce(
          (prev, curr) => (curr.index < prev.index ? curr : prev),
          visibleSections[0]
        );

        if (focusedSection && focusedSection.title !== currentSectionTitle) {
          // Update the current section title, icon, color, description, and index
          setCurrentSectionTitle(focusedSection.title);
          setCurrentSectionIcon(focusedSection.icon || 'book');
          setCurrentSectionColor(focusedSection.color || 'green');
          setCurrentSectionDescription(focusedSection.description || '');
          setCurrentSectionIndex(focusedSection.index || 0);

          // Still track first render
          if (isFirstRender.current) {
            isFirstRender.current = false;
          }
        }
      }
    },
    [currentSectionTitle]
  );

  // Create a viewability config ref
  const viewabilityConfig = {
    viewAreaCoveragePercentThreshold: 10,
  };

  // Find the next available unit
  const nextAvailableUnit = useCallback(() => {
    // Always use SHORTER_BIBLE_PATHS_2 to ensure units have at most 1-2 chapters
    const pathsToUse = SHORTER_BIBLE_PATHS_2;

    // Find first unit or next unlocked unit that isn't completed
    for (const path of pathsToUse) {
      for (let i = 0; i < path.units.length; i++) {
        const unit = path.units[i];
        // Skip if already completed
        if (completedUnitIds.includes(unit.id)) continue;

        // First unit or unit after a completed one is available
        if (i === 0 || completedUnitIds.includes(path.units[i - 1].id)) {
          console.log('Next available unit:', unit.id, unit.title);
          return unit;
        }
      }
    }
    return null;
  }, [completedUnitIds]); // Removed frequencyGoal as dependency since we always use SHORTER_BIBLE_PATHS_2

  // Track visible items to locate next unit on screen
  const [nextItemLayout, setNextItemLayout] = useState<{ id: string; x: number; y: number } | null>(
    null
  );
  const [showNextIndicator, setShowNextIndicator] = useState(false);
  const nextUnit = nextAvailableUnit();

  // Function to check if a unit should be indicated as next
  const isNextUnit = useCallback(
    (unit: Unit) => {
      return nextUnit?.id === unit.id;
    },
    [nextUnit]
  );

  // Function to get Rive asset based on name
  const getRiveAssetUri = (riveName?: string) => {
    if (!riveAssets || !riveName) return null;

    if (riveName === 'homeLamb') {
      return riveAssets[0].uri!;
    } else if (riveName === 'successLamb') {
      return riveAssets[1].uri!;
    }

    return null;
  };

  // Render a node item - Optimized with useCallback and better dependencies
  const renderItem = useCallback(
    ({ item, index, section }: { item: Unit; index: number; section: BibleSection }) => {
      const status = getStatus(section.pathId, item.id);
      const alignment = ['center', 'start', 'center', 'end'][index % 4] as
        | 'start'
        | 'center'
        | 'end';
      const shouldIndicateNext = isNextUnit(item);
      const sectionIsUnlocked = isSectionUnlocked(section.pathId);

      // Position within each section (repeating pattern)
      // Show sheep only at second node position of every section
      const isSecondNodeInSection = index === 1;

      // Show journal icon only at fourth node position of every section
      const isFourthNodeInSection = index === 3;

      if (shouldIndicateNext) {
        console.log(`Next unit on screen: ${item.id} (${item.title})`);
      }

      const isLastUnitInSection = index === section.data.length - 1;

      // Handle node click with additional checks for non-pro users and reading completion
      function onNodePress(unit: Unit) {
        console.log('onNodePress', unit);
        console.log(
          'Debug - Pro status:',
          isProMember,
          'Reading completed:',
          readingCompleted,
          'Section index:',
          section.index
        );

        // Only show pricing screen if ALL of these conditions are true:
        // 1. User is not a pro member (proStatus !== "pro")
        // 2. User has completed their daily reading (readingCompleted is true)
        // 3. They're trying to access a non-first path (section.index > 0)
        if (!isProMember) {
          console.log(
            'Showing pricing screen: user is not pro, has completed reading, and is trying to access a non-first path'
          );
          handleSubscriptionPress();
        } else {
          handleNodePress(unit, isLastUnitInSection);
        }
      }

      return (
        <View className="relative">
          <PathNode
            key={item.id}
            unit={item}
            status={status}
            alignment={alignment}
            onPress={onNodePress}
            pathColor={section.color}
          />

          {/* Sheep decoration at second node position in every section - Only render when visible */}
          {isSecondNodeInSection && section.riveName && section.artboardName && false && (
            <View
              className={`absolute ${section.riveName === 'successLamb' ? 'right-24' : 'right-2'} top-1/2 -translate-y-1/2`}
              style={{ zIndex: 10 }}>
              <View className="w-44 h-44">
                {/* Rive animations temporarily disabled for performance */}
              </View>
            </View>
          )}

          {/* Journal icon at fourth node position in every section */}
          {isFourthNodeInSection && section.image && (
            <View className="absolute left-8 top-1/2 -translate-y-1/2" style={{ zIndex: 10 }}>
              <Image
                source={section.image}
                style={{ width: 128, height: 128, opacity: sectionIsUnlocked ? 1 : 0.5 }}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      );
    },
    [getStatus, handleNodePress, isNextUnit, isSectionUnlocked, isProMember, readingCompleted]
  ); // Updated dependencies

  // Render section header - Improved with memo
  const renderSectionHeader = useCallback(
    ({ section }: { section: BibleSection }) => {
      // Check if section is unlocked
      const isUnlocked = isSectionUnlocked(section.pathId);

      return (
        <StickyPathHeader
          title={section.title || ''}
          icon={section.icon || 'book'}
          color={section.color || 'green'}
          description={section.description || ''}
          sectionNumber={section.index + 1}
          isLocked={!isUnlocked}
          opacity={!isUnlocked ? 0.5 : 1}
        />
      );
    },
    [isSectionUnlocked]
  );

  // Show loading indicator while assets load
  if (!riveAssets) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream">
        <ActivityIndicator size="large" color="#3C584A" />
        <Text className="font-feather text-textPrimary mt-4">Loading Map...</Text>
      </View>
    );
  }

  return (
    <>
      <SafeAreaView className="flex-1 bg-surfaceCream mt-4">
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        
        {/* Back button when coming from home screen */}
        {fromHome && (
          <BackButton 
            onPress={() => router.back()} 
            containerClassName="absolute top-0 left-0 z-50"
          />
        )}
        
        <SectionList<Unit, BibleSection>
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        SectionSeparatorComponent={null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: heightScreen * 0.1 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        stickySectionHeadersEnabled={false}
        // Performance optimizations
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(_data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        updateCellsBatchingPeriod={50}
                  maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
      </SafeAreaView>
    </>
  );
}
