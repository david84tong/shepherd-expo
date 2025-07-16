import React, { useState, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useAssets } from 'expo-asset';
import Rive from 'rive-react-native';
import PrimaryButton from '../components/PrimaryButton';
import analytics from '../utils/analytics';
import { isSignedIn } from './hooks/authHook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_ANDROID, IS_IOS } from './utils/utils';
import i18n from '~/app/utils/i18n';
import useSubscriptionStore from '~/app/stores/subscriptionStore';
import { ONBOARDING_COMPLETED_KEY } from './models/Onboarding';
import { hapticLight, hapticMedium } from '~/utils/haptics';
import { appLog } from './helper/helper';

// Key for tracking daily first load
const DAILY_FIRST_LOAD_KEY = 'daily_first_load_';

interface AnimatedItemProps {
  index?: number;
  children: ReactNode;
  animateItemFromBottom?: boolean; // New prop to control individual item animation intensity
}

const AnimatedItem = ({
  index = 0,
  children,
  animateItemFromBottom = false,
}: AnimatedItemProps) => {
  const opacity = useSharedValue(0);
  // Start further down if animating from bottom, otherwise a gentler slide
  const initialTranslateY = animateItemFromBottom ? 60 : 25;
  const translateY = useSharedValue(initialTranslateY);

  useEffect(() => {
    // Adjusted delays and durations for a smoother, slightly faster feel
    const delay = 50 + index * 75;
    opacity.value = withDelay(delay, withTiming(1, { duration: 550 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 550 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

const PricingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [animationReady, setAnimationReady] = useState(false); // Ensures animations run after mount
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  const animateScreenFromBottom = params.animateFromBottom === 'true';
  const fromLoading = params.fromLoading === 'true';
  const isInReview = (global as any).is_In_Review;

  // Track screen view
  useEffect(() => {
    const initializeScreen = async () => {
      analytics.logEvent('PricingScreen_Viewed', {
        fromLoading: fromLoading || false,
        animateFromBottom: animateScreenFromBottom || false,
      });

      // Check if onboarding is completed and set from screen accordingly
      try {
        const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        const fromScreenValue = onboardingCompleted === 'true'
          ? 'pricingscreen_onboardingdone'
          : 'pricingscreen';

        useSubscriptionStore.getState().setFromScreen(fromScreenValue);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Fallback to default value
        useSubscriptionStore.getState().setFromScreen('pricingscreen');
      }
    };

    initializeScreen();
  }, [fromLoading, animateScreenFromBottom]);

  // Set daily first load to true when PricingScreen loads
  useEffect(() => {
    const setDailyFirstLoad = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
        const dailyKey = DAILY_FIRST_LOAD_KEY + today;
        await AsyncStorage.setItem(dailyKey, 'true');
        appLog(`[PricingScreen] Set daily first load to true for ${today}`);
      } catch (error) {
        console.error('[PricingScreen] Error setting daily first load:', error);
      }
    };
    setDailyFirstLoad();
  }, []);

  // Screen container just fades in quickly
  const screenOpacity = useSharedValue(0);

  useEffect(() => {
    const screenReadyTimeout = setTimeout(() => {
      setAnimationReady(true);
      screenOpacity.value = withTiming(1, { duration: 250 }); // Quick fade-in for the container
    }, 50); // Short delay to ensure component is mounted

    return () => clearTimeout(screenReadyTimeout);
  }, []);

  const screenContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: screenOpacity.value, // Only opacity for the main container
    };
  });

  // Load Rive assets
  const [riveAssets] = useAssets([require('../assets/riveAnimations/goldLamb.riv')]);

  const handleSubscribe = async () => {
    hapticMedium();

    // Get A/B test value to determine action
    let abTestValue = 0; // Default value
    try {
      const storedAbTest = await AsyncStorage.getItem('abTest');
      if (storedAbTest !== null) {
        abTestValue = parseInt(storedAbTest, 10);
        appLog('[PricingScreen] Retrieved A/B test value:', abTestValue);
      } else {
        appLog('[PricingScreen] No A/B test value found, using default:', abTestValue);
      }
    } catch (abTestError) {
      console.error('[PricingScreen] Error retrieving A/B test value:', abTestError);
    }

    analytics.logEvent('PricingScreen_SubscribeButton_Tapped', {
      trialEnabled: trialEnabled,
      abTestGroup: abTestValue,
      action: abTestValue === 1 ? 'presentFreeTrialPaywall' : 'navigateToFreeOffer',
    });

    try {
      setIsLoading(true);
      const { presentFreeTrialPaywall } = useSubscriptionStore.getState();
      await presentFreeTrialPaywall();
    } catch (error) {
      console.error('[PricingScreen] Error presenting free trial paywall:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    hapticLight();
    analytics.logEvent('PricingScreen_BackButton_Tapped');

    // Always navigate to tabs when closing pricing screen for logged in users
    if (isSignedIn()) {
      router.replace('/(tabs)');
    } else {
      // Check onboarding status before navigation
      try {
        const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        if (onboardingCompleted === 'true') {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding/11');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        router.replace('/(tabs)');
      }
    }
  };

  const handleOpenReferralModal = () => {
    hapticLight();
    analytics.logEvent('PricingScreen_ReferralCode_Tapped');
    setReferralInput('');
    setReferralModalVisible(true);
  };

  const handleReferralSubmit = async (code: string) => {
    setIsSubmittingReferral(true);
    try {
      // Check if user is authenticated first
      if (!isSignedIn()) {
        appLog('[PricingScreen] User not authenticated, creating anonymous account first');
        
        // Import auth functions
        const auth = (await import('@react-native-firebase/auth')).default;
        
        // Create anonymous account
        try {
          const userCredential = await auth().signInAnonymously();
          appLog('[PricingScreen] Anonymous account created:', userCredential.user.uid);
          
          // Create user document in Firestore
          const firestore = (await import('@react-native-firebase/firestore')).default;
          await firestore().collection('users').doc(userCredential.user.uid).set({
            id: userCredential.user.uid,
            displayName: 'Anonymous User',
            createdAt: firestore.Timestamp.now(),
            updatedAt: firestore.Timestamp.now(),
          }, { merge: true });
          
          // Update local user store
          const { useUserStore } = await import('./stores/userStore');
          useUserStore.getState().setUser({
            id: userCredential.user.uid,
            displayName: 'Anonymous User',
          });
          
          appLog('[PricingScreen] Anonymous user setup complete');
        } catch (authError) {
          console.error('[PricingScreen] Failed to create anonymous account:', authError);
          Alert.alert('Error', 'Failed to authenticate. Please try again.');
          return;
        }
      }
      
      // Now apply the referral code
      const { handleReferralCode, forceRefreshProStatus } = useSubscriptionStore.getState();
      await handleReferralCode(code);
      
      // Wait a bit for Firestore to update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Force refresh pro status across all stores
      await forceRefreshProStatus();
      
      // Double-check and ensure pro status is set
      const subscriptionState = useSubscriptionStore.getState();
      appLog('[PricingScreen] After referral code and force refresh, isProMember:', subscriptionState.isProMember);
      
      // Update user store pro status to ensure it's reflected everywhere
      const { useUserStore } = await import('./stores/userStore');
      const userStore = useUserStore.getState();
      userStore.setProStatus('pro');
      
      // Force update the user properties
      userStore.setUser({
        ...userStore.getUser(),
        isPro: true,
        proStatus: 'pro'
      });
      
      // Success!
      Alert.alert('Success!', 'Referral code applied successfully');
      setReferralModalVisible(false);
      
      // Check if onboarding is completed to determine navigation
      const onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      
      setTimeout(() => {
        if (onboardingCompleted === 'true') {
          // User has completed onboarding before, go to tabs
          router.replace('/(tabs)');
        } else {
          // User hasn't completed onboarding, go to screen 11
          router.replace('/onboarding/11');
        }
      }, 1000);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to apply referral code');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  // Conditional rendering of animated items to ensure animations trigger correctly
  const renderAnimatedContent = () => {
    if (!animationReady) return null;
    return (
      <>
        {/* Header */}
        {IS_ANDROID && (
          <AnimatedItem index={0} animateItemFromBottom={animateScreenFromBottom}>
            <View className="flex-row items-center justify-between px-5 py-3 mb-3">
                <Animated.View entering={FadeIn.duration(600)}>
                  <TouchableOpacity onPress={handleBack} className="p-2">
                    <Feather name="x" size={28} color="#B89B4C" />
                  </TouchableOpacity>
                </Animated.View>            
              <View className="w-10" />
            </View>
          </AnimatedItem>
        )}

        {/* Main content */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 120,
            paddingHorizontal: 20,
          }}>

          {/* <AnimatedItem index={1} animateItemFromBottom={animateScreenFromBottom}>
            <View className="items-center mb-4 flex justify-center mt-16">
              <LinearGradient
                colors={['#F7B500', '#FFF45B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 32,
                  maxWidth: '85%',
                }}>
                <Text
                  className="font-nunito-italic text-title text-white text-center"
                  style={{
                    textShadowColor: 'rgba(0,0,0,0.15)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 3,
                  }}>
                  {i18n.t('pricing_super')}
                </Text>
              </LinearGradient>
              <Text
                className="font-feather text-title text-textPrimary text-center mt-2"
                style={{
                  textShadowColor: 'rgba(0,0,0,0.15)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3,
                }}>
                {i18n.t('pricing_shepherd')}
              </Text>
            </View>
          </AnimatedItem> */}

          {/* <AnimatedItem index={2} animateItemFromBottom={animateScreenFromBottom}>
            <View className="bg-white rounded-2xl shadow-card p-6 mb-8 items-center mt-4">
              <Text className="font-feather text-h2 text-textPrimary mb-2 text-center">
                {i18n.t('pricing_draw_closer_to_god')}
              </Text>
              <Image
                source={require('../assets/onboarding/reviews.png')}
                className="w-96 h-20"
                resizeMode="contain"
              />
              <Text className="font-din text-heading text-description text-center">
                {i18n.t('pricing_join_10000_super_users')}
              </Text>
            </View>
          </AnimatedItem> */}

          {/* How Trial Works Section */}
          <AnimatedItem index={2.5} animateItemFromBottom={animateScreenFromBottom}>
            <View className="mb-10 mt-12">
              <Text className="font-feather text-h2 text-textPrimary mb-6 text-center">
                {IS_ANDROID ? 'Unlock Super Shepherd Today' : i18n.t('pricing_giving_super_shepherd_free')}
              </Text>
              <View
                className="bg-lightYellow border-2 border-accentGold shadow-lg rounded-[24px] mb-0 overflow-hidden h-48 mt-4"
                style={{
                  shadowColor: '#FCD34D',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                }}>

                <View className="flex-row p-4 h-48 justify-between">
                  {/* Lamb Image - Full size, no background, clipped at bottom */}
                  <View className="w-48 h-full absolute left-0 bottom-0 ml-2">
                    <View
                      className="w-48 h-48 absolute bottom-[-20] rounded-full"
                      style={{
                        backgroundColor: 'rgba(252, 211, 77, 0.2)',
                        shadowColor: '#FCD34D',
                        shadowOffset: { width: 0, height: 0 },
                        right: 4,
                        shadowOpacity: 0.6,
                        shadowRadius: 20,
                        elevation: 10,
                      }}
                    />
                    {riveAssets && (
                      <>
                        {IS_ANDROID ? (
                          <Rive
                            resourceName={'gold_lamb'}
                            style={{ width: 192, height: 192, position: 'absolute', bottom: -20 }}
                            artboardName="lamb-idle"
                            autoplay={true}
                          />
                        ) : (
                          <Rive
                            url={riveAssets[0].localUri!}
                            style={{ width: 192, height: 192, position: 'absolute', bottom: -20 }}
                            artboardName="lamb-idle"
                            autoplay={true}
                          />
                        )}
                      </>
                    )}
                  </View>

                  {/* Content - Add left padding to account for image */}
                  <View className="flex-1 ml-44 pl-2 mr-2 my-2">
                    {/* Name */}
                    <Text className="font-feather text-lg text-textPrimary mb-1">
                    LIMITED Time
                    </Text>

                    {/* Description */}
                    <Text className="font-din text-sm text-description -mb-2 h-16" numberOfLines={3}>
                      {i18n.t('pricing_anointed_lamb_description')}
                    </Text>

                    {/* Included with Super badge */}
                    <View className="mt-2">
                      <View className="bg-accentGold/20 px-3 py-1.5 rounded-full self-start mt-4">
                        <Text className="font-feather text-xs text-textPrimary">
                          {i18n.t('pricing_included_with_super')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

            </View>
          </AnimatedItem>


          <AnimatedItem index={3} animateItemFromBottom={animateScreenFromBottom}>
            <View className="bg-white rounded-2xl shadow-card mb-8 overflow-hidden">
              <View className="flex-row">
                <View className="flex-1" />
                <View className="items-center justify-center py-4" style={{ width: '25%' }}>
                  <Image 
                    source={require('../assets/youversion.png')}
                    style={{ width: 36, height: 36 }}
                    resizeMode="contain"
                  />
                </View>
                <View
                  className="items-center justify-center py-4 bg-accentGold/10"
                  style={{ width: '25%' }}>
                  <LinearGradient
                    colors={['#F7B500', '#FFF45B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      paddingHorizontal: 4,
                      paddingVertical: 6,
                      borderRadius: 32,
                      width: '80%',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                      elevation: 5,
                    }}>
                    <Text
                      className="font-nunito-italic text-md text-white text-center"
                      style={{
                        textShadowColor: 'rgba(0,0,0,0.15)',
                        textShadowOffset: { width: 1, height: 1 },
                        textShadowRadius: 3,
                      }}>
                      {i18n.t('pricing_super')}
                    </Text>
                  </LinearGradient>
                </View>
              </View>
              <View>
                {[
                  { name: i18n.t('feature_access_bible'), free: true, pro: true },
                  { name: i18n.t('pricing_custom_devotionals'), free: false, pro: true },
                  { name: i18n.t('pricing_chat_with_bible_verse'), free: false, pro: true },
                  { name: i18n.t('feature_unlimited_daily_reflections'), free: false, pro: true },
                  { name: i18n.t('feature_equip_skins'), free: false, pro: true },
                  { name: i18n.t('pricing_beta_access_social'), free: false, pro: true },
                  { name: i18n.t('feature_super_lamb_skin'), free: false, pro: true },
                ].map((feature, idx) => (
                  <AnimatedItem
                    key={feature.name}
                    index={4 + idx * 0.5}
                    animateItemFromBottom={animateScreenFromBottom}>
                    <View className="flex-row border-t border-surfaceCream">
                      <View className="flex-1 py-4 pl-6 pr-2">
                        <Text className="font-din text-body text-textPrimary">{feature.name}</Text>
                      </View>
                      <View className="items-center justify-center" style={{ width: '25%' }}>
                        {feature.free ? (
                          <Feather name="check-circle" size={22} color="#24CA17" />
                        ) : (
                          <Feather name="circle" size={22} color="#E9E2C7" />
                        )}
                      </View>
                      <View
                        className="items-center justify-center bg-accentGold/10"
                        style={{ width: '25%' }}>
                        <Feather name="check-circle" size={22} color="#24CA17" />
                      </View>
                    </View>
                  </AnimatedItem>
                ))}
              </View>
            </View>

            {/* Referral Code Button - Below the table */}
         {!isInReview && (
          <TouchableOpacity onPress={handleOpenReferralModal} className="mt-0 py-3 mb-12">
              <Text className="text-center text-description underline font-din text-sm">
                {i18n.t('referral_code_title')}
              </Text>
            </TouchableOpacity>  
         )}

          </AnimatedItem>




        </ScrollView>
        <AnimatedItem index={14} animateItemFromBottom={animateScreenFromBottom}>
          <View
            className="absolute bottom-0 left-0 right-0 bg-surfaceCream/90 pt-4 pb-2 px-5 z-20"
            style={{
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 247, 230, 1)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 5,
              borderRadius: 20,
            }}>
            {isLoading ? (
              <View className="py-3 flex-row justify-center items-center">
                <ActivityIndicator size="small" color="#F7B500" />
                <Text className="font-din text-lg text-textPrimary ml-3">
                  {i18n.t('loading_subscription_options')}
                </Text>
              </View>
            ) : (
              <PrimaryButton title={IS_ANDROID ? 'Unlock Super Shepherd' : i18n.t('pricing_see_free_offer')} onPress={handleSubscribe} />
            )}

          </View>
        </AnimatedItem>
      </>
    );
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="flex-1 bg-surfaceCream">
        <Animated.View
          className="flex-1"
          style={[screenContainerStyle, { paddingTop: insets.top }]}>
          {renderAnimatedContent()}

          {/* Full Screen Loading Overlay (shown during paywall transitions) */}
          {isLoading && (
            <Animated.View
              className="absolute inset-0 bg-black/30 items-center justify-center z-50"
              entering={FadeIn.duration(200)}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
              <View className="bg-white p-5 rounded-xl items-center">
                <ActivityIndicator size="large" color="#F7B500" />
                <Text className="font-din text-body text-textPrimary mt-3">
                  {i18n.t('loading_subscription_options')}
                </Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>

      {/* Referral Code Modal - same as in SettingsSheet */}
      <Modal
        visible={referralModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReferralModalVisible(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-surfaceCream rounded-2xl p-5 w-[85%] max-w-[350px]">
            {/* Title */}
            <Text className="font-feather text-xl text-textPrimary text-center mb-4">
              {i18n.t('enter_referral_code')}
            </Text>

            {/* Input Field */}
            <View className="mb-4">
              <TextInput
                className="bg-white rounded-xl px-4 py-3 text-lg font-din text-textPrimary border border-[#FFE4A8]"
                placeholder={i18n.t('enter_code_here')}
                placeholderTextColor="#B89B4C"
                value={referralInput || ''}
                onChangeText={setReferralInput}
                autoCapitalize="characters"
                maxLength={6}
                editable={!isSubmittingReferral}
              />
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={() => handleReferralSubmit(referralInput)}
              className={`bg-[#FFE07D] rounded-xl p-4 mb-2 ${referralInput.length !== 6 ? 'opacity-50' : ''}`}
              disabled={referralInput.length !== 6 || isSubmittingReferral}>
              <Text className="font-feather text-textPrimary text-center text-lg">
                {isSubmittingReferral ? i18n.t('submitting') : i18n.t('confirm_button')}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setReferralModalVisible(false)}
              className="bg-textPrimary/10 rounded-xl p-4">
              <Text className="font-din text-textPrimary text-center">{i18n.t('cancel_button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default PricingScreen;
