import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';

import { BIBLE_BOOK_IDS, BIBLE_CHAPTER_COUNTS } from '../app/models/Path';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT_PERCENT = 0.9; // 60% of screen height
const SHEET_HEIGHT = SCREEN_HEIGHT * SHEET_HEIGHT_PERCENT;

interface BookChapterSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  currentBookId: number;
  currentChapter: number;
  onSelect: (bookId: number, chapter: number) => void;
}

const BookChapterSelectorSheet: React.FC<BookChapterSelectorSheetProps> = ({
  visible,
  onClose,
  currentBookId,
  currentChapter,
  onSelect,
}) => {
  const [selectedBookId, setSelectedBookId] = useState<number>(currentBookId);
  const [isVisible, setIsVisible] = useState<boolean>(visible);
  const sheetAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  // Reverse mapping for book names
  const bookNames: Record<number, string> = useMemo(
    () => Object.fromEntries(Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => [id, name])),
    []
  );

  const bookList = useMemo(
    () => Object.entries(BIBLE_BOOK_IDS).map(([name, id]) => ({ id, name })),
    []
  );

  // Filter chapter counts based on the selected book
  const availableChapters = useMemo(() => {
    const count = BIBLE_CHAPTER_COUNTS[selectedBookId] || 0;
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [selectedBookId]);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      setSelectedBookId(currentBookId); // Reset selection when opening
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (isVisible) {
      Animated.timing(sheetAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false); // Only hide the modal after animation completes
      });
    }
  }, [visible, currentBookId]);

  const handleSelectChapter = (chapter: number) => {
    onSelect(selectedBookId, chapter);
    handleClose();
  };

  const handleSelectBook = (bookId: number) => {
    setSelectedBookId(bookId);
    // Maybe scroll chapter view to top or to current chapter if applicable
  };

  // Handle close with animation
  const handleClose = () => {
    Animated.timing(sheetAnim, {
      toValue: SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      onRequestClose={handleClose}
      animationType="none" // Use custom animation
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Animated.View
          style={[styles.sheetContainer, { transform: [{ translateY: sheetAnim }] }]}
          // Prevent clicks inside the sheet from closing it
          onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Book & Chapter</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {/* Book List */}
            <View style={styles.listContainer}>
              <Text style={styles.listTitle}>Book</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {bookList.map((book) => (
                  <TouchableOpacity
                    key={book.id}
                    style={[styles.bookItem, selectedBookId === book.id && styles.selectedBookItem]}
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
              </ScrollView>
            </View>

            {/* Chapter Grid */}
            <View style={[styles.listContainer, { flex: 1 }]}>
              <Text style={styles.listTitle}>Chapter</Text>
              <ScrollView contentContainerStyle={styles.chapterGrid}>
                {availableChapters.map((chapter) => (
                  <TouchableOpacity
                    key={chapter}
                    style={[
                      styles.chapterItem,
                      selectedBookId === currentBookId &&
                        chapter === currentChapter &&
                        styles.selectedChapterItem,
                    ]}
                    onPress={() => handleSelectChapter(chapter)}>
                    <Text
                      style={[
                        styles.chapterItemText,
                        selectedBookId === currentBookId &&
                          chapter === currentChapter &&
                          styles.selectedChapterItemText,
                      ]}>
                      {chapter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bookItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    backgroundColor: '#F9F3E5', // secondary-button-bg (or similar light cream)
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E9E2C7', // pillBorder
  },
  bookItemText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 15, // textPrimary
  },
  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 20,
    paddingHorizontal: 15,
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
    margin: 6,
  },
  chapterItemText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    color: '#F7B500', // darkYellow (or another accent)
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 10,
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
    fontFamily: 'Feather Bold',
    fontSize: 18, // textPrimary
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
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
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
  sheetContainer: {
    height: SHEET_HEIGHT,
    width: '100%',
    backgroundColor: '#FFF4D9', // surfaceCream
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
});

export default BookChapterSelectorSheet;
