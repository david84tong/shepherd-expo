import React, { useEffect } from 'react';
import { View, Text, Image, SafeAreaView } from 'react-native';
import PrimaryButton from './PrimaryButton';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useUserStore } from '../app/stores/userStore';
import dayjs from 'dayjs';

const flameIcon = require('../assets/icons/flameIcon.png');
const blueCheckIcon = require('../assets/icons/flameIcon.png'); // Placeholder for blue check

export const StreakScreen = () => {
  const completedReadings = useUserStore((state) => state.getCompletedReadings());
  const setStreakCount = useUserStore((state) => state.setStreakCount);
  const syncWithFirestore = useUserStore((state) => state.syncWithFirestore);
  const today = dayjs().startOf('day');
  const daysToShow = 7;
  // Build a set of YYYY-MM-DD strings for fast lookup
  const completedSet = new Set(
    completedReadings.map((reading) => {
      const d = reading.date;
      if (d && typeof d.toDate === 'function') {
        return dayjs(d.toDate()).format('YYYY-MM-DD');
      }
      if (d instanceof Date) {
        return dayjs(d).format('YYYY-MM-DD');
      }
      return null;
    }).filter(Boolean)
  );
  // Build the last 7 days, most recent last
  const days = Array.from({ length: daysToShow }).map((_, i) => {
    const date = today.subtract(daysToShow - 1 - i, 'day');
    const key = date.format('YYYY-MM-DD');
    return {
      label: date.format('dd')[0], // e.g. 'M', 'T', etc.
      date: key,
      completed: completedSet.has(key),
      isToday: i === daysToShow - 1,
    };
  });
  // Calculate streak: count consecutive days from today backwards
  let streak = 0;
  for (let i = daysToShow - 1; i >= 0; i--) {
    if (days[i].completed) {
      streak++;
    } else {
      break;
    }
  }
  
  useEffect(() => {
    // Update the user's streakCount in the store
    setStreakCount(streak);
    // Sync the updated streakCount with Firestore
    syncWithFirestore();
  }, [streak, setStreakCount, syncWithFirestore]);
  
  const percent = 69.2; // Placeholder, replace with real data if available

  return (
    <SafeAreaView className="flex-1 bg-surfaceCream justify-between">
      {/* Large flame with streak number */}
      <View className="items-center mt-10 mb-2">
        <View className="relative justify-center items-center mb-1">
          <Image source={flameIcon} className="w-36 h-36" />
          <Text className="absolute text-[52px] font-feather-bold text-accentGold" style={{top: 54}}>{streak}</Text>
        </View>
        <Text className="text-accentGold text-xl font-feather-bold mb-1 tracking-wide">day streak!</Text>
      </View>

      {/* Day tracker card */}
      <View className="mx-4 rounded-card border-4 border-border bg-white py-4 px-2  py-8">
        <View className="flex-row justify-between items-center mb-2 px-8">
          {days.map((day, idx) => (
            <View key={idx} className="items-center">
              <Text className={`font-feather text-md mb-1 ${day.isToday ? 'text-accentGold font-feather-bold' : 'text-description'}`}>{day.label}</Text>
              {day.isToday && day.completed ? (
          <View className="w-12 h-12 rounded-full bg-accentGold items-center justify-center">
                  <Image source={require('../assets/icons/whiteCheck.png')} className="w-12 h-12" resizeMode="contain" />
                </View>
              ) : !day.completed ? (
                <View className="w-12 h-12 rounded-full bg-red items-center justify-center">
                  <Ionicons name="close-sharp" size={28} color="white" style={{ fontWeight: 'bold' }} />
                </View>
              ) : (
                <View className="w-12 h-12 rounded-full bg-accentGold items-center justify-center">
                  <Image source={require('../assets/icons/whiteCheck.png')} className="w-12 h-12" resizeMode="contain" />
                </View>
              )}
            </View>
          ))}
        </View>
        <View className="border-t border-border my-2" />
        <Text className="text-center text-black text-h2 font-din px-8 py-4">
          Early Bird! You extended your streak earlier than <Text className="text-accentGold font-feather-bold">{percent}%</Text> of learners.
        </Text>
      </View>

      {/* Continue button */}
      <View className="px-6 pb-10 mt-8">
        <PrimaryButton
          title="CONTINUE"
          onPress={() => {}}
        />
      </View>
    </SafeAreaView>
  );
};
