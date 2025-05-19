import React from 'react';
import { SafeAreaView } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import NewBibleReader from '../components/NewBibleReader';

export default function NewBibleReaderScreen() {
  const params = useLocalSearchParams();
  const bookId = Number(params.bookId || 43); // Default to John
  const chapter = Number(params.chapter || 3); // Default to chapter 3
  const translation = String(params.translation || 'ESV');

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <NewBibleReader 
        bookId={bookId} 
        chapter={chapter} 
        translation={translation} 
      />
    </SafeAreaView>
  );
} 