import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, Modal, TouchableWithoutFeedback, Image } from 'react-native';
import { useCheckInStore } from '../stores/checkInStore';
import { Svg, Path, Circle, Rect, Line, LinearGradient, Stop, Defs, Text as SvgText, ForeignObject } from 'react-native-svg';
import { hapticLight } from '~/utils/haptics';
import i18n from '../utils/i18n';
import { Feather } from '@expo/vector-icons';
import { appLog } from '../helper/helper';
import analytics from '~/utils/analytics';

const { width: screenWidth } = Dimensions.get('window');

interface MoodStrugglesGraphsProps {
  containerWidth?: number;
  containerHeight?: number;
}

const MoodStrugglesGraphs: React.FC<MoodStrugglesGraphsProps> = ({ 
  containerWidth = screenWidth - 48, 
  containerHeight = 300 
}) => {
  const { checkInHistory } = useCheckInStore();
  const [selectedGraph, setSelectedGraph] = useState<'mood' | 'struggles'>('mood');
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    x: number;
    y: number;

    content: string;
    date?: string;
  } | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const graphWidth = containerWidth;
  const graphHeight = containerHeight;
  const padding = 40;
  const innerWidth = graphWidth - 2 * padding;
  const innerHeight = graphHeight - 2 * padding;
  
  // Mood mappings with proper color tokens and emojis
  const moodValues = {
    'Great': 5,
    'good': 4,
    'meh': 3,
    'bad': 2,
    'veryBad': 1,
    'angry': 1.5
  };
  
  const moodColors = {
    'Great': '#24CA17', // darkGreen
    'good': '#A8F093', // forestGreen50
    'meh': '#FCD34D', // accentGold
    'bad': '#FF8C1A', // darkOrange
    'veryBad': '#E64132', // darkRed
    'angry': '#E6319E' // darkPink
  };

  // Mood images from GlobalCheckIn.tsx
  const moodImages = {
    'Great': require('../../assets/icons/moods/greatLamb.png'),
    'good': require('../../assets/icons/moods/goodLamb.png'),
    'meh': require('../../assets/icons/moods/sheepIcon.png'),
    'bad': require('../../assets/icons/moods/sadLamb.png'),
    'veryBad': require('../../assets/icons/moods/reallyBadLamb.png'),
    'angry': require('../../assets/icons/moods/angryLamb.png')
  };

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  // Struggle mappings with proper color tokens
  const struggleColors = {
    'lust': '#E64132', // darkRed
    'envy': '#E64132', // darkRed
    'anger': '#C81E28', // darkCrimson
    'greed': '#24CA17', // darkGreen
    'laziness': '#7B2BFF', // darkPurple
    'pride': '#FF8C1A', // darkOrange
    'vanity': '#E6319E', // darkPink
    'impatience': '#18B2B6', // darkCyan
    'gluttony': '#2196F3' // darkBlue
  };
  
  const struggleLabels = {
    'lust': i18n.t('checkin_struggle_lust'),
    'envy': i18n.t('checkin_struggle_envy'),
    'anger': i18n.t('checkin_struggle_anger'),
    'greed': i18n.t('checkin_struggle_greed'),
    'laziness': i18n.t('checkin_struggle_laziness'),
    'pride': i18n.t('checkin_struggle_pride'),
    'vanity': i18n.t('checkin_struggle_vanity'),
    'impatience': i18n.t('checkin_struggle_impatience'),
    'gluttony': i18n.t('checkin_struggle_gluttony')
  };

  // Get last 7 days of check-in data grouped by day of week
  const getWeeklyData = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekData = checkInHistory
      .filter(checkIn => {
        const checkInDate = new Date(checkIn.completedAt);
        return checkInDate >= sevenDaysAgo && checkInDate <= today;
      })
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

    // Group by day of week (0 = Sunday, 1 = Monday, etc.)
    const groupedByDay: { [key: number]: any[] } = {};
    weekData.forEach(checkIn => {
      const dayOfWeek = new Date(checkIn.completedAt).getDay();
      if (!groupedByDay[dayOfWeek]) {
        groupedByDay[dayOfWeek] = [];
      }
      groupedByDay[dayOfWeek].push(checkIn);
    });

    return groupedByDay;
  };

  // Animation effect
  useEffect(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    
    setAnimationProgress(0);
    let progress = 0;
    
    const animate = () => {
      progress += 0.02;
      if (progress >= 1) {
        progress = 1;
        setAnimationProgress(progress);
        return;
      }
      setAnimationProgress(progress);
      animationRef.current = setTimeout(animate, 16);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [selectedGraph]);

  // Process mood data for weekly chart
  const getMoodChartData = () => {
    const groupedData = getWeeklyData();
    const weeklyMoodData = [];
    
    // Create data for each day of the week (Monday to Sunday)
    for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
      const dayOfWeek = dayIndex === 7 ? 0 : dayIndex; // Sunday = 0, Monday = 1, etc.
      const dayData = groupedData[dayOfWeek];
      
      if (dayData && dayData.length > 0) {
        // Get the most recent mood for this day
        const latestCheckIn = dayData[dayData.length - 1];
        const moodValue = moodValues[latestCheckIn.mood as keyof typeof moodValues] || 3;
        
        weeklyMoodData.push({
          x: ((dayIndex - 1) / 6) * innerWidth,
          y: innerHeight - ((moodValue - 1) / 4) * innerHeight,
          value: moodValue,
          color: moodColors[latestCheckIn.mood as keyof typeof moodColors] || '#FCD34D',
          date: new Date(latestCheckIn.completedAt),
          mood: latestCheckIn.mood,
          dayOfWeek: dayIndex - 1,
          dayLabel: weekDays[dayIndex - 1]
        });
      } else {
        // No data for this day - show neutral
        weeklyMoodData.push({
          x: ((dayIndex - 1) / 6) * innerWidth,
          y: innerHeight - ((3 - 1) / 4) * innerHeight,
          value: 3,
          color: '#E9E2C7',
          date: null,
          mood: 'no_data',
          dayOfWeek: dayIndex - 1,
          dayLabel: weekDays[dayIndex - 1]
        });
      }
    }
    
    return weeklyMoodData;
  };

  // Process struggle data for weekly chart
  const getStrugglesChartData = () => {
    const groupedData = getWeeklyData();
    const weeklyStruggleData = [];
    
    // Create data for each day of the week (Monday to Sunday)
    for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
      const dayOfWeek = dayIndex === 7 ? 0 : dayIndex; // Sunday = 0, Monday = 1, etc.
      const dayData = groupedData[dayOfWeek];
      
      if (dayData && dayData.length > 0) {
        // Count struggles for this day
        const strugglesCount = dayData.filter(checkIn => checkIn.struggle && checkIn.struggle !== '').length;
        const mostCommonStruggle = dayData
          .filter(checkIn => checkIn.struggle && checkIn.struggle !== '')
          .reduce((acc: { [key: string]: number }, checkIn) => {
            acc[checkIn.struggle] = (acc[checkIn.struggle] || 0) + 1;
            return acc;
          }, {});
        
        const topStruggle = Object.entries(mostCommonStruggle)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0];
        
        weeklyStruggleData.push({
          x: ((dayIndex - 1) / 6) * innerWidth,
          height: (strugglesCount / 3) * innerHeight, // Max 3 struggles per day
          count: strugglesCount,
          struggle: topStruggle ? topStruggle[0] : 'none',
          color: topStruggle ? (struggleColors[topStruggle[0] as keyof typeof struggleColors] || '#666') : '#E9E2C7',
          label: topStruggle ? (struggleLabels[topStruggle[0] as keyof typeof struggleLabels] || topStruggle[0]) : 'None',
          dayOfWeek: dayIndex - 1,
          dayLabel: weekDays[dayIndex - 1],
          width: (innerWidth / 7) - 20
        });
      } else {
        // No data for this day
        weeklyStruggleData.push({
          x: ((dayIndex - 1) / 6) * innerWidth,
          height: 0,
          count: 0,
          struggle: 'none',
          color: '#E9E2C7',
          label: 'None',
          dayOfWeek: dayIndex - 1,
          dayLabel: weekDays[dayIndex - 1],
          width: (innerWidth / 7) - 8
        });
      }
    }
    
    return weeklyStruggleData;
  };

  // Create smooth path for mood line
  const createSmoothPath = (points: any[]) => {
    if (points.length < 2) return '';
    
    const visiblePoints = points.slice(0, Math.floor(points.length * animationProgress));
    if (visiblePoints.length < 2) return '';
    
    let path = `M ${visiblePoints[0].x + padding} ${visiblePoints[0].y + padding}`;
    
    for (let i = 1; i < visiblePoints.length; i++) {
      const prev = visiblePoints[i - 1];
      const curr = visiblePoints[i];
      
      const cp1x = prev.x + padding + (curr.x - prev.x) * 0.4;
      const cp1y = prev.y + padding;
      const cp2x = curr.x + padding - (curr.x - prev.x) * 0.4;
      const cp2y = curr.y + padding;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x + padding} ${curr.y + padding}`;
    }
    
    return path;
  };

  // Create area path for mood chart
  const createAreaPath = (points: any[]) => {
    const linePath = createSmoothPath(points);
    if (!linePath) return '';
    
    const visiblePoints = points.slice(0, Math.floor(points.length * animationProgress));
    if (visiblePoints.length < 2) return '';
    
    const lastPoint = visiblePoints[visiblePoints.length - 1];
    const firstPoint = visiblePoints[0];
    
    return `${linePath} L ${lastPoint.x + padding} ${innerHeight + padding} L ${firstPoint.x + padding} ${innerHeight + padding} Z`;
  };

  const renderMoodGraph = () => {
    const moodData = getMoodChartData();
    appLog('moodData', moodData);
    
    if (moodData.length === 0) {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="font-feather text-heading text-textPrimary/70 text-center">
            {i18n.t('no_mood_data')}
          </Text>
          <Text className="font-din text-body text-description text-center mt-2">
            Complete daily check-ins to see your weekly mood trends
          </Text>
        </View>
      );
    }
    
    const pathData = createSmoothPath(moodData);
    const areaData = createAreaPath(moodData);
    const visiblePoints = moodData.slice(0, Math.floor(moodData.length * animationProgress));
    
    return (
      <View className="flex-1" style={{ position: 'relative' }}>
        <Svg width={graphWidth} height={graphHeight}>
          {/* Mood Gradient */}
          <Defs>
            <LinearGradient id="moodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#24CA17" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#24CA17" stopOpacity="0.1" />
            </LinearGradient>
          </Defs>
          
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map(level => (
            <Line
              key={level}
              x1={padding}
              y1={padding + innerHeight - ((level - 1) / 4) * innerHeight}
              x2={graphWidth - padding}
              y2={padding + innerHeight - ((level - 1) / 4) * innerHeight}
              stroke="#E9E2C7"
              strokeWidth="1"
              strokeDasharray="5,5"
            />
          ))}
          
          {/* Area under curve */}
          <Path
            d={areaData}
            fill="url(#moodGradient)"
          />
          
          {/* Mood line */}
          <Path
            d={pathData}
            stroke="#24CA17"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {visiblePoints.map((point, index) => (
            <Circle
              key={index}
              cx={point.x + padding}
              cy={point.y + padding}
              r={point.color === '#E9E2C7' ? 0 : 7}
              fill={point.color}
              stroke="#fff"
              strokeWidth="1"
              onPress={(event) => handleDataPointPress(point, event)}
            />
          ))}
          
          {/* Y-axis labels for mood levels */}
          {[
            { level: 5, label: 'Great', y: padding + innerHeight - ((5 - 1) / 4) * innerHeight },
            { level: 4, label: 'Good', y: padding + innerHeight - ((4 - 1) / 4) * innerHeight },
            { level: 3, label: 'Meh', y: padding + innerHeight - ((3 - 1) / 4) * innerHeight },
            { level: 2, label: 'Bad', y: padding + innerHeight - ((2 - 1) / 4) * innerHeight },
            { level: 1, label: 'Very Bad', y: padding + innerHeight - ((1 - 1) / 4) * innerHeight }
          ].map((mood) => (
            <SvgText
              key={mood.level}
              x={padding - 2}
              y={mood.y + 5}
              fontSize="7"
              fill="#B89B4C"
              textAnchor="end"
              fontWeight="500"
            >
              {mood.label}
            </SvgText>
          ))}
          
          {/* X-axis labels - Days of week */}
          {moodData.map((point, index) => (
            <SvgText
              key={index}
              x={point.x + padding}
              y={graphHeight - 10}
              fontSize="12"
              fill="#B89B4C"
              textAnchor="middle"
              fontWeight="bold"
            >
              {point.dayLabel}
            </SvgText>
          ))}
        </Svg>
        
        {/* Mood images positioned above data points */}
        {visiblePoints.map((point, index) => {
          if (point.mood === 'no_data') return null;
          
          return (
            <View
              key={`mood-image-${index}`}
              style={{
                position: 'absolute',
                left: point.x + padding - 16, 
                top: point.y + padding - 40,
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image
                source={moodImages[point.mood as keyof typeof moodImages]}
                style={{
                  width: 50,
                  height: 50,
                }}
                resizeMode="contain"
              />
            </View>
          );
        })}
      </View>
    );
  };

  const renderStrugglesGraph = () => {
    const strugglesData = getStrugglesChartData();
    
    if (strugglesData.length === 0) {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="font-feather text-heading text-textPrimary/70 text-center">
            {i18n.t('no_struggles_data')}
          </Text>
          <Text className="font-din text-body text-description text-center mt-2">
            Track your struggles in daily check-ins to see weekly patterns
          </Text>
        </View>
      );
    }
    
    return (
      <View className="flex-1">
        <Svg width={graphWidth} height={graphHeight}>
          <Defs>
            {strugglesData.map((item, index) => (
              <LinearGradient key={index} id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={item.color} stopOpacity="0.8" />
                <Stop offset="100%" stopColor={item.color} stopOpacity="0.4" />
              </LinearGradient>
            ))}
          </Defs>
          
          {/* Grid lines */}
          {[0, 1, 2, 3].map(level => (
            <Line
              key={level}
              x1={padding}
              y1={padding + innerHeight - (level / 3) * innerHeight}
              x2={graphWidth - padding}
              y2={padding + innerHeight - (level / 3) * innerHeight}
              stroke="#E9E2C7"
              strokeWidth="1"
              strokeDasharray="3"
            />
          ))}
          
          {/* Struggle bars */}
          {strugglesData.map((item, index) => (
            <React.Fragment key={index}>
              <Rect
                x={padding + item.x + 6}
                y={padding + innerHeight - (item.height * animationProgress)}
                width={item.width}
                height={Math.max(item.height * animationProgress, 4)} // Minimum height for visibility
                fill={`url(#gradient-${index})`}
                rx="3"
                onPress={(event) => handleDataPointPress(item, event)}
              />
              {item.count > 0 && (
                <SvgText
                  x={padding + item.x + item.width / 2 + 5}
                  y={padding + innerHeight - (item.height * animationProgress) - 12}
                  fontSize="14"
                  fill="#795323"
                  textAnchor="middle"
                  fontWeight="bold"
                  
                >
                  {item.count}
                </SvgText>
              )}
            </React.Fragment>
          ))}
          
          {/* X-axis labels - Days of week */}
          {strugglesData.map((item, index) => (
            <SvgText
              key={index}
              x={padding + item.x + item.width / 2}
              y={graphHeight - 10}
              fontSize="12"
              fill="#B89B4C"
              textAnchor="middle"
              fontWeight="bold"
            >
              {item.dayLabel}
            </SvgText>
          ))}
        </Svg>
      </View>
    );
  };

  const handleGraphSwitch = (graphType: 'mood' | 'struggles') => {
    if (graphType !== selectedGraph) {
      hapticLight();
      setSelectedGraph(graphType);
      
      // Add scale animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleDataPointPress = (point: any, event: any) => {
    hapticLight();
    
    if (selectedGraph === 'mood') {
      analytics.logEvent('mood_graph_point_pressed', {
        mood: point.mood,
        date: point.date,
        graph: selectedGraph,
      });
      const date = new Date(point.date).toLocaleDateString();
      setTooltipData({
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
        content: `Mood: ${point.mood}`,
        date: date,
      });
    } else {
      setTooltipData({
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
        content: `${point.label}: ${point.count} times`,
      });
    }
    
    setShowTooltip(true);
    
    // Auto-hide tooltip after 3 seconds
    setTimeout(() => {
      setShowTooltip(false);
    }, 1000);
  };

  return (
    <>
      <Animated.View 
        style={{ transform: [{ scale: scaleAnim }] }}
        className="bg-surfaceCreamLight rounded-[20px] border border-brownBorder"
      >
        {/* Header with graph selector */}
        <View className="flex-row justify-between items-center mb-6 p-4">
          <Text className="font-feather text-lg text-textPrimary">
            {selectedGraph === 'mood' ? 'Mood Trends' : 'Struggle Patterns'}
          </Text>
          
          <View className="flex-row bg-surfaceCream rounded-full p-1">
            <TouchableOpacity
              onPress={() => handleGraphSwitch('mood')}
              className={`px-4 py-2 rounded-full ${
                selectedGraph === 'mood' 
                  ? 'bg-accentGold' 
                  : 'bg-transparent'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`font-din text-sm ${
                selectedGraph === 'mood' 
                  ? 'text-white' 
                  : 'text-textPrimary'
              }`}>
                Mood
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => handleGraphSwitch('struggles')}
              className={`px-4 py-2 rounded-full ${
                selectedGraph === 'struggles' 
                  ? 'bg-accentGold' 
                  : 'bg-transparent'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`font-din text-sm ${
                selectedGraph === 'struggles' 
                  ? 'text-white' 
                  : 'text-textPrimary'
              }`}>
                Struggles
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Graph content */}
        <View style={{ height: containerHeight , width: containerWidth}}>
          {selectedGraph === 'mood' ? renderMoodGraph() : renderStrugglesGraph()}
        </View>
        
        {/* Legend */}
        <View className="mt-4 p-2 border-t border-brownBorder">
                  <Text className="font-din text-sm text-description text-center">
          {selectedGraph === 'mood' 
            ? 'Track your emotional journey over the week' 
            : 'See which areas you\'re working on this week'
          }
        </Text>
        </View>
      </Animated.View>

      {/* Tooltip Modal */}
      <Modal
        visible={showTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTooltip(false)}>
          <View className="flex-1">
            {tooltipData && (
              <View
                style={{
                  position: 'absolute',
                  top: tooltipData.y + 150,
                  left: tooltipData.x ,
                  minWidth: 100,
                }}
                className="bg-textPrimary rounded-lg p-3 shadow-lg"
              >
                <Text className="font-din text-white text-center text-sm">
                  {tooltipData.content}
                </Text>
                {tooltipData.date && (
                  <Text className="font-din text-white/70 text-center text-xs mt-1">
                    {tooltipData.date}
                  </Text>
                )}
                <View 
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    left: '50%',
                    marginLeft: -6,
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 6,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: '#795323',
                  }}
                />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default MoodStrugglesGraphs; 