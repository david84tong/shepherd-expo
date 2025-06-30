import React, { useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { hapticLight, hapticMedium } from '~/utils/haptics';
import { useUIStore } from '~/app/stores/uiStore';

// Define the ref type
export type DevotionalsSheetRef = {
  show: () => void;
  close: () => void;
  expand: () => void;
};

interface GlobalDevotionalsSheetProps {
  devotionalsSheetRef: React.RefObject<DevotionalsSheetRef>;
}

const GlobalDevotionalsSheet: React.FC<GlobalDevotionalsSheetProps> = ({ devotionalsSheetRef }) => {
  // Add internal ref for the actual BottomSheet
  const bottomSheetRef = useRef<BottomSheet>(null);
  
  // Snap points for 90% height
  const snapPoints = useMemo(() => ['90%'], []);
  
  // Access UI store for visibility
  const isDevotionalsSheetVisible = useUIStore((state) => state.isDevotionalsSheetVisible);
  const hideDevotionalsSheet = useUIStore((state) => state.hideDevotionalsSheet);

  const handleClose = useCallback(() => {
    hapticLight();
    bottomSheetRef.current?.close();
  }, []);
  
  // Handle sheet changes
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        hideDevotionalsSheet();
      }
    },
    [hideDevotionalsSheet]
  );

  // Show the sheet
  const showSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
    hapticMedium();
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
    devotionalsSheetRef,
    () => ({
      show: showSheet,
      close: () => bottomSheetRef.current?.close(),
      expand: () => bottomSheetRef.current?.expand(),
    }),
    [showSheet]
  );

  return (
    <>
      {isDevotionalsSheetVisible ? (
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          onChange={handleSheetChange}
          backdropComponent={renderBackdrop}
          backgroundStyle={{
            backgroundColor: '#FFF4DC',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
          handleIndicatorStyle={{
            backgroundColor: '#795323',
            opacity: 0.3,
          }}
        >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Devotionals</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#795323" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.placeholderText}>Devotionals content coming soon...</Text>
        </View>
      </BottomSheetView>
        </BottomSheet>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Feather',
    color: '#795323',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#795323',
    opacity: 0.6,
  },
});

export default GlobalDevotionalsSheet;