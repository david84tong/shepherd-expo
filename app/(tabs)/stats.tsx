import dayjs from 'dayjs';
import { useCallback } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useUIStore } from '../stores/uiStore';
import { useUserStore } from '../stores/userStore';

import * as Haptics from 'expo-haptics';
import { Prayer, Reading, Reflection } from '../models/User';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const COLORS: Record<number, string> = {
  3: 'bg-accentGold', // yellow instead of green
  2: 'bg-accentGold/80', // lighter yellow
  1: 'bg-accentGold/60', // even lighter yellow
  0: 'bg-pillBorder', // gray (using pillBorder color from config)
};

type DayMap = { [date: string]: { reading: boolean; prayer: boolean; reflection: boolean } };

function toDateSafe(ts: any): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
  if (ts._seconds !== undefined) return new Date(ts._seconds * 1000);
  return new Date(ts);
}

// Function to format relative time (30m ago, 2d ago, etc.)
function formatRelativeTime(timestamp: any): string {
  try {
    const date = toDateSafe(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Less than a minute
    if (diffMs < 60000) {
      return 'just now';
    }

    // Minutes
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    // Hours
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Days
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays}d ago`;
    }

    // Months
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths}mo ago`;
    }

    // Years
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears}y ago`;
  } catch (error) {
    console.error('Error formatting relative time:', error, timestamp);
    return '';
  }
}

// function getWeekData(
//   readings: Reading[],
//   prayers: Prayer[],
//   reflections: Reflection[],
//   numberOfDays: number = 28 // Default to 28 days (4 weeks)
// ): { date: string; reading: boolean; prayer: boolean; reflection: boolean }[] {
//   // Build a map: { 'YYYY-MM-DD': {reading:bool, prayer:bool, reflection:bool} }
//   const map: DayMap = {};
//   readings.forEach((r: Reading) => {
//     const d = dayjs(toDateSafe(r.date)).format('YYYY-MM-DD');
//     if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
//     map[d].reading = true;
//   });
//   prayers.forEach((p: Prayer) => {
//     const d = dayjs(toDateSafe(p.date)).format('YYYY-MM-DD');
//     if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
//     map[d].prayer = true;
//   });
//   reflections.forEach((rf: Reflection) => {
//     const d = dayjs(toDateSafe(rf.date)).format('YYYY-MM-DD');
//     if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
//     map[d].reflection = true;
//   });
//   // Get last N days
//   const today = dayjs();
//   const days = [];
//   // Loop from numberOfDays - 1 down to 0 to get the days in correct order
//   for (let i = numberOfDays - 1; i >= 0; i--) {
//     const d = today.subtract(i, 'day').format('YYYY-MM-DD');
//     days.push({
//       date: d,
//       ...(map[d] || { reading: false, prayer: false, reflection: false }),
//     });
//   }
//   return days;
// }

function getMonthGrid(
  readings: Reading[],
  prayers: Prayer[],
  reflections: Reflection[],
  year: number,
  month: number // 0-indexed for JS Date
) {
  // Build a map: { 'YYYY-MM-DD': {reading:bool, prayer:bool, reflection:bool} }
  const map: DayMap = {};
  readings.forEach((r: Reading) => {
    const d = dayjs(toDateSafe(r.date)).format('YYYY-MM-DD');
    if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
    map[d].reading = true;
  });
  prayers.forEach((p: Prayer) => {
    const d = dayjs(toDateSafe(p.date)).format('YYYY-MM-DD');
    if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
    map[d].prayer = true;
  });
  reflections.forEach((rf: Reflection) => {
    const d = dayjs(toDateSafe(rf.date)).format('YYYY-MM-DD');
    if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
    map[d].reflection = true;
  });

  // Get first and last day of the month
  const firstDay = dayjs(new Date(year, month, 1));
  const lastDay = firstDay.endOf('month');
  const daysInMonth = lastDay.date();
  const firstWeekday = firstDay.day(); // 0=Sun, 6=Sat

  // Build grid: array of weeks, each week is array of 7 days (or null for empty)
  const grid = [];
  let week = [];
  let dayCounter = 1;

  // Fill first week with nulls until first day
  for (let i = 0; i < firstWeekday; i++) {
    week.push(null);
  }
  // Fill the rest of the first week
  for (let i = firstWeekday; i < 7; i++) {
    if (dayCounter <= daysInMonth) {
      const d = dayjs(new Date(year, month, dayCounter)).format('YYYY-MM-DD');
      week.push({
        date: d,
        ...(map[d] || { reading: false, prayer: false, reflection: false }),
      });
      dayCounter++;
    }
  }
  grid.push(week);

  // Fill remaining weeks
  while (dayCounter <= daysInMonth) {
    week = [];
    for (let i = 0; i < 7; i++) {
      if (dayCounter <= daysInMonth) {
        const d = dayjs(new Date(year, month, dayCounter)).format('YYYY-MM-DD');
        week.push({
          date: d,
          ...(map[d] || { reading: false, prayer: false, reflection: false }),
        });
        dayCounter++;
      } else {
        week.push(null);
      }
    }
    grid.push(week);
  }
  return grid;
}

const breadIcon = require('../../assets/icons/breadIcon.png');
const journalIcon = require('../../assets/icons/journalIcon.png');
const dropIcon = require('../../assets/icons/waterIcon.png');

// Function to handle haptic feedback
const triggerHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
};

export default function StatsScreen() {
  const readings = useUserStore(s => s.getCompletedReadings());
  const prayers = useUserStore(s => s.getCompletedPrayers());
  const reflections = useUserStore(s => s.getCompletedReflections());

  // Get the showOldReflectionSheet function directly from uiStore
  const showOldReflectionSheet = useUIStore(state => state.showOldReflectionSheet);

  // Total activity counts
  const totalBibleReadings = readings.length;
  const totalPrayerSessions = prayers.length;
  const totalReflections = reflections.length;

  // Get current year and month
  const now = dayjs();
  const year = now.year();
  const month = now.month(); // 0-indexed
  const monthGrid = getMonthGrid(readings, prayers, reflections, year, month);

  // Recent reflections (sorted desc)
  const recentReflections = [...reflections]
    .sort((a, b) => toDateSafe(b.date).getTime() - toDateSafe(a.date).getTime())
    .slice(0, 3);

  // Handle month selection with haptic feedback
  const handleMonthPress = useCallback(() => {
    // Provide light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    // Month selection logic would go here
    console.log('Month selector pressed');
    // For now, this is just a visual element without actual month selection
  }, []);

  // Function to handle tapping on a reflection
  const handleReflectionPress = useCallback((reflection: Reflection) => {
    console.log('Reflection tapped:', reflection);

    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    // First try using the local reference to the function
    if (showOldReflectionSheet) {
      console.log('Using direct UIStore reference to show sheet');
      showOldReflectionSheet(reflection);
    }
    // Fallback to global object if needed
    else if (typeof global !== 'undefined' && (global as any).showOldReflectionSheet) {
      console.log('Using global reference to show sheet');
      (global as any).showOldReflectionSheet(reflection);
    }
    // Final fallback to alert
    else {
      console.error('showOldReflectionSheet is not available');
      Alert.alert('Reflection Detail', reflection.content || 'No content.');
    }
  }, [showOldReflectionSheet]);

  // Handle opening a reflection
  const handleOpenReflection = (reflection: Reflection) => {
    triggerHaptic();
    showOldReflectionSheet(reflection);
  };

  // Handle activity card press
  const handleActivityCardPress = () => {
    triggerHaptic();
    // Could navigate to detailed view or expand card in future
  };

  // Handle stat button press
  // const handleStatButtonPress = () => {
  //   triggerHaptic();
  //   // Could navigate to detailed statistics in future
  // };

  // Recent activity section
  const renderRecentActivity = () => {
    // Show most recent 5 items of any type
    const allActivities = [
      ...readings.map(r => ({ type: 'reading' as const, data: r })),
      ...prayers.map(p => ({ type: 'prayer' as const, data: p })),
      ...reflections.map(r => ({ type: 'reflection' as const, data: r }))
    ];

    // Sort by date (most recent first)
    allActivities.sort((a, b) => {
      const dateA = toDateSafe(a.data.date);
      const dateB = toDateSafe(b.data.date);
      return dateB.getTime() - dateA.getTime();
    });

    // Take the 5 most recent
    const recentActivities = allActivities.slice(0, 5);

    return (
      <>
        {recentActivities.length > 0 ? (
          <>
            {recentActivities.map((activity, index) => {
              const date = toDateSafe(activity.data.date);
              let icon, title, subtitle;

              if (activity.type === 'reading') {
                icon = breadIcon;
                title = 'Daily Bread';
                subtitle = activity.data.book ? `${activity.data.book}` : 'Scripture reading';
              } else if (activity.type === 'prayer') {
                icon = dropIcon;
                title = 'Prayer';
                subtitle = activity.data.topic || 'Prayer time';
              } else {
                icon = journalIcon;
                title = 'Reflection';
                // Show a preview of the content
                subtitle = activity.data.content?.substring(0, 28) + '...';
              }

              return (
                <TouchableOpacity
                  key={`${activity.type}-${index}`}
                  onPress={() => {
                    if (activity.type === 'reflection') {
                      // Open reflection sheet
                      handleOpenReflection(activity.data);
                    } else {
                      // For other types, just show feedback
                      handleActivityCardPress();
                    }
                  }}
                  className="flex-row items-center mb-3 px-4 py-3 bg-surfaceCream rounded-xl border border-border"
                  activeOpacity={0.7}
                >
                  <Image source={icon} className="w-8 h-8 mr-3" />
                  <View className="flex-1">
                    <Text className="font-din text-textPrimary text-body font-medium">{title}</Text>
                    <Text className="font-din text-textPrimary/70 text-caption">{subtitle}</Text>
                  </View>
                  <Text className="font-din text-textPrimary/60 text-caption ml-2">
                    {formatRelativeTime(date)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          <View className="items-center justify-center py-6">
            <Text className="font-din text-textPrimary/70 text-body">No recent activity yet</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF4D9' }}>
      <ScrollView className="flex-1 bg-surfaceCream">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 pt-8 pb-4">
          <Text className="font-feather text-h2 text-textPrimary">Heart Posture</Text>
        </View>

        {/* Heatmap Card */}
        <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-card">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-feather text-heading text-textPrimary">Monthly Activity</Text>
            <TouchableOpacity
              className="bg-lightYellow px-4 py-1 rounded-full"
              onPress={handleMonthPress}
              activeOpacity={0.7}
            >
              <Text className="font-feather text-accentGold">{now.format('MMMM YYYY')}</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers with proper spacing */}
          <View className="flex-row justify-between mb-2">
            {DAYS.map((d) => (
              <Text key={d} className="text-caption font-din text-description w-8 text-center">
                {d}
              </Text>
            ))}
          </View>

          {/* Month grid */}
          {monthGrid.map((week, weekIdx) => (
            <View key={weekIdx} className="flex-row justify-between mt-2">
              {week.map((day, dayIdx) => {
                if (!day)
                  return <View key={dayIdx} className="w-8 h-8 rounded-md bg-transparent" />;
                const count = [day.reading, day.prayer, day.reflection].filter(Boolean).length;
                return (
                  <TouchableOpacity
                    key={day.date}
                    className={`w-8 h-8 rounded-md ${COLORS[count]}`}
                    activeOpacity={0.8}
                    onPress={() => {
                      // Provide light haptic feedback
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

                      // In the future, this could show detail for the specific day
                      console.log('Day pressed:', day.date);
                    }}
                  />
                );
              })}
            </View>
          ))}

          <View className="flex-row justify-end mt-4">
            <View className="flex-row items-center mr-3">
              <View className="w-3 h-3 rounded-sm bg-pillBorder mr-1" />
              <Text className="font-din text-description text-xs">0</Text>
            </View>
            <View className="flex-row items-center mr-3">
              <View className="w-3 h-3 rounded-sm bg-accentGold/60 mr-1" />
              <Text className="font-din text-description text-xs">1</Text>
            </View>
            <View className="flex-row items-center mr-3">
              <View className="w-3 h-3 rounded-sm bg-accentGold/80 mr-1" />
              <Text className="font-din text-description text-xs">2</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-sm bg-accentGold mr-1" />
              <Text className="font-din text-description text-xs">3</Text>
            </View>
          </View>
        </View>

        {/* Activity Summary Card - Moved to bottom */}
        <View className="mx-6 mt-4 bg-white rounded-[20px] p-6 shadow-cardx mt-8">
          <Text className="font-feather text-heading text-textPrimary mb-4">Activity Summary</Text>

          <View className="flex-row justify-between">
            <TouchableOpacity
              className="items-center bg-surfaceCream rounded-xl px-3 py-3 flex-1 mx-1"
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                console.log('Readings summary pressed');
              }}
            >
              <Text className="font-feather text-h2 text-textPrimary">{totalBibleReadings}</Text>
              <Text className="font-din text-description text-center">Readings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center bg-surfaceCream rounded-xl px-3 py-3 flex-1 mx-1"
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                console.log('Prayers summary pressed');
              }}
            >
              <Text className="font-feather text-h2 text-textPrimary">{totalPrayerSessions}</Text>
              <Text className="font-din text-description text-center">Prayers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="items-center bg-surfaceCream rounded-xl px-3 py-3 flex-1 mx-1"
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                console.log('Reflections summary pressed');
              }}
            >
              <Text className="font-feather text-h2 text-textPrimary">{totalReflections}</Text>
              <Text className="font-din text-description text-center">Reflections</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent reflections */}
        <View className="mx-6 mt-8 bg-white rounded-[20px] p-6 shadow-card mb-24">
          <Text className="font-feather text-heading text-textPrimary mb-4">Recent Reflections</Text>

          {recentReflections.length > 0 ? (
            <View className="space-y-4">
              {recentReflections.map((rf, i) => (
                <TouchableOpacity
                  key={i}
                  className="bg-surfaceCream rounded-xl p-4 my-2"
                  onPress={() => handleReflectionPress(rf)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-surfaceCream items-center justify-center mr-4">
                      <Image source={journalIcon} className="w-12 h-12" />
                    </View>
                    <View className="flex-1 flex-row justify-between items-center">
                      <View className="flex-1 mr-2">
                        <Text className="font-feather text-body text-textPrimary" numberOfLines={1}>
                          Quiet Time
                        </Text>
                        {rf.content && (
                          <Text className="font-din text-sm text-description mt-1" numberOfLines={1} ellipsizeMode="tail">
                            {rf.content}
                          </Text>
                        )}
                      </View>
                      <Text className="font-din text-description text-sm ml-2">
                        {formatRelativeTime(rf.date)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="bg-surfaceCream/70 rounded-xl p-5 flex items-center justify-center">
              <Image source={journalIcon} className="w-24 h-24 opacity-50 mb-3" />
              <Text className="font-feather text-heading text-textPrimary/70 text-center">
                No recent reflections
              </Text>
              <Text className="font-din text-body text-description text-center mt-1">
                Take a moment to reflect on your journey with God
              </Text>
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View className="px-6 mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-feather text-textPrimary text-heading">Recent Activity</Text>
            <TouchableOpacity onPress={handleActivityCardPress} activeOpacity={0.7}>
              <Text className="font-din text-accentGold text-body">See All</Text>
            </TouchableOpacity>
          </View>
          {renderRecentActivity()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
