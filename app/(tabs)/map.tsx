import React, { useState, useRef, useCallback } from 'react';
import { View, Text, SectionList, Pressable, SafeAreaView, NativeSyntheticEvent, NativeScrollEvent, ViewToken, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BIBLE_PATHS, Unit, Path } from '../models/Path';
import { usePathStore, PathInfo } from '../stores/pathStore';

// Define node status
type NodeStatus = 'locked' | 'active' | 'completed';

// Define our custom section type
type BibleSection = {
  title: string;
  pathId: string;
  index: number;
  data: Unit[];
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

// Node Component (for Units)
interface PathNodeProps {
  unit: Unit;
  status: NodeStatus;
  alignment: 'start' | 'center' | 'end';
  onPress: (unit: Unit) => void;
}

const PathNode: React.FC<PathNodeProps> = ({ unit, status, alignment, onPress }) => {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = status === 'locked';

  const alignmentClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  }[alignment];

  const nodeBgColor = {
    locked: 'bg-gray-300',
    active: 'bg-accentGold',
    completed: 'bg-forestGreen80',
  }[status];

  const nodeBorderColor = {
    locked: 'border-gray-400',
    active: 'border-buttonBorder',
    completed: 'border-forestGreen50',
  }[status];

  const iconColor = isDisabled ? '#9CA3AF' : '#FFFFFF';

  // Enhanced shadow styling
  let shadowStyle = {};
  if (!isPressed) {
    if (status === 'active') {
      // Use direct style object for more control over the active shadow
      shadowStyle = { 
        shadowColor: '#FFE4A8', // Golden yellow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.8,
        shadowRadius: 0,
        elevation: 10
      };
    } else if (status === 'completed') {
      shadowStyle = { 
        shadowColor: '#A0D468', // Green
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.7,
        shadowRadius: 0,
        elevation: 8
      };
    } else {
      // Locked state
      shadowStyle = { 
        shadowColor: '#9CA3AF', // Gray
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 0,
        elevation: 5
      };
    }
  }

  // TailwindCSS shadow classes (as fallbacks)
  const nodeShadowBase = 'shadow-[0px_6px_0px_0px_';
  const nodeShadowColor = {
    locked: '#D1D5DB]',
    active: 'rgba(219,185,86,0.7)]',
    completed: 'rgba(209,232,163,1)]',
  }[status];
  const nodeShadowClass = !isPressed ? `${nodeShadowBase}${nodeShadowColor}` : '';

  return (
    <View className={`w-full px-16 my-4 ${alignmentClass}`}> 
      <Pressable
        onPress={() => !isDisabled && onPress(unit)}
        disabled={isDisabled}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        className={`
          w-24 h-24 rounded-full items-center justify-center border-4 
          p-2
          ${nodeBgColor} ${nodeBorderColor}
          transform ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}
          ${nodeShadowClass} 
        `}
        style={{ 
          ...shadowStyle,
          elevation: isPressed ? 2 : (status === 'active' ? 10 : 5)
        }}
      >
        <Ionicons name="book" size={32} color={iconColor} />
        <Text 
          className={`text-center text-xs mt-1 ${isDisabled ? 'text-gray-500' : 'text-white'} font-din`} 
          numberOfLines={2}
        >
          {unit.title}
        </Text>
      </Pressable>
    </View>
  );
};

// Custom header component for each section
interface SectionHeaderProps {
  title: string;
  isFirst: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, isFirst }) => {
  return (
    <View className={`pt-6 pb-4 ${isFirst ? 'mt-0' : 'mt-6 border-t border-gray-300 mx-8'}`}>
      <Text className="text-center font-feather text-heading3 text-textPrimary">
        {title}
      </Text>
    </View>
  );
};

// Sticky header at the top
interface StickyHeaderProps {
  title: string;
}

const StickyPathHeader: React.FC<StickyHeaderProps> = ({ title }) => {
  return (
    <View className="absolute top-0 left-0 right-0 pt-10 bg-surfaceCream z-10"> 
      <View className="px-4 pt-4 mb-2">
        <View className="bg-forestGreen80 rounded-2xl p-4 items-center justify-center shadow-md">
          <Text className="text-white font-feather text-heading3 text-center">{title}</Text>
        </View>
      </View>
    </View>
  );
};

