import { Ionicons } from '@expo/vector-icons';
import { useAssets } from 'expo-asset';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  SafeAreaView,
  SectionList,
  Text,
  View,
  ViewToken
} from 'react-native';

import PathNode, { NodeStatus } from '../../components/MapComponents/PathNode';
import StickyPathHeader from '../../components/MapComponents/StickyPathHeader';
import { BIBLE_BOOK_IDS, SHORTER_BIBLE_PATHS_2, BIBLE_PATHS, Unit } from '../../app/models/Path';
import { PathInfo, usePathStore } from '../stores/pathStore';
import { useUserStore } from '../stores/userStore';
import { heightScreen } from '~/utils/dimensions';
import * as Haptics from 'expo-haptics';
import useSubscriptionStore from '../stores/subscriptionStore';

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
//         url={riveAssets[0].localUri!}
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

  const getStatus = (pathId: string, unitId: string): NodeStatus => {
    // 1. Check if the current unit is completed
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
      if (completedUnitIds.includes(previousUnitId)) {
        return 'active';
      }
    }

    // 4. If first unit in a later section and last unit of previous section is completed, it's active
    if (unitIndex === 0 && sectionIndex > 0) {
      const previousSection = sections[sectionIndex - 1];
      if (previousSection && previousSection.data.length > 0) {
        const lastUnitOfPreviousSectionId =
          previousSection.data[previousSection.data.length - 1].id;
        if (completedUnitIds.includes(lastUnitOfPreviousSectionId)) {
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
      return completedUnitIds.includes(lastUnitOfPreviousSectionId);
    }

    return false;
  };

  return { getStatus, isSectionUnlocked };
};


// Define a rough constant height for each node item (including margins)
const ITEM_HEIGHT = 180; // adjust if needed

export default function MapScreen() {
  const router = useRouter();

  // Get user reading time preference
  const frequencyGoal = useUserStore(state => state.frequencyGoal);
  
  // Get selectedPath from the store inside the component
  const selectedPath = usePathStore((state) => state.selectedPath);

  // Calculate sections inside the component using useMemo
  const sections = useMemo(() => {
    // Choose paths based on user's frequencyGoal
    const pathsToUse = frequencyGoal === '1-5' ? SHORTER_BIBLE_PATHS_2 : BIBLE_PATHS;
    
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
  }, [selectedPath, frequencyGoal]); // Added frequencyGoal as dependency

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

  const isProMember = useSubscriptionStore(state => state.isProMember)

  // Handle subscription button press using the store action
  const handleSubscriptionPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/PricingScreen' as any);
  }

  // Track if we need to suppress haptic feedback (e.g., on first render)
  const isFirstRender = useRef(true);

  // Load all Rive assets needed for sections
  const [riveAssets] = useAssets([
    require('../../assets/riveAnimations/homeLamb.riv'),
    require('../../assets/riveAnimations/successLamb.riv'),
  ]);

  const handleNodePress = (unit: Unit) => {
    console.log('Pressed unit:', unit.title, unit.reference);
    console.log('Reference details:', JSON.stringify(unit.reference));

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

    setCurrentPath(pathInfo);

    // Set path in progress to hide tab bar when opening Bible
    setPathInProgress(true);

    // Genesis 1 first node should have bookId=1, chapters=[1,2]
    // Verify the data looks right
    console.log(`Selected node data: Book ID=${bookId}, Chapters=${JSON.stringify(chapters)}`);

    // Ensure chapters is always an array and join correctly
    const chaptersQuery = Array.isArray(chapters) ? chapters.join(',') : '';

    if (bookId && chaptersQuery) {
      // Use an absolute path format to target the Bible reader screen
      router.push({
        pathname: '/bibleReader', // Use bibleReader (not /bible) for consistency
        params: {
          bookId: bookId.toString(),
          chapters: chaptersQuery,
          title: encodeURIComponent(unit.title),
          // Add a flag to help identify where this navigation came from
          source: 'map',
          timestamp: Date.now().toString(), // Force new params by adding timestamp
        },
      });
    } else {
      console.warn('Invalid unit reference for navigation:', unit.reference);
    }
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
    // Choose paths based on user's frequencyGoal
    const pathsToUse = frequencyGoal === '1-5' ? SHORTER_BIBLE_PATHS_2 : BIBLE_PATHS;
    
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
  }, [completedUnitIds, frequencyGoal]); // Added frequencyGoal as dependency

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
      return riveAssets[0].localUri!;
    } else if (riveName === 'successLamb') {
      return riveAssets[1].localUri!;
    }

    return null;
  };

  // Render a node item - Optimized with useCallback and better dependencies
  const renderItem = useCallback(({ item, index, section }: {
    item: Unit,
    index: number,
    section: BibleSection
  }) => {
    const status = getStatus(section.pathId, item.id);
    const alignment = ['center', 'start', 'center', 'end'][index % 4] as 'start' | 'center' | 'end';
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

    function onNodeClick(unit: Unit) {
      if (!isProMember && section.index > 0) {
        handleSubscriptionPress()
      } else {
        handleNodePress(unit)
      }
    }
    return (
      <View className="relative">
        <PathNode
          key={item.id}
          unit={item}
          status={status}
          alignment={alignment}
          onPress={onNodeClick}
        />

        {/* Sheep decoration at second node position in every section - Only render when visible */}
        {isSecondNodeInSection && section.riveName && section.artboardName && false && (
          <View
            className={`absolute ${section.riveName === 'successLamb' ? 'right-24' : 'right-2'} top-1/2 -translate-y-1/2`}
            style={{ zIndex: 10 }}
          >
            <View className="w-44 h-44">
              {/* Rive animations temporarily disabled for performance */}
            </View>
          </View>
        )}

        {/* Journal icon at fourth node position in every section */}
        {isFourthNodeInSection && section.image && (
          <View
            className="absolute left-8 top-1/2 -translate-y-1/2"
            style={{ zIndex: 10 }}
          >
            <Image
              source={section.image}
              style={{ width: 128, height: 128, opacity: sectionIsUnlocked ? 1 : 0.5 }}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    );
  }, [getStatus, handleNodePress, isNextUnit, isSectionUnlocked]); // Added isSectionUnlocked to dependencies

  // Render section header - Improved with memo
  const renderSectionHeader = useCallback(({ section }: { section: BibleSection }) => {
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
  }, [isSectionUnlocked]);

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
    <SafeAreaView className="flex-1 bg-surfaceCream">
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

      {/* If we want a floating persistent next indicator, we could add it here */}
      {nextUnit && (
        <View className="absolute bottom-4 right-4 items-center">
          <View className="bg-white px-2 py-1 rounded-full mb-1 shadow-sm">
            <Text className="text-xs font-bold text-yellow-600">NEXT UNIT</Text>
          </View>
          <View className="bg-yellow-300 p-2 rounded-full shadow-sm border border-white">
            <Ionicons name="arrow-up" size={20} color="#000" />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
