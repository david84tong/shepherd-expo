import { Tabs } from 'expo-router';
import { Text, Animated, Platform, StyleSheet, ViewStyle } from 'react-native';
import { useHomeStore } from '../../store/homeStore';
import { useEffect, useRef } from 'react';

export default function TabLayout() {
  const mode = useHomeStore((state) => state.mode);
  const tabBarAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.timing(tabBarAnim, {
      toValue: mode === 'DEFAULT' ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [mode]);

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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: animatedTabBarStyle,
        tabBarActiveTintColor: '#3C584A',
        tabBarInactiveTintColor: '#3C584A80',
        headerShown: false,
        // Add bottom padding to screens to prevent content from being hidden behind the tab bar
        contentStyle: {
          backgroundColor: '#FFF4D9',
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📖</Text>,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
