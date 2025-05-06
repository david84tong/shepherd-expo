import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BIBLE_BOOK_IDS, BIBLE_CHAPTER_COUNTS } from '../app/models/Path';
import { useUIStore } from '../app/stores/uiStore';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * GlobalBookChapterSelectorSheet is a singleton component rendered at root level
 * and controlled via uiStore. Ensures it's rendered above tab bar.
 */
const GlobalBookChapterSelectorSheet: React.FC = () => {
  // Access uiStore to control visibility
  const isBookChapterSelectorVisible = useUIStore(state => state.isBookChapterSelectorVisible);
  const bookChapterSelectorParams = useUIStore(state => state.bookChapterSelectorParams);
  const hideBookChapterSelector = useUIStore(state => state.hideBookChapterSelector);

  // Local state
  const [selectedBookId, setSelectedBookId] = useState<number>(bookChapterSelectorParams.initialBookId || 1);
  
  // Ref for the bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [selectedBookId, bookChapterSelectorParams.onSelect]);
  
  // Handle select book
  const handleSelectBook = useCallback((bookId: number) => {
    setSelectedBookId(bookId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);
  
  // Close handler
  const handleClose = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  // Handle sheet changes
  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      // Sheet is closed - reset state
      hideBookChapterSelector();
    }
  }, [hideBookChapterSelector]);
  
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
    bottomSheetRef.current?.expand();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['70%']}
      enablePanDownToClose={true}
      onChange={handleSheetChange}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={renderBackdrop}
    >
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
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Book</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 15 }}
            >
              {bookList.map(book => (
                <TouchableOpacity 
                  key={book.id}
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
            </ScrollView>
          </View>

          {/* Chapter Grid */}
          <View style={[styles.listContainer, { flex: 1 }]}>
            <Text style={styles.listTitle}>Chapter</Text>
            <ScrollView contentContainerStyle={styles.chapterGrid}>
              {availableChapters.map(chapter => (
                <TouchableOpacity 
                  key={chapter}
                  style={[
                    styles.chapterItem,
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
    paddingTop: 10,
  },
  listContainer: {
    marginBottom: 15,
  },
  listTitle: {
    fontSize: 14,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#B89B4C', // description
    marginBottom: 8,
    marginLeft: 20,
    textTransform: 'uppercase',
  },
  bookItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    backgroundColor: '#F9F3E5', // secondary-button-bg (or similar light cream)
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E2C7', // pillBorder
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
    paddingBottom: 20,
  },
  chapterItem: {
    width: 55, // Adjust size as needed
    height: 55,
    borderRadius: 27.5, // Make it circular
    backgroundColor: '#F9F3E5',
    borderWidth: 1,
    borderColor: '#E9E2C7',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 9,
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
