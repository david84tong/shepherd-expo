import React, { useCallback, useState, useRef, useImperativeHandle, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import PrimaryButton from './PrimaryButton';
import { usePrayerStore } from '../app/stores/prayerStore';

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
  const { 
    prayerTopics, 
    recentPrayers, 
    incrementTopicCount, 
    addRecentPrayer, 
    getOrderedTopics 
  } = usePrayerStore();
  
  // Get ordered topics
  const [orderedTopics, setOrderedTopics] = useState(getOrderedTopics().map(topic => topic.name));
  
  // Update ordered topics when store changes
  useEffect(() => {
    setOrderedTopics(getOrderedTopics().map(topic => topic.name));
  }, [prayerTopics, getOrderedTopics]);
  
  // Handle prayer topic selection
  const handlePrayerTopicPress = useCallback((topic: string) => {
    setPrayerInput(topic);
    incrementTopicCount(topic);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [incrementTopicCount]);
  
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
        Alert.alert(
          "Prayer Generated", 
          `Your prayer for "${prayerInput}" has been generated.`,
          [{ text: "Amen", style: "default" }]
        );
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
      setTimeout(() => {
        setPrayerInput('');
      }, 200);
    }
  }, []);
  
  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Show the prayer sheet with any preparations
  const showSheet = useCallback(() => {
    setPrayerInput('');
    
    // Update ordered topics before showing the sheet
    setOrderedTopics(getOrderedTopics().map(topic => topic.name));
    
    bottomSheetRef.current?.expand();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [getOrderedTopics]);
  
  // Expose methods via ref
  useImperativeHandle(
    prayerSheetRef,
    () => ({
      show: showSheet,
      close: () => bottomSheetRef.current?.close(),
      expand: () => bottomSheetRef.current?.expand()
    }),
    [showSheet]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onChange={handlePrayerSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
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
                autoFocus={true}
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
                contentContainerStyle={{ paddingRight: 20 }}
              >
                {recentPrayers.slice(0, 5).map((prayer, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handlePrayerTopicPress(prayer)}
                    style={styles.recentPrayerButton}
                  >
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
                .filter(topic => !recentPrayers.includes(topic))
                .slice(0, 8)
                .map((topic) => (
                  <TouchableOpacity
                    key={topic}
                    onPress={() => handlePrayerTopicPress(topic)}
                    style={styles.prayerTopicButton}
                  >
                    <Text style={styles.prayerTopicText}>{topic}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Generate button */}
          <View className="mt-48">
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
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    width: 40,
    height: 4,
  },
  prayerContentContainer: {
    flex: 1,
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4A8',
  },
  prayerTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Black',
    color: '#3C584A',
  },
  doneButton: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#F7B500',
    fontWeight: '600',
  },
  prayerContent: {
    flex: 1,
    paddingHorizontal: 20, // Add horizontal padding
  },
  prayerEmojiContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  prayerEmoji: {
    fontSize: 36,
  },
  prayerInputContainer: {
    marginBottom: 30,
  },
  prayerInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingBottom: 8,
  },
  prayerInputLabel: {
    fontFamily: 'Nunito-Black',
    fontSize: 22,
    color: '#3C584A',
    marginRight: 8,
  },
  prayerInputText: {
    fontFamily: 'Nunito-Black',
    fontSize: 22,
    color: '#06B6FE',
    flex: 1,
  },
  prayerTopicsContainer: {
    marginBottom: 30,
  },
  prayerTopicsLabel: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 18,
    color: '#B89B4C',
    marginBottom: 16,
  },
  prayerTopicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  prayerTopicButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E9E2C7',
  },
  prayerTopicText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    color: '#3C584A',
  },
  prayerGenerateContainer: {
    // Use padding instead of marginTop: auto to ensure it's reachable when keyboard is up
    paddingVertical: 20,
  },
  prayerGenerateButton: {
    backgroundColor: '#FFF4D9',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#FFE4A8',
    shadowOffset: { width: 0, height: 5.716 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  prayerGenerateButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowColor: 'transparent',
    elevation: 0,
  },
  prayerGenerateText: {
    fontFamily: 'Nunito-Black',
    fontSize: 18,
    color: '#3C584A',
  },
  prayerGenerateTextDisabled: {
    color: 'rgba(60, 88, 74, 0.5)',
  },
  recentPrayersContainer: {
    marginBottom: 30,
  },
  recentPrayerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E9E2C7',
  },
  recentPrayerText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    color: '#06B6FE',
    maxWidth: 150,
  },
});

export default PrayerSheet; 