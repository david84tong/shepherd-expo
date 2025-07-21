import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAnalytics } from '../app/hooks/useAnalytics';

/**
 * Example component demonstrating how to use the analytics hook
 * This is just for documentation - not actual app code
 */
const AnalyticsExampleComponent = () => {
  // Get analytics methods from the hook
  const { 
    logScreenView, 
    logButtonPress, 
    logSpiritualActivity,
    logError,
    AnalyticsEvent,
    EventCategory
  } = useAnalytics();

  // Log screen view when component mounts
  useEffect(() => {
    logScreenView('ExampleScreen', {
      customParam: 'custom value'
    });
    // Handle any errors during component initialization
    try {
      // Initialization code...
    } catch (error: any) {
      logError(
        'Failed to initialize ExampleComponent',
        'INIT_ERROR',
        { errorDetails: error.message }
      );
    }
  }, [logScreenView, logError]);

  // Example button handler
  const handleStartReading = () => {
    // Log the button press
    logButtonPress('startReading', 'ExampleScreen', {
      buttonLabel: 'Start Reading'
    });
    // Log the spiritual activity
    logSpiritualActivity(AnalyticsEvent.BIBLE_READING_STARTED, {
      bookName: 'Genesis',
      chapter: 1
    });
    // Continue with actual functionality...
  };

  // Example error handling
  const handleRiskyAction = () => {
    try {
      // Some code that might fail
      throw new Error('Example error');
    } catch (error: any) {
      // Log the error
      logError(
        'Failed to complete risky action',
        'RISKY_ACTION_ERROR',
        { errorMessage: error.message }
      );
      
      // Show user-friendly error message
      alert('Something went wrong. Please try again.');
    }
  };

  return (
    <View className="p-4">
      <Text className="text-heading font-feather">Analytics Example</Text>
      
      <TouchableOpacity 
        className="mt-4 bg-accentGreen p-4 rounded-md"
        onPress={handleStartReading}
      >
        <Text className="text-white font-din text-center">Start Reading</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        className="mt-4 bg-accentRed p-4 rounded-md"
        onPress={handleRiskyAction}
      >
        <Text className="text-white font-din text-center">Try Risky Action</Text>
      </TouchableOpacity>
    </View>
  );
};

export default AnalyticsExampleComponent; 