import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Dimensions, 
  Animated,
} from 'react-native';
import EmptyModal from '../components/EmptyModal';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

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

// Calculate screen dimensions once
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Fixed content height as a percentage of screen height
const CONTENT_HEIGHT = SCREEN_HEIGHT * 0.35;
// Fixed sheet height
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;

interface WidgetHowToSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function WidgetHowToSheet({ visible, onClose }: WidgetHowToSheetProps) {
  const [step, setStep] = useState(0);
  const imageScale = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(1)).current;
  
  // Reset animation values when modal becomes visible
  useEffect(() => {
    if (visible) {
      setStep(0);
      // Animate image when first shown
      animateImage();
    }
  }, [visible]);

  // Handle closing animation - now delegated to EmptyModal
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  // Animate image when step changes
  const animateImage = () => {
    // Reset values
    imageScale.setValue(0.9);
    imageOpacity.setValue(0.7);
    
    // Animate in
    Animated.parallel([
      Animated.timing(imageScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(imageOpacity, {
        toValue: 1, 
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // When the step changes, animate the image
  const handleNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < steps.length - 1) {
      setStep(step + 1);
      animateImage();
    } else {
      handleClose();
    }
  };

  // Navigate to a specific step when progress indicator is clicked
  const goToStep = (stepIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(stepIndex);
    animateImage();
  };

  return (
    <EmptyModal visible={visible} onClose={handleClose}>
      <View style={styles.modalContent}>
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
        
        {/* Content Container - with fixed height */}
        <View style={styles.contentContainer}>
          {/* Image for Step */}
          <Animated.View 
            style={[
              styles.imageContainer,
              { 
                transform: [{ scale: imageScale }],
                opacity: imageOpacity,
              }
            ]}
          >
            <Image
              source={steps[step].image}
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>
          
          {/* Main instruction - in a fixed-height container */}
          <View style={styles.instructionContainer}>
            <Text style={styles.mainInstruction}>
              {steps[step].instruction}
            </Text>
          </View>
        </View>
        
        {/* Progress and Button Container */}
        <View style={styles.bottomContainer}>
          {/* Progress indicators */}
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
            activeOpacity={0.8}
            onPress={handleNextStep}
          >
            <Text style={styles.buttonText}>
              {step < steps.length - 1 ? 'Next' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </EmptyModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    width: '100%',
    height: SHEET_HEIGHT,
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
    width: 36,
    height: 4,
    borderRadius: 100,
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 6,
    marginBottom: 12,
  },
  closeButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'feather',
    color: '#3C584A',
    fontWeight: '600',
  },
  contentContainer: {
    height: CONTENT_HEIGHT,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  imageContainer: {
    width: SCREEN_WIDTH * 0.8,
    height: CONTENT_HEIGHT * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  instructionContainer: {
    height: CONTENT_HEIGHT * 0.35 - 16, // Account for marginBottom of imageContainer
    justifyContent: 'center',
  },
  mainInstruction: {
    fontFamily: 'feather',
    fontSize: 20,
    fontWeight: '600',
    color: '#3C584A',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 27,
  },
  bottomContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: '#FEF3C7',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    backgroundColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  inactiveCircle: {
    backgroundColor: '#FFF4D9',
    borderWidth: 1,
    borderColor: '#E9E2C7',
  },
  progressNumber: {
    fontFamily: 'feather',
    fontSize: 13,
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
    marginHorizontal: 3,
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
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    fontFamily: 'feather',
    fontSize: 17,
    fontWeight: '600',
    color: '#3C584A',
  },
});