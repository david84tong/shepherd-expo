import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BIBLE_PATHS, Unit } from '../../app/models/Path';

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
  const path = BIBLE_PATHS.find(p => p.units.some(u => u.id === unit.id));
  const pathColor = path?.color || 'green';

  // Get background color based on status - use light colors for active and completed
  const getBgColorClass = () => {
    // Always use the path color, regardless of status
    switch (pathColor) {
      case 'yellow': return 'bg-lightYellow';
      case 'red': return 'bg-lightRed';
      case 'green': return 'bg-lightGreen';
      case 'orange': return 'bg-lightOrange';
      case 'teal': return 'bg-lightTeal';
      case 'purple': return 'bg-lightPurple';
      case 'pink': return 'bg-lightPink';
      case 'crimson': return 'bg-lightCrimson';
      case 'indigo': return 'bg-lightIndigo';
      case 'blue': return 'bg-lightBlue';
      case 'cyan': return 'bg-lightCyan';
      case 'scarlet': return 'bg-lightScarlet';
      default: return 'bg-lightGreen';
    }
  };
  
  // Get border color based on status - use dark colors for active and completed
  const getBorderColorClass = () => {
    // Always use the path color, regardless of status
    switch (pathColor) {
      case 'yellow': return 'border-darkYellow';
      case 'red': return 'border-darkRed';
      case 'green': return 'border-darkGreen';
      case 'orange': return 'border-darkOrange';
      case 'teal': return 'border-darkTeal';
      case 'purple': return 'border-darkPurple';
      case 'pink': return 'border-darkPink';
      case 'crimson': return 'border-darkCrimson';
      case 'indigo': return 'border-darkIndigo';
      case 'blue': return 'border-darkBlue';
      case 'cyan': return 'border-darkCyan';
      case 'scarlet': return 'border-darkScarlet';
      default: return 'border-darkGreen';
    }
  };
  
  // Get text/icon color based on status - use dark colors for active and completed
  const getTextIconColor = () => {
    // Always use the path color, regardless of status
    switch (pathColor) {
      case 'yellow': return '#F7B500';
      case 'red': return '#E64132';
      case 'green': return '#24CA17';
      case 'orange': return '#FF8C1A';
      case 'teal': return '#17CABC';
      case 'purple': return '#7B2BFF';
      case 'pink': return '#E6319E';
      case 'crimson': return '#C81E28';
      case 'indigo': return '#3040FF';
      case 'blue': return '#2196F3';
      case 'cyan': return '#18B2B6';
      case 'scarlet': return '#D72618';
      default: return '#24CA17';
    }
  };
  
  // Get shadow class based on status
  const getShadowClass = () => {
    if (isPressed) {
      return '';
    }
    
    switch (pathColor) {
      case 'yellow': return 'shadow-darkYellow';
      case 'red': return 'shadow-darkRed';
      case 'green': return 'shadow-darkGreen';
      case 'orange': return 'shadow-darkOrange';
      case 'teal': return 'shadow-darkTeal';
      case 'purple': return 'shadow-darkPurple';
      case 'pink': return 'shadow-darkPink';
      case 'crimson': return 'shadow-darkCrimson';
      case 'indigo': return 'shadow-darkIndigo';
      case 'blue': return 'shadow-darkBlue';
      case 'cyan': return 'shadow-darkCyan';
      case 'scarlet': return 'shadow-darkScarlet';
      default: return 'shadow-darkGreen';
    }
  };

  return (
    <View className={`w-full px-16 my-4 ${alignmentClass}`}> 
      <Pressable
        onPress={() => !isDisabled && onPress(unit)}
        disabled={isDisabled}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        className={`
          w-36 h-36 rounded-full items-center justify-center border-2
          p-2
          ${getBgColorClass()} ${getBorderColorClass()}
          transform ${isPressed ? 'translate-y-1' : 'translate-y-0'}
          ${getShadowClass()}
        `}
        style={{ 
          opacity: isDisabled ? 0.2 : 1,
        }}
      >
        <Ionicons 
          name={(unit.icon || "book") as any} 
          size={42} 
          color={getTextIconColor()} 
        />
        <Text 
          className="text-center text-small mt-1 font-feather"
          style={{ color: getTextIconColor() }}
          numberOfLines={2}
        >
          {unit.title}
        </Text>
        {/* Completed check icon */}
        {status === 'completed' && (
          <View className="absolute ml-4 mt-4 -bottom-1 -right-2 bg-lightGreen rounded-full p-1.5 border-4 border-darkGreen ">
            <Ionicons name="checkmark" size={24} color="green" style={{ fontWeight: 'bold' }} />
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default PathNode; 