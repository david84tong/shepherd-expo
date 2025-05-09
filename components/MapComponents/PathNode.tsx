import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';

import { BIBLE_PATHS, Unit } from '../../app/models/Path';
import analytics from '../../utils/analytics';
// Define node status
export type NodeStatus = 'locked' | 'active' | 'completed';

interface PathNodeProps {
  unit: Unit;
  status: NodeStatus;
  alignment: 'start' | 'center' | 'end';
  onPress: (unit: Unit) => void;
}

const PathNode: React.FC<PathNodeProps> = ({ unit, status, alignment, onPress }) => {
  const [isPressed, setIsPressed] = useState(false);
  const isDisabled = status === 'locked';

  const alignmentClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  }[alignment];

  // Find the path that contains this unit
  const path = BIBLE_PATHS.find((p) => p.units.some((u) => u.id === unit.id));
  const pathColor = path?.color || 'green';

  // Get background color based on status - use light colors for active and completed
  const getBgColorClass = () => {
    // For locked nodes, use grey
    if (status === 'locked') {
      return 'bg-gray-200';
    }
    
    // For active and completed nodes, use the path color
    switch (pathColor) {
      case 'yellow':
        return 'bg-lightYellow';
      case 'red':
        return 'bg-lightRed';
      case 'green':
        return 'bg-lightGreen';
      case 'orange':
        return 'bg-lightOrange';
      case 'teal':
        return 'bg-lightTeal';
      case 'purple':
        return 'bg-lightPurple';
      case 'pink':
        return 'bg-lightPink';
      case 'crimson':
        return 'bg-lightCrimson';
      case 'indigo':
        return 'bg-lightIndigo';
      case 'blue':
        return 'bg-lightBlue';
      case 'cyan':
        return 'bg-lightCyan';
      case 'scarlet':
        return 'bg-lightScarlet';
      default:
        return 'bg-lightGreen';
    }
  };

  // Get border color based on status - use dark colors for active and completed
  const getBorderColorClass = () => {
    // For locked nodes, use grey
    if (status === 'locked') {
      return 'border-gray-400';
    }
    
    // For active and completed nodes, use the path color
    switch (pathColor) {
      case 'yellow':
        return 'border-darkYellow';
      case 'red':
        return 'border-darkRed';
      case 'green':
        return 'border-darkGreen';
      case 'orange':
        return 'border-darkOrange';
      case 'teal':
        return 'border-darkTeal';
      case 'purple':
        return 'border-darkPurple';
      case 'pink':
        return 'border-darkPink';
      case 'crimson':
        return 'border-darkCrimson';
      case 'indigo':
        return 'border-darkIndigo';
      case 'blue':
        return 'border-darkBlue';
      case 'cyan':
        return 'border-darkCyan';
      case 'scarlet':
        return 'border-darkScarlet';
      default:
        return 'border-darkGreen';
    }
  };

  // Get text/icon color based on status - use dark colors for active and completed
  const getTextIconColor = () => {
    // For locked nodes, use grey
    if (status === 'locked') {
      return '#9CA3AF'; // gray-400
    }
    
    // For active and completed nodes, use the path color
    switch (pathColor) {
      case 'yellow':
        return '#F7B500';
      case 'red':
        return '#E64132';
      case 'green':
        return '#24CA17';
      case 'orange':
        return '#FF8C1A';
      case 'teal':
        return '#17CABC';
      case 'purple':
        return '#7B2BFF';
      case 'pink':
        return '#E6319E';
      case 'crimson':
        return '#C81E28';
      case 'indigo':
        return '#3040FF';
      case 'blue':
        return '#2196F3';
      case 'cyan':
        return '#18B2B6';
      case 'scarlet':
        return '#D72618';
      default:
        return '#24CA17';
    }
  };

  // Get shadow class based on status
  const getShadowClass = () => {
    if (isPressed) {
      return '';
    }
    
    // For locked nodes, use grey shadow
    if (status === 'locked') {
      return 'shadow-greyShadow';
  }
    
    switch (pathColor) {
      case 'yellow':
        return 'shadow-darkYellow';
      case 'red':
        return 'shadow-darkRed';
      case 'green':
        return 'shadow-darkGreen';
      case 'orange':
        return 'shadow-darkOrange';
      case 'teal':
        return 'shadow-darkTeal';
      case 'purple':
        return 'shadow-darkPurple';
      case 'pink':
        return 'shadow-darkPink';
      case 'crimson':
        return 'shadow-darkCrimson';
      case 'indigo':
        return 'shadow-darkIndigo';
      case 'blue':
        return 'shadow-darkBlue';
      case 'cyan':
        return 'shadow-darkCyan';
      case 'scarlet':
        return 'shadow-darkScarlet';
      default:
        return 'shadow-darkGreen';
    }
  };

  return (
    <View className={`w-full px-16 my-4 ${alignmentClass}`}>
      <Pressable
        onPress={() => {
          if (!isDisabled) {
            // Add light haptic feedback when tapping a node
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress(unit);
            analytics.logEvent("PathNode_Tapped", {
              unit: unit.id,
              unitName: unit.title
            });
          }
        }}
        disabled={isDisabled}
        onPressIn={() => {
          setIsPressed(true);
          // Optional: add even lighter feedback on press in
          if (!isDisabled) {
            Haptics.selectionAsync();
          }
        }}
        onPressOut={() => setIsPressed(false)}
        className={`
          w-36 h-36 rounded-full items-center justify-center border-2
          p-2
          ${getBgColorClass()} ${getBorderColorClass()}
          transform ${isPressed ? 'translate-y-1' : 'translate-y-0'}
          ${getShadowClass()}
        `}
        style={{ 
          opacity: isDisabled ? 0.3 : 1,
        }}
      >
        <Ionicons 
          name={(unit.icon || "book") as React.ComponentProps<typeof Ionicons>['name']} 
          size={42} 
          color={getTextIconColor()} 
        />
       
        {/* Completed check icon */}
        {status === 'completed' && (
          <View className="absolute ml-4 mt-4 -bottom-1 -right-2 bg-lightGreen rounded-full p-1.5 border-4 border-darkGreen ">
            <Ionicons name="checkmark" size={24} color="green" style={{ fontWeight: 'bold' }} />
          </View>
        )}

        {/* Locked icon */}
        {status === 'locked' && (
          <View className="absolute ml-4 mt-4 -bottom-1 -right-2 bg-gray-200 rounded-full p-1.5 border-4 border-gray-400">
            <Ionicons name="lock-closed" size={24} color="gray" style={{ fontWeight: 'bold' }} />
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default PathNode;
