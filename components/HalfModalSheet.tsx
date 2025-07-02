import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useRef, useImperativeHandle } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

import PrimaryButton from './PrimaryButton';
import { HalfModalType } from '../app/halfModal';
import { useUserStore } from '../app/stores/userStore';
import { hapticMedium } from '~/utils/haptics';

export type HalfModalSheetRef = {
  expand: () => void;
  close: () => void;
};

interface HalfModalSheetProps {
  halfModalRef: React.RefObject<HalfModalSheetRef>;
  snapPoints: string[];
  params: {
    type?: HalfModalType;
    message?: string;
    subMessage?: string;
    penalty?: number;
    daysMissed?: number;
  };
}

const HalfModalSheet: React.FC<HalfModalSheetProps> = ({ halfModalRef, snapPoints, params }) => {
  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Handle dismiss of half modal
  const handleDismiss = useCallback(() => {
    bottomSheetRef.current?.close();
    hapticMedium();
  }, []);

  // Handle bottom sheet changes
  const handleSheetChange = useCallback((index: number) => {
    // Can implement backdrop opacity changes or other effects here if needed
  }, []);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Expose methods via ref
  useImperativeHandle(
    halfModalRef,
    () => ({
      expand: () => bottomSheetRef.current?.expand(),
      close: () => bottomSheetRef.current?.close(),
    }),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}>
      <BottomSheetView style={styles.contentContainer}>
        {params.type === HalfModalType.HEART_PENALTY ? (
          <>
            <Image
              source={require('../assets/lambStatic/cryingLamb.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.title}>{params.message || 'Hearts Lost!'}</Text>
            {params.penalty && params.daysMissed ? (
              <View>
                <Text style={styles.penaltyText}>
                  ❤️ {useUserStore.getState().getLambName()} lost {params.penalty} hearts after{' '}
                  {params.daysMissed} days away.
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Image
              source={require('../assets/icons/heartIcon.png')}
              style={styles.icon}
              resizeMode="contain"
            />
            <Text style={styles.title}>{params.message || 'Attention'}</Text>
            <Text style={styles.penaltyText}>{params.subMessage || 'Something happened.'}</Text>
          </>
        )}

        {/* Close Button */}
        <PrimaryButton
          title="Let's bounce back"
          onPress={handleDismiss}
          style="w-full mt-6"
          buttonType="default"
        />
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    alignItems: 'center',
    flex: 1,
    padding: 20,
    paddingBottom: 30,
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
    width: 40,
  },
  icon: {
    height: 240,
    marginBottom: 16,
    width: 240,
  },
  penaltyText: {
    color: '#666', // secondaryText
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    color: '#3C584A', // textPrimary
    fontFamily: 'Nunito-Black',
    fontSize: 32,
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default HalfModalSheet;
