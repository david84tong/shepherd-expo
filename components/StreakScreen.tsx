import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useAssets } from 'expo-asset';
import { router } from 'expo-router';
import { usePathStore } from '../app/stores/pathStore';
import { useUserStore } from '~/app/stores/userStore';
import Rive, { RiveRef } from 'rive-react-native';
import PrimaryButton from './PrimaryButton';
import { getStreakSubtext } from '../app/hooks/streakHook';
/* ─────────────── helper ─────────────── */
type DayStatus = 'BEFORE_ACCOUNT' | 'TODAY_PENDING' | 'COMPLETED' | 'MISSED' | 'FUTURE';

interface WeekCell {
  dateKey: string; // 'YYYY-MM-DD'
  label: string; // single-letter weekday
  status: DayStatus;
  isToday: boolean;
}

/**
 * Build 7 cells centered on today: index 3 === today, indices 0-2 are past days, indices 4-6 are future days
 * - No past dates earlier than account-creation ever get 'MISSED'.
 */
const buildWeekCells = (
  today: dayjs.Dayjs,
  accountCreated: dayjs.Dayjs,
  completed: Set<string>
): WeekCell[] => {
  return Array.from({ length: 7 }).map((_, i) => {
    // Start 3 days before today and go up to 3 days after today
    const d = today.subtract(3 - i, 'day');
    const key = d.format('YYYY-MM-DD');
    const isToday = d.isSame(today, 'day');

    let status: DayStatus;
    if (d.isBefore(accountCreated, 'day')) status = 'BEFORE_ACCOUNT';
    else if (isToday) status = completed.has(key) ? 'COMPLETED' : 'TODAY_PENDING';
    else if (d.isAfter(today, 'day')) status = 'FUTURE';
    else if (completed.has(key)) status = 'COMPLETED';
    else status = 'MISSED';

    return {
      dateKey: key,
      label: d.format('dd')[0], // 'S', 'M', …
      status,
      isToday,
    };
  });
};

