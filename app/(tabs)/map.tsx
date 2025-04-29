import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, SectionList, Pressable, SafeAreaView, NativeSyntheticEvent, NativeScrollEvent, ViewToken, TouchableOpacity, Dimensions, Image, Animated, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Rive from 'rive-react-native';
import { BIBLE_PATHS, Unit, Path, BIBLE_BOOK_IDS } from '../models/Path';
import { usePathStore, PathInfo } from '../stores/pathStore';
import PathNode, { NodeStatus } from '../../components/MapComponents/PathNode';
import StickyPathHeader from '../../components/MapComponents/StickyPathHeader';

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

// Next node indicator component with Rive animation
const NextNodeIndicator = ({ alignment }: { alignment: 'start' | 'center' | 'end' }) => {
  // Only render on non-center alignments (left or right of path)
  if (alignment === 'center') return null;

  // More visible wrapper with bright colors
  return (
    <View 
      className={`absolute ${alignment === 'start' ? 'right-1' : 'left-1'} top-4 w-28 h-28 bg-yellow-300 rounded-full items-center justify-center border-4 border-white`}
      style={{ zIndex: 50 }}
    >
      <Rive
        resourceName="homeLamb"
        artboardName="lamb-idle"
        autoplay={true}
        style={{ width: '100%', height: '100%' }}
      />
      {/* Text indicator to make it obvious */}
      <Text className="absolute bottom-0 font-bold text-xs bg-white px-1 rounded">NEXT</Text>
    </View>
  );
};

// Hook to get unit status based on global state
const useUnitStatus = () => {
  const completedUnitIds = usePathStore((state) => state.completedUnitIds);
  
  const getStatus = (pathId: string, unitId: string): NodeStatus => {
    // 1. Check if the current unit is completed
    if (completedUnitIds.includes(unitId)) {
      return 'completed';
    }
    
    // Find the path and unit indices
    const pathIndex = BIBLE_PATHS.findIndex(p => p.id === pathId);
    const currentPath = BIBLE_PATHS[pathIndex];
    if (!currentPath) return 'locked'; // Path not found
    
    const unitIndex = currentPath.units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) return 'locked'; // Unit not found
    
    // 2. Check if it's the very first unit overall and not completed
    if (pathIndex === 0 && unitIndex === 0) {
      return 'active';
    }
    
    // 3. Check if the PREVIOUS unit in the SAME path is completed
    if (unitIndex > 0) {
      const previousUnitId = currentPath.units[unitIndex - 1].id;
      if (completedUnitIds.includes(previousUnitId)) {
        return 'active';
      }
    }
    
    // 4. If none of the above, it's locked
    return 'locked';
  };
  
  return { getStatus };
};

// Custom header component for each section
interface SectionHeaderProps {
  title: string;
  isFirst: boolean;
  icon: string;
  color: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, isFirst, icon, color }) => {
  // Get the background color based on path color
  const getBgColor = () => {
    switch (color) {
      case 'yellow': return 'bg-lightYellow';
      case 'red': return 'bg-lightRed';
      case 'green': return 'bg-lightGreen';
      case 'orange': return 'bg-lightOrange';
      case 'teal': return 'bg-lightTeal';
      case 'purple': return 'bg-lightPurple';
      case 'pink': return 'bg-lightPink';
      case 'crimson': return 'bg-lightCrimson';
      case 'indigo': return 'bg-lightIndigo';
      case 'blue': return 'bg-lightBlue';
      case 'cyan': return 'bg-lightCyan';
      case 'scarlet': return 'bg-lightScarlet';
      default: return 'bg-lightGreen';
    }
  };
  
  // Get the border color based on path color
  const getBorderColor = () => {
    switch (color) {
      case 'yellow': return 'border-darkYellow';
      case 'red': return 'border-darkRed';
      case 'green': return 'border-darkGreen';
      case 'orange': return 'border-darkOrange';
      case 'teal': return 'border-darkTeal';
      case 'purple': return 'border-darkPurple';
      case 'pink': return 'border-darkPink';
      case 'crimson': return 'border-darkCrimson';
      case 'indigo': return 'border-darkIndigo';
      case 'blue': return 'border-darkBlue';
      case 'cyan': return 'border-darkCyan';
      case 'scarlet': return 'border-darkScarlet';
      default: return 'border-darkGreen';
    }
  };

  return (
    <View className={`pt-8 pb-4 ${isFirst ? 'mt-0' : 'mt-4'}`}>
      <View className="flex items-center justify-center mx-4">
        <View className={`${getBgColor()} ${getBorderColor()} border-[1px] rounded-xl p-2 flex-row items-center justify-center shadow-sm w-full`}>
          <Ionicons name={(icon || "book") as any} size={24} color="#3C584A" />
          <Text className="text-textPrimary font-feather text-lg text-center ml-2">
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Prepare data for SectionList with section indices and include colors
const sections: BibleSection[] = BIBLE_PATHS.map((path, index) => ({
  title: path.title,
  pathId: path.id,
  index,
  data: path.units,
  icon: path.icon,
  color: path.color,
  description: path.description,
  image: path.image,
  riveName: path.riveName,
  artboardName: path.artboardName
}));

// Safe haptic feedback function
const triggerHaptic = () => {
  // Check if Haptics is available and the method exists
  if (Haptics && typeof Haptics.impactAsync === 'function') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        // Silently fail if haptics don't work
      });
    } catch (error) {
      // Safely ignore haptic errors
      console.log('Haptics not available');
    }
  }
};

