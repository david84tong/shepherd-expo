import { useAssets } from 'expo-asset';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, Animated, ScrollView, ImageBackground, SafeAreaView, StatusBar } from 'react-native';
import BackButton from '../components/BackButton';
import PrimaryButton from '../components/PrimaryButton';
import { Unit, SHORTER_BIBLE_PATHS_2, BIBLE_PATHS } from './models/Path';
import { usePathStore } from './stores/pathStore';
import { useUserStore } from './stores/userStore';
import analytics from '../utils/analytics';

export default function BiblePreviewScreen() {
  const params = useLocalSearchParams();
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(-100)).current;
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
    currentPath,
  } = usePathStore();

  // Use selectedPath to determine the correct order for BIBLE_PATHS
  const selectedPath = usePathStore((state) => state.selectedPath);
  const orderedPaths = useMemo(() => {
    const pathsToUse = frequencyGoal === '1-5' ? SHORTER_BIBLE_PATHS_2 : BIBLE_PATHS;

    if (selectedPath && Array.isArray(selectedPath.order) && selectedPath.order.length > 0) {
      const pathMap = Object.fromEntries(pathsToUse.map((p) => [p.id, p]));
      const ordered = selectedPath.order.map((id) => pathMap[id]).filter(Boolean);
      const remaining = pathsToUse.filter((p) => !selectedPath.order.includes(p.id));
      return [...ordered, ...remaining];
    }
    return pathsToUse;
  }, [selectedPath, frequencyGoal]);

  // Find the next uncompleted unit from the ordered paths
  const nextUnit = useMemo(() => {
    // If we have a current path set from the map, use that unit
    if (currentPath) {
      for (const path of orderedPaths) {
        const unit = path.units.find(u => u.id === currentPath.unitId);
        if (unit) return unit;
      }
    }
    
    // Otherwise find the next uncompleted unit
    let nextUnitToComplete: Unit | null = null;
    for (const path of orderedPaths) {
      for (const unit of path.units) {
        if (!completedUnitIds.includes(unit.id)) {
          nextUnitToComplete = unit;
          break;
        }
      }
      if (nextUnitToComplete) break;
    }
    if (!nextUnitToComplete && orderedPaths.length > 0 && orderedPaths[0].units.length > 0) {
      nextUnitToComplete = orderedPaths[0].units[0];
    }
    return nextUnitToComplete;
  }, [completedUnitIds, orderedPaths, currentPath]);

  // Helper to get a single BibleReference from nextUnit.reference
  const getFirstReference = (ref: Unit['reference']) => (Array.isArray(ref) ? ref[0] : ref);

  // Content for the preview card
  const title = useMemo(() => nextUnit?.title || 'The Good Shepherd', [nextUnit]);
  const subtitle = useMemo(() => {
    if (nextUnit) {
      const ref = getFirstReference(nextUnit.reference);
      const chapters = ref.chapters;
      
      // If there's only one chapter, show single chapter format
      if (chapters.length === 1) {
        return `Next: ${ref.bookName} ${chapters[0]}`;
      } else {
        // Show chapter range
        const startChapter = chapters[0];
        const endChapter = chapters[chapters.length - 1];
        return `Next: ${ref.bookName} ${startChapter}-${endChapter}`;
      }
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

  // Animation values for the primary button
  const buttonAnim = useRef(new Animated.Value(60)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollViewRef = useRef(null);

  // Prepare for future Rive usage
  const [riveAssets] = useAssets([require('../assets/riveAnimations/homeLamb.riv')]);

  useEffect(() => {
    // Animate the container opacity and card entry
    Animated.parallel([
      Animated.timing(containerOpacity, {
        toValue: 1,
        duration: 400,
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
  }, []);

  const handleBack = () => {
    setPathInProgress(false);
    router.back();
  };

  const handleStart = () => {
    if (nextUnit) {
      // Find the path that contains this unit
      let pathId = '';
      let pathTitle = '';
      for (const path of orderedPaths) {
        if (path.units.some((u) => u.id === nextUnit.id)) {
          pathId = path.id;
          pathTitle = path.title;
          break;
        }
      }

      const ref = getFirstReference(nextUnit.reference);
      const startChapter = ref.chapters[0];
      const endChapter = ref.chapters[ref.chapters.length - 1];

      setPathInProgress(true);
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

  const handleJustReadBible = () => {
    setPathInProgress(true);
    router.push({
      pathname: '/bibleReader',
      params: {
        bookId: savedBookId?.toString(),
        chapters: savedChapter?.toString(),
        title: savedBook,
        source: 'just-read',
        justReadMode: 'true',
        timestamp: Date.now().toString(),
        isFromDailyBread: 'true',
      },
    });
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      setScrolledToBottom(true);
    } else {
      setScrolledToBottom(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/backgrounds/path1Background.png')}
      style={{ flex: 1 }}
      resizeMode="cover">
      <SafeAreaView className="flex-1">
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        
        <Animated.View
          className="flex-1"
          style={{ opacity: containerOpacity }}>
          
          {/* Back Button - Same position as map.tsx */}
          <BackButton
            onPress={handleBack}
            containerClassName="absolute -top-12 left-0 z-50"
          />

          {/* Content Area */}
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingTop: 120,
              paddingBottom: 150,
              alignItems: 'center',
            }}
            className="w-full flex-1"
            showsVerticalScrollIndicator={false}>
            
            {/* Animated Card Preview */}
            <Animated.View
              className="w-[90%] bg-surfaceCream rounded-[28px] py-8 px-6 items-center border-4 border-border mb-6 -mt-8"
              style={{ 
                opacity: cardOpacity, 
                transform: [{ translateY: cardAnim }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
              }}>
              <Text className="text-h1 font-feather text-accentGold mb-2 text-center leading-tight">
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

          {/* Buttons Container */}
          <Animated.View
            className="absolute bottom-0 left-0 right-0 w-full px-5 pb-8 pt-4 items-center bg-transparent"
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
      </SafeAreaView>
    </ImageBackground>
  );
} 