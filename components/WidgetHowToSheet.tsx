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
import { analytics } from '~/utils/analytics';
import i18n from '~/app/utils/i18n';

// Image references
const PREVIEW_IMAGE = require('../assets/images/widgetPreviewStep.png');
const STEP1_IMAGE = require('../assets/images/widgetStep1.png');
const STEP2_IMAGE = require('../assets/images/widgetStep2.png');
const STEP3_IMAGE = require('../assets/images/widgetStep3.png');
const STEP4_IMAGE = require('../assets/images/widgetStep4.png');


// Simplified steps with concise instructions
const steps = [
  {
    instruction: i18n.t('widget_step1_instruction'),
    image: STEP1_IMAGE,
  },
  {
    instruction: i18n.t('widget_step2_instruction'),
    image: STEP2_IMAGE,
  },
  {
    instruction: i18n.t('widget_step3_instruction'),
    image: STEP3_IMAGE,
  },
  {
    instruction: i18n.t('widget_step4_instruction'),
    image: STEP4_IMAGE,
  },
];

interface WidgetHowToSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function WidgetHowToSheet({ visible, onClose }: WidgetHowToSheetProps) {
  const [step, setStep] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      opacity.setValue(1);
      setStep(0);
      setShowInstructions(false); // Reset to landing screen
    }
  }, [visible]);

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

  const handleNextStep = () => {
    if (step < steps.length - 1) {
      analytics.logEvent(`how_to_widget_sheet_next_step_${steps?.length || 1}_pressed`);
      setStep(step + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      analytics.logEvent('how_to_widget_sheet_done_pressed');
      handleClose();
    }
  };

  const goToStep = (stepIndex: number) => {
    setStep(stepIndex);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onNoThanksPressed = () => {
    analytics.logEvent('how_to_widget_sheet_no_thanks_pressed');
    handleClose();
  };

  const onAddWidgetPressed = () => {
    analytics.logEvent('how_to_widget_sheet_add_widget_pressed');
    setShowInstructions(true)
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
          <Text style={styles.headerTitle}>{i18n.t('widget_howto_header')}</Text>
          <View style={{ width: 40 }} />
        </View>
        {/* Landing screen or instructions */}
        {!showInstructions ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-2xl font-feather font-bold text-center text-[#3C584A] mb-8 ">{i18n.t('widget_howto_landing_title')}</Text>
            <View style={styles.imageContainerPreview}>
              <Image
                source={PREVIEW_IMAGE}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity
              className="w-full rounded-full py-4 mb-4"
              onPress={onAddWidgetPressed}
              style={{ backgroundColor: '#FCD34D' }}
            >
              <Text className="text-lg font-feather font-bold text-[#3C584A] text-center">{i18n.t('widget_howto_add_widget')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-full rounded-full py-4"
              onPress={onNoThanksPressed}
            >
              <Text className="text-lg font-feather text-[#3C584A] text-center">{i18n.t('widget_howto_no_thanks')}</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <>
            {/* Scrollable Content Area */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Progress indicators - moved to top */}
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
              {/* Main instruction text below progress */}
              <Text style={styles.mainInstruction}>
                {steps[step].instruction}
              </Text>
              {/* Image below text */}
              <View style={styles.imageContainer}>
                <Image
                  source={steps[step].image}
                  style={styles.image}
                  resizeMode="cover"

                />
              </View>
              <View style={{ height: 100 }} />
            </ScrollView>
            {/* Fixed Bottom Area */}
            <View style={styles.fixedBottomContainer}>
              {/* Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleNextStep}
              >
                <Text style={styles.buttonText}>
                  {step < steps.length - 1 ? i18n.t('next') : i18n.t('done')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </Animated.View>
    </EmptyModal>
  );
}

const styles = StyleSheet.create({
  activeCircle: {
    backgroundColor: '#FCD34D',
  },
  activeLine: {
    backgroundColor: '#FCD34D',
  },
  activeNumber: {
    color: '#3C584A',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#FCD34D',
    borderRadius: 100,
    elevation: 3,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonText: {
    color: '#3C584A',
    fontFamily: 'feather',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  fixedBottomContainer: {
    backgroundColor: '#FEF3C7',
    paddingBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 8,
    width: '100%',
  },
  handle: {
    backgroundColor: '#D1D5DB',
    borderRadius: 100,
    height: 4,
    width: 40,
  },
  handleContainer: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 12,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  headerTitle: {
    color: '#3C584A',
    fontFamily: 'feather',
    fontSize: 20,
    fontWeight: '600',
  },
  image: {
    borderRadius: 16,
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  imageContainer: {
    alignItems: 'center',
    borderRadius: 16,
    height: Dimensions.get('window').width * 0.8,
    justifyContent: 'center',
    marginTop: 24,
    overflow: 'hidden',
    width: 240,
  },
  imageContainerPreview: {
    alignItems: 'center',
    borderRadius: 16,
    height: Dimensions.get('window').width * 0.8,
    justifyContent: 'center',
    marginBottom: 40,
    overflow: 'hidden',
    width: Dimensions.get('window').width * 0.8,
  },
  inactiveCircle: {
    backgroundColor: '#FFF4D9',
    borderColor: '#E9E2C7',
    borderWidth: 1,
  },
  inactiveLine: {
    backgroundColor: '#E9E2C7',
  },
  inactiveNumber: {
    color: '#B89B4C',
  },
  mainInstruction: {
    color: '#3C584A',
    fontFamily: 'feather',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
  progressCircle: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  progressContainer: {
    marginBottom: 16,
    width: '100%',
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  progressNumber: {
    fontFamily: 'feather',
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
});