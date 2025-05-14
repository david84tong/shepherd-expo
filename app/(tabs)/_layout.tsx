import * as Haptics from 'expo-haptics';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { isSignedIn } from '../hooks/authHook';
import { useHomeStore } from '../stores/homeStore';
import { usePathStore } from '../stores/pathStore';

// Helper component to center the icon
const CenteredIcon = ({ children }: { children: React.ReactNode }) => (
  // Use className for centering and ensure it doesn't expand unnecessarily
  <View className="flex items-center justify-center">{children}</View>
);

// Custom Tab Bar Button component with animation
function CustomTabBarButton(props: any) {
  const { children, onPress, accessibilityState } = props;
  const focused = accessibilityState?.selected;
  // Animated value for focus state (0 or 1)
  const focusAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  // Animate the value when focus changes
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 200, // Animation duration (milliseconds)
      useNativeDriver: true, // Use native driver for performance (opacity)
    }).start();
  }, [focused, focusAnim]);

  // Handle press with haptic feedback
  const handlePress = () => {
    // Trigger medium haptic feedback when tab is pressed
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
      // Silently fail if haptics don't work
      console.log('Haptics not available');
    });

    // Call the original onPress handler
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      // Apply base flex styling and only horizontal margin
      className="flex-1 items-center justify-center mx-1">
      {/* Container for content and animated background */}
      <View className="items-center justify-center p-4 mt-4 w-full">
        {/* Animated background View */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject, // Position behind content
            {
              backgroundColor: '#FFE4A8', // bg-black/5 equivalent
              borderRadius: 8, // rounded-lg equivalent
              opacity: focusAnim, // Apply animated opacity
            },
          ]}
        />
        {/* Actual tab content (icon/label) */}
        {children}
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const signedIn = isSignedIn();

  // Se não estiver logado, redireciona para o login
  if (!signedIn) {
    return <Redirect href="/(auth)" />;
  }

  const mode = useHomeStore((state) => state.mode);
  const pathInProgress = usePathStore((state) => state.pathInProgress);
  const tabBarAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(tabBarAnim, {
      toValue: mode === 'DEFAULT' && !pathInProgress ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [mode, pathInProgress]);

  // Using absolute positioning to prevent the "chin" gap
  const animatedTabBarStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF4D9',
    opacity: tabBarAnim,
    // Pull tab bar completely out of view when hidden
    transform: [
      {
        translateY: tabBarAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
    // Add shadow for better visual separation
    ...Platform.select({
      ios: {
        shadowColor: '#FFE4A8',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: {
        elevation: 5,
      },
    }),
    // Ensure a minimum height for the tab bar
    height: Platform.OS === 'ios' ? 90 : 70,
  } as ViewStyle; // Cast to ViewStyle for type safety

  return (
    <Tabs
      initialRouteName='index'
      screenOptions={{
        tabBarStyle: animatedTabBarStyle,
        tabBarActiveTintColor: '#3C584A',
        tabBarInactiveTintColor: '#3C584A80',
        headerShown: false,
        tabBarLabelStyle: {
          marginTop: 2,
          fontSize: 1, // Reset font size to be visible
        },
        // Use the custom button component for all tabs
        tabBarButton: (props) => <CustomTabBarButton {...props} />,
      }}>
      <Tabs.Screen
        name="map"
        options={{
          title: 'map',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/trophyIcon.png')} className="w-12 h-12" />
            </CenteredIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: 'heart',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/heartIcon.png')} className="w-12 h-12" />
            </CenteredIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'sheep',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/sheepIcon.png')} className="w-16 h-16" />
            </CenteredIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/bibleIcon.png')} className="w-14 h-14" />
            </CenteredIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <CenteredIcon>
              <Image source={require('../../assets/icons/profileIcon.png')} className="w-14 h-14" />
            </CenteredIcon>
          ),
        }}
      />
    </Tabs>
  );
}

