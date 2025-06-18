import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import { useUIStore } from '../app/stores/uiStore';
import StoreScreen from './StoreScreen';

interface StoreSheetProps {
  storeSheetRef: React.RefObject<StoreSheetRef>;
}

// Define the ref type that includes both BottomSheet methods and our custom show method
export type StoreSheetRef = {
  show: () => void;
  close: () => void;
  expand: () => void;
};

const StoreSheet: React.FC<StoreSheetProps> = ({ storeSheetRef }) => {
  const snapPoints = useMemo(() => ['85%', '95%'], []);

  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Access UI store for visibility
  const isStoreSheetVisible = useUIStore((state) => state.isStoreSheetVisible);
  const hideStoreSheet = useUIStore((state) => state.hideStoreSheet);

  // Handle sheet changes
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        hideStoreSheet();
      }
    },
    [hideStoreSheet]
  );

  // Handle close
  const handleClose = useCallback(() => {
    // Trigger the bottom sheet close animation first
    bottomSheetRef.current?.close();
    // Don't call hideStoreSheet() here - let handleSheetChange do it when animation completes
  }, []);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  // Show the store sheet
  const showSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  // Expose methods via ref
  useImperativeHandle(
    storeSheetRef,
    () => ({
      show: showSheet,
      close: () => {
        // Trigger the bottom sheet close animation first
        bottomSheetRef.current?.close();
        // Don't call hideStoreSheet() here - let handleSheetChange do it when animation completes
      },
      expand: () => bottomSheetRef.current?.expand(),
    }),
    [showSheet]
  );

  return (
    <>
      {isStoreSheetVisible ? (
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
          <BottomSheetView style={{ flex: 1 }}>
            <StoreScreen onClose={handleClose} />
          </BottomSheetView>
        </BottomSheet>
      ) : null}
    </>
  );
};

export default StoreSheet; 