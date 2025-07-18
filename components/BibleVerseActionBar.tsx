import React from 'react';
import { View, Text, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CircleButton from './Shared/CircleButton';
import { AntDesign } from '@expo/vector-icons';
import { IS_ANDROID } from '~/app/utils/utils';
import { RPH } from '~/app/helper/helper';

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
        bottom: Platform.OS === 'ios' && Dimensions.get('window').height <= 667 ? 58 : insets.bottom + TAB_BAR_HEIGHT - (IS_ANDROID ? 0 : RPH(3)),
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
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.08)',
        paddingBottom: RPH(3),
      }}
    >
      <TouchableOpacity onPress={onVersePress}>

        {reference ? <Text
          className='font-feather'
          style={{
            fontSize: 18,
            color: '#B89B4C',
          }}
        >
          {reference}
        </Text> : null}
      </TouchableOpacity>
      <View className='flex-row gap-4 items-center'>
        <CircleButton
          iconComponent={leftIconComponent || <AntDesign name="caretleft" size={RPH(1.7)} color="#795222" />}
          size={RPH(7)}
          onPress={onPrev || (() => { })}
          disabled={disabledPrev}
          isSmall={true}
        />
        <CircleButton
          iconComponent={rightIconComponent || <AntDesign name="caretright" size={RPH(1.7)} color="#795222" />}
          size={RPH(7)}
          onPress={onNext || (() => { })}
          disabled={disabledNext}
          isSmall={true}
        />
      </View>
    </View>
  );
} 