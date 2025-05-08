import { Stack } from 'expo-router';
import React from 'react';

import { StreakScreen } from '../components/StreakScreen';

export default function StreakRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          animation: 'slide_from_bottom',
          headerShown: false,
          title: 'Streak',
        }}
      />
      <StreakScreen />
    </>
  );
}