// Pulsing animation component
const PulsingCircle: React.FC = () => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.7)).current;
  
  useEffect(() => {
    const pulse = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          })
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ]).start(() => pulse());
    };
    
    pulse();
    return () => {
      // Cleanup animations
      scaleAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, []);
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 9999,
        borderWidth: 2,
        borderColor: '#facc15', // tailwind yellow-400
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    />
  );
};

export default function MapScreen() {
  const router = useRouter();
  const [currentSectionTitle, setCurrentSectionTitle] = useState(sections[0]?.title || 'Map');
  const [currentSectionIcon, setCurrentSectionIcon] = useState(sections[0]?.icon || 'book');
  const [currentSectionColor, setCurrentSectionColor] = useState(sections[0]?.color || 'green');
  const [currentSectionDescription, setCurrentSectionDescription] = useState(sections[0]?.description || '');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(sections[0]?.index || 0);
  const sectionListRef = useRef<SectionList<Unit, BibleSection>>(null);
  
  // Get path store functions
  const { setPathInProgress, setSelectedPath, setSelectedBookChapter, setCurrentPath } = usePathStore();
  const { getStatus } = useUnitStatus(); // Use the custom hook
  const completedUnitIds = usePathStore((state) => state.completedUnitIds);
  
  // Track if we need to suppress haptic feedback (e.g., on first render)
  const isFirstRender = useRef(true);
  // To prevent excessive updates
  const lastUpdate = useRef(Date.now());
  const updateIntervalMs = 50; // Faster header updates

  const handleNodePress = (unit: Unit) => {
    console.log('Pressed unit:', unit.title, unit.reference);
    console.log('Reference details:', JSON.stringify(unit.reference));
    
    // Get the current section/path information
    const currentPath = sections.find(section => section.data.some(u => u.id === unit.id));
    
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
    const endChapter = Array.isArray(chapters) && chapters.length > 1 ? chapters[chapters.length - 1] : startChapter;
    
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
    setSelectedPath(
      currentPath.pathId,
      currentPath.title,
      unit.id,
      unit.title,
      startChapter,
      endChapter
    );
    
    // Set the complete current path object 
    const pathInfo: PathInfo = {
      pathId: currentPath.pathId,
      pathTitle: currentPath.title,
      unitId: unit.id,
      unitTitle: unit.title,
      bookId,
      startChapter,
      endChapter
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
            timestamp: Date.now().toString() // Force new params by adding timestamp
          }
        });
    } else {
        console.warn('Invalid unit reference for navigation:', unit.reference);
    }
  };

  // This function handles viewability change for section headers
  const onViewableItemsChanged = useCallback(({ viewableItems, changed }: { 
    viewableItems: ViewToken[],
    changed: ViewToken[] 
  }) => {
    // Skip if too soon since last update
    const now = Date.now();
    if (now - lastUpdate.current < updateIntervalMs) {
      return;
    }
    
    // Determine currently focused section (closest to top) by taking the last visible section (highest index)
    const visibleSections = viewableItems
      .filter(token => token.isViewable && token.section)
      .map(token => token.section);

    if (visibleSections.length > 0) {
      const focusedSection = visibleSections.reduce((prev, curr) => (curr.index > prev.index ? curr : prev), visibleSections[0]);

      if (focusedSection && focusedSection.title !== currentSectionTitle) {
        // Update the current section title, icon, color, description, and index
        setCurrentSectionTitle(focusedSection.title);
        setCurrentSectionIcon(focusedSection.icon || 'book');
        setCurrentSectionColor(focusedSection.color || 'green');
        setCurrentSectionDescription(focusedSection.description || '');
        setCurrentSectionIndex(focusedSection.index || 0);
        
        lastUpdate.current = now;
        
        // Don't trigger haptic on first render
        if (!isFirstRender.current) {
          triggerHaptic(); // Use our safe wrapper instead of direct call
        } else {
          isFirstRender.current = false;
        }
      }
    }
  }, [currentSectionTitle]);

  // Create a viewability config ref
  const viewabilityConfig = {
    // Consider an item visible when at least 10% is visible
    itemVisiblePercentThreshold: 0,
    // This helps ensure we catch the sections early
    minimumViewTime: 1,
  };

  // Find the next available unit
  const nextAvailableUnit = useCallback(() => {
    // Find first unit or next unlocked unit that isn't completed
    for (const path of BIBLE_PATHS) {
      for (let i = 0; i < path.units.length; i++) {
        const unit = path.units[i];
        // Skip if already completed
        if (completedUnitIds.includes(unit.id)) continue;
        
        // First unit or unit after a completed one is available
        if (i === 0 || completedUnitIds.includes(path.units[i-1].id)) {
          console.log("Next available unit:", unit.id, unit.title);
          return unit;
        }
      }
    }
    return null;
  }, [completedUnitIds]);
  
  // Track visible items to locate next unit on screen
  const [nextItemLayout, setNextItemLayout] = useState<{ id: string, x: number, y: number } | null>(null);
  const [showNextIndicator, setShowNextIndicator] = useState(false);
  const nextUnit = nextAvailableUnit();
  
  // Function to check if a unit should be indicated as next  
  const isNextUnit = useCallback((unit: Unit) => {
    return nextUnit?.id === unit.id;
  }, [nextUnit]);
  
  // Render a node item
  const renderItem = useCallback(({ item, index, section }: { 
    item: Unit, 
    index: number, 
    section: BibleSection
  }) => {
    const status = getStatus(section.pathId, item.id);
    const alignment = ['center', 'start', 'center', 'end'][index % 4] as 'start' | 'center' | 'end';
    const shouldIndicateNext = isNextUnit(item);
    
    // Position within each section (repeating pattern)
    // Show sheep only at second node position of every section
    const isSecondNodeInSection = index === 1;
    
    // Show journal icon only at fourth node position of every section
    const isFourthNodeInSection = index === 3;
    
    if (shouldIndicateNext) {
      console.log(`Next unit on screen: ${item.id} (${item.title})`);
    }
    
    return (
      <View className="relative">
        <PathNode
          key={item.id}
          unit={item}
          status={status}
          alignment={alignment}
          onPress={handleNodePress}
        />
        
        {/* Sheep decoration at second node position in every section */}
        {isSecondNodeInSection && section.riveName && section.artboardName && (
          <View 
            className={`absolute ${section.riveName === 'successLamb' ? 'right-24' : 'right-2'} top-1/2 -translate-y-1/2`}
            style={{ zIndex: 10 }}
          >
            <View className="w-44 h-44">
              <Rive
                resourceName={section.riveName}
                artboardName={section.artboardName}
                autoplay={true}
                style={{
                  width: section.riveName === 'successLamb' ? '200%' : '100%',
                  height: section.riveName === 'successLamb' ? '200%' : '100%',
                  opacity: section.pathId === 'genesis-beginnings' ? 1 : 0.5,
                }}
              />
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
              style={{ width: 128, height: 128 }}
              resizeMode="contain"
              className="opacity-50"
            />
          </View>
        )}
        
    
      </View>
    );
  }, [getStatus, handleNodePress, isNextUnit]);

  // Render section header
  const renderSectionHeader = ({ section }: { section: BibleSection }) => (
    <SimpleSectionHeader 
      title={section.title} 
      isFirst={section.index === 0}
    />
  );

  interface SimpleSectionHeaderProps {
    title: string;
    isFirst: boolean;
  }
  
  const SimpleSectionHeader: React.FC<SimpleSectionHeaderProps> = ({ title, isFirst }) => {
    return (
      <View className={`pt-6 pb-4 ${isFirst ? 'mt-0' : 'mt-6 border-t border-gray-300 mx-8'}`}>
      
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surfaceCream">
      {/* Custom Sticky Header */}
      <StickyPathHeader 
        title={currentSectionTitle} 
        icon={currentSectionIcon}
        color={currentSectionColor}
        description={currentSectionDescription}
        sectionNumber={currentSectionIndex + 1}
      />

      <SectionList<Unit, BibleSection>
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        SectionSeparatorComponent={null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 40 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        stickySectionHeadersEnabled={false} 
        className="-mt-16"
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