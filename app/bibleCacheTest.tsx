import React from 'react';
import { SafeAreaView } from 'react-native';
import BibleCacheTest from './components/BibleCacheTest';

export default function BibleCacheTestScreen() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F9F3E5' }}>
            <BibleCacheTest />
        </SafeAreaView>
    );
} 