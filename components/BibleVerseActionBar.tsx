import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_HEIGHT = 64;

interface Props {
  reference?: string;
  onPrev?: () => void;
  onNext?: () => void;
  disabledPrev?: boolean;
  disabledNext?: boolean;
}

const BibleVerseActionBar: React.FC<Props> = ({
  reference = 'John 3:16',
  onPrev,
  onNext,
  disabledPrev = false,
  disabledNext = false,
}) => {
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
      <Text
        style={{
          fontFamily: 'Feather-Bold',
          fontSize: 18,
          color: '#B89B4C',
        }}
      >
        {reference}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          onPress={onPrev}
          disabled={disabledPrev}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: disabledPrev ? '#E5E5E5' : '#FFE4A8',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons name="chevron-left" size={24} color="#3C584A" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          disabled={disabledNext}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: disabledNext ? '#E5E5E5' : '#FFE4A8',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons name="chevron-right" size={24} color="#3C584A" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default BibleVerseActionBar; 