import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text } from 'react-native';
import { widthScreen } from '~/utils/dimensions';

interface StickyPathHeaderProps {
  title: string;
  icon: string;
  color: string;
  description: string;
  sectionNumber: number;
  isLocked?: boolean;
  opacity?: number;
}

const StickyPathHeader: React.FC<StickyPathHeaderProps> = ({
  title,
  icon,
  color,
  description,
  sectionNumber,
  isLocked = false,
  opacity = 1,
}) => {
  // Get the light background color based on path color
  const getBgColor = () => {
    // For locked sections, use gray background
    if (isLocked) {
      return 'bg-gray-200';
    }

    switch (color) {
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

  // Get the dark color for text/icon and border
  const getDarkColor = () => {
    // For locked sections, use gray color
    if (isLocked) {
      return '#9CA3AF'; // gray-400
    }

    switch (color) {
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

  // Get the border class for the dark color
  const getBorderClass = () => {
    // For locked sections, use gray border
    if (isLocked) {
      return 'border-gray-400';
    }

    switch (color) {
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

  return (
    <View className="w-full mt-12">
      <View className="px-4 pt-10">
        <View
          className={`flex-row items-center w-full ${getBgColor()} ${getBorderClass()} border-2 rounded-3xl px-5 py-4`}
          style={{ minHeight: 72, opacity: isLocked ? opacity : 1 }}>
          <View className="flex-1 justify-center">
            <Text
              className="font-din uppercase text-2xl mb-1 text-textPrimary"
              style={{ color: getDarkColor(), opacity: 0.7 }}>{`SECTION ${sectionNumber}`}</Text>
            <Text
              className="font-feather text-2xl font-bold"
              style={{ color: getDarkColor(), maxWidth: widthScreen * 0.6 }}
            >
              {title}
            </Text>
          </View>
          {isLocked ? (
            <View className="relative">
              <View className="bg-gray-200 rounded-full p-1.5 border-4 border-gray-400">
                <Ionicons
                  name="lock-closed"
                  size={24}
                  color="gray"
                  style={{ fontWeight: 'bold' }}
                />
              </View>
            </View>
          ) : (
            <Ionicons
              name={(icon || 'book') as any}
              size={32}
              style={{ color: getDarkColor(), opacity: 0.7 }}
            />
          )}
        </View>
        {/* Decorative connector below header */}
        <View className="items-center">
          <View
            className="w-1 h-4 bg-gray-300"
            style={{ borderRadius: 2, marginTop: -2, marginBottom: 2, opacity: isLocked ? opacity : 1 }}
          />
          <View
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: isLocked ? '#9CA3AF' : getDarkColor(),
              marginBottom: -6,
              borderWidth: 2,
              borderColor: '#fff',
              opacity: isLocked ? opacity : 1
            }}
          />
        </View>
      </View>
    </View>
  );
};

export default StickyPathHeader;
