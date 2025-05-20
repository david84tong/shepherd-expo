import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Dimensions, 
  ScrollView,
  Animated,
} from 'react-native';
import EmptyModal from './EmptyModal';
import { Feather } from '@expo/vector-icons';

// Image references
const STEP1_IMAGE = require('../assets/images/widget-step1.png');
const STEP2_IMAGE = require('../assets/images/widget-step2.png');
const STEP3_IMAGE = require('../assets/images/widget-step3.png');
const STEP4_IMAGE = require('../assets/images/widget-step4.png');
const PREVIEW_IMAGE = require('../assets/images/sheep-widget-preview.png');

// Simplified steps with concise instructions
const steps = [
  {
    instruction: 'Press and hold on any empty area of your home screen until the apps start to jiggle.',
    image: STEP1_IMAGE,
  },
  {
    instruction: 'Tap the plus (+) button in the top-left corner of your screen.',
    image: STEP2_IMAGE,
  },
  {
    instruction: 'Find Shepherd in the widget gallery.',
    image: STEP3_IMAGE,
  },
  {
    instruction: 'Choose the Shepherd widget size by swiping left or right.',
    image: STEP4_IMAGE,
  },
  {
    instruction: 'Tap "Add Widget" and position it on your home screen.',
    image: PREVIEW_IMAGE,
  },
];

interface WidgetHowToSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function WidgetHowToSheet({ visible, onClose }: WidgetHowToSheetProps) {
  const [step, setStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  // Reset animation values when modal becomes visible
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      opacity.setValue(1);
      setStep(0);
    }
  }, [visible]);

  // Handle closing animation
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // When the step changes, scroll to the top
  const handleNextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      handleClose();
    }
  };

  // Navigate to a specific step when progress indicator is clicked
  const goToStep = (stepIndex: number) => {
    setStep(stepIndex);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <EmptyModal visible={visible} onClose={handleClose}>
      <Animated.View 
        style={[
          styles.modalContent,
          { transform: [{ translateY }], opacity }
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#3C584A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Widget to Home Screen</Text>
          <View style={{ width: 40 }} />
        </View>
        
        {/* Scrollable Content Area */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image for Step - Now above instructions */}
          <View style={styles.imageContainer}>
            <Image
              source={steps[step].image}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
          
          {/* Main instruction */}
          <Text style={styles.mainInstruction}>
            {steps[step].instruction}
          </Text>
          
          {/* Bottom padding to ensure content doesn't get cut off by fixed elements */}
          <View style={{ height: 100 }} />
        </ScrollView>
        
        {/* Fixed Bottom Area */}
        <View style={styles.fixedBottomContainer}>
          {/* Progress indicators - Now clickable */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              {steps.map((_, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={[styles.progressLine, i <= step ? styles.activeLine : styles.inactiveLine]} />}
                  <TouchableOpacity 
                    onPress={() => goToStep(i)}
                    style={[styles.progressCircle, i <= step ? styles.activeCircle : styles.inactiveCircle]}
                  >
                    <Text style={[styles.progressNumber, i <= step ? styles.activeNumber : styles.inactiveNumber]}>
                      {i + 1}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
          
          {/* Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleNextStep}
          >
            <Text style={styles.buttonText}>
              {step < steps.length - 1 ? 'Next' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </EmptyModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 100,
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 12,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'feather',
    color: '#3C584A',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    alignItems: 'center',
  },
  imageContainer: {
    width: Dimensions.get('window').width * 0.8,
    height: Dimensions.get('window').width * 0.6,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Added rounded corners
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16, // Added rounded corners to the image
  },
  mainInstruction: {
    fontFamily: 'feather',
    fontSize: 20,
    fontWeight: '600',
    color: '#3C584A',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  fixedBottomContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    backgroundColor: '#FEF3C7',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    backgroundColor: '#FCD34D',
  },
  inactiveCircle: {
    backgroundColor: '#FFF4D9',
    borderWidth: 1,
    borderColor: '#E9E2C7',
  },
  progressNumber: {
    fontFamily: 'feather',
    fontSize: 14,
    fontWeight: '600',
  },
  activeNumber: {
    color: '#3C584A',
  },
  inactiveNumber: {
    color: '#B89B4C',
  },
  progressLine: {
    height: 2,
    flex: 1,
    marginHorizontal: 4,
  },
  activeLine: {
    backgroundColor: '#FCD34D',
  },
  inactiveLine: {
    backgroundColor: '#E9E2C7',
  },
  button: {
    backgroundColor: '#FCD34D',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  buttonText: {
    fontFamily: 'feather',
    fontSize: 16,
    fontWeight: '600',
    color: '#3C584A',
  },
});