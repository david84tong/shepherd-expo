import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { usePrayerStore } from '../app/stores/prayerStore';
import PrimaryButton from './PrimaryButton';
import { useUIStore } from '../app/stores/uiStore';
import { useHomeStore } from '../app/stores/homeStore';
import { KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight, hapticMedium } from '~/utils/haptics';
interface PrayerSheetProps {
  prayerSheetRef: React.RefObject<PrayerSheetRef>;
  onPrayerGenerated?: () => void;
}

// Define the ref type that includes both BottomSheet methods and our custom show method
export type PrayerSheetRef = {
  show: () => void;
  close: () => void;
  expand: () => void;
};

const PrayerSheet: React.FC<PrayerSheetProps> = ({ prayerSheetRef, onPrayerGenerated }) => {
  const snapPoints = useMemo(() => ['75%', '85%'], []);
  const [prayerInput, setPrayerInput] = useState('');
  const [isCustomInput, setIsCustomInput] = useState(true);

  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { bottom: bottomPadding } = useSafeAreaInsets();

  // Access prayer store
  const { prayerTopics, recentPrayers, incrementTopicCount, addRecentPrayer, getOrderedTopics } =
    usePrayerStore();

  // Access home store
  const setTappedPrayAboutVerse = useHomeStore((state) => state.setTappedPrayAboutVerse);

  // Get ordered topics
  const [orderedTopics, setOrderedTopics] = useState(getOrderedTopics().map((topic) => topic.name));

  // Update ordered topics when store changes
  useEffect(() => {
    setOrderedTopics(getOrderedTopics().map((topic) => topic.name));
  }, [prayerTopics, getOrderedTopics]);

  // Access UI store for visibility
  const isPrayerSheetVisible = useUIStore((state) => state.isPrayerSheetVisible);
  const hidePrayerSheet = useUIStore((state) => state.hidePrayerSheet);
  const prayerGeneratedCallback = useUIStore((state) => state.prayerGeneratedCallback);

  // Handle text input change
  const handleTextInputChange = useCallback((text: string) => {
    setPrayerInput(text);
    setIsCustomInput(true); // When user types, it's a custom input
  }, []);

  // Handle prayer topic selection
  const handlePrayerTopicPress = useCallback((topic: string, isCustom: boolean = false) => {
    setPrayerInput(topic);
    setIsCustomInput(isCustom); // Track if this is a custom or predefined topic

    // No need to increment count here, we'll only increment when actually generating the prayer
    hapticLight();
  }, []);

  // Handle prayer generation
  const handlePrayerGenerate = useCallback(() => {
    if (!prayerInput.trim()) return;

    console.log(`Generating prayer for: ${prayerInput}, isCustomInput: ${isCustomInput}`);

    // Check if this is a predefined topic or a truly custom entry
    const isPredefinedTopic = orderedTopics.some(
      (topic) => topic.toLowerCase() === prayerInput.toLowerCase()
    );

    // Always increment the count regardless of source
    incrementTopicCount(prayerInput);

    // Always add to recent prayers for prayer generation to work,
    // but we'll filter the display in the UI
    addRecentPrayer(prayerInput);

    if (!isPredefinedTopic && isCustomInput) {
      console.log(`Added "${prayerInput}" to recent prayers as a custom prayer`);
    } else {
      console.log(
        `Added "${prayerInput}" to recent prayers (for functionality) but it's a predefined topic`
      );
    }

    // Set tappedPrayAboutVerse to false when a prayer is generated
    setTappedPrayAboutVerse(false);

    // Close the bottom sheet
    bottomSheetRef.current?.close();

    // Trigger the onPrayerGenerated callback after the sheet is closed
    // Use a slight delay to ensure state updates properly propagate
    setTimeout(() => {
      // Make sure the prayer input value is still in recentPrayers[0]
      const currentPrayers = usePrayerStore.getState().recentPrayers;
      console.log('Current recent prayers before callback:', currentPrayers);

      if (prayerGeneratedCallback) {
        console.log('Executing prayer generated callback from UIStore');
        prayerGeneratedCallback();
      } else if (onPrayerGenerated) {
        console.log('Executing prayer generated callback from props');
        onPrayerGenerated();
      } else {
        // Fallback if no callback provided - show the alert as before
        console.log('No callback provided, showing alert');
        Alert.alert('Prayer Generated', `Your prayer for "${prayerInput}" has been generated.`, [
          { text: 'Amen', style: 'default' },
        ]);
      }

      // Clear input state after callback execution
      setPrayerInput('');
    }, 500); // Slightly longer delay to ensure state propagation
  }, [
    prayerInput,
    incrementTopicCount,
    addRecentPrayer,
    onPrayerGenerated,
    prayerGeneratedCallback,
    isCustomInput,
    orderedTopics,
    setTappedPrayAboutVerse,
  ]);

  // Handle sheet changes
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        hidePrayerSheet();
      }
    },
    [hidePrayerSheet]
  );

  // Handle close
  const handleClose = useCallback(() => {
    hidePrayerSheet();
    bottomSheetRef.current?.close();
  }, [hidePrayerSheet]);

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
    hapticMedium();
  }, [getOrderedTopics]);

  // Expose methods via ref
  useImperativeHandle(
    prayerSheetRef,
    () => ({
      show: showSheet,
      close: () => {
        hidePrayerSheet();
        bottomSheetRef.current?.close();
      },
      expand: () => bottomSheetRef.current?.expand(),
    }),
    [showSheet, hidePrayerSheet]
  );

  return (
    <>
      {isPrayerSheetVisible ? (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          onChange={handleSheetChange}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
          backdropComponent={renderBackdrop}>
          <BottomSheetView style={styles.prayerContentContainer}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: bottomPadding + 140 }}
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
                      onChangeText={handleTextInputChange}
                      placeholder="guidance..."
                      placeholderTextColor="#B89B4C"
                      style={styles.prayerInputText}
                    />
                  </View>
                </View>

                {/* Recent prayers section - show if there are any TRULY CUSTOM prayers */}
                {recentPrayers.length > 0 && (
                  <View style={styles.recentPrayersContainer}>
                    <Text style={styles.prayerTopicsLabel}>Custom prayers:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 20 }}>
                      {recentPrayers
                        .filter(
                          (prayer) =>
                            // Only show prayers that are not in the predefined topics list
                            !orderedTopics.some(
                              (topic) => topic.toLowerCase() === prayer.toLowerCase()
                            )
                        )
                        .slice(0, 5)
                        .map((prayer, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => handlePrayerTopicPress(prayer, true)}
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
                    {orderedTopics.slice(0, 8).map((topic) => (
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
                <View
                  style={{
                    width: '100%',
                    marginTop: 20,
                  }}>
                  <PrimaryButton
                    title="Generate a prayer"
                    onPress={handlePrayerGenerate}
                    disabled={!prayerInput.trim()}
                  />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  doneButton: {
    color: '#F7B500',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0,
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
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
