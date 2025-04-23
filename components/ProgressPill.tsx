import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';

interface ProgressPillProps {
  value: number; // Progress value from 0-100
  label: string; // Text to display (e.g. "87")
  icon: ImageSourcePropType; // Icon to display
  progressColor?: string; // Optional custom color for progress fill
}

const ProgressPill: React.FC<ProgressPillProps> = ({ 
  value, 
  label, 
  icon, 
  progressColor = 'rgba(239, 68, 68, 0.15)' // Default to light red
}) => {
  // Ensure value is within 0-100 range
  const safeValue = Math.max(0, Math.min(100, value));
  
  return (
    <View className="flex-row items-center bg-surfaceCream rounded-full h-10 border border-border shadow-card overflow-hidden">
      {/* Progress background indicator */}
      <View 
        style={{ 
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${safeValue}%`,
          backgroundColor: progressColor
        }} 
      />
      
      {/* Content (number and icon) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 }}>
        <Text className="font-feather text-body text-textPrimary mr-1">{label}</Text>
        <Image source={icon} className="w-6 h-6" />
      </View>
    </View>
  );
};

export default ProgressPill;