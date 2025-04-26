import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import PrimaryButton from './PrimaryButton';
import { router } from 'expo-router';
import { usePathStore } from '../app/stores/pathStore';
import BackButton from './BackButton';
import * as Haptics from 'expo-haptics';
import { Unit, BIBLE_PATHS } from '../app/models/Path'; // Import Unit and BIBLE_PATHS

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
  
  // Get saved reading & path in progress state from path store
  const { 
    savedBook, 
    savedChapter, 
    setPathInProgress, 
    savedBookId, 
    completedUnitIds,
    setCurrentPath
  } = usePathStore();
  
  // Find the next uncompleted unit from BIBLE_PATHS
  const nextUnit = useMemo(() => {
    let nextUnitToComplete: Unit | null = null;
    
    console.log('Finding next uncompleted unit. Completed:', completedUnitIds);
    
    // Iterate through all paths in order
    for (const path of BIBLE_PATHS) {
      // Iterate through units in order within each path
      for (const unit of path.units) {
        // Find the first unit that's not in completedUnitIds
        if (!completedUnitIds.includes(unit.id)) {
          console.log(`Found next uncompleted unit: ${unit.title}`);
          nextUnitToComplete = unit;
          
          // Also store the path details in a variable for later use
          const pathInfo = {
            pathId: path.id,
            pathTitle: path.title
          };
          
          // Break out of unit loop once we find the first uncompleted unit
          break;
        }
      }
      
      // Break out of path loop if we found a unit
      if (nextUnitToComplete) break;
    }
    
    // If no uncompleted unit was found, default to the first unit
    if (!nextUnitToComplete && BIBLE_PATHS.length > 0 && BIBLE_PATHS[0].units.length > 0) {
      console.log('No uncompleted units found, defaulting to first unit');
      nextUnitToComplete = BIBLE_PATHS[0].units[0];
    }
    
    return nextUnitToComplete;
  }, [completedUnitIds]);
  
  // Content for the preview card - either from nextUnit or fallbacks
  const title = useMemo(() => nextUnit?.title || "The Good Shepherd", [nextUnit]);
  const subtitle = useMemo(() => 
    nextUnit ? 
    `Next: ${nextUnit.reference.bookName} ${nextUnit.reference.chapters[0]}` : 
    `Today's Reading · ${savedBook} ${savedChapter}`,
    [nextUnit, savedBook, savedChapter]
  );
  const summary = useMemo(() => 
    nextUnit?.description || 
    (savedBook === 'John' && savedChapter === 3 ? 
     "Jesus teaches Nicodemus about being born again and God's love for the world." : 
     "Jesus describes Himself as the Good Shepherd who lays down His life for the sheep."),
    [nextUnit, savedBook, savedChapter]
  );

  // Determine bookId and chapter for the "Start Reading" button
  const bookIdToLoad = useMemo(() => nextUnit?.reference.bookId || savedBookId, [nextUnit, savedBookId]);
  const chaptersToLoad = useMemo(() => 
    nextUnit ? nextUnit.reference.chapters.join(',') : savedChapter.toString(), 
    [nextUnit, savedChapter]
  );

  // Animation values for the primary button
  const buttonAnim = useRef(new Animated.Value(60)).current; // Start 60 units below final position
  const buttonOpacity = useRef(new Animated.Value(0)).current; // Start fully transparent

  useEffect(() => {
    if (visible) {
      // First animate the container opacity and card entry
      Animated.parallel([
        Animated.timing(containerOpacity, { // Fade in container
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
        })
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
          })
        ]).start();
      }, 200); 
    } else {
      // Reset animations when component is hidden
      containerOpacity.setValue(0); // Reset container opacity
      cardAnim.setValue(-100);
      cardOpacity.setValue(0);
      buttonAnim.setValue(60);
      buttonOpacity.setValue(0);
    }
  }, [visible, containerOpacity, cardAnim, cardOpacity, buttonAnim, buttonOpacity]);

  // We still return null immediately when not visible
  if (!visible) return null;

  const handleBack = () => {
    setPathInProgress(false);
    onClose();
  };

  const handleStart = () => {
    // Set up the path information if we have a nextUnit
    if (nextUnit) {
      console.log('Starting reading with unit:', nextUnit.title);
      
      // Find the path that contains this unit
      let pathId = '';
      let pathTitle = '';
      for (const path of BIBLE_PATHS) {
        if (path.units.some(u => u.id === nextUnit.id)) {
          pathId = path.id;
          pathTitle = path.title;
          break;
        }
      }
      
      // Get start and end chapters
      const startChapter = nextUnit.reference.chapters[0];
      const endChapter = nextUnit.reference.chapters[nextUnit.reference.chapters.length - 1];
      
      // Set the currentPath in the pathStore
      setPathInProgress(true); // Keep path progress active for Bible Reader
      setCurrentPath({
        pathId: pathId,
        pathTitle: pathTitle,
        unitId: nextUnit.id,
        unitTitle: nextUnit.title,
        bookId: nextUnit.reference.bookId,
        startChapter: startChapter,
        endChapter: endChapter
      });
    }
    
    // Explicitly trigger haptic feedback before navigation
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Silently fail if haptics not available
    }
    
    // Use a simpler approach - this will rely on our route config in _layout.tsx
    // for the slide_from_right animation
    router.push({
      pathname: '/bibleReader', // Use bibleReader which we know is configured correctly
      params: { 
        bookId: bookIdToLoad.toString(), // Use determined bookId
        chapters: chaptersToLoad, // Use determined chapters
        title: title, // Pass the dynamic title
        source: 'preview',
        timestamp: Date.now().toString() // Force params refresh
      }
    });
  };

  return (
    <Animated.View
      className="absolute inset-0 flex flex-col"
      style={{ opacity: containerOpacity }}
      pointerEvents="box-none"
    >
      {/* Back Button */}
      <BackButton onPress={handleBack} />

      {/* Animated Card Preview at the top */} 
      <Animated.View
        className="w-[90%] bg-surfaceCream rounded-[28px] py-8 px-6 items-center z-10 mx-auto my-auto mt-[120px] border-4 border-border "
        style={{ opacity: cardOpacity, transform: [{ translateY: cardAnim }] }}
      >
        {/* Pillar Title */} 
        <Text className="text-h1 font-feather text-accentGold mb-2 text-center leading-tight ">{title}</Text>
        {/* Date or subtitle */} 
        <Text className="text-body font-din text-[#B89B4C] mb-4">{subtitle}</Text>
        {/* Summary Section */} 
        <View className="w-full bg-surfaceCream/50 rounded-[18px] p-4 mt-2 border border-border mb-2">
          <Text className="text-caption font-din text-[#B89B4C] text-center uppercase mb-1 tracking-wider">SUMMARY</Text>
          <Text className="text-body font-din text-textPrimary text-center">
            {summary}
          </Text>
        </View>
      </Animated.View>
      <View className="flex-1 h-96" />
      {/* Animated Primary Button */}
      <Animated.View 
        className="w-full px-5 mb-10 mt-auto items-center z-10 mt-0"
        style={{ opacity: buttonOpacity, transform: [{ translateY: buttonAnim }] }}
      >
        <PrimaryButton title="Start Reading" onPress={handleStart} />
      </Animated.View>
    </Animated.View>
  );
};

export default BiblePreviewComponent;
