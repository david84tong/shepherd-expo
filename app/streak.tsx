import React from 'react';
import { StreakScreen } from '../components/StreakScreen';
import { Stack } from 'expo-router';

export default function StreakRoute() {
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          title: 'Streak',
        }}
      />
      <StreakScreen />
    </>
  );
} 