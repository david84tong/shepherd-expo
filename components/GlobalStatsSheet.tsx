import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import { useUIStore } from '../app/stores/uiStore';
import StatsScreen from '../app/components/stats';
import { hapticMedium } from '~/utils/haptics';

interface StatsSheetProps {
  statsSheetRef: React.RefObject<StatsSheetRef>;
}

// Define the ref type that includes both BottomSheet methods and our custom show method
export type StatsSheetRef = {
  show: () => void;
  close: () => void;
  expand: () => void;
};

const StatsSheet: React.FC<StatsSheetProps> = ({ statsSheetRef }) => {
  const snapPoints = useMemo(() => ['95%'], []);

  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Access UI store for visibility
  const isStatsSheetVisible = useUIStore((state) => state.isStatsSheetVisible);
  const hideStatsSheet = useUIStore((state) => state.hideStatsSheet);

  // Handle sheet changes
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        hideStatsSheet();
      }
    },
    [hideStatsSheet]
  );

  // Handle close
  const handleClose = useCallback(() => {
    // Trigger the bottom sheet close animation first
    bottomSheetRef.current?.close();
    // Don't call hideStatsSheet() here - let handleSheetChange do it when animation completes
  }, []);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Show the stats sheet
  const showSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
    hapticMedium();
  }, []);

  // Expose methods via ref
  useImperativeHandle(
    statsSheetRef,
    () => ({
      show: showSheet,
      close: () => {
        // Trigger the bottom sheet close animation first
        bottomSheetRef.current?.close();
        // Don't call hideStatsSheet() here - let handleSheetChange do it when animation completes
      },
      expand: () => bottomSheetRef.current?.expand(),
    }),
    [showSheet]
  );

  return (
    <>
      {isStatsSheetVisible ? (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          onChange={handleSheetChange}
          backgroundStyle={{
            backgroundColor: '#FDEBB8',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
          handleIndicatorStyle={{
            backgroundColor: '#634012',
            opacity: 0.3,
          }}
          backdropComponent={renderBackdrop}>
          <BottomSheetScrollView
            style={{ flex: 1 }}
            bounces={false}
          >
            <StatsScreen onClose={handleClose} />
          </BottomSheetScrollView>
        </BottomSheet>
      ) : null}
    </>
  );
};

export default StatsSheet; 