export const StreakScreen = () => {
  // Animation states
  const animationsInitialized = useRef(false);
  const screenOpacity = useSharedValue(0);
  const flameOpacity = useSharedValue(0);
  const flameScale = useSharedValue(0.5);
  const streakNumberOpacity = useSharedValue(0);
  const streakTextOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(30);
  const subtextOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const riveRef = useRef<RiveRef>(null);

  // 1. grab data from the store
  const createdAt = useUserStore((s) => s.getCreatedAt()); // Firestore Timestamp or Date
  const completedReadings = useUserStore((s) => s.getCompletedReadings());
  const setStreakCount = useUserStore((state) => state.setStreakCount);
  const syncWithFirestore = useUserStore((state) => state.syncWithFirestore);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // 2. normalize → dayjs (memoized to prevent recalculation)
  const today = useMemo(() => dayjs().startOf('day'), []);
  const createdDate = useMemo(
    () => (createdAt ? dayjs((createdAt as any)?.toDate?.() ?? createdAt).startOf('day') : today),
    [createdAt, today]
  );

  // Process completed readings (memoized)
  const { completedSet, completedDates } = useMemo(() => {
    // Convert completed readings to readable dates for debugging
    const dates = completedReadings.map((r) => {
      const d = r.date;
      const formattedDate =
        d && typeof d.toDate === 'function'
          ? dayjs(d.toDate()).format('YYYY-MM-DD')
          : d instanceof Date
            ? dayjs(d).format('YYYY-MM-DD')
            : 'invalid date';

      return {
        book: r.book,
        formattedDate,
        rawDate: d,
      };
    });

    // Build the completed set
    const set = new Set<string>(
      completedReadings
        .map((r) => {
          const d = r.date;
          return d && typeof d.toDate === 'function'
            ? dayjs(d.toDate()).format('YYYY-MM-DD')
            : d instanceof Date
              ? dayjs(d).format('YYYY-MM-DD')
              : null;
        })
        .filter(Boolean) as string[]
    );

    return { completedSet: set, completedDates: dates };
  }, [completedReadings]);

  // 3. build the centered grid (today in the middle)
  const weekCells = useMemo(
    () => buildWeekCells(today, createdDate, completedSet),
    [today, createdDate, completedSet]
  );

  // 4. calculate streak (memoized to prevent recalculation)
  const streak = useMemo(() => {
    const todayStr = today.format('YYYY-MM-DD');
    const yesterdayStr = today.subtract(1, 'day').format('YYYY-MM-DD');
    const twoDaysAgoStr = today.subtract(2, 'day').format('YYYY-MM-DD');

    // Check if consecutive days are in the completedSet
    const hasTodayCompleted = completedSet.has(todayStr);
    const hasYesterdayCompleted = completedSet.has(yesterdayStr);
    const hasTwoDaysAgoCompleted = completedSet.has(twoDaysAgoStr);

    // Calculate streak - start from today and go backwards
    let calculatedStreak = 0;
    if (hasTodayCompleted) {
      calculatedStreak++;
      if (hasYesterdayCompleted) {
        calculatedStreak++;
        if (hasTwoDaysAgoCompleted) {
          calculatedStreak++;
        }
      }
    } else if (hasYesterdayCompleted) {
      // If today isn't complete but yesterday is, start from yesterday
      calculatedStreak = 1;
      if (hasTwoDaysAgoCompleted) {
        calculatedStreak++;
      }
    }

    // Store debug info but only once, not on every render
    if (!debugInfo) {
      setDebugInfo({
        today: todayStr,
        yesterday: yesterdayStr,
        twoDaysAgo: twoDaysAgoStr,
        hasTodayCompleted,
        hasYesterdayCompleted,
        hasTwoDaysAgoCompleted,
        completedDates: Array.from(completedSet),
        createdDate: createdDate.format('YYYY-MM-DD'),
      });

      console.log('Debug streak info:', {
        streak: calculatedStreak,
        completedDates: Array.from(completedSet),
        createdDate: createdDate.format('YYYY-MM-DD'),
        today: todayStr,
      });
    }

    return calculatedStreak;
  }, [today, createdDate, completedSet, debugInfo]);

  // Update the user's streakCount in the store whenever streak changes
  useEffect(() => {
    setStreakCount(streak);
    console.log('streak', streak);
  }, [streak, setStreakCount]);

  // Setup animations when component mounts
  useLayoutEffect(() => {
    if (animationsInitialized.current) return;

    // Start with screen fade in - set immediate value to avoid flicker
    screenOpacity.value = 0;
    screenOpacity.value = withTiming(1, { duration: 300 });

    // Initialize all animations immediately without delay
    const startAnimations = () => {
      // Flame animation
      flameOpacity.value = withTiming(1, { duration: 400 });
      flameScale.value = withSpring(1, {
        damping: 10,
        stiffness: 80,
      });

      // Streak number and text animation
      streakNumberOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
      streakTextOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));

      // Card animation
      cardOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
      cardTranslateY.value = withDelay(
        400,
        withSpring(0, {
          damping: 12,
          stiffness: 100,
          mass: 0.8,
        })
      );

      // Subtext and button animations
      subtextOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));
      buttonOpacity.value = withDelay(700, withTiming(1, { duration: 300 }));
      buttonTranslateY.value = withDelay(
        700,
        withSpring(0, {
          damping: 12,
          stiffness: 100,
        })
      );

      animationsInitialized.current = true;
    };

    // Start animations immediately
    startAnimations();

    // Trigger the Rive animation immediately
    if (riveRef.current) {
      riveRef.current.play();
    }
  }, []);

  // Define animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    flex: 1,
  }));

  const flameContainerStyle = useAnimatedStyle(() => ({
    opacity: flameOpacity.value,
    transform: [{ scale: flameScale.value }],
  }));

  const streakNumberStyle = useAnimatedStyle(() => ({
    opacity: streakNumberOpacity.value,
  }));

  const streakTextStyle = useAnimatedStyle(() => ({
    opacity: streakTextOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const subtextStyle = useAnimatedStyle(() => ({
    opacity: subtextOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // Load Rive assets
  const [riveAssets] = useAssets([require('../assets/riveAnimations/successLamb.riv')]);

  const subText = getStreakSubtext(streak);

  // Add a function to handle continue button press
  const setPathInProgress = usePathStore((state) => state.setPathInProgress);

  const handleContinue = () => {
    console.log('[StreakScreen] Continue pressed. Resetting pathInProgress and navigating to home.');
    setPathInProgress(false);
    router.replace('/(tabs)');
  };

  // Show loading indicator if assets aren't loaded yet
  if (!riveAssets) {
    return (
      <View className="flex-1 items-center justify-center bg-surfaceCream">
        <ActivityIndicator size="large" color="#F2B705" />
        <Text className="font-feather text-textPrimary mt-4">Loading streak animation...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={containerStyle} className="flex-1 bg-surfaceCream justify-between">
      {/* Large flame with streak number */}
      <Animated.View style={flameContainerStyle} className="items-center mt-10 mb-2">
        <View className="relative justify-center items-center mb-1">
          <View className="w-96 h-96 justify-center items-center">
            <Rive
              url={riveAssets[0].localUri!}
              artboardName='streak'
              autoplay
              style={{ width: '200%', height: '200%' }}
              ref={riveRef}
            />
          </View>
        </View>
        <View className="flex flex-col justify-center items-center -mt-20">
          <Animated.Text
            style={streakNumberStyle}
            className="absolute text-[96px] font-feather-bold text-textPrimary mb-12 -top-16">
            {streak}
          </Animated.Text>
          <Animated.Text
            style={streakTextStyle}
            className="text-textPrimary text-2xl font-feather-bold mb-1 tracking-wide mt-12">
            day streak!
          </Animated.Text>
        </View>
      </Animated.View>

      {/* Day tracker card */}
      <Animated.View
        style={cardStyle}
        className="mx-4 rounded-card border-4 border-border bg-white py-4 px-2 py-6">
        <View className="flex-row justify-between items-center mb-2 px-4">
          {weekCells.map((cell) => (
            <View key={cell.dateKey} className="items-center mx-1">
              <Text
                className={`font-feather text-md mb-1
                ${cell.isToday ? 'text-accentGold font-feather-bold' : 'text-description'}`}>
                {cell.label}
              </Text>

              {/* icon swap */}
              {cell.status === 'BEFORE_ACCOUNT' && <View className="w-10 h-10" />}
              {cell.status === 'FUTURE' && <View className="w-10 h-10 rounded-full bg-[#EAEAEA]" />}
              {cell.status === 'TODAY_PENDING' && (
                <View className="w-10 h-10 rounded-full border-2 border-accentGold items-center justify-center">
                  <Ionicons name="ellipsis-horizontal" size={24} color="#F2B705" />
                </View>
              )}
              {cell.status === 'COMPLETED' && (
                <View className="w-10 h-10 rounded-full bg-accentGold items-center justify-center">
                  <Image source={require('../assets/icons/whiteCheck.png')} className="w-12 h-12" />
                </View>
              )}
              {cell.status === 'MISSED' && (
                <View className="w-10 h-10 rounded-full bg-[#EAEAEA] items-center justify-center">
                  <Text className="text-[#999] text-xl">✕</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <View className="border-t border-border my-2" />
        <Animated.Text
          style={subtextStyle}
          className="text-center text-black text-heading font-din px-8 py-4">
          {subText}
        </Animated.Text>
      </Animated.View>

      {/* Continue button */}
      <Animated.View style={buttonStyle} className="px-6 pb-10 mt-8">
        <PrimaryButton title="CONTINUE" onPress={handleContinue} />
      </Animated.View>

      {/* Development debug info */}
      {__DEV__ && debugInfo && (
        <View
          style={{
            position: 'absolute',
            bottom: 80,
            left: 10,
            right: 10,
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: 8,
            borderRadius: 5,
          }}>
          <Text style={{ color: 'white', fontSize: 10 }}>
            Streak: {streak} | Dates completed: {debugInfo.completedDates?.join(', ')}
          </Text>
          <Text style={{ color: 'white', fontSize: 10 }}>
            Today: {debugInfo.today} | Yesterday: {debugInfo.yesterday} | 2 Days Ago:{' '}
            {debugInfo.twoDaysAgo}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};
