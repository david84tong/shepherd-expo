import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { BIBLE_BOOK_IDS, BIBLE_CHAPTER_COUNTS } from '../app/models/Path';
import { useUIStore } from '../app/stores/uiStore';
import { usePathStore } from '../app/stores/pathStore';
import { hapticLight, hapticMedium } from '~/utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Cache for chapter data
const chapterCache = new Map<string, any>();

/**
 * GlobalBookChapterSelectorSheet is a singleton component rendered at root level
 * and controlled via uiStore. Ensures it's rendered above tab bar.
 */
const GlobalBookChapterSelectorSheet: React.FC = () => {
  // Access uiStore to control visibility
  const isBookChapterSelectorVisible = useUIStore((state) => state.isBookChapterSelectorVisible);
  const bookChapterSelectorParams = useUIStore((state) => state.bookChapterSelectorParams);
  const hideBookChapterSelector = useUIStore((state) => state.hideBookChapterSelector);

  // Access pathStore to save selected chapter
  const setSavedReading = usePathStore((state) => state.setSavedReading);

  // Local state - initialize with defaults but will be updated when sheet opens
  const [selectedBookId, setSelectedBookId] = useState<number>(1);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [isSelecting, setIsSelecting] = useState(false);

  // Ref for the bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { width: WINDOW_WIDTH } = useWindowDimensions();

  // Calculate the optimal item size and number of columns
  const GRID_SPACING = 8;
  const NUM_COLUMNS = 5; // We want 5 items per row
  const itemSize = useMemo(() => {
    const availableWidth = WINDOW_WIDTH - 30; // 30 for horizontal padding (15 each side)
    const totalSpacing = GRID_SPACING * (NUM_COLUMNS - 1);
    return (availableWidth - totalSpacing) / NUM_COLUMNS;
  }, [WINDOW_WIDTH]);

  // Reverse mapping for book names
  const bookNames = useMemo(
    () => Object.fromEntries(Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => [id, name])),
    []
  );

  const bookList = useMemo(
    () => Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => ({ id: Number(id), name })),
    []
  );

  // Filter chapter counts based on the selected book
  const availableChapters = useMemo(() => {
    const count = BIBLE_CHAPTER_COUNTS[selectedBookId] || 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedBookId]);

  // Simple effect: when sheet becomes visible, update state with current params
  useEffect(() => {
    if (isBookChapterSelectorVisible) {
      const bookId = bookChapterSelectorParams.initialBookId || 1;
      const chapter = bookChapterSelectorParams.initialChapter || 1;

      console.log(
        `📖 [GlobalBookChapterSelector] Sheet opened with bookId: ${bookId}, chapter: ${chapter}`
      );

      setSelectedBookId(bookId);
      setSelectedChapter(chapter);

      bottomSheetRef.current?.snapToIndex(0);
      hapticMedium();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [
    isBookChapterSelectorVisible,
    bookChapterSelectorParams.initialBookId,
    bookChapterSelectorParams.initialChapter,
  ]);

  // Handle select chapter with debouncing and caching
  const handleSelectChapter = useCallback(
    async (chapter: number) => {
      if (isSelecting) return; // Prevent multiple selections

      setIsSelecting(true);
      console.log(
        `📖 [GlobalBookChapterSelector] Selected chapter: ${chapter} for book: ${selectedBookId}`
      );

      try {
        // Save to pathStore as the last read chapter/verse
        const bookName = bookNames[selectedBookId] || 'Unknown';
        setSavedReading(bookName, selectedBookId, chapter);
        console.log(
          `💾 [GlobalBookChapterSelector] Saved to pathStore: ${bookName} (${selectedBookId}) Chapter ${chapter}`
        );

        if (bookChapterSelectorParams.onSelect) {
          await bookChapterSelectorParams.onSelect(selectedBookId, chapter);
        }

        bottomSheetRef.current?.close();
        hapticLight();
      } finally {
        setIsSelecting(false);
      }
    },
    [selectedBookId, bookChapterSelectorParams.onSelect, bookNames, setSavedReading]
  );

  // Handle select book with optimization
  const handleSelectBook = useCallback(
    (bookId: number) => {
      if (bookId === selectedBookId || isSelecting) return; // Prevent unnecessary updates

      console.log(`📖 [GlobalBookChapterSelector] Selected book: ${bookId}`);
      setSelectedBookId(bookId);
      setSelectedChapter(1); // Reset to chapter 1 when switching books
      hapticLight();
    },
    [selectedBookId, isSelecting]
  );

  // Close handler
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  const bookScrollViewRef = useRef<ScrollView>(null);
  const bookItemRefs = useRef<{ [key: number]: View | null }>({});

  // Function to scroll to selected book
  const scrollToSelectedBook = useCallback(() => {
    if (!bookScrollViewRef.current || !bookItemRefs.current[selectedBookId]) return;

    bookItemRefs.current[selectedBookId]?.measureLayout(
      // @ts-ignore - Known React Native typing issue
      bookScrollViewRef.current,
      (x: number) => {
        bookScrollViewRef.current?.scrollTo({
          x: x - WINDOW_WIDTH / 2 + 100, // Center the item, 100 is approximate half item width
          animated: true,
        });
      },
      () => { } // Error callback - empty
    );
  }, [selectedBookId, WINDOW_WIDTH]);

  // Scroll to selected book when sheet opens and state is set
  useEffect(() => {
    if (isBookChapterSelectorVisible && selectedBookId > 1) {
      // Small delay to ensure layout is complete
      setTimeout(scrollToSelectedBook, 200);
    }
  }, [isBookChapterSelectorVisible, selectedBookId, scrollToSelectedBook]);

  // Debug logging
  console.log(
    `📖 [GlobalBookChapterSelector] Rendering - selectedBookId: ${selectedBookId}, selectedChapter: ${selectedChapter}`
  );

  return isBookChapterSelectorVisible ? (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={['70%']}
      enablePanDownToClose={true}
      enableOverDrag={false}
      onClose={hideBookChapterSelector}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}
      enableContentPanningGesture={false}>
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Book & Chapter</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.mainContent}>
          {/* Book List */}
          <View style={styles.bookSection}>
            <Text style={styles.listTitle}>Book</Text>
            <ScrollView
              ref={bookScrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 15 }}>
              <View style={styles.bookRowsContainer}>
                <View style={styles.bookRow}>
                  {bookList.slice(0, Math.ceil(bookList.length / 2)).map((book) => (
                    <TouchableOpacity
                      key={book.id}
                      ref={(ref) => (bookItemRefs.current[book.id] = ref)}
                      style={[
                        styles.bookItem,
                        selectedBookId === book.id && styles.selectedBookItem,
                      ]}
                      onPress={() => handleSelectBook(book.id)}>
                      <Text
                        style={[
                          styles.bookItemText,
                          selectedBookId === book.id && styles.selectedBookItemText,
                        ]}>
                        {book.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.bookRow}>
                  {bookList.slice(Math.ceil(bookList.length / 2)).map((book) => (
                    <TouchableOpacity
                      key={book.id}
                      ref={(ref) => (bookItemRefs.current[book.id] = ref)}
                      style={[
                        styles.bookItem,
                        selectedBookId === book.id && styles.selectedBookItem,
                      ]}
                      onPress={() => handleSelectBook(book.id)}>
                      <Text
                        style={[
                          styles.bookItemText,
                          selectedBookId === book.id && styles.selectedBookItemText,
                        ]}>
                        {book.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Chapter Grid */}
          <View style={styles.chapterSection}>
            <Text style={styles.listTitle}>Chapter</Text>
            <View style={styles.chapterScrollContainer}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={[styles.chapterGrid, { gap: GRID_SPACING }]}>
                {availableChapters.map((chapter) => (
                  <TouchableOpacity
                    key={chapter}
                    style={[
                      styles.chapterItem,
                      { width: itemSize, height: itemSize },
                      chapter === selectedChapter && styles.selectedChapterItem,
                    ]}
                    onPress={() => handleSelectChapter(chapter)}>
                    <Text
                      style={[
                        styles.chapterItemText,
                        chapter === selectedChapter && styles.selectedChapterItemText,
                      ]}>
                      {chapter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  ) : null;
};

const styles = StyleSheet.create({
  bookItem: {
    backgroundColor: '#F9F3E5',
    borderColor: '#E9E2C7',
    borderRadius: 15,
    borderWidth: 1,
    marginHorizontal: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  bookItemText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 15, // textPrimary
  },
  bookRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bookRowsContainer: {
    flexDirection: 'column',
  },
  bookSection: {
    height: 120,
    paddingTop: 10,
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 300,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  chapterItem: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: '#F9F3E5',
    borderColor: '#E9E2C7',
    borderRadius: 100,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chapterItemText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  chapterScrollContainer: {
    flex: 1,
  },
  chapterSection: {
    flex: 1,
    paddingTop: 10,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#F7B500', // darkYellow
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    height: 4,
    width: 40,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#FFE4A8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15, // buttonBorder
  },
  headerTitle: {
    color: '#3C584A',
    fontFamily: 'Nunito-Black',
    fontSize: 18, // textPrimary
  },
  listTitle: {
    fontSize: 14,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#B89B4C', // description
    marginBottom: 8,
    marginLeft: 20,
    textTransform: 'uppercase',
  },
  mainContent: {
    flex: 1,
  },
  selectedBookItem: {
    backgroundColor: '#FFE4A8', // buttonBorder
    borderColor: '#F7B500', // darkYellow
  },
  selectedBookItemText: {
    fontWeight: '600',
  },
  selectedChapterItem: {
    backgroundColor: '#F7B500', // darkYellow
    borderColor: '#F7B500',
  },
  selectedChapterItemText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

export default GlobalBookChapterSelectorSheet;
