import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Alert, StatusBar, Platform, Keyboard, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import PhoneInput from 'react-native-phone-input';
import auth from '@react-native-firebase/auth';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import PrimaryButton from '../../components/PrimaryButton';
import analytics from '../../utils/analytics';
import { appLog, RPH } from '../helper/helper';
import { hapticLight } from '~/utils/haptics';
import i18n from '../utils/i18n';

export default function PhoneNumberScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const { setPhoneNumber } = useUserStore();
  
  const [phoneNumber, setPhoneNumberLocal] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const phoneInputRef = useRef<PhoneInput>(null);
  // Animation values
  const screenOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(40);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);

  useEffect(() => {
    analytics.logEvent("OnboardingPhoneNumberScreen_Viewed");

    // Reset animation values and start entrance animations
    screenOpacity.value = 0;
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    subtitleOpacity.value = 0;
    subtitleTranslateY.value = 40;
    contentOpacity.value = 0;
    contentTranslateY.value = 40;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 40;

    // Staggered animations matching onboarding pattern
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 200 }));
    };

    screenOpacity.value = withTiming(1, { duration: 300 });
    animateComponent(titleOpacity, titleTranslateY, 100);
    animateComponent(subtitleOpacity, subtitleTranslateY, 200);
    animateComponent(contentOpacity, contentTranslateY, 300);
    animateComponent(buttonOpacity, buttonTranslateY, 400);
  }, []);

  // Handle OTP digit change
  const handleOtpDigitChange = (text: string, index: number) => {
    const newDigits = [...otpDigits];
    
    // Only allow single digit
    if (text.length <= 1 && /^\d*$/.test(text)) {
      newDigits[index] = text;
      setOtpDigits(newDigits);
      
      // Update the combined verification code
      const combinedCode = newDigits.join('');
      setVerificationCode(combinedCode);
      
      // Auto-focus next input if current input has a digit and there's a next input
      if (text && index < 5 && otpInputRefs.current[index + 1]) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle OTP digit backspace
  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newDigits = [...otpDigits];
      
      if (newDigits[index] === '' && index > 0) {
        // If current input is empty and backspace is pressed, focus previous input
        otpInputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        newDigits[index] = '';
        setOtpDigits(newDigits);
        setVerificationCode(newDigits.join(''));
      }
    }
  };

  // Reset OTP when verification is dismissed
  const resetOtp = () => {
    setOtpDigits(['', '', '', '', '', '']);
    setVerificationCode('');
  };

  const handleSendVerification = async () => {
    if (!phoneNumber) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
      return;
    }

    // Basic phone number validation
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number with country code.');
      return;
    }

    try {
      setLoading(true);
      hapticLight();
      
      appLog('Sending verification to:', phoneNumber);
      
      
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      appLog('Confirmation:', confirmation);
      setConfirmation(confirmation);
      setShowVerification(true);
      
      analytics.logEvent('OnboardingPhoneNumberScreen_VerificationSent', {
        phoneNumber: phoneNumber.substring(0, 5) + 'XXXXX' // Log partial for privacy
      });

      // Focus first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 500);
      
    } catch (error: any) {
      console.error('Phone verification error:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
      analytics.logEvent('OnboardingPhoneNumberScreen_VerificationError', {
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmation || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      hapticLight();
      
      // Verify the code - this will sign in the user with the phone number
      const userCredential = await confirmation.confirm(verificationCode);
      
      if (!phoneNumber) {
        throw new Error('Phone number not available');
      }
      
      // Save to stores and onboarding responses
      await setResponse('phoneNumber', phoneNumber);
      await setResponse('phoneVerified', true);
      setPhoneNumber(phoneNumber);
      
      // Update user store with verified phone
      const { setPhoneVerified } = useUserStore.getState();
      setPhoneVerified(true);
      
      appLog('Phone number verified successfully:', phoneNumber.substring(0, 5) + 'XXXXX');
      
      analytics.logEvent('OnboardingPhoneNumberScreen_Verified', {
        phoneNumber: phoneNumber.substring(0, 5) + 'XXXXX'
      });
      
      // Navigate to contacts screen
      router.push('/onboarding/contacts');
      
    } catch (error: any) {
      console.error('Code verification error:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/invalid-verification-code') {
        Alert.alert('Invalid Code', 'The verification code is incorrect. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        Alert.alert('Code Expired', 'The verification code has expired. Please request a new one.');
        setShowVerification(false);
        setConfirmation(null);
        resetOtp();
      } else {
        Alert.alert('Verification Failed', 'Failed to verify phone number. Please try again.');
      }
      
      analytics.logEvent('OnboardingPhoneNumberScreen_VerificationFailed', {
        error: error.message,
        errorCode: error.code
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    hapticLight();
    analytics.logEvent('OnboardingPhoneNumberScreen_Skipped');
    router.push('/onboarding/contacts');
  };

  // Animated styles
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const continueStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));


  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Pressable 
        style={{ flex: 1 }} 
        onPress={() => Keyboard.dismiss()}
        className="bg-surfaceCream px-6 pt-12 pb-24"
      >
        {/* Title */}
        <Animated.View style={titleStyle}>
          <Text className="font-feather text-h2 text-center text-textPrimary mb-4 mt-4 px-2">
            {showVerification ? 'Verify your phone number' : 'What\'s your phone number?'}
          </Text>
        </Animated.View>

        {/* Content */}
        <Animated.View style={contentStyle} className="flex-1">
          {!showVerification ? (
            // Phone Number Input using react-native-phone-input
            <View className="mb-8">
              <View className="bg-white rounded-full px-4 py-4">
                <PhoneInput
                  ref={phoneInputRef}
                  initialCountry="us"
                  textStyle={{ 
                    color: '#795323', 
                    fontSize: 18,
                  }}
                  textProps={{
                    placeholder: "Enter phone number",
                    placeholderTextColor: '#B89B4C',
                  }}
                  
                  onChangePhoneNumber={(phone) => {
                    appLog('Phone number changed:', phone);
                    setPhoneNumberLocal(phone);
                  }}
                  style={{
                    width: '100%',
                    height: 25,
                    borderRadius: 20,
                  }}
                />
              </View>
            </View>
          ) : (
            // Custom OTP Input Component
            <View className="mb-8">
              <View className="flex-row justify-center  mb-4">
                {otpDigits.map((digit, index) => (
                  <View
                    key={index}
                    className={`w-12 h-12 rounded-xl border-2 items-center justify-center mr-2 ${
                      digit ? 'border-accentGold bg-surfaceCream' : 'border-pillBorder bg-white'
                    }`}
                   
                  >
                    <TextInput
                      ref={(ref) => {
                        otpInputRefs.current[index] = ref;
                      }}
                      className="font-feather text-xl text-textPrimary text-center w-full h-full"
                      value={digit}
                      onChangeText={(text) => handleOtpDigitChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      autoFocus={index === 0}
                      textAlign="center"
                      style={{
                        textAlignVertical: 'center',
                      }}
                    />
                  </View>
                ))}
              </View>
              
              {/* Helper Text */}
              <View className="items-center mb-4">
                <Text className="font-din text-xl text-description text-center">
                  Sent to {phoneNumber}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Continue Button - Fixed at bottom */}
        <Animated.View style={continueStyle}>
          <PrimaryButton
            title={
              loading 
                ? (showVerification ? 'Verifying...' : 'Sending Code...') 
                : (showVerification ? 'Verify Code' : 'Send Verification Code')
            }
            onPress={showVerification ? handleVerifyCode : handleSendVerification}
            disabled={loading || (!showVerification && !phoneNumber) || (showVerification && verificationCode.length !== 6)}
            isActive={(!showVerification && !!phoneNumber) || (showVerification && verificationCode.length === 6)}
            loading={loading}
          />
          
          {/* Skip Button */}
          {
            !showVerification && (
              <View className="items-center mt-4">
            <Text 
              onPress={handleSkip}
              className="font-din text-base text-description"
            >
              Skip for now
            </Text>
          </View>
            )
          }
        </Animated.View>
      </Pressable>
    </>
  );
}