import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable, Dimensions, useWindowDimensions } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BIBLE_BOOK_IDS, BIBLE_CHAPTER_COUNTS } from '../app/models/Path';
import { useUIStore } from '../app/stores/uiStore';
import * as Haptics from 'expo-haptics';
import useTranslation from '../app/hooks/useTranslation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * GlobalBookChapterSelectorSheet is a singleton component rendered at root level
 * and controlled via uiStore. Ensures it's rendered above tab bar.
 */
const GlobalBookChapterSelectorSheet: React.FC = () => {
  const { t } = useTranslation();

  // Access uiStore to control visibility
  const isBookChapterSelectorVisible = useUIStore(state => state.isBookChapterSelectorVisible);
  const bookChapterSelectorParams = useUIStore(state => state.bookChapterSelectorParams);
  const hideBookChapterSelector = useUIStore(state => state.hideBookChapterSelector);

  // Local state
  const [selectedBookId, setSelectedBookId] = useState<number>(bookChapterSelectorParams.initialBookId || 1);

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
  const bookNames = useMemo(() => Object.fromEntries(
    Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => [id, name])
  ), []);

  const bookList = useMemo(() =>
    Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => ({ id: Number(id), name })),
    []);

  // Filter chapter counts based on the selected book
  const availableChapters = useMemo(() => {
    const count = BIBLE_CHAPTER_COUNTS[selectedBookId] || 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedBookId]);

  // Watch for visibility changes and open/close the sheet accordingly
  useEffect(() => {
    if (isBookChapterSelectorVisible) {
      setSelectedBookId(bookChapterSelectorParams.initialBookId || 1);
      showSheet();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isBookChapterSelectorVisible, bookChapterSelectorParams.initialBookId]);

  // Handle select chapter
  const handleSelectChapter = useCallback((chapter: number) => {
    if (bookChapterSelectorParams.onSelect) {
      bookChapterSelectorParams.onSelect(selectedBookId, chapter);
    }
    bottomSheetRef.current?.close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }, [selectedBookId, bookChapterSelectorParams.onSelect]);

  // Handle select book
  const handleSelectBook = useCallback((bookId: number) => {
    setSelectedBookId(bookId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
  }, []);

  // Close handler
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Custom backdrop renderer
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Show the sheet
  const showSheet = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
  }, []);

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
          animated: true
        });
      },
      () => { }, // Error callback - empty
    );
  }, [selectedBookId, WINDOW_WIDTH]);

  // Effect to scroll to selected book when sheet opens
  useEffect(() => {
    if (isBookChapterSelectorVisible) {
      bottomSheetRef.current?.snapToIndex(0);
      // Small delay to ensure layout is complete
      setTimeout(scrollToSelectedBook, 100);
    }
  }, [isBookChapterSelectorVisible, scrollToSelectedBook]);

  // Effect to scroll when book selection changes
  useEffect(() => {
    scrollToSelectedBook();
  }, [selectedBookId, scrollToSelectedBook]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['70%']}
      enablePanDownToClose={true}
      enableOverDrag={false}
      onClose={hideBookChapterSelector}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('bookChapterSelector.title')}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('bookChapterSelector.done')}</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.mainContent}>
          {/* Book List */}
          <View style={styles.bookSection}>
            <Text style={styles.listTitle}>{t('bookChapterSelector.book')}</Text>
            <ScrollView
              ref={bookScrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 15 }}
            >
              <View style={styles.bookRowsContainer}>
                <View style={styles.bookRow}>
                  {bookList.slice(0, Math.ceil(bookList.length / 2)).map(book => (
                    <TouchableOpacity
                      key={book.id}
                      ref={ref => bookItemRefs.current[book.id] = ref}
                      style={[
                        styles.bookItem,
                        selectedBookId === book.id && styles.selectedBookItem
                      ]}
                      onPress={() => handleSelectBook(book.id)}
                    >
                      <Text style={[
                        styles.bookItemText,
                        selectedBookId === book.id && styles.selectedBookItemText
                      ]}>
                        {book.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.bookRow}>
                  {bookList.slice(Math.ceil(bookList.length / 2)).map(book => (
                    <TouchableOpacity
                      key={book.id}
                      ref={ref => bookItemRefs.current[book.id] = ref}
                      style={[
                        styles.bookItem,
                        selectedBookId === book.id && styles.selectedBookItem
                      ]}
                      onPress={() => handleSelectBook(book.id)}
                    >
                      <Text style={[
                        styles.bookItemText,
                        selectedBookId === book.id && styles.selectedBookItemText
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
            <Text style={styles.listTitle}>{t('bookChapterSelector.chapter')}</Text>
            <View style={styles.chapterScrollContainer}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={[
                  styles.chapterGrid,
                  { gap: GRID_SPACING }
                ]}
              >
                {availableChapters.map(chapter => (
                  <TouchableOpacity
                    key={chapter}
                    style={[
                      styles.chapterItem,
                      { width: itemSize, height: itemSize },
                      selectedBookId === bookChapterSelectorParams.initialBookId &&
                      chapter === bookChapterSelectorParams.initialChapter &&
                      styles.selectedChapterItem
                    ]}
                    onPress={() => handleSelectChapter(chapter)}
                  >
                    <Text style={[
                      styles.chapterItemText,
                      selectedBookId === bookChapterSelectorParams.initialBookId &&
                      chapter === bookChapterSelectorParams.initialChapter &&
                      styles.selectedChapterItemText
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
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FFF4D9', // surfaceCream 
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#DCB280',
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4A8', // buttonBorder
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Feather Bold',
    color: '#3C584A', // textPrimary
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
  mainContent: {
    flex: 1,
  },
  bookSection: {
    paddingTop: 10,
    height: 110,
  },
  chapterSection: {
    flex: 1,
    paddingTop: 10,
  },
  chapterScrollContainer: {
    flex: 1,
  },
  listTitle: {
    fontSize: 14,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#B89B4C', // description
    marginBottom: 8,
    marginLeft: 20,
    textTransform: 'uppercase',
  },
  bookRowsContainer: {
    flexDirection: 'column',
  },
  bookRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  bookItem: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    backgroundColor: '#F9F3E5',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E2C7',
  },
  selectedBookItem: {
    backgroundColor: '#FFE4A8', // buttonBorder
    borderColor: '#F7B500', // darkYellow
  },
  bookItemText: {
    fontSize: 15,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#3C584A', // textPrimary
  },
  selectedBookItemText: {
    fontWeight: '600',
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'center',
    paddingBottom: 300
  },
  chapterItem: {
    aspectRatio: 1,
    borderRadius: 100,
    backgroundColor: '#F9F3E5',
    borderWidth: 1,
    borderColor: '#E9E2C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChapterItem: {
    backgroundColor: '#F7B500', // darkYellow
    borderColor: '#F7B500',
  },
  chapterItemText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#3C584A',
  },
  selectedChapterItemText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default GlobalBookChapterSelectorSheet;