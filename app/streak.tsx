import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { StreakScreen } from '../components/StreakScreen';

export default function StreakRoute() {
  const { isPrayPresses, isReflectPresses } = useLocalSearchParams();
  
  return (
    <>
      <Stack.Screen
        options={{
          animation: 'slide_from_bottom',
          headerShown: false,
          title: 'Streak',
        }}
      />
      <StreakScreen isPrayPresses={isPrayPresses as string} isReflectPresses={isReflectPresses as string} />
    </>
  );
}
