import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Or another icon set

// Define node types and statuses
type NodeStatus = 'locked' | 'active' | 'completed';
interface PathNodeData {
  id: number;
  icon: keyof typeof Ionicons.glyphMap; // Use icon names from Ionicons
  status: NodeStatus;
  type: 'lesson' | 'chest' | 'boss'; // Example types
}

// Dummy data for the path
const pathData: PathNodeData[] = [
  { id: 1, icon: 'star', status: 'completed', type: 'lesson' },
  { id: 2, icon: 'mic', status: 'completed', type: 'lesson' },
  { id: 3, icon: 'barbell', status: 'active', type: 'lesson' },
  { id: 4, icon: 'book', status: 'locked', type: 'boss' },
  { id: 5, icon: 'lock-closed', status: 'locked', type: 'chest' },
  { id: 6, icon: 'mic', status: 'locked', type: 'lesson' },
  { id: 7, icon: 'star', status: 'locked', type: 'lesson' },
  { id: 8, icon: 'barbell', status: 'locked', type: 'lesson' },
  { id: 9, icon: 'book', status: 'locked', type: 'boss' },
  { id: 10, icon: 'lock-closed', status: 'locked', type: 'chest' },
  { id: 11, icon: 'star', status: 'locked', type: 'lesson' },
  { id: 12, icon: 'mic', status: 'locked', type: 'lesson' },
];

// Node Component (Internal for now)
interface PathNodeProps {
  node: PathNodeData;
  alignment: 'start' | 'center' | 'end';
  onPress: (id: number) => void;
}

const PathNode: React.FC<PathNodeProps> = ({ node, alignment, onPress }) => {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = node.status === 'locked';

  const alignmentClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  }[alignment];

  const nodeBgColor = {
    locked: 'bg-gray-300',
    active: 'bg-accentGold', // Use accentGold for active
    completed: 'bg-forestGreen80', // Use a green for completed
  }[node.status];

  const nodeBorderColor = {
    locked: 'border-gray-400',
    active: 'border-buttonBorder', // Use buttonBorder
    completed: 'border-forestGreen50',
  }[node.status];
  
  const iconColor = isDisabled ? '#9CA3AF' : '#FFFFFF'; // Gray for locked, white otherwise

  // Basic shadow, similar to back button but adjusted
  const nodeShadow = !isPressed && !isDisabled ? 'shadow-[0px_6px_0px_0px_rgba(209,232,163,1)]' : ''; // Example green shadow for completed/active
  const nodeShadowLocked = !isPressed && isDisabled ? 'shadow-[0px_6px_0px_0px_#D1D5DB]' : ''; // Example gray shadow for locked

  return (
    <View className={`w-full px-24 my-3 ${alignmentClass}`}>
      <Pressable
        onPress={() => !isDisabled && onPress(node.id)}
        disabled={isDisabled}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        className={`
          w-20 h-20 rounded-full items-center justify-center border-4 
          ${nodeBgColor} ${nodeBorderColor}
          transform ${isPressed ? 'translate-y-[3px]' : 'translate-y-0'}
          ${isDisabled ? nodeShadowLocked : nodeShadow} 
        `}
        // Basic elevation for Android consistency
        style={{ elevation: isPressed || isDisabled ? 2 : 5 }}
      >
        <Ionicons name={node.icon} size={32} color={iconColor} />
        {node.type === 'boss' && (
             <View className="absolute -bottom-2 flex-row">
                {[...Array(3)].map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color={node.status === 'completed' ? iconColor : '#D1D5DB'} style={{ marginHorizontal: 1 }} />
                ))}
             </View>
        )}
         {node.type === 'chest' && (
             <View className="absolute -bottom-2">
                 <Ionicons name="lock-closed" size={16} color={isDisabled ? '#9CA3AF' : iconColor} />
             </View>
         )}
      </Pressable>
    </View>
  );
};

// Header Component (New)
const MapHeader = () => {
  return (
    <View className="px-4 pt-4 relative mb-8">
      <View className="bg-forestGreen80 rounded-2xl p-4 flex-row items-center justify-between">
        <View> 
          <Text className="text-white font-din uppercase text-caption">Section 2, Unit 9</Text>
          <Text className="text-white font-feather text-heading">Describe Colors</Text>
        </View>
        <Pressable className="p-2">
          <Ionicons name="list" size={28} color="white" />
        </Pressable>
      </View>
      <Pressable 
        className="w-16 h-16 bg-forestGreen80 rounded-full items-center justify-center absolute -bottom-6 left-1/2 -ml-8 border-4 border-surfaceCream shadow-md"
        style={{ elevation: 5 }}
      >
        <Ionicons name="play-forward" size={24} color="white" style={{ marginLeft: 4 }}/>
      </Pressable>
    </View>
  );
}

export default function MapScreen() {
  const handleNodePress = (id: number) => {
    console.log('Pressed node:', id);
    // Navigate or perform action based on node id/type
  };

  return (
    <SafeAreaView className="flex-1 bg-surfaceCream">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="flex-1 bg-surfaceCream pt-10">
        <MapHeader />

        <View>
          {pathData.map((node, index) => {
            const alignment = [
              'center', 
              'start', 
              'center', 
              'end'
          ][index % 4] as 'start' | 'center' | 'end';
            return (
              <PathNode 
                key={node.id} 
                node={node} 
                alignment={alignment} 
                onPress={handleNodePress} 
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 