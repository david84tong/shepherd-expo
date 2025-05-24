import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUIStore } from '../app/stores/uiStore';
import { Reflection } from '../app/models/User';
import dayjs from 'dayjs';

// Using exact same date handling from stats.tsx
function toDateSafe(ts: any): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
  if (ts._seconds !== undefined) return new Date(ts._seconds * 1000);
  return new Date(ts);
}

// Function to format relative time (30m ago, 2d ago, etc.) - from stats.tsx
function formatRelativeTime(timestamp: any): string {
  try {
    const date = toDateSafe(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Less than a minute
    if (diffMs < 60000) {
      return 'just now';
    }
    
    // Minutes
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    
    // Hours
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    
    // Days
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays}d ago`;
    }
    
    // Months
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths}mo ago`;
    }
    
    // Years
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears}y ago`;
  } catch (error) {
    console.error('Error formatting relative time:', error, timestamp);
    return 'Recent Reflection';
  }
}

// Format full date for content area
function formatFullDate(timestamp: any): string {
  try {
    const date = toDateSafe(timestamp);
    return dayjs(date).format('MMMM D, YYYY · h:mm A');
  } catch (error) {
    console.error('Error formatting full date:', error);
    return '';
  }
}

const OldReflectionSheet: React.FC = () => {
  // Get visibility state and data from UI store
  const isVisible = useUIStore(state => state.isOldReflectionSheetVisible);
  const reflectionData = useUIStore(state => state.reflectionToShow);
  const hideSheet = useUIStore(state => state.hideOldReflectionSheet);

  // Ref for the bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Use fixed snap points for now, allow scrolling for large content
  const snapPoints = useMemo(() => ['60%', '85%'], []);

  // Calculate character count of the reflection content
  const charCount = useMemo(() => {
    if (!reflectionData?.content) return 0;
    return reflectionData.content.length;
  }, [reflectionData?.content]);

  // Log when reflection data changes
  useEffect(() => {
    console.log('OldReflectionSheet: reflectionData changed:', reflectionData);
  }, [reflectionData]);

  // Log when visibility changes
  useEffect(() => {
    console.log('OldReflectionSheet: isVisible changed to:', isVisible);
  }, [isVisible]);

  // Effect to control sheet visibility based on store state
  useEffect(() => {
    if (isVisible) {
      console.log('OldReflectionSheet: Expanding sheet');
      // Add a small delay to ensure the sheet expands properly
      setTimeout(() => {
        bottomSheetRef.current?.expand();
      }, 100);
      
      // Provide haptic feedback when sheet opens
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      console.log('OldReflectionSheet: Closing sheet');
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Handle sheet closing
  const handleSheetChanges = useCallback((index: number) => {
    console.log('OldReflectionSheet: Sheet index changed to:', index);
    if (index === -1) { // Index -1 means sheet is closed
      hideSheet();
    }
  }, [hideSheet]);

  // Close button handler
  const handleClose = useCallback(() => {
    console.log('OldReflectionSheet: Close button pressed');
    bottomSheetRef.current?.close();
  }, []);

  // Custom backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close" // Close sheet when backdrop is pressed
      />
    ),
    []
  );

  // Don't render anything if no reflection data
  if (!reflectionData) {
    console.log('OldReflectionSheet: No reflection data, not rendering');
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Start closed
      snapPoints={snapPoints} // Use fixed snap points
      enablePanDownToClose={true}
      onChange={handleSheetChanges}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Header - Now using relative time */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {reflectionData ? formatFullDate(reflectionData.date) : ''}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content Area */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.relativeTimeText}>
            {formatRelativeTime(reflectionData.date)}
          </Text>
          
          <Text style={styles.reflectionText}>
            {reflectionData?.content || 'No content found.'}
          </Text>
        </ScrollView>
        
        {/* Character count bubble */}
        <View style={styles.charCountContainer}>
          <Text style={styles.charCountText}>
            {charCount}
          </Text>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#DCB280', // accent
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1, // Ensure content container takes up space
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4A8', // border
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold', // din font
    color: '#B89B4C', // description color
    flexShrink: 1, // Allow title to shrink if needed
    marginRight: 10,
  },
  closeButton: {
    padding: 5,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular', // din font
    color: '#F7B500', // accentGold
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 25, // Consistent horizontal padding
    paddingBottom: 50, // Extra padding to avoid overlap with character count
  },
  relativeTimeText: {
    fontSize: 14,
    fontFamily: 'DIN Next Rounded LT W01 Regular', // din font
    color: '#B89B4C', // description color
    marginBottom: 12,
  },
  reflectionText: {
    fontSize: 16, // body size
    fontFamily: 'DIN Next Rounded LT W01 Regular', // din font
    color: '#3C584A', // textPrimary
    lineHeight: 24, // Improve readability
  },
  charCountContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#F7B500', // accentGold
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    shadowOpacity: 1,
    elevation: 2,
  },
  charCountText: {
    fontSize: 14,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#FFFFFF', // white
    fontWeight: '500',
  },
});

export default OldReflectionSheet;
