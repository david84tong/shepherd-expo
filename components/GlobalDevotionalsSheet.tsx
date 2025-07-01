import React, { useCallback, useImperativeHandle, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { hapticLight, hapticMedium } from '~/utils/haptics';
import { useUIStore } from '~/app/stores/uiStore';
import { useDevotionalStore } from '~/app/stores/devotionalStore';
import { useUserStore } from '~/app/stores/userStore';
import { Devotional } from '~/app/models/Devotional';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import SavedDevotionalCard from '~/components/SavedDevotionalCard';

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

  // Snap points for 95% height
  const snapPoints = useMemo(() => ['90%'], []);

  // Access UI store for visibility
  const isDevotionalsSheetVisible = useUIStore((state) => state.isDevotionalsSheetVisible);
  const hideDevotionalsSheet = useUIStore((state) => state.hideDevotionalsSheet);

  // State for saved devotionals
  const [savedDevotionals, setSavedDevotionals] = useState<Devotional[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user and devotional store
  const currentUser = useUserStore.getState();
  const { setCustomDevotional } = useDevotionalStore();

  // Fetch saved devotionals when sheet becomes visible
  useEffect(() => {
    if (isDevotionalsSheetVisible && currentUser?.id) {
      fetchSavedDevotionals();
      // Ensure the sheet expands to full height
      setTimeout(() => {
        bottomSheetRef.current?.expand();
      }, 100);
    }
  }, [isDevotionalsSheetVisible, currentUser?.id]);

  const fetchSavedDevotionals = async () => {
    if (!currentUser?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch saved devotionals for the current user
      const savedDevotionalsRef = firestore().collection('savedDevotionals');
      const snapshot = await savedDevotionalsRef
        .where('userId', '==', currentUser.id)
        .get();

      const devotionals: Devotional[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Devotional & { savedAt: string; originalCollection: string; originalId: string };
        devotionals.push({
          ...data,
          id: data.originalId || doc.id, // Use original ID for consistency
        });
      });

      // Sort by savedAt in descending order (newest first)
      devotionals.sort((a, b) => {
        const dateA = new Date((a as any).savedAt || a.createdAt).getTime();
        const dateB = new Date((b as any).savedAt || b.createdAt).getTime();
        return dateB - dateA;
      });

      setSavedDevotionals(devotionals);
    } catch (err) {
      console.error('Error fetching saved devotionals:', err);
      setError('Failed to load saved devotionals');
    } finally {
      setIsLoading(false);
    }
  };

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
    bottomSheetRef.current?.snapToIndex(0);
    hapticMedium();
  }, []);

  // Handle start devotional
  const handleStartDevotional = useCallback((devotional: Devotional) => {
    hapticLight();
    setCustomDevotional(devotional);
    hideDevotionalsSheet();
    router.replace('/(tabs)');
  }, [setCustomDevotional, hideDevotionalsSheet]);

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

  const renderDevotional = ({ item }: { item: Devotional }) => (
    <SavedDevotionalCard
      devotional={item}
      onStartDevotional={() => handleStartDevotional(item)}
      onRefresh={fetchSavedDevotionals}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="heart" size={48} color="#795323" style={{ opacity: 0.3 }} />
      <Text style={styles.emptyStateTitle}>No Saved Devotionals</Text>
      <Text style={styles.emptyStateText}>
        Like devotionals to see them here
      </Text>
    </View>
  );

  return (
    <>
      {isDevotionalsSheetVisible ? (
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
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
          <BottomSheetScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text className="text-2xl font-feather text-textPrimary ml-1">Saved Devotionals</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={24} color="#795323" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#795323" />
                  <Text style={styles.loadingText}>Loading saved devotionals...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={fetchSavedDevotionals} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : savedDevotionals.length === 0 ? (
                renderEmptyState()
              ) : (
                <FlatList
                  scrollEnabled={false}
                  data={savedDevotionals}
                  renderItem={renderDevotional}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContainer}
                />
              )}
            </View>
          </BottomSheetScrollView>
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

  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#795323',
    marginTop: 12,
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#795323',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#795323',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#FFF4DC',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Feather',
    color: '#795323',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#795323',
    opacity: 0.6,
    textAlign: 'center',
  },
});

export default GlobalDevotionalsSheet;