// Prepare data for SectionList with section indices
const sections: BibleSection[] = BIBLE_PATHS.map((path, index) => ({
  title: path.title,
  pathId: path.id,
  index,
  data: path.units,
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

export default function MapScreen() {
  const router = useRouter();
  const [currentSectionTitle, setCurrentSectionTitle] = useState(sections[0]?.title || 'Map');
  const sectionListRef = useRef<SectionList<Unit, BibleSection>>(null);
  
  // Get path store functions
  const { setPathInProgress, setSelectedPath, setSelectedBookChapter, setCurrentPath } = usePathStore();
  const { getStatus } = useUnitStatus(); // Use the custom hook
  
  // Track if we need to suppress haptic feedback (e.g., on first render)
  const isFirstRender = useRef(true);
  // To prevent excessive updates
  const lastUpdate = useRef(Date.now());
  const updateIntervalMs = 300; // Minimum ms between updates

  const handleNodePress = (unit: Unit) => {
    console.log('Pressed unit:', unit.title, unit.reference);
    console.log('Reference details:', JSON.stringify(unit.reference));
    
    // Get the current section/path information
    const currentPath = sections.find(section => section.data.some(u => u.id === unit.id));
    
    if (!currentPath) {
      console.warn('Path not found for unit:', unit.id);
      return;
    }
    
    // Get chapter range
    const { bookId, chapters } = unit.reference;
    const startChapter = Array.isArray(chapters) && chapters.length > 0 ? chapters[0] : 1;
    const endChapter = Array.isArray(chapters) && chapters.length > 1 ? chapters[chapters.length - 1] : startChapter;
    
    // Create the book name lookup based on bookId
    // This is a simplified mapping - in a real app, you'd have a more complete mapping
    const bookNames: Record<number, string> = {
      1: "Genesis",
      2: "Exodus",
      // Add more as needed
      43: "John",
      44: "Acts",
      45: "Romans",
      // Add more as needed
    };
    
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
    
    // Look for section changes
    const visibleSections = viewableItems
      .filter(token => token.isViewable && token.section)
      .map(token => token.section);
    
    if (visibleSections.length > 0) {
      // Get the first visible section (topmost)
      const topSection = visibleSections.reduce((prev, curr) => 
        (curr.index < prev.index) ? curr : prev, visibleSections[0]);
      
      if (topSection && topSection.title !== currentSectionTitle) {
        // Update the current section title
        setCurrentSectionTitle(topSection.title);
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
    itemVisiblePercentThreshold: 10,
    // This helps ensure we catch the sections early
    minimumViewTime: 10,
  };

  // Render item function for SectionList
  const renderUnitItem = ({ item, index, section }: { 
    item: Unit, 
    index: number, 
    section: BibleSection
  }) => {
    const status = getStatus(section.pathId, item.id); // Get status from hook
    const alignment = ['center', 'start', 'center', 'end'][index % 4] as 'start' | 'center' | 'end';
    return (
      <PathNode
        key={item.id}
        unit={item}
        status={status}
        alignment={alignment}
        onPress={handleNodePress}
      />
    );
  };

  // Render section header with custom component
  const renderSectionHeader = ({ section }: { section: BibleSection }) => (
    <SectionHeader 
      title={section.title} 
      isFirst={section.index === 0} 
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-surfaceCream">
      {/* Debug button with Genesis parameters */}
      <TouchableOpacity
        onPress={() => 
        { 
          console.log("genesis 1");
           router.push({
          pathname: '/bibleReader',
          params: { 
            bookId: "1", 
            chapters: "1",
            title: "Genesis 1 - Direct Debug",
            source: 'debug-button',
            timestamp: Date.now().toString()
          }
        })
      }
      }
        style={{ 
          padding: 8, 
          backgroundColor: '#FFE4A8', 
          margin: 8, 
          borderRadius: 8,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#3C584A', fontWeight: 'bold' }}>📖 OPEN GENESIS 1 DIRECT</Text>
      </TouchableOpacity>
      
      {/* Custom Sticky Header */}
      <StickyPathHeader title={currentSectionTitle} />

      <SectionList<Unit, BibleSection>
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderUnitItem}
        renderSectionHeader={renderSectionHeader}
        // Remove the separate section separator since we integrated it into the header
        SectionSeparatorComponent={null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 40 }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // Use a more standard scroll throttle value
        scrollEventThrottle={16}
        stickySectionHeadersEnabled={false} // Disable default sticky headers
      />
    </SafeAreaView>
  );
} 