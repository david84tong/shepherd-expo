import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, Animated, Easing, Dimensions, StatusBar } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
// @ts-expect-error: If you get type errors for 'three', install @types/three for type support
import * as THREE from 'three';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_KEY } from '~/app/models/Onboarding';
import i18n from '~/app/utils/i18n';
import useSubscriptionStore from '~/app/stores/subscriptionStore';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import analytics, { getStatsigClient } from '~/utils/analytics';
import { hapticHeavy } from '~/utils/haptics';
import { useUIStore } from '../stores/uiStore';
import { appLog } from '../helper/helper';
import Toast from 'react-native-toast-message';
import { IS_ANDROID } from '../utils/utils';

const { width, height } = Dimensions.get('window');

const ORANGE = '#FCD34D';
const DARK_BG = '#FDEBB8';
const TEXT_PRIMARY = '#3C584A';
const DESCRIPTION = '#B89B4C';
const GRAY_400 = '#9ca3af';
const GRAY_500 = '#6b7280';

const LOADING_POINTS = [
  i18n.t('loading_saving_responses'),
  i18n.t('loading_encrypting_data'),
  i18n.t('loading_sprinkling_holy_water'),
  i18n.t('loading_generating_study_plan'),
];

const DEVOTIONAL_LOADING_POINTS = [
  i18n.t('loading_crafting_devotional'),
  i18n.t('loading_cross_checking_verses'),
  i18n.t('loading_sprinkling_holy_water'),
  i18n.t('loading_waking_lamb'),
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LoadingScreenProps {
  isOnboarding?: boolean;
  verseText?: string;
  reference?: string;
}

// Optimize loading points timing
const BASE_STEP_DURATION = 1500; // Base duration for each step
const FINAL_DELAY = 500; // Reduced from 600ms

export default function LoadingScreen({
  isOnboarding: propIsOnboarding,
  verseText: propVerseText,
  reference: propReference,
}: LoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const animRef = useRef(0);
  const router = useRouter();
  const params = useLocalSearchParams();
  const [hasStarted, setHasStarted] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const lastHapticPercentage = useRef(0);

  // Add timeout state and ref
  const [timeoutTriggered, setTimeoutTriggered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track nested timers to ensure we clear them on unmount as well
  const nestedTimersRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Get custom devotional from store FIRST - needs to be before useEffect
  const customDevotional = useDevotionalStore((s) => s.customDevotional);
  const isFromCheckInStore = useDevotionalStore((s) => s.isFromCheckIn);

  // Check onboarding completion status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // If we're from check-in, skip onboarding check entirely
        if (isFromCheckInStore) {
          appLog('[LoadingScreen] Skipping onboarding check - from check-in');
          setOnboardingCompleted(true); // Treat as completed to prevent redirect
          return;
        }

        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        setOnboardingCompleted(completed === 'true');
        appLog('[LoadingScreen] Onboarding completed status:', completed === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      }
    };
    checkOnboardingStatus();
  }, [isFromCheckInStore]);

  // Check if this is from check-in flow - MUST be defined before isOnboarding
  const isCheckInFlow = useMemo(() => {
    // Check store flag first as it's the most reliable
    if (isFromCheckInStore) {
      appLog('[LoadingScreen] Check-in flow detected from store');
      return true;
    }
    // Then check params
    if (params.isCheckInFlow === 'true' || params.fromCheckIn === 'true') {
      appLog('[LoadingScreen] Check-in flow detected from params');
      return true;
    }
    return false;
  }, [isFromCheckInStore, params.isCheckInFlow, params.fromCheckIn]);

  // Stabilize critical route-derived values
  const isOnboarding = useMemo(() => {
    // Check-in flow overrides everything
    if (isCheckInFlow) {
      appLog('[LoadingScreen] isOnboarding: false (check-in flow)');
      return false;
    }
    if (params.fromSwipe === 'true') {
      appLog('[LoadingScreen] isOnboarding: false (from swipe)');
      return false;
    }
    // Use onboarding completion status if available, otherwise fall back to params/props
    if (onboardingCompleted !== null) {
      const result = !onboardingCompleted;
      appLog('[LoadingScreen] isOnboarding:', result, '(based on completion status)');
      return result;
    }
    const result =
      params.isOnboarding !== undefined ? params.isOnboarding === 'true' : propIsOnboarding;
    appLog('[LoadingScreen] isOnboarding:', result, '(from params/props)');
    return result;
  }, [params.fromSwipe, params.isOnboarding, propIsOnboarding, onboardingCompleted, isCheckInFlow]);

  const verseText = useMemo(
    () => (params.verseText as string | undefined) || propVerseText,
    [params.verseText, propVerseText]
  );

  const reference = useMemo(
    () => (params.reference as string | undefined) || propReference,
    [params.reference, propReference]
  );

  // Devotional store actions
  const isCreatingDevotional = useDevotionalStore((s) => s.isCreatingDevotional);
  const devotionalStoreCurrentDevotional = useDevotionalStore((s) => s.currentDevotional);
  const devotionalError = useDevotionalStore((s) => s.error);

  // Check if user is pro and get paywall function
  const isProMember = useSubscriptionStore((s) => s.isProMember);
  const { presentFreeTrialPaywall } = useSubscriptionStore();

  // Use appropriate loading points
  const loadingPoints = useMemo(() => {
    if (isOnboarding) return LOADING_POINTS;
    if (isCheckInFlow) return DEVOTIONAL_LOADING_POINTS;
    return DEVOTIONAL_LOADING_POINTS;
  }, [isOnboarding, isCheckInFlow]);

  // Detect if a GPT-5 or GPT-4-mini model is active via Statsig experiment
  const [isGpt5Model, setIsGpt5Model] = useState(false);
  const [isGpt4MiniModel, setIsGpt4MiniModel] = useState(false);
  useEffect(() => {
    try {
      const client = getStatsigClient?.();
      let modelName = 'gpt-5-nano';
      if (client && typeof client.getExperiment === 'function') {
        const exp = client.getExperiment('gpt-model');
        modelName = exp?.get?.('gptModel', 'gpt-5-nano') || 'gpt-5-nano';
      }
      const isGpt5 = typeof modelName === 'string' && modelName.startsWith('gpt-5');
      const isGpt4Mini =
        typeof modelName === 'string' &&
        modelName.startsWith('gpt-4') &&
        modelName.includes('mini');
      setIsGpt5Model(isGpt5);
      setIsGpt4MiniModel(isGpt4Mini);
      appLog(
        '[LoadingScreen] Detected GPT model:',
        modelName,
        'isGpt5:',
        isGpt5,
        'isGpt4Mini:',
        isGpt4Mini
      );
    } catch (e) {
      appLog('[LoadingScreen] Error detecting GPT model, defaulting to non-enforced timing:', e);
      setIsGpt5Model(false);
      setIsGpt4MiniModel(false);
    }
  }, []);

  // Flow-aware step duration with model-based caps (GPT-4 mini max 5s total)
  const STEP_DURATION = useMemo(() => {
    const base = isOnboarding ? BASE_STEP_DURATION : BASE_STEP_DURATION * 3;
    if (isGpt4MiniModel) {
      const totalBudgetMs = 5000 - (isOnboarding ? FINAL_DELAY : 0);
      const perStep = Math.floor(totalBudgetMs / Math.max(1, loadingPoints.length));
      return Math.max(200, Math.min(base, perStep));
    }
    return base;
  }, [isOnboarding, loadingPoints.length, isGpt4MiniModel]);

  // Animation values for checklist items
  const animValuesRef = useRef(
    Array(loadingPoints.length)
      .fill(0)
      .map(() => new Animated.Value(0))
  );

  // Spinner animation values for each step
  const spinnerAnimsRef = useRef(
    Array(loadingPoints.length)
      .fill(0)
      .map(() => new Animated.Value(0))
  );

  // Track which steps have been animated
  const animatedStepsRef = useRef(new Set<number>());

  // Progress animation - Always start from 0
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progressValue, setProgressValue] = useState(0);
  const CIRCLE_RADIUS = 52;
  const CIRCLE_CIRCUM = 2 * Math.PI * CIRCLE_RADIUS;

  // Track if we've started animating to prevent jumping to 100%
  const hasStartedAnimating = useRef(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Listen to animation updates and sync progressValue
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setProgressValue(value);
    });
    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, []); // Don't use dependency progressAnim because it is stable

  function showDevotionalReader() {
    if (!useUIStore.getState().devotionalReaderVisible) {
      useUIStore.getState().setDevotionalReaderVisible(true);
    }
  }

  // Add loading state for API call
  const [apiLoadingState, setApiLoadingState] = useState<
    'idle' | 'loading' | 'completed' | 'error'
  >('idle');

  // Track if paywall has been shown to prevent duplicate calls
  const [paywallShown, setPaywallShown] = useState(false);

  // Add navigation guard to prevent multiple navigations
  const hasNavigated = useRef(false);
  const hasScheduledPostWaitRef = useRef(false);

  // Add timeout effect for custom devotional creation - starts 60 seconds AFTER reaching 100%
  useEffect(() => {
    // Set timeout for non-onboarding flows (custom devotional creation AND check-in flows)
    if (!isOnboarding) {
      const currentProgress = Math.round(progressValue * 100);

      // Only start the 60-second timer when we reach 100%
      if (currentProgress === 100 && !timeoutRef.current) {
        appLog(
          '[LoadingScreen] Progress reached 100%, starting 60-second timeout for devotional creation'
        );

        timeoutRef.current = setTimeout(() => {
          appLog('[LoadingScreen] 60-second timeout triggered after reaching 100%');
          setTimeoutTriggered(true);

          // Track timeout event
          analytics.logEvent('LoadingScreen_Custom_Devotional_Timeout_After_100', {
            verseText: verseText || 'unknown',
            reference: reference || 'unknown',
            currentStep,
            totalSteps: loadingPoints.length,
            apiLoadingState,
            isCreatingDevotional,
            hasCustomDevotional: !!customDevotional,
            hasCurrentDevotional: !!devotionalStoreCurrentDevotional,
            timeStuckAt100: 60000, // 60 seconds
          });

          // Show error toast
          Toast.show({
            type: 'error',
            text1: 'Devotional Creation Timeout',
            text2: 'The devotional is taking longer than expected. Please try again.',
            position: 'top',
            visibilityTime: 4000,
          });

          // Navigate back to appropriate screen after toast has been shown for full duration
          const nested = setTimeout(() => {
            if (!hasNavigated.current) {
              hasNavigated.current = true;
              // For check-in flow, go back to home tab, otherwise go to bible tab
              if (isCheckInFlow) {
                router.back();
              } else {
                router.back();
              }
            }
          }, 4000); // Wait for full toast duration before navigating
          nestedTimersRef.current.add(nested);
        }, 60000); // 60 seconds after reaching 100%
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // Clear any nested timers that may have been scheduled by the timeout callback
        nestedTimersRef.current.forEach((id) => clearTimeout(id));
        nestedTimersRef.current.clear();
      };
    }
  }, [
    progressValue,
    isOnboarding,
    isCheckInFlow,
    verseText,
    reference,
    currentStep,
    loadingPoints.length,
    apiLoadingState,
    isCreatingDevotional,
    customDevotional,
    devotionalStoreCurrentDevotional,
    router,
  ]);
  /**
   * NOTE (leak risk): Multiple chained setTimeouts exist here (20s + 4s). If navigation happens elsewhere first,
   * these timers can fire later and re-touch state. We clear the main timer on effect cleanup, but the nested 4s timer
   * relies on the outer callback having executed. If you see delayed toasts/navigation after leaving this screen,
   * this is likely why. Consider tracking and clearing nested timers too if needed.
   */

  // Cleanup function
  useEffect(() => {
    return () => {
      setHasStarted(false);
      animatedStepsRef.current.clear();
      hasStartedAnimating.current = false;
      progressAnim.setValue(0); // Reset progress to 0
      lastHapticPercentage.current = 0; // Reset haptic tracking
      setAnimationComplete(false); // Reset animation complete state
      setApiLoadingState('idle'); // Reset API loading state
      setPaywallShown(false); // Reset paywall shown state
      hasNavigated.current = false; // Reset navigation guard
      setTimeoutTriggered(false); // Reset timeout state

      // Clear timeout on cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [progressAnim]);

  // Start spinner animation for the current step
  useEffect(() => {
    if (!hasStarted || currentStep >= loadingPoints.length) return;

    const spinnerAnim = spinnerAnimsRef.current[currentStep];
    spinnerAnim.setValue(0);
    const spinnerLoop = Animated.loop(
      Animated.timing(spinnerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinnerLoop.start();
    return () => spinnerLoop.stop();
  }, [currentStep, hasStarted, loadingPoints.length]);

  // Animate glow effect using requestAnimationFrame

  /// Use useRef to keep stable and don't use frameId as local variable
  /// It helps avoid re-run and leak memory.
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTime = performance.now();
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameInterval) {
        animRef.current += 0.02;
        lastTime = currentTime;
      }

      frameIdRef.current = requestAnimationFrame(animate);
    };

    frameIdRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    };
  }, []);
  /**
   * NOTE (leak risk): The rAF loop above is safe as long as this component always unmounts.
   * If navigation bounces in and out of this screen without unmount (or during fast hot reload),
   * a stale rAF could remain scheduled. We cancel in cleanup; if you see steady “All Heap & Anonymous VM” growth
   * while sitting on this screen, confirm cleanup is running by logging the cleanup path.
   */

  // Initialize animation sequence
  useEffect(() => {
    if (!hasStarted) {
      // Ensure progress starts at 0
      progressAnim.setValue(0);
      setProgressValue(0);

      const startTimer = setTimeout(() => {
        setHasStarted(true);
        startTimeRef.current = Date.now();
        // Don't set currentStep here - let it stay at 0
      }, 100);
      return () => clearTimeout(startTimer);
    }
  }, [hasStarted, progressAnim]);

  // Handle step progression with optimized timing
  useEffect(() => {
    if (!hasStarted) return;

    let timer: NodeJS.Timeout;

    // Add initial delay for the first step to allow smooth start
    const delay = currentStep === 0 ? 300 : STEP_DURATION;

    if (isOnboarding) {
      // Onboarding flow - keep existing timer-based progress unchanged
      if (currentStep < loadingPoints.length) {
        timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, delay);
      } else {
        timer = setTimeout(async () => {
          // Get A/B test value to determine which pricing screen to show
          let abTestValue = 0; // Default value
          try {
            const storedAbTest = await AsyncStorage.getItem('abTest');
            if (storedAbTest !== null) {
              abTestValue = parseInt(storedAbTest, 10);
              appLog('[LoadingScreen] Retrieved A/B test value:', abTestValue);
            } else {
              appLog('[LoadingScreen] No A/B test value found, using default:', abTestValue);
            }
          } catch (abTestError) {
            console.error('[LoadingScreen] Error retrieving A/B test value:', abTestError);
          }

          // Track onboarding loading completion with A/B test info
          analytics.logEvent('LoadingScreen_Onboarding_Completed', {
            totalSteps: loadingPoints.length,
            timeSpent: currentStep * STEP_DURATION + FINAL_DELAY,
            abTestGroup: abTestValue,
            redirectTo: 'streakCommitment',
          });

          // Navigate to streak commitment screen
          if (!isCheckInFlow) {
            appLog('[LoadingScreen] Navigating to pricing screen (not check-in flow)');
            if (abTestValue === 0) {
              router.push('/PricingScreen');
            } else {
              router.push('/PricingScreen');
            }
          } else {
            appLog('[LoadingScreen] Skipping pricing navigation (check-in flow detected)');
          }
        }, FINAL_DELAY);
      }
    } else {
      // For custom devotional creation - consistent timing
      if (currentStep < loadingPoints.length) {
        // Use flow-aware duration (3x for custom devotional)
        timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, delay);
      }
      // Note: The actual navigation is handled by the monitoring effect below
    }

    return () => clearTimeout(timer);
  }, [currentStep, hasStarted, isOnboarding, loadingPoints.length, router]);

  // Optimize checklist animation timing - same for both modes
  useEffect(() => {
    if (!hasStarted) return;

    // Animate steps one by one for both onboarding and devotional
    if (currentStep < loadingPoints.length && !animatedStepsRef.current.has(currentStep)) {
      animatedStepsRef.current.add(currentStep);
      animValuesRef.current[currentStep].setValue(0);
      const animation = Animated.timing(animValuesRef.current[currentStep], {
        toValue: 1,
        duration: 300, // Consistent duration for both modes
        useNativeDriver: true,
      });

      animation.start();
      // Cleanup animation khi step thay đổi hoặc component unmount
      return () => animation.stop();
    }
  }, [currentStep, hasStarted, loadingPoints.length]);

  // Optimize progress animation timing
  useEffect(() => {
    if (!hasStarted) return;

    // Calculate progress based on current step
    const progress = currentStep / loadingPoints.length;
    const currentPercentage = Math.round(progress * 100);

    // Trigger heavy haptic feedback at 25%, 50%, 75%, and 100%
    const hapticThresholds = [25, 50, 75, 100];
    for (const threshold of hapticThresholds) {
      if (currentPercentage >= threshold && lastHapticPercentage.current < threshold) {
        hapticHeavy();
        lastHapticPercentage.current = threshold;
        break;
      }
    }

    // Mark that we've started animating
    if (!hasStartedAnimating.current && hasStarted) {
      hasStartedAnimating.current = true;
    }

    // Calculate animation duration to match step progression
    // Animation should be smooth and match the step duration
    const animationDuration = Math.max(50, STEP_DURATION - 200); // Slightly less than step duration for smooth transition

    const anim = Animated.timing(progressAnim, {
      toValue: progress,
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start(() => {
      // Mark animation as complete when progress reaches 100%
      if (progress >= 1) {
        setAnimationComplete(true);
      }
    });
    // Cleanup: stop animation if component unmounts or deps change
    return () => anim.stop();
  }, [currentStep, hasStarted, loadingPoints.length, progressAnim, isOnboarding]);

  // REMOVED: This effect was causing premature API completion
  // The API state should only be marked as completed when the devotional is actually ready,
  // not based on checklist completion

  // Build checklist state
  const checklist = useMemo(() => {
    // Use the same logic for both onboarding and devotional - show steps one by one
    return loadingPoints
      .map((label, idx) => {
        if (idx < currentStep) return { label, status: 'done' };
        if (idx === currentStep) return { label, status: 'loading' };
        return { label, status: 'pending' };
      })
      .slice(0, Math.max(1, currentStep + 1));
  }, [loadingPoints, currentStep]);

  // Helper function to show paywall for non-pro users
  const showPaywallForNonProUser = useCallback(async () => {
    // Only show paywall for non-pro users
    if (isProMember) {
      appLog('[LoadingScreen] User is pro member, skipping paywall');
      return;
    }

    // Prevent duplicate paywall calls
    if (paywallShown) {
      appLog('[LoadingScreen] Paywall already shown, skipping');
      return;
    }

    setPaywallShown(true);

    analytics.logEvent('LoadingScreen_Custom_Devotional_Paywalled', {
      isProMember: false,
      verseText: verseText || 'unknown',
      reference: reference || 'unknown',
      totalLoadingTime: currentStep * STEP_DURATION,
    });

    const timer = setTimeout(async () => {
      try {
        // Set the fromScreen property for tracking
        useSubscriptionStore.getState().setFromScreen('CustomDevotional');

        // Show the paywall
        const result = await presentFreeTrialPaywall();

        // Handle paywall result
        if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
          // User upgraded - navigate to home with devotional
          analytics.logEvent('LoadingScreen_Custom_Devotional_Created', {
            isProMember: true,
            verseText: verseText || 'unknown',
            reference: reference || 'unknown',
            totalLoadingTime: currentStep * STEP_DURATION,
            upgradedFromPaywall: true,
          });

          // Check navigation guard before navigating
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            showDevotionalReader();
            if (IS_ANDROID) {
              router.replace({
                pathname: '/(tabs)',
                params: { showDevotional: 'true' },
              });
            } else {
              router.navigate({
                pathname: '/(tabs)',
                params: { showDevotional: 'true' },
              });
            }
          }
        } else {
          // User cancelled or error - go back to Bible tab
          analytics.logEvent('LoadingScreen_Custom_Devotional_Paywall_Cancelled', {
            paywallResult: result,
            verseText: verseText || 'unknown',
            reference: reference || 'unknown',
          });

          // Check navigation guard before navigating
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            router.back();
          }
        }
      } catch (error) {
        console.error('Error showing paywall:', error);
        analytics.logEvent('LoadingScreen_Custom_Devotional_Paywall_Error', {
          error: error instanceof Error ? error.message : 'unknown',
          verseText: verseText || 'unknown',
          reference: reference || 'unknown',
        });
        // Fallback - go to Bible tab
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          router.back();
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    presentFreeTrialPaywall,
    verseText,
    reference,
    currentStep,
    router,
    paywallShown,
    isProMember,
  ]);

  // Monitor devotional creation progress - ENHANCED to prevent premature navigation
  useEffect(() => {
    if (!isOnboarding) {
      appLog('[LoadingScreen] Navigation check:', {
        apiLoadingState,
        isProMember,
        isCheckInFlow,
        hasCustomDevotional: !!customDevotional,
        hasDevotional: !!devotionalStoreCurrentDevotional,
        hasError: !!devotionalError,
        currentStep,
        totalSteps: loadingPoints.length,
        animationComplete,
        isCreatingDevotional,
        timeoutTriggered,
      });

      // CRITICAL: Only navigate when ALL conditions are met AND timeout hasn't triggered
      // For check-in flows, we must wait specifically for customDevotional, not just any devotional
      const hasRequiredDevotional = isCheckInFlow
        ? customDevotional
        : customDevotional || devotionalStoreCurrentDevotional;

      const canNavigate =
        !timeoutTriggered &&
        currentStep >= loadingPoints.length &&
        animationComplete &&
        apiLoadingState === 'completed' &&
        hasRequiredDevotional &&
        !isCreatingDevotional &&
        !devotionalError; // Additional safety check

      appLog('[LoadingScreen] Navigation conditions:', {
        stepsComplete: currentStep >= loadingPoints.length,
        animationComplete,
        apiCompleted: apiLoadingState === 'completed',
        hasRequiredDevotional: !!hasRequiredDevotional,
        hasCustomDevotional: !!customDevotional,
        hasCurrentDevotional: !!devotionalStoreCurrentDevotional,
        isCheckInFlow,
        notCreating: !isCreatingDevotional,
        noError: !devotionalError,
        noTimeout: !timeoutTriggered,
        canNavigate,
      });

      if (canNavigate) {
        const minTotalMs = isGpt5Model ? 12000 : 0;
        const start = startTimeRef.current || Date.now();
        const elapsedMs = Date.now() - start;
        const remainingMs = Math.max(0, minTotalMs - elapsedMs);

        // Clear timeout if navigation is successful
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        const doNavigateToDevotional = () => {
          const isFromCheckIn = isCheckInFlow && customDevotional;
          appLog(
            `[LoadingScreen] All conditions met - ${isFromCheckIn ? 'check-in' : 'pro user'} devotional ready, navigating to DevotionalReader`
          );
          analytics.logEvent(
            isFromCheckIn
              ? 'LoadingScreen_CheckIn_Devotional_Ready'
              : 'LoadingScreen_Custom_Devotional_Created',
            {
              isProMember: isProMember,
              verseText: verseText || 'unknown',
              reference: reference || 'unknown',
              totalLoadingTime: loadingPoints.length * STEP_DURATION,
            }
          );
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            const timer = setTimeout(() => {
              showDevotionalReader();
              if (IS_ANDROID) {
                router.replace({ pathname: '/(tabs)', params: { showDevotional: 'true' } });
              } else {
                router.navigate({ pathname: '/(tabs)', params: { showDevotional: 'true' } });
              }
            }, 500);
            return () => clearTimeout(timer);
          }
        };

        const doShowPaywall = () => {
          appLog('[LoadingScreen] All conditions met - non-pro user, showing paywall');
          showPaywallForNonProUser();
        };

        const scheduleAfterWait = (fn: () => any) => {
          if (remainingMs > 0) {
            if (!hasScheduledPostWaitRef.current) {
              hasScheduledPostWaitRef.current = true;
              const t = setTimeout(() => {
                fn();
              }, remainingMs);
              return () => clearTimeout(t);
            }
            return;
          }
          fn();
        };

        // For check-in flow OR pro users - always navigate to devotional reader with custom devotional
        if (
          (isCheckInFlow && customDevotional) ||
          (isProMember && (customDevotional || devotionalStoreCurrentDevotional))
        ) {
          const cleanup = scheduleAfterWait(doNavigateToDevotional);
          if (cleanup) return cleanup;
        }
        // For non-pro users NOT in check-in flow - show paywall
        else if (!isProMember && !isCheckInFlow && !paywallShown) {
          // Prevent duplicate scheduling before actual call sets paywallShown
          if (remainingMs > 0 && !hasScheduledPostWaitRef.current) {
            setPaywallShown(true);
          }
          const cleanup = scheduleAfterWait(doShowPaywall);
          if (cleanup) return cleanup;
        }
        // Additional safety: if it's a check-in flow but we somehow don't have customDevotional
        else if (isCheckInFlow && !customDevotional) {
          appLog(
            '[LoadingScreen] Check-in flow detected but no custom devotional - this should not happen'
          );
          // Navigate back to home as fallback
          if (!hasNavigated.current) {
            hasNavigated.current = true;
            router.replace('/(tabs)');
          }
        }
      }

      // Handle error case - navigate back only on actual error
      if (apiLoadingState === 'error' && devotionalError) {
        appLog('[LoadingScreen] API error occurred:', devotionalError);

        // Clear timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Check navigation guard before navigating
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          const timer = setTimeout(() => {
            router.replace('/');
          }, 2000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [
    isOnboarding,
    apiLoadingState,
    router,
    currentStep,
    loadingPoints.length,
    isProMember,
    verseText,
    reference,
    devotionalError,
    devotionalStoreCurrentDevotional,
    isCheckInFlow,
    customDevotional,
    showPaywallForNonProUser,
    animationComplete,
    paywallShown,
    isCreatingDevotional,
    timeoutTriggered,
  ]);

  // Clear the check-in flag when navigating away
  useEffect(() => {
    return () => {
      if (isFromCheckInStore) {
        appLog('[LoadingScreen] Clearing isFromCheckIn flag on unmount');
        useDevotionalStore.getState().setIsFromCheckIn(false);
      }
    };
  }, [isFromCheckInStore]);

  // Fallback check for non-pro users with devotional - REMOVED to prevent duplicate paywall calls
  // This was causing the paywall to show twice. The main navigation effect above handles all cases properly.
  // useEffect(() => {
  //   if (!isOnboarding && devotionalStoreCurrentDevotional && !isProMember && apiLoadingState !== 'completed') {
  //     appLog('[LoadingScreen] Fallback: Non-pro user has devotional, showing paywall');
  //     showPaywallForNonProUser();
  //   }
  // }, [isOnboarding, devotionalStoreCurrentDevotional, isProMember, apiLoadingState, showPaywallForNonProUser]);

  // --- GLOWING BORDER EFFECT ---
  const glViewRef = useRef<{ stop: () => void } | null>(null);
  const threeFrameRef = useRef<number | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Optimize GLView animation
  const handleContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    let scene: THREE.Scene;
    let camera: THREE.Camera;
    let renderer: THREE.WebGLRenderer;
    let material: THREE.ShaderMaterial;
    let plane: THREE.Mesh;
    let shouldAnimate = true;
    let lastFrameTime = 0;
    const targetFPS = 30; // Reduced from 60 FPS
    const frameInterval = 1000 / targetFPS;

    try {
      renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(DARK_BG, 1);
      rendererRef.current = renderer;

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;

      const geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
          u_resolution: { value: new THREE.Vector2(gl.drawingBufferWidth, gl.drawingBufferHeight) },
          u_color: { value: new THREE.Color(ORANGE) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform float u_time;
          uniform vec2 u_resolution;
          uniform vec3 u_color;
          varying vec2 vUv;
          
          float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);
          }
          
  // Animated side glow (left & right)
          float edgeGlow(float x, float y, float time, float edge) {
            float spotY = 0.5 + 0.3 * sin(time * 1.2 + edge * 3.0);
            float spotWidth = 0.1 + 0.05 * sin(time * 1.7 + edge * 2.0);
            float edgeDist = abs(x - edge);
            float yDist = abs(y - spotY);
            float spot = exp(-pow(yDist / spotWidth, 2.0) * 6.0);
            float flicker = 0.6 + 0.4 * noise(vec2(y * 10.0, time * 0.5 + edge * 10.0));
            return smoothstep(0.12, 0.0, edgeDist) * (0.5 + 0.8 * spot * flicker);
          }
          
  // Static glow for top and bottom
          float staticGlow(float y, float edge) {
            float edgeDist = abs(y - edge);
            return smoothstep(0.06, 0.0, edgeDist);
          }
  
  float verticalEdgeGlow(float x, float y, float time, float edge) {
     float spotX = 0.5 + 0.3 * sin(time * 1.2 + edge * 3.0);
     float spotWidth = 0.1 + 0.05 * sin(time * 1.7 + edge * 2.0);
     float edgeDist = abs(y - edge);
     float xDist = abs(x - spotX);
     float spot = exp(-pow(xDist / spotWidth, 2.0) * 6.0);
     float flicker = 0.6 + 0.4 * noise(vec2(x * 10.0, time * 0.5 + edge * 10.0));
     return smoothstep(0.08, 0.0, edgeDist) * (0.5 + 0.5 * spot * flicker);
   }
          
          void main() {
            float t = u_time;
  
    // Center fading glow
            float edgeDist = min(vUv.x, 1.0 - vUv.x);
            float n = noise(vUv * 10.0 + t * 0.2);
            float glow = smoothstep(0.0, 0.25 + 0.08 * sin(t + n * 6.0), edgeDist);
            float intensity = (1.0 - glow) * (0.7 + 0.3 * sin(t + vUv.x * 10.0));
            float centerAlpha = pow(1.0 - edgeDist, 2.5) * intensity;
            
    // Animated left/right
            float leftGlow = edgeGlow(vUv.x, vUv.y, t, 0.0);
            float rightGlow = edgeGlow(vUv.x, vUv.y, t, 1.0);
  
    // Static top/bottom
            float bottomGlow = staticGlow(vUv.y, 0.0);
            float topGlow = staticGlow(vUv.y, 1.0);
            
    // Combine
            float sideAlpha = leftGlow + rightGlow;
            float verticalAlpha = bottomGlow + topGlow;
            float finalAlpha = centerAlpha + sideAlpha + verticalAlpha;
            
            gl_FragColor = vec4(u_color, finalAlpha);
          }
        
        
        `,
        transparent: true,
        depthWrite: false,

        // ... your existing shader material code
      });

      plane = new THREE.Mesh(geometry, material);
      scene.add(plane);

      const animate = (currentTime: number) => {
        if (!shouldAnimate) return;

        const deltaTime = currentTime - lastFrameTime;

        if (deltaTime >= frameInterval) {
          material.uniforms.u_time.value += 0.016;
          renderer.render(scene, camera);
          gl.endFrameEXP();
          lastFrameTime = currentTime;
        }

        threeFrameRef.current = requestAnimationFrame(animate);
      };

      animate(0);

      // Store cleanup function
      glViewRef.current = {
        stop: () => {
          shouldAnimate = false;
          if (threeFrameRef.current) {
            cancelAnimationFrame(threeFrameRef.current);
            threeFrameRef.current = null;
          }
          if (geometry) geometry.dispose();
          if (material) material.dispose();
          if (plane) scene?.remove(plane);
          try {
            (renderer as any)?.dispose?.();
          } catch (_) {}
          try {
            (rendererRef.current as any)?.dispose?.();
          } catch (_) {}
          rendererRef.current = null;
        },
      };
    } catch (error) {
      console.error('GLView error:', error);
      if (glViewRef.current?.stop) glViewRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (glViewRef.current?.stop) {
        glViewRef.current.stop();
      }
      // Extra guard: ensure no stray timers survive unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      nestedTimersRef.current.forEach((id) => clearTimeout(id));
      nestedTimersRef.current.clear();
    };
  }, []);

  return (
    <View
      className="flex-1 items-center justify-center bg-surfaceCream"
      style={{ backgroundColor: DARK_BG }}>
      <StatusBar translucent backgroundColor="transparent" />
      {/* Glowing border background */}
      <GLView
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
        pointerEvents="none"
        onContextCreate={handleContextCreate}
      />
      {/* All content stacked and centered */}
      <View className="items-center w-full max-w-[340px]" style={{ zIndex: 1 }}>
        {/* Circular progress */}
        <View className="items-center justify-center mb-8">
          <Svg height="120" width="120">
            <Circle
              cx="60"
              cy="60"
              r={CIRCLE_RADIUS}
              stroke="#ffe49c"
              strokeWidth="10"
              fill="none"
            />
            <AnimatedCircle
              cx="60"
              cy="60"
              r={CIRCLE_RADIUS}
              stroke={ORANGE}
              strokeWidth="12"
              fill="none"
              strokeDasharray={CIRCLE_CIRCUM}
              strokeDashoffset={progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [CIRCLE_CIRCUM, 0],
              })}
              strokeLinecap="round"
              rotation="-90"
              origin="60,60"
            />
          </Svg>
          <Text
            className="absolute top-0 left-0 w-[120px] h-[120px] text-center text-2xl font-feather text-accentGold flex items-center justify-center"
            style={{ lineHeight: 120, color: ORANGE }}>
            {Math.round(progressValue * 100)}%
          </Text>
        </View>

        {/* Headline and subheadline */}
        <Text className="text-3xl font-feather text-center mb-2" style={{ color: TEXT_PRIMARY }}>
          {isOnboarding
            ? i18n.t('loading_just_a_moment')
            : isCheckInFlow
              ? 'Preparing Your Devotional'
              : devotionalError
                ? i18n.t('loading_something_wrong')
                : i18n.t('loading_creating_devotional')}
        </Text>
        <Text className="text-lg font-din text-center mb-8" style={{ color: DESCRIPTION }}>
          {isOnboarding
            ? i18n.t('loading_building_plan')
            : isCheckInFlow
              ? 'Crafting guidance based on your check-in...'
              : devotionalError
                ? i18n.t('loading_redirecting_back')
                : i18n.t('loading_preparing_meal')}
        </Text>

        {/* Checklist directly below */}
        <View
          className="w-[75%] min-h-[160px] flex-col justify-start self-center"
          style={{ zIndex: 1 }}>
          {checklist.map((item, idx) => (
            <Animated.View
              key={item.label}
              style={{
                opacity: hasStarted && idx > 0 ? animValuesRef.current[idx] : 1, // Hide until animation starts
                transform: [
                  {
                    translateY:
                      idx > 0
                        ? animValuesRef.current[idx].interpolate({
                            inputRange: [0, 1],
                            outputRange: [24, 0],
                          })
                        : 0,
                  },
                ],
              }}
              className="flex-row items-start mb-4">
              {item.status === 'done' && (
                <Ionicons name="checkmark-circle" size={24} color={ORANGE} className="mr-2" />
              )}
              {item.status === 'loading' && (
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: spinnerAnimsRef.current[idx].interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}
                  className="mr-2">
                  <Ionicons name="ellipse" size={24} color={ORANGE} />
                </Animated.View>
              )}
              <Text
                className={`text-lg font-din ${item.status === 'done' || item.status === 'loading' ? '' : 'text-gray-400'}`}
                style={{
                  color:
                    item.status === 'done' || item.status === 'loading' ? TEXT_PRIMARY : GRAY_400,
                }}>
                {item.label}
              </Text>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Toast component for error messages */}
      <Toast />
    </View>
  );
}

export const unstable_settings = {
  safeAreaInsets: { top: 'never', bottom: 'never' },
};
