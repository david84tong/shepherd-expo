import { useLocalSearchParams, Stack } from 'expo-router';
import React from 'react';

import SuccessAnimation from '../components/SuccessAnimation';

export default function SuccessScreen() {
  // Get the message and subMessage from the URL params
  const params = useLocalSearchParams();
  const isPrayPresses = params.isPrayPresses === 'true';
  const message = (params.message as string) || 'Great job!';
  const subMessage = (params.subMessage as string) || 'You completed your reading for today.';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      />
      <SuccessAnimation message={message} isPrayPresses={isPrayPresses} subMessage={subMessage} />
    </>
  );
}
