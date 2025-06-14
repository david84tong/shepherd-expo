import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CircleButton from './Shared/CircleButton';
import { AntDesign } from '@expo/vector-icons';

export const TAB_BAR_HEIGHT = 64;

export interface BibleVerseActionBarProps {
  reference?: string;
  onPrev?: () => void;
  onNext?: () => void;
  disabledPrev?: boolean;
  disabledNext?: boolean;
  leftIconComponent?: React.ReactNode;
  rightIconComponent?: React.ReactNode;
  onVersePress?: () => void;
}

export function BibleVerseActionBar({ 
  reference = 'John 3:16', 
  onPrev,
  onNext,
  disabledPrev = false,
  disabledNext = false,
  leftIconComponent,
  rightIconComponent,
  onVersePress
}: BibleVerseActionBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + TAB_BAR_HEIGHT - 10,
        backgroundColor: '#FDEBB8',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        shadowColor: 'rgba(0,0,0,0.04)',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
        zIndex: 100,
      }}
    >
      <TouchableOpacity onPress={onVersePress}>

      <Text
        style={{
          fontFamily: 'Feather-Bold',
          fontSize: 18,
          color: '#B89B4C',
        }}
        >
        {reference}
      </Text>
        </TouchableOpacity>
      <View className='flex-row gap-4 items-center'>
        <CircleButton
          iconComponent={leftIconComponent || <AntDesign name="caretleft" size={14} color="#795222" />}
          size={56}
          onPress={onPrev || (() => {})}
          disabled={disabledPrev}
          isSmall={true}
        />
        <CircleButton
          iconComponent={rightIconComponent || <AntDesign name="caretright" size={14} color="#795222" />}
          size={56}
          onPress={onNext || (() => {})}
          disabled={disabledNext}
          isSmall={true}
        />
      </View>
    </View>
  );
} 