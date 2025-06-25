import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useDevotionalStore } from '../stores/devotionalStore';
import { fetchChapterWithCache, fetchChaptersBatch, clearChapterCache } from '../api/bible';

const BibleCacheTest: React.FC = () => {
    const [testResults, setTestResults] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const clearBibleCache = useDevotionalStore(state => state.clearBibleCache);

    const addResult = (message: string) => {
        setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const testSingleFetch = async () => {
        setIsLoading(true);
        addResult('🔄 Testing single chapter fetch...');

        const startTime = Date.now();
        const result = await fetchChapterWithCache('ESV', 1, 1); // Genesis 1
        const endTime = Date.now();

        if (!('error' in result)) {
            addResult(`✅ Single fetch completed in ${endTime - startTime}ms`);
            addResult(`📖 Found ${result.verses.length} verses`);
        } else {
            addResult(`❌ Single fetch failed: ${result.message}`);
        }

        setIsLoading(false);
    };

    const testBatchFetch = async () => {
        setIsLoading(true);
        addResult('🔄 Testing batch chapter fetch...');

        const chapters = [
            { bookId: 1, chapter: 1 }, // Genesis 1
            { bookId: 1, chapter: 2 }, // Genesis 2
            { bookId: 2, chapter: 1 }, // Exodus 1
            { bookId: 2, chapter: 2 }, // Exodus 2
            { bookId: 3, chapter: 1 }, // Leviticus 1
        ];

        const startTime = Date.now();
        const results = await fetchChaptersBatch('ESV', chapters);
        const endTime = Date.now();

        const successCount = Array.from(results.values()).filter(r => !('error' in r)).length;
        addResult(`✅ Batch fetch completed in ${endTime - startTime}ms`);
        addResult(`📖 Successfully fetched ${successCount}/${chapters.length} chapters`);

        setIsLoading(false);
    };

    const testCachedFetch = async () => {
        setIsLoading(true);
        addResult('🔄 Testing cached fetch (should be faster)...');

        const startTime = Date.now();
        const result = await fetchChapterWithCache('ESV', 1, 1); // Genesis 1 (should be cached)
        const endTime = Date.now();

        if (!('error' in result)) {
            addResult(`✅ Cached fetch completed in ${endTime - startTime}ms`);
            addResult(`📖 Found ${result.verses.length} verses (from cache)`);
        } else {
            addResult(`❌ Cached fetch failed: ${result.message}`);
        }

        setIsLoading(false);
    };

    const testWidgetTimeline = async () => {
        setIsLoading(true);
        addResult('🔄 Testing widget timeline update (uses batch fetch)...');

        const startTime = Date.now();
        await useDevotionalStore.getState().updateWidgetTimeline();
        const endTime = Date.now();

        addResult(`✅ Widget timeline updated in ${endTime - startTime}ms`);
        setIsLoading(false);
    };

    const clearCache = async () => {
        setIsLoading(true);
        addResult('🧹 Clearing Bible chapter cache...');

        await clearBibleCache();
        addResult('✅ Cache cleared successfully');

        setIsLoading(false);
    };

    const clearResults = () => {
        setTestResults([]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bible Cache Optimization Test</Text>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={testSingleFetch}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Single Fetch</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={testBatchFetch}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Batch Fetch</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={testCachedFetch}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Cached Fetch</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={testWidgetTimeline}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Widget Timeline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.clearButton, isLoading && styles.buttonDisabled]}
                    onPress={clearCache}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Clear Cache</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.clearButton]}
                    onPress={clearResults}
                >
                    <Text style={styles.buttonText}>Clear Results</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultsContainer}>
                {testResults.map((result, index) => (
                    <Text key={index} style={styles.resultText}>
                        {result}
                    </Text>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F9F3E5',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#3C584A',
        fontFamily: 'Nunito-Black',
    },
    buttonContainer: {
        gap: 10,
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#3C584A',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    clearButton: {
        backgroundColor: '#F7B500',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'DIN Next Rounded LT W01 Regular',
    },
    resultsContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
    },
    resultText: {
        fontSize: 14,
        marginBottom: 5,
        fontFamily: 'DIN Next Rounded LT W01 Regular',
        color: '#3C584A',
    },
});

export default BibleCacheTest; 