import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
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
import analytics from '~/utils/analytics';
import { hapticHeavy } from '~/utils/haptics';

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
const STEP_DURATION = 1200; // Reduced from 1500ms
const FINAL_DELAY = 500; // Reduced from 600ms

export default function LoadingScreen({ isOnboarding: propIsOnboarding, verseText: propVerseText, reference: propReference }: LoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const animRef = useRef(0);
  const router = useRouter();
  const params = useLocalSearchParams();
  const [hasStarted, setHasStarted] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const lastHapticPercentage = useRef(0);

  // Check onboarding completion status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        setOnboardingCompleted(completed === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      }
    };
    checkOnboardingStatus();
  }, []);

  // Check if this is from check-in flow
  const isCheckInFlow = useMemo(() => {
    return isFromCheckInStore || params.isCheckInFlow === 'true' || params.fromCheckIn === 'true';
  }, [isFromCheckInStore, params.isCheckInFlow, params.fromCheckIn]);

  // Stabilize critical route-derived values
  const isOnboarding = useMemo(() => {
    if (params.fromSwipe === 'true') {
      return false;
    }
    if (isCheckInFlow) {
      return false; // Check-in flow is not onboarding
    }
    // Use onboarding completion status if available, otherwise fall back to params/props
    if (onboardingCompleted !== null) {
      return !onboardingCompleted;
    }
    return params.isOnboarding !== undefined ? params.isOnboarding === 'true' : propIsOnboarding;
  }, [params.fromSwipe, params.isOnboarding, propIsOnboarding, onboardingCompleted, isCheckInFlow]);

  const verseText = useMemo(() =>
    (params.verseText as string | undefined) || propVerseText,
    [params.verseText, propVerseText]
  );

  const reference = useMemo(() =>
    (params.reference as string | undefined) || propReference,
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

  // Add loading state for API call
  const [apiLoadingState, setApiLoadingState] = useState<'idle' | 'loading' | 'completed' | 'error'>('idle');

  // Get custom devotional from store
  const customDevotional = useDevotionalStore((s) => s.customDevotional);
  const isFromCheckInStore = useDevotionalStore((s) => s.isFromCheckIn);

  // Monitor API loading state
  useEffect(() => {
    if (!isOnboarding) {
      if (isCreatingDevotional) {
        setApiLoadingState('loading');
      } else if (isCheckInFlow && customDevotional) {
        setApiLoadingState('completed');
      } else if (devotionalStoreCurrentDevotional) {
        setApiLoadingState('completed');
      } else if (devotionalError) {
        setApiLoadingState('error');
      }
    }
  }, [isOnboarding, isCreatingDevotional, devotionalStoreCurrentDevotional, devotionalError, isCheckInFlow, customDevotional]);

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

  // Progress animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progressValue, setProgressValue] = useState(0);
  const CIRCLE_RADIUS = 52;
  const CIRCLE_CIRCUM = 2 * Math.PI * CIRCLE_RADIUS;

  // Listen to animation updates and sync progressValue
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setProgressValue(value);
    });
    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  // Cleanup function
  useEffect(() => {
    return () => {
      setHasStarted(false);
      animatedStepsRef.current.clear();
    };
  }, []);

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
  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameInterval) {
        animRef.current += 0.02;
        lastTime = currentTime;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Initialize animation sequence
  useEffect(() => {
    if (!hasStarted) {
      const startTimer = setTimeout(() => {
        setHasStarted(true);
        setCurrentStep(0);
      }, 100);
      return () => clearTimeout(startTimer);
    }
  }, [hasStarted]);

  // Handle step progression with optimized timing
  useEffect(() => {
    if (!hasStarted) return;

    let timer: NodeJS.Timeout;

    if (isOnboarding) {
      // Onboarding flow - keep existing timer-based progress unchanged
      if (currentStep < loadingPoints.length) {
        timer = setTimeout(() => {
          setCurrentStep(prev => prev + 1);
        }, STEP_DURATION);
      } else {
        timer = setTimeout(async () => {
          // Get A/B test value to determine which pricing screen to show
          let abTestValue = 0; // Default value
          try {
            const storedAbTest = await AsyncStorage.getItem('abTest');
            if (storedAbTest !== null) {
              abTestValue = parseInt(storedAbTest, 10);
              console.log('[LoadingScreen] Retrieved A/B test value:', abTestValue);
            } else {
              console.log('[LoadingScreen] No A/B test value found, using default:', abTestValue);
            }
          } catch (abTestError) {
            console.error('[LoadingScreen] Error retrieving A/B test value:', abTestError);
          }

          // Track onboarding loading completion with A/B test info
          analytics.logEvent('LoadingScreen_Onboarding_Completed', {
            totalSteps: loadingPoints.length,
            timeSpent: currentStep * STEP_DURATION + FINAL_DELAY,
            abTestGroup: abTestValue,
            redirectTo: abTestValue === 0 ? 'PricingScreen' : 'OldPricingScreen',
          });

          // Navigate based on A/B test value
          if (abTestValue === 0) {
            router.push('/PricingScreen');
          } else {
            router.push('/onboarding/pricing/OldPricingScreen');
          }
        }, FINAL_DELAY);
      }
    } else {
      // For custom devotional creation - progress based on API completion
      if (currentStep < loadingPoints.length) {
        // For custom devotionals, progress through steps more slowly to match API timing
        // Each step takes longer to give the API time to complete
        const customStepDuration = 2000; // 2 seconds per step for custom devotionals
        timer = setTimeout(() => {
          setCurrentStep(prev => prev + 1);
        }, customStepDuration);
      }
      // Note: The actual navigation is handled by the monitoring effect below
    }

    return () => clearTimeout(timer);
  }, [currentStep, hasStarted, isOnboarding, loadingPoints.length, router]);

  // Optimize checklist animation timing
  useEffect(() => {
    if (!hasStarted) return;

    if (isOnboarding) {
      // Onboarding: animate steps one by one
      if (currentStep < loadingPoints.length && !animatedStepsRef.current.has(currentStep)) {
        animatedStepsRef.current.add(currentStep);
        animValuesRef.current[currentStep].setValue(0);
        Animated.timing(animValuesRef.current[currentStep], {
          toValue: 1,
          duration: 300, // Reduced from 400ms
          useNativeDriver: true,
        }).start();
      }
    } else {
      // Custom devotional: check API loading state
      if (apiLoadingState === 'completed') {
        // API completed - immediately animate all remaining steps
        console.log('[LoadingScreen] API completed, animating all remaining steps');
        for (let i = 0; i < loadingPoints.length; i++) {
          if (!animatedStepsRef.current.has(i)) {
            animatedStepsRef.current.add(i);
            animValuesRef.current[i].setValue(0);
            Animated.timing(animValuesRef.current[i], {
              toValue: 1,
              duration: 200, // Faster animation for API completion
              useNativeDriver: true,
            }).start();
          }
        }
      } else if (currentStep < loadingPoints.length && !animatedStepsRef.current.has(currentStep)) {
        // API still loading - animate current step
        animatedStepsRef.current.add(currentStep);
        animValuesRef.current[currentStep].setValue(0);
        Animated.timing(animValuesRef.current[currentStep], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [currentStep, hasStarted, loadingPoints.length, isOnboarding, apiLoadingState]);

  // Optimize progress animation timing
  useEffect(() => {
    if (!hasStarted) return;

    let progress;

    if (isOnboarding) {
      progress = currentStep / loadingPoints.length;
    } else {
      if (apiLoadingState === 'completed') {
        progress = 1;
      } else if (apiLoadingState === 'error') {
        progress = currentStep / loadingPoints.length;
      } else if (apiLoadingState === 'loading') {
        const stepProgress = currentStep / loadingPoints.length;
        progress = Math.min(stepProgress, 0.8);
      } else {
        progress = currentStep / loadingPoints.length;
      }
    }

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

    // Animate progress bar
    let duration = isOnboarding ? 500 : 300;
    if (apiLoadingState === 'completed' && !isOnboarding) {
      duration = 200; // Fast fill for pro user
    }
    Animated.timing(progressAnim, {
      toValue: progress,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentStep, hasStarted, loadingPoints.length, progressAnim, isOnboarding, apiLoadingState]);

  // Build checklist state
  const checklist = useMemo(() => {
    if (isOnboarding) {
      // Onboarding: show steps based on currentStep
      return loadingPoints.map((label, idx) => {
        if (idx < currentStep) return { label, status: 'done' };
        if (idx === currentStep) return { label, status: 'loading' };
        return { label, status: 'pending' };
      }).slice(0, Math.max(1, currentStep + 1));
    } else {
      // Custom devotional: check API loading state
      if (apiLoadingState === 'completed') {
        // API completed - show all steps as done
        return loadingPoints.map((label) => ({ label, status: 'done' }));
      } else if (apiLoadingState === 'error') {
        // API error - show current step progress
        return loadingPoints.map((label, idx) => {
          if (idx < currentStep) return { label, status: 'done' };
          if (idx === currentStep) return { label, status: 'loading' };
          return { label, status: 'pending' };
        }).slice(0, Math.max(1, currentStep + 1));
      } else {
        // API loading or idle - show current step progress
        return loadingPoints.map((label, idx) => {
          if (idx < currentStep) return { label, status: 'done' };
          if (idx === currentStep) return { label, status: 'loading' };
          return { label, status: 'pending' };
        }).slice(0, Math.max(1, currentStep + 1));
      }
    }
  }, [loadingPoints, currentStep, isOnboarding, apiLoadingState]);

  // Helper function to show paywall for non-pro users
  const showPaywallForNonProUser = useCallback(async () => {
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
          router.navigate({
            pathname: '/(tabs)',
            params: { showDevotional: 'true' }
          });
        } else {
          // User cancelled or error - go back to Bible tab
          analytics.logEvent('LoadingScreen_Custom_Devotional_Paywall_Cancelled', {
            paywallResult: result,
            verseText: verseText || 'unknown',
            reference: reference || 'unknown',
          });
          router.navigate('/(tabs)/bible');
        }
      } catch (error) {
        console.error('Error showing paywall:', error);
        analytics.logEvent('LoadingScreen_Custom_Devotional_Paywall_Error', {
          error: error instanceof Error ? error.message : 'unknown',
          verseText: verseText || 'unknown',
          reference: reference || 'unknown',
        });
        // Fallback - go to Bible tab
        router.navigate('/(tabs)/bible');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [presentFreeTrialPaywall, verseText, reference, currentStep, router]);

  // Monitor devotional creation progress - MODIFIED for API-based progress
  useEffect(() => {
    if (!isOnboarding) {
      console.log('[LoadingScreen] Navigation check:', {
        apiLoadingState,
        isProMember,
        isCheckInFlow,
        hasCustomDevotional: !!customDevotional,
        hasDevotional: !!devotionalStoreCurrentDevotional,
        hasError: !!devotionalError
      });

      // For check-in flow, check if custom devotional is ready
      if (isCheckInFlow && customDevotional && apiLoadingState === 'completed') {
        // Check-in devotional ready - navigate to DevotionalReader
        console.log('[LoadingScreen] Check-in devotional ready, navigating to DevotionalReader');
        setCurrentStep(loadingPoints.length);

        analytics.logEvent('LoadingScreen_CheckIn_Devotional_Ready', {
          totalLoadingTime: currentStep * STEP_DURATION,
        });

        const timer = setTimeout(() => {
          router.navigate({
            pathname: '/(tabs)',
            params: { showDevotional: 'true' }
          });
        }, 500); // Short delay for smooth transition
        return () => clearTimeout(timer);
      } else if (apiLoadingState === 'completed' && isProMember && !isCheckInFlow) {
        // API completed successfully - immediately complete all steps and navigate
        console.log('[LoadingScreen] API completed for pro user, navigating to home');
        setCurrentStep(loadingPoints.length);

        analytics.logEvent('LoadingScreen_Custom_Devotional_Created', {
          isProMember: true,
          verseText: verseText || 'unknown',
          reference: reference || 'unknown',
          totalLoadingTime: currentStep * STEP_DURATION,
        });

        const timer = setTimeout(() => {
          router.navigate({
            pathname: '/(tabs)',
            params: { showDevotional: 'true' }
          });
        }, 500); // Short delay for smooth transition
        return () => clearTimeout(timer);
      } else if (apiLoadingState === 'error') {
        // Error occurred - navigate back
        console.log('[LoadingScreen] API error occurred:', devotionalError);
        const timer = setTimeout(() => {
          router.replace('/');
        }, 2000);
        return () => clearTimeout(timer);
      } else if (apiLoadingState === 'completed' && !isProMember && !isCheckInFlow) {
        // User is not pro - show paywall when API completes
        console.log('[LoadingScreen] API completed for non-pro user, showing paywall');
        showPaywallForNonProUser();
      }
    }
  }, [isOnboarding, apiLoadingState, router, currentStep, loadingPoints.length, isProMember, presentFreeTrialPaywall, verseText, reference, devotionalError, devotionalStoreCurrentDevotional, isCheckInFlow, customDevotional]);
  
  // Clear the check-in flag when navigating away
  useEffect(() => {
    return () => {
      if (isFromCheckInStore) {
        useDevotionalStore.getState().setIsFromCheckIn(false);
      }
    };
  }, [isFromCheckInStore]);

  // Fallback check for non-pro users with devotional
  useEffect(() => {
    if (!isOnboarding && devotionalStoreCurrentDevotional && !isProMember && apiLoadingState !== 'completed') {
      console.log('[LoadingScreen] Fallback: Non-pro user has devotional, showing paywall');
      showPaywallForNonProUser();
    }
  }, [isOnboarding, devotionalStoreCurrentDevotional, isProMember, apiLoadingState, showPaywallForNonProUser]);

  // --- GLOWING BORDER EFFECT ---
  const glViewRef = useRef<{ stop: () => void } | null>(null);
  const threeFrameRef = useRef<number | null>(null);

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
          }
          if (geometry) geometry.dispose();
          if (material) material.dispose();
          if (plane) scene?.remove(plane);
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
          {isOnboarding ? i18n.t('loading_just_a_moment') : isCheckInFlow ? 'Creating Your Devotional' : devotionalError ? i18n.t('loading_something_wrong') : i18n.t('loading_creating_devotional')}
        </Text>
        <Text className="text-lg font-din text-center mb-8" style={{ color: DESCRIPTION }}>
          {isOnboarding ? i18n.t('loading_building_plan') : isCheckInFlow ? 'Based on your check-in...' : devotionalError ? i18n.t('loading_redirecting_back') : i18n.t('loading_preparing_meal')}
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
                    translateY: idx > 0 ? animValuesRef.current[idx].interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }) : 0,
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
    </View>
  );
}

export const unstable_settings = {
  safeAreaInsets: { top: 'never', bottom: 'never' }
};