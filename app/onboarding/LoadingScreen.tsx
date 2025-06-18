import React, { useEffect, useRef, useState, useMemo } from 'react';
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
import i18n from '~/app/utils/i18n';

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

  // Stabilize critical route-derived values
  const isOnboarding = useMemo(() => {
    if (params.fromSwipe === 'true') {
      return false;
    }
    return params.isOnboarding !== undefined ? params.isOnboarding === 'true' : propIsOnboarding;
  }, [params.fromSwipe, params.isOnboarding, propIsOnboarding]);

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

  // Use appropriate loading points
  const loadingPoints = useMemo(() => 
    isOnboarding ? LOADING_POINTS : DEVOTIONAL_LOADING_POINTS,
    [isOnboarding]
  );

  // Animation values for checklist items
  const animValuesRef = useRef(
    Array(loadingPoints.length)
      .fill(0)
      .map(() => new Animated.Value(0))
  );

  // Track which steps have been animated
  const animatedStepsRef = useRef(new Set<number>());

  // Spinner rotation animation
  const spinnerAnim = useRef(new Animated.Value(0)).current;

  // Progress animation
  const progressAnim = useRef(new Animated.Value(0)).current;
  const CIRCLE_RADIUS = 52;
  const CIRCLE_CIRCUM = 2 * Math.PI * CIRCLE_RADIUS;

  // Cleanup function
  useEffect(() => {
    return () => {
      setHasStarted(false);
      animatedStepsRef.current.clear();
    };
  }, []);

  // Start continuous spinner animation
  useEffect(() => {
    if (!hasStarted) return;

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
  }, [hasStarted, spinnerAnim]);

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
      if (currentStep < loadingPoints.length) {
        timer = setTimeout(() => {
          setCurrentStep(prev => prev + 1);
        }, STEP_DURATION);
      } else {
        timer = setTimeout(() => {
          router.replace({ pathname: '/PricingScreen', params: { animateFromBottom: 'true' } });
        }, FINAL_DELAY);
      }
    } else {
      // For devotional creation
      if (isCreatingDevotional) {
        // Continue through steps while creating
        if (currentStep < loadingPoints.length - 1) {
          timer = setTimeout(() => {
            setCurrentStep(prev => prev + 1);
          }, STEP_DURATION);
        }
      } else if (devotionalStoreCurrentDevotional) {
        // When devotional is created, ensure we complete all steps
        if (currentStep < loadingPoints.length - 1) {
          timer = setTimeout(() => {
            setCurrentStep(prev => prev + 1);
          }, STEP_DURATION);
        } else if (currentStep === loadingPoints.length - 1) {
          // Complete the final step
          timer = setTimeout(() => {
            setCurrentStep(loadingPoints.length);
          }, STEP_DURATION);
        }
      }
    }

    return () => clearTimeout(timer);
  }, [currentStep, hasStarted, isOnboarding, isCreatingDevotional, devotionalStoreCurrentDevotional, loadingPoints.length, router]);

  // Optimize checklist animation timing
  useEffect(() => {
    if (!hasStarted || currentStep >= loadingPoints.length) return;

    if (!animatedStepsRef.current.has(currentStep)) {
      animatedStepsRef.current.add(currentStep);
      animValuesRef.current[currentStep].setValue(0);
      Animated.timing(animValuesRef.current[currentStep], {
        toValue: 1,
        duration: 300, // Reduced from 400ms
        useNativeDriver: true,
      }).start();
    }
  }, [currentStep, hasStarted, loadingPoints.length]);

  // Optimize progress animation timing
  useEffect(() => {
    if (!hasStarted) return;

    const progress = currentStep / loadingPoints.length;
    
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500, // Reduced from 700ms
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentStep, hasStarted, loadingPoints.length, progressAnim]);

  // Build checklist state
  const checklist = useMemo(() => 
    loadingPoints.map((label, idx) => {
      if (idx < currentStep) return { label, status: 'done' };
      if (idx === currentStep) return { label, status: 'loading' };
      return { label, status: 'pending' };
    }).slice(0, Math.max(1, currentStep + 1)),
    [loadingPoints, currentStep]
  );

  // Monitor devotional creation progress
  useEffect(() => {
    if (!isOnboarding && !isCreatingDevotional) {
      if (devotionalStoreCurrentDevotional && currentStep === loadingPoints.length) {
        const timer = setTimeout(() => {
          router.navigate({
            pathname: '/(tabs)',
            params: { showDevotional: 'true' }
          });
        }, 1000);
        return () => clearTimeout(timer);
      } else if (devotionalError) {
        const timer = setTimeout(() => {
          router.replace('/');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnboarding, isCreatingDevotional, devotionalStoreCurrentDevotional, devotionalError, router, currentStep, loadingPoints.length]);

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
            {Math.min(Math.round((currentStep / loadingPoints.length) * 100), 100)}%
          </Text>
        </View>

        {/* Headline and subheadline */}
        <Text className="text-3xl font-feather text-center mb-2" style={{ color: TEXT_PRIMARY }}>
          {isOnboarding ? i18n.t('loading_just_a_moment') : devotionalError ? i18n.t('loading_something_wrong') : i18n.t('loading_creating_devotional')}
        </Text>
        <Text className="text-lg font-din text-center mb-8" style={{ color: DESCRIPTION }}>
          {isOnboarding ? i18n.t('loading_building_plan') : devotionalError ? i18n.t('loading_redirecting_back') : i18n.t('loading_preparing_meal')}
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
                    marginRight: 8,
                    transform: [
                      {
                        rotate: spinnerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  }}>
                  <Svg height="24" width="24">
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke={ORANGE}
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="60"
                      strokeDashoffset="24"
                    />
                  </Svg>
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