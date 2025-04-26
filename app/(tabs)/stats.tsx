import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useUserStore } from '../stores/userStore';
import dayjs from 'dayjs';
import { Reading, Prayer, Reflection } from '../models/User';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const COLORS: Record<number, string> = {
  3: 'bg-darkGreen', // green
  2: 'bg-accentGold', // yellow
  1: 'bg-red', // red
  0: 'bg-pillBorder' // gray (using pillBorder color from config)
};

type DayMap = { [date: string]: { reading: boolean; prayer: boolean; reflection: boolean } };

function toDateSafe(ts: any): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  return new Date(ts);
}

function getWeekData(
  readings: Reading[],
  prayers: Prayer[],
  reflections: Reflection[],
  numberOfDays: number = 28 // Default to 28 days (4 weeks)
): { date: string; reading: boolean; prayer: boolean; reflection: boolean }[] {
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
  // Get last N days
  const today = dayjs();
  const days = [];
  // Loop from numberOfDays - 1 down to 0 to get the days in correct order
  for (let i = numberOfDays - 1; i >= 0; i--) {
    const d = today.subtract(i, 'day').format('YYYY-MM-DD');
    days.push({
      date: d,
      ...(map[d] || { reading: false, prayer: false, reflection: false })
    });
  }
  return days;
}

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
        ...(map[d] || { reading: false, prayer: false, reflection: false })
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
          ...(map[d] || { reading: false, prayer: false, reflection: false })
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

export default function StatsScreen() {
  const readings = useUserStore(s => s.getCompletedReadings());
  const prayers = useUserStore(s => s.getCompletedPrayers());
  const reflections = useUserStore(s => s.getCompletedReflections());

  // Get current year and month
  const now = dayjs();
  const year = now.year();
  const month = now.month(); // 0-indexed
  const monthGrid = getMonthGrid(readings, prayers, reflections, year, month);

  // Recent reflections (sorted desc)
  const recentReflections = [...reflections]
    .sort((a, b) => (toDateSafe(b.date).getTime()) - (toDateSafe(a.date).getTime()))
    .slice(0, 3);

  return (
    <ScrollView className="flex-1 bg-main-bg px-4 pt-8">
      <Text className="text-h1 font-feather text-center mb-1">Heart posture</Text>
      <Text className="text-body font-din text-center text-description mb-6">Reflect on how you're really doing</Text>
      {/* Heatmap */}
      <View className="bg-surfaceCream rounded-xl p-4 mb-6 border border-border">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-heading font-feather text-textPrimary">Activity</Text>
          <TouchableOpacity className="flex-row items-center">
            <Text className="text-caption font-din text-description mr-1">Overall</Text>
            <FontAwesome name="chevron-down" size={14} color="#B89B4C" />
          </TouchableOpacity>
        </View>
        {/* Day headers with proper spacing */}
        <View className="flex-row justify-between mb-2">
          {DAYS.map(d => (
            <Text key={d} className="text-caption font-din text-description w-8 text-center">{d}</Text>
          ))}
        </View>
        {/* Month grid */}
        {monthGrid.map((week, weekIdx) => (
          <View key={weekIdx} className="flex-row justify-between mt-2">
            {week.map((day, dayIdx) => {
              if (!day) return <View key={dayIdx} className="w-8 h-8 rounded-md bg-transparent" />;
              const count = [day.reading, day.prayer, day.reflection].filter(Boolean).length;
              return (
                <View
                  key={day.date}
                  className={`w-8 h-8 rounded-md ${COLORS[count]}`}
                />
              );
            })}
          </View>
        ))}
      </View>
      {/* Recent reflections */}
      <Text className="text-h2 font-feather mb-3 mt-2">Recent reflections</Text>
      <View className="mb-8 space-y-3"> 
        {recentReflections.map((rf, i) => (
          <View key={i} className="bg-surfaceCream rounded-xl p-4 border border-border"> 
            <View className="flex-row items-start"> 
              {/* Icon Column */}
              <View className="w-10 h-10 rounded-lg bg-[#FFF4D9] items-center justify-center mr-4"> 
                <FontAwesome name="book" size={20} color="#B89B4C" />
              </View>

              {/* Content Column */}
              <View className="flex-1">
                {/* Top Row: Title + Date */}
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="font-feather text-heading text-textPrimary flex-shrink mr-2" numberOfLines={1} ellipsizeMode='tail'> 
                    {rf.content.split(' ').slice(0, 3).join(' ') || 'Reflection'}
                  </Text>
                  <Text className="text-caption font-din text-description whitespace-nowrap">
                    {dayjs(toDateSafe(rf.date)).format('MMMM D')}
                  </Text>
                </View>

                {/* Bottom Row: Content Preview */}
                <Text className="font-din text-body text-textPrimary" numberOfLines={1} ellipsizeMode="tail">
                  {rf.content} 
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
} 