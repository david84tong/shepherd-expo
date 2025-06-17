import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import i18n from '~/app/utils/i18n';

import { StreakScreen } from '../components/StreakScreen';

export default function StreakRoute() {
  const { isPrayPresses, isReflectPresses } = useLocalSearchParams();
  
  return (
    <>
      <Stack.Screen
        options={{
          animation: 'slide_from_bottom',
          headerShown: false,
          title: i18n.t('streak_title'),
        }}
      />
      <StreakScreen isPrayPresses={isPrayPresses as string} isReflectPresses={isReflectPresses as string} />
    </>
  );
}
