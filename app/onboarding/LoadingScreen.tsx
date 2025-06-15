import React, { useEffect, useRef, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useDevotionalStore } from '~/app/stores/devotionalStore';

const { width, height } = Dimensions.get('window');

const ORANGE = '#FCD34D';
const DARK_BG = '#FDEBB8';
const TEXT_PRIMARY = '#3C584A';
const DESCRIPTION = '#B89B4C';
const GRAY_400 = '#9ca3af';
const GRAY_500 = '#6b7280';

const LOADING_POINTS = [
  'Saving your responses',
  'Encrypting your data',
  'Sprinkling some holy water',
  'Generating your custom bible study plan',
];

const DEVOTIONAL_LOADING_POINTS = [
  'Crafting your custom devotional',
  'Cross-checking similar verses',
  'Sprinkling some holy water',
  'waking up your lamb'
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LoadingScreenProps {
  isOnboarding?: boolean;
  verseText?: string;
  reference?: string;
}

export default function LoadingScreen({ isOnboarding = true, verseText, reference }: LoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [anim, setAnim] = useState(0);
  const animRef = useRef(0);
  const router = useRouter();

  // Devotional store action (only used when !isOnboarding)
  const createQuickDevotional = useDevotionalStore((s) => s.createQuickDevotional);

  // Use appropriate loading points based on isOnboarding
  const loadingPoints = isOnboarding ? LOADING_POINTS : DEVOTIONAL_LOADING_POINTS;

  // Animation values for checklist items
  const animValuesRef = useRef(
    Array(loadingPoints.length)
      .fill(0)
      .map(() => new Animated.Value(0))
  );

  // Spinner rotation animation value (only one, for the current loading item)
  const spinnerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    spinnerAnim.setValue(0); // Reset to 0 on each new step
    const loop = Animated.loop(
      Animated.timing(spinnerAnim, {
        toValue: 1,
        duration: 1200, // Smoother
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [currentStep]);

  // Animate glow
  useEffect(() => {
    let frame: number;
    const animate = () => {
      animRef.current += 0.02;
      setAnim(animRef.current);
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  // Step-by-step checklist progression
  useEffect(() => {
    if (currentStep < loadingPoints.length) {
      const timer = setTimeout(() => {
        setCurrentStep((step) => step + 1);
      }, 1000); // 1 second per checklist step (4 steps = 4 seconds)
      return () => clearTimeout(timer);
    } else {
      // All steps complete, navigate
      setTimeout(() => {
        if (isOnboarding) {
          router.replace({ pathname: '/PricingScreen', params: { animateFromBottom: 'true' } });
        } else {
          // For devotional loading, go back to home screen
          router.replace('/');
        }
      }, 600);
    }
  }, [currentStep, router, isOnboarding, loadingPoints.length]);

  // Animate the current checklist item when it appears
  useEffect(() => {
    if (currentStep < loadingPoints.length) {
      Animated.timing(animValuesRef.current[currentStep], {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [currentStep]);

  // Animated progress value for smooth circular progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  const CIRCLE_RADIUS = 52;
  const CIRCLE_CIRCUM = 2 * Math.PI * CIRCLE_RADIUS;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStep / loadingPoints.length,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // SVG props can't use native driver
    }).start();
  }, [currentStep]);

  // Build checklist state (stepper style)
  const checklist = loadingPoints.map((label, idx) => {
    if (idx < currentStep) return { label, status: 'done' };
    if (idx === currentStep) return { label, status: 'loading' };
    return { label, status: 'pending' };
  }).slice(0, currentStep + 1);

  // --- GLOWING BORDER EFFECT ---
  // We'll use a ref to keep track of the animation frame for Three.js
  const glViewRef = useRef<{ stop: () => void } | null>(null);
  const threeFrameRef = useRef<number | null>(null);

  // Handler for GLView context creation
  const handleContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    let scene: THREE.Scene;
    let camera: THREE.Camera;
    let renderer: THREE.WebGLRenderer;
    let material: THREE.ShaderMaterial;
    let plane: THREE.Mesh;
    let shouldAnimate = true;

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

      const animate = () => {
        if (!shouldAnimate) return;

        material.uniforms.u_time.value += 0.016;
        renderer.render(scene, camera);
        gl.endFrameEXP();
        threeFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      // Store cleanup function
      glViewRef.current = {
        stop: () => {
          shouldAnimate = false;
          if (threeFrameRef.current) {
            cancelAnimationFrame(threeFrameRef.current);
          }
          // Clean up Three.js resources
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

  // Kick off devotional creation immediately when not onboarding
  useEffect(() => {
    if (!isOnboarding && verseText && reference) {
      createQuickDevotional(verseText, reference);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {Math.round((currentStep / loadingPoints.length) * 100)}%
          </Text>
        </View>

        {/* Headline and subheadline */}
        <Text className="text-3xl font-feather text-center mb-2" style={{ color: TEXT_PRIMARY }}>
          {isOnboarding ? 'Just a moment' : 'Creating devotional'}
        </Text>
        <Text className="text-lg font-din text-center mb-8" style={{ color: DESCRIPTION }}>
          {isOnboarding ? 'Building a personalized plan' : 'Preparing your spiritual meal'}
        </Text>

        {/* Checklist directly below */}
        <View
          className="w-[75%] min-h-[160px] flex-col justify-start self-center"
          style={{ zIndex: 1 }}>
          {checklist.map((item, idx) => (
            <Animated.View
              key={item.label}
              style={{
                opacity: animValuesRef.current[idx],
                transform: [
                  {
                    translateY: animValuesRef.current[idx].interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              }}
              className="flex-row items-start mb-4">
              {item.status === 'done' && (
                <Ionicons name="checkmark-circle" size={24} color={ORANGE} className="mr-2" />
              )}
              {item.status === 'loading' && idx === currentStep && (
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
                      strokeDashoffset={24}
                    />
                  </Svg>
                </Animated.View>
              )}
              {/* If not the current loading item, show static spinner (no animation) for safety */}
              {item.status === 'loading' && idx !== currentStep && (
                <Svg height="24" width="24" style={{ marginRight: 8 }}>
                  <Circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke={ORANGE}
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="60"
                    strokeDashoffset={24}
                  />
                </Svg>
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
