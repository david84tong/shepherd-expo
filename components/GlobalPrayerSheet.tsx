import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePrayerStore } from '../app/stores/prayerStore';
import PrimaryButton from './PrimaryButton';
import { useUIStore } from '~/app/stores/uiStore';

interface PrayerSheetProps {
  prayerSheetRef: React.RefObject<PrayerSheetRef>;
  snapPoints: string[];
  onPrayerGenerated?: () => void;
}

// Define the ref type that includes both BottomSheet methods and our custom show method
export type PrayerSheetRef = {
  show: () => void;
  close: () => void;
  expand: () => void;
};

const PrayerSheet: React.FC<PrayerSheetProps> = ({
  prayerSheetRef,
  snapPoints,
  onPrayerGenerated,
}) => {
  const [prayerInput, setPrayerInput] = useState('');

  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Access prayer store
  const { prayerTopics, recentPrayers, incrementTopicCount, addRecentPrayer, getOrderedTopics } =
    usePrayerStore();

  // Get ordered topics
  const [orderedTopics, setOrderedTopics] = useState(getOrderedTopics().map((topic) => topic.name));

  // Update ordered topics when store changes
  useEffect(() => {
    setOrderedTopics(getOrderedTopics().map((topic) => topic.name));
  }, [prayerTopics, getOrderedTopics]);

  // Access UI store
  const hidePrayerSheet = useUIStore(state => state.hidePrayerSheet);

  // Handle prayer topic selection
  const handlePrayerTopicPress = useCallback(
    (topic: string) => {
      setPrayerInput(topic);
      incrementTopicCount(topic);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    },
    [incrementTopicCount]
  );

  // Handle prayer generation
  const handlePrayerGenerate = useCallback(() => {
    if (!prayerInput.trim()) return;

    console.log(`Generating prayer for: ${prayerInput}`);

    // Save the prayer to store
    incrementTopicCount(prayerInput);
    addRecentPrayer(prayerInput);

    // Close the bottom sheet
    bottomSheetRef.current?.close();

    // Trigger the onPrayerGenerated callback after the sheet is closed
    setTimeout(() => {
      if (onPrayerGenerated) {
        onPrayerGenerated();
      } else {
        // Fallback if no callback provided - show the alert as before
        Alert.alert('Prayer Generated', `Your prayer for "${prayerInput}" has been generated.`, [
          { text: 'Amen', style: 'default' },
        ]);
      }
      setPrayerInput('');
    }, 300);
  }, [prayerInput, incrementTopicCount, addRecentPrayer, onPrayerGenerated]);

  // Close the prayer sheet
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Handle prayer sheet changes
  const handlePrayerSheetChange = useCallback((index: number) => {
    if (index === -1) {
      // Sheet is closed - reset state after a delay
      hidePrayerSheet();
      setTimeout(() => {
        setPrayerInput('');
      }, 200);
    }
  }, []);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Show the prayer sheet with any preparations
  const showSheet = useCallback(() => {
    setPrayerInput('');

    // Update ordered topics before showing the sheet
    setOrderedTopics(getOrderedTopics().map((topic) => topic.name));

    bottomSheetRef.current?.expand();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
  }, [getOrderedTopics]);

  // Expose methods via ref
  useImperativeHandle(
    prayerSheetRef,
    () => ({
      show: showSheet,
      close: () => bottomSheetRef.current?.close(),
      expand: () => bottomSheetRef.current?.expand(),
    }),
    [showSheet]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handlePrayerSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore">
      <BottomSheetView style={styles.prayerContentContainer}>
        {/* Header */}
        <View style={styles.prayerHeader}>
          <TouchableOpacity onPress={handleClose} style={{ padding: 5 }}>
            <Ionicons name="close" size={24} color="#3C584A" />
          </TouchableOpacity>
          <Text style={styles.prayerTitle}>My Prayers</Text>
          <TouchableOpacity onPress={handleClose} style={{ padding: 5 }}>
            <Text style={styles.doneButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.prayerContent}
          contentContainerStyle={{ paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled" // Ensure taps work inside scrollview when keyboard is up
        >
          {/* Prayer hands emoji */}
          <View style={styles.prayerEmojiContainer}>
            <Text style={styles.prayerEmoji}>🙏</Text>
          </View>

          {/* Prayer input */}
          <View style={styles.prayerInputContainer}>
            <View style={styles.prayerInputWrapper}>
              <Text style={styles.prayerInputLabel}>I want to pray for</Text>
              <TextInput
                value={prayerInput}
                onChangeText={setPrayerInput}
                placeholder="guidance..."
                placeholderTextColor="#B89B4C"
                style={styles.prayerInputText}
                autoFocus
              />
            </View>
          </View>

          {/* Recent prayers section - show if there are any */}
          {recentPrayers.length > 0 && (
            <View style={styles.recentPrayersContainer}>
              <Text style={styles.prayerTopicsLabel}>Recent prayers:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}>
                {recentPrayers.slice(0, 5).map((prayer, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handlePrayerTopicPress(prayer)}
                    style={styles.recentPrayerButton}>
                    <Text style={styles.recentPrayerText} numberOfLines={1}>
                      {prayer}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Prayer topic options */}
          <View style={styles.prayerTopicsContainer}>
            <Text style={styles.prayerTopicsLabel}>Or pick one of these:</Text>
            <View style={styles.prayerTopicsGrid}>
              {orderedTopics
                .filter((topic) => !recentPrayers.includes(topic))
                .slice(0, 8)
                .map((topic) => (
                  <TouchableOpacity
                    key={topic}
                    onPress={() => handlePrayerTopicPress(topic)}
                    style={styles.prayerTopicButton}>
                    <Text style={styles.prayerTopicText}>{topic}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Generate button */}
          <View className="mt-18">
            <PrimaryButton
              title="Generate a prayer"
              onPress={handlePrayerGenerate}
              disabled={!prayerInput.trim()}
            />
          </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  doneButton: {
    color: '#F7B500',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
    width: 40,
  },
  prayerContent: {
    flex: 1,
    paddingHorizontal: 20, // Add horizontal padding
  },
  prayerContentContainer: {
    flex: 1,
  },
  prayerEmoji: {
    fontSize: 36,
  },
  prayerEmojiContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  prayerGenerateButton: {
    alignItems: 'center',
    backgroundColor: '#FFF4D9',
    borderRadius: 30,
    elevation: 6,
    padding: 16,
    shadowColor: '#FFE4A8',
    shadowOffset: { width: 0, height: 5.716 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  prayerGenerateButtonDisabled: {
    backgroundColor: '#E0E0E0',
    elevation: 0,
    shadowColor: 'transparent',
  },
  prayerGenerateContainer: {
    // Use padding instead of marginTop: auto to ensure it's reachable when keyboard is up
    paddingVertical: 20,
  },
  prayerGenerateText: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18,
  },
  prayerGenerateTextDisabled: {
    color: 'rgba(60, 88, 74, 0.5)',
  },
  prayerHeader: {
    alignItems: 'center',
    borderBottomColor: '#FFE4A8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  prayerInputContainer: {
    marginBottom: 30,
  },
  prayerInputLabel: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 22,
    marginRight: 8,
  },
  prayerInputText: {
    color: '#06B6FE',
    flex: 1,
    fontFamily: 'Nunito-Black',
    fontSize: 22,
  },
  prayerInputWrapper: {
    alignItems: 'center',
    borderBottomColor: '#FCD34D',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingBottom: 8,
  },
  prayerTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18,
  },
  prayerTopicButton: {
    backgroundColor: 'white',
    borderColor: '#E9E2C7',
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  prayerTopicText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  prayerTopicsContainer: {
    marginBottom: 30,
  },
  prayerTopicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  prayerTopicsLabel: {
    color: '#B89B4C',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 18,
    marginBottom: 16,
  },
  recentPrayerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: '#E9E2C7',
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recentPrayerText: {
    color: '#06B6FE',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    maxWidth: 150,
  },
  recentPrayersContainer: {
    marginBottom: 30,
  },
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

export default PrayerSheet;
