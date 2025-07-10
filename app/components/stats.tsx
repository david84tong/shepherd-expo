import dayjs from 'dayjs';
import { useCallback, useState, useEffect, useRef } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Modal,
  StatusBar,
} from 'react-native';
import { useUIStore } from '../stores/uiStore';
import { useUserStore } from '../stores/userStore';
import useHighlightStore, { VerseHighlight, HIGHLIGHT_COLORS } from '../stores/highlightStore';
import useNoteStore, { VerseNote } from '../stores/noteStore';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { fetchChapter } from '../api/bible';

import { Prayer, Reading, Reflection } from '../models/User';
import i18n from '../utils/i18n';
import journalIcon from '../../assets/icons/journalIcon.png';
import { hapticLight } from '~/utils/haptics';

// Bible book names mapping
const BIBLE_BOOK_NAMES: { [bookId: number]: string } = {
  1: 'Genesis',
  2: 'Exodus',
  3: 'Leviticus',
  4: 'Numbers',
  5: 'Deuteronomy',
  6: 'Joshua',
  7: 'Judges',
  8: 'Ruth',
  9: '1 Samuel',
  10: '2 Samuel',
  11: '1 Kings',
  12: '2 Kings',
  13: '1 Chronicles',
  14: '2 Chronicles',
  15: 'Ezra',
  16: 'Nehemiah',
  17: 'Esther',
  18: 'Job',
  19: 'Psalms',
  20: 'Proverbs',
  21: 'Ecclesiastes',
  22: 'Song of Solomon',
  23: 'Isaiah',
  24: 'Jeremiah',
  25: 'Lamentations',
  26: 'Ezekiel',
  27: 'Daniel',
  28: 'Hosea',
  29: 'Joel',
  30: 'Amos',
  31: 'Obadiah',
  32: 'Jonah',
  33: 'Micah',
  34: 'Nahum',
  35: 'Habakkuk',
  36: 'Zephaniah',
  37: 'Haggai',
  38: 'Zechariah',
  39: 'Malachi',
  40: 'Matthew',
  41: 'Mark',
  42: 'Luke',
  43: 'John',
  44: 'Acts',
  45: 'Romans',
  46: '1 Corinthians',
  47: '2 Corinthians',
  48: 'Galatians',
  49: 'Ephesians',
  50: 'Philippians',
  51: 'Colossians',
  52: '1 Thessalonians',
  53: '2 Thessalonians',
  54: '1 Timothy',
  55: '2 Timothy',
  56: 'Titus',
  57: 'Philemon',
  58: 'Hebrews',
  59: 'James',
  60: '1 Peter',
  61: '2 Peter',
  62: '1 John',
  63: '2 John',
  64: '3 John',
  65: 'Jude',
  66: 'Revelation',
};

// Content type for the dropdown
type ContentType = 'reflections' | 'highlights' | 'notes';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const COLORS: Record<number, string> = {
  3: 'bg-accentGold', // yellow instead of green
  2: 'bg-accentGold/80', // lighter yellow
  1: 'bg-accentGold/60', // even lighter yellow
  0: 'bg-pillBorder', // gray (using pillBorder color from config)
};

type DayMap = { [date: string]: { reading: boolean; prayer: boolean; reflection: boolean } };

function toDateSafe(ts: any): Date {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
  if (ts._seconds !== undefined) return new Date(ts._seconds * 1000);
  return new Date(ts);
}

// Function to format relative time (30m ago, 2d ago, etc.)
function formatRelativeTime(timestamp: any): string {
  try {
    const date = toDateSafe(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // Less than a minute
    if (diffMs < 60000) {
      return 'just now';
    }

    // Minutes
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    // Hours
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Days
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays}d ago`;
    }

    // Months
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths}mo ago`;
    }

    // Years
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears}y ago`;
  } catch (error) {
    console.log('Error formatting relative time:', error, timestamp);
    return '';
  }
}

// function getWeekData(
//   readings: Reading[],
//   prayers: Prayer[],
//   reflections: Reflection[],
//   numberOfDays: number = 28 // Default to 28 days (4 weeks)
// ): { date: string; reading: boolean; prayer: boolean; reflection: boolean }[] {
//   // Build a map: { 'YYYY-MM-DD': {reading:bool, prayer:bool, reflection:bool} }
//   const map: DayMap = {};
//   readings.forEach((r: Reading) => {
//     const d = dayjs(toDateSafe(r.date)).format('YYYY-MM-DD');
//     if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
//     map[d].reading = true;
//   });
//   prayers.forEach((p: Prayer) => {
//     const d = dayjs(toDateSafe(p.date)).format('YYYY-MM-DD');
//     if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
//     map[d].prayer = true;
//   });
//   reflections.forEach((rf: Reflection) => {
//     const d = dayjs(toDateSafe(rf.date)).format('YYYY-MM-DD');
//     if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
//     map[d].reflection = true;
//   });
//   // Get last N days
//   const today = dayjs();
//   const days = [];
//   // Loop from numberOfDays - 1 down to 0 to get the days in correct order
//   for (let i = numberOfDays - 1; i >= 0; i--) {
//     const d = today.subtract(i, 'day').format('YYYY-MM-DD');
//     days.push({
//       date: d,
//       ...(map[d] || { reading: false, prayer: false, reflection: false }),
//     });
//   }
//   return days;
// }

function getMonthGrid(
  readings: Reading[],
  prayers: Prayer[],
  reflections: Reflection[],
  year: number,
  month: number // 0-indexed for JS Date
) {
  // Build a map: { 'YYYY-MM-DD': {reading:bool, prayer:bool, reflection:bool} }
  const map: DayMap = {};
  readings.forEach((r: Reading) => {
    const d = dayjs(toDateSafe(r.date)).format('YYYY-MM-DD');
    if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
    map[d].reading = true;
  });
  prayers.forEach((p: Prayer) => {
    const d = dayjs(toDateSafe(p.date)).format('YYYY-MM-DD');
    if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
    map[d].prayer = true;
  });
  reflections.forEach((rf: Reflection) => {
    const d = dayjs(toDateSafe(rf.date)).format('YYYY-MM-DD');
    if (!map[d]) map[d] = { reading: false, prayer: false, reflection: false };
    map[d].reflection = true;
  });

  // Get first and last day of the month
  const firstDay = dayjs(new Date(year, month, 1));
  const lastDay = firstDay.endOf('month');
  const daysInMonth = lastDay.date();
  const firstWeekday = firstDay.day(); // 0=Sun, 6=Sat

  // Build grid: array of weeks, each week is array of 7 days (or null for empty)
  const grid = [];
  let week = [];
  let dayCounter = 1;

  // Fill first week with nulls until first day
  for (let i = 0; i < firstWeekday; i++) {
    week.push(null);
  }
  // Fill the rest of the first week
  for (let i = firstWeekday; i < 7; i++) {
    if (dayCounter <= daysInMonth) {
      const d = dayjs(new Date(year, month, dayCounter)).format('YYYY-MM-DD');
      week.push({
        date: d,
        ...(map[d] || { reading: false, prayer: false, reflection: false }),
      });
      dayCounter++;
    }
  }
  grid.push(week);

  // Fill remaining weeks
  while (dayCounter <= daysInMonth) {
    week = [];
    for (let i = 0; i < 7; i++) {
      if (dayCounter <= daysInMonth) {
        const d = dayjs(new Date(year, month, dayCounter)).format('YYYY-MM-DD');
        week.push({
          date: d,
          ...(map[d] || { reading: false, prayer: false, reflection: false }),
        });
        dayCounter++;
      } else {
        week.push(null);
      }
    }
    grid.push(week);
  }
  return grid;
}

// Function to handle haptic feedback
const triggerHaptic = () => {
  hapticLight();
};

interface StatsScreenProps {
  onClose?: () => void;
}

export default function StatsScreen({ onClose }: StatsScreenProps = {}) {
  const readings = useUserStore((s) => s.getCompletedReadings());
  const prayers = useUserStore((s) => s.getCompletedPrayers());
  const reflections = useUserStore((s) => s.getCompletedReflections());

  // Get the showOldReflectionSheet function directly from uiStore
  const showOldReflectionSheet = useUIStore((state) => state.showOldReflectionSheet);

  // Highlight and note store hooks
  const highlights = useHighlightStore((state) => state.highlights);
  const notes = useNoteStore((state) => state.notes);
  const loadHighlights = useHighlightStore((state) => state.loadHighlights);
  const loadNotes = useNoteStore((state) => state.loadNotes);

  // State for dropdown
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('reflections');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // State for verse detail modal
  const [isVerseModalVisible, setIsVerseModalVisible] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<{
    bookName: string;
    chapter: number;
    verse: number;
    type: 'highlight' | 'note';
    highlight?: VerseHighlight;
    note?: VerseNote;
  } | null>(null);
  const [verseText, setVerseText] = useState<string>('');
  const [loadingVerse, setLoadingVerse] = useState(false);

  // Ref for the dropdown button
  const dropdownButtonRef = useRef<View>(null);

  // Load highlights and notes on component mount
  useEffect(() => {
    loadHighlights();
    loadNotes();
  }, [loadHighlights, loadNotes]);

  // Fetch verse text when selectedVerse changes
  useEffect(() => {
    if (selectedVerse && isVerseModalVisible) {
      fetchVerseText(selectedVerse.bookName, selectedVerse.chapter, selectedVerse.verse);
    }
  }, [selectedVerse, isVerseModalVisible]);

  // Function to fetch verse text
  const fetchVerseText = async (bookName: string, chapter: number, verseNumber: number) => {
    setLoadingVerse(true);
    try {
      // Find the book ID from the book name
      const bookId = Object.entries(BIBLE_BOOK_NAMES).find(([_, name]) => name === bookName)?.[0];
      if (!bookId) {
        setVerseText('Verse not found');
        return;
      }

      const response = await fetchChapter('ESV', parseInt(bookId), chapter);
      if ('error' in response) {
        setVerseText('Error loading verse');
      } else {
        const verse = response.verses.find((v) => v.verse === verseNumber);
        setVerseText(verse?.text || 'Verse not found');
      }
    } catch (error) {
      console.error('Error fetching verse:', error);
      setVerseText('Error loading verse');
    } finally {
      setLoadingVerse(false);
    }
  };

  // Total activity counts
  const totalBibleReadings = readings.length;
  const totalPrayerSessions = prayers.length;
  const totalReflections = reflections.length;

  // Get current year and month
  const now = dayjs();
  const year = now.year();
  const month = now.month(); // 0-indexed
  const monthGrid = getMonthGrid(readings, prayers, reflections, year, month);

  // Recent reflections (sorted desc)
  const recentReflections = [...reflections]
    .sort((a, b) => toDateSafe(b.date).getTime() - toDateSafe(a.date).getTime())
    .slice(0, 3);

  // Handle month selection with haptic feedback
  const handleMonthPress = useCallback(() => {
    // Provide light haptic feedback
    hapticLight();

    // Month selection logic would go here
    console.log('Month selector pressed');
    // For now, this is just a visual element without actual month selection
  }, []);

  // Function to handle tapping on a reflection
  const handleReflectionPress = useCallback(
    (reflection: Reflection) => {
      console.log('Reflection tapped:', reflection);

      // Provide haptic feedback
      hapticLight();

      // First try using the local reference to the function
      if (showOldReflectionSheet) {
        console.log('Using direct UIStore reference to show sheet');
        showOldReflectionSheet(reflection);
      }
      // Fallback to global object if needed
      else if (typeof global !== 'undefined' && (global as any).showOldReflectionSheet) {
        console.log('Using global reference to show sheet');
        (global as any).showOldReflectionSheet(reflection);
      }
      // Final fallback to alert
      else {
        console.log('showOldReflectionSheet is not available');
        Alert.alert('Reflection Detail', reflection.content || 'No content.');
      }
    },
    [showOldReflectionSheet]
  );

  // Handle opening a reflection
  const handleOpenReflection = (reflection: Reflection) => {
    triggerHaptic();
    showOldReflectionSheet(reflection);
  };

  // Handle activity card press
  const handleActivityCardPress = () => {
    triggerHaptic();
    // Could navigate to detailed view or expand card in future
  };

  // Get recent highlights (sorted by timestamp)
  const getRecentHighlights = () => {
    return Object.values(highlights)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

  // Get recent notes (sorted by timestamp)
  const getRecentNotes = () => {
    return Object.values(notes)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: number): string => {
    return formatRelativeTime({ seconds: timestamp / 1000 });
  };

  // Handle dropdown toggle
  const handleDropdownToggle = () => {
    triggerHaptic();

    if (!isDropdownOpen && dropdownButtonRef.current) {
      // Measure the button position
      dropdownButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setDropdownPosition({
          top: pageY + height + 8, // 8px below the button
          right: 24, // 24px from right edge (matching the container padding)
        });
        setIsDropdownOpen(true);
      });
    } else {
      setIsDropdownOpen(false);
    }
  };

  // Handle content type selection
  const handleContentTypeSelect = (type: ContentType) => {
    triggerHaptic();
    setSelectedContentType(type);
    setIsDropdownOpen(false);
  };

  // Handle opening verse highlight modal
  const handleHighlightPress = (highlight: VerseHighlight) => {
    triggerHaptic();
    setSelectedVerse({
      bookName: BIBLE_BOOK_NAMES[highlight.bookId],
      chapter: highlight.chapter,
      verse: highlight.verse,
      type: 'highlight',
      highlight,
    });
    setIsVerseModalVisible(true);
  };

  // Handle opening verse note modal
  const handleNotePress = (note: VerseNote) => {
    triggerHaptic();
    setSelectedVerse({
      bookName: BIBLE_BOOK_NAMES[note.bookId],
      chapter: note.chapter,
      verse: note.verse,
      type: 'note',
      note,
    });
    setIsVerseModalVisible(true);
  };

  // Handle closing verse modal
  const handleCloseVerseModal = () => {
    setIsVerseModalVisible(false);
    setSelectedVerse(null);
  };

  // Render content based on selected type
  const renderSelectedContent = () => {
    let recentHighlights = [], recentNotes = [];
    switch (selectedContentType) {
      case 'highlights':
        recentHighlights = getRecentHighlights();
        return recentHighlights.length > 0 ? (
          <View className="space-y-4">
            {recentHighlights.map((highlight, i) => (
              <TouchableOpacity
                key={highlight.id}
                className="bg-surfaceCream rounded-xl p-4 my-2"
                onPress={() => handleHighlightPress(highlight)}
                activeOpacity={0.7}>
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: HIGHLIGHT_COLORS[highlight.colorKey] }}>
                    <Feather name="edit-2" size={16} color="#3C584A" />
                  </View>
                  <View className="flex-1 flex-row justify-between items-center">
                    <View className="flex-1 mr-2">
                      <Text className="font-feather text-body text-textPrimary" numberOfLines={1}>
                        {BIBLE_BOOK_NAMES[highlight.bookId]} {highlight.chapter}:{highlight.verse}
                      </Text>
                      <Text className="font-din text-sm text-description mt-1">
                        {i18n.t('highlighted_verse')}
                      </Text>
                    </View>
                    <Text className="font-din text-description text-sm ml-2">
                      {formatTimestamp(highlight.timestamp)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="bg-surfaceCreamLight/70 rounded-xl p-5 flex items-center justify-center">
            <Feather
              name="edit-2"
              size={48}
              color="#3C584A"
              style={{ opacity: 0.5, marginBottom: 12 }}
            />
            <Text className="font-feather text-heading text-textPrimary/70 text-center">
              {i18n.t('no_highlights_yet')}
            </Text>
            <Text className="font-din text-body text-description text-center mt-1">
              {i18n.t('highlight_verses_hint')}
            </Text>
          </View>
        );

      case 'notes':
        recentNotes = getRecentNotes();
        return recentNotes.length > 0 ? (
          <View className="space-y-4">
            {recentNotes.map((note, i) => (
              <TouchableOpacity
                key={note.id}
                className="bg-surfaceCream rounded-xl p-4 my-2"
                onPress={() => handleNotePress(note)}
                activeOpacity={0.7}>
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-surfaceCream items-center justify-center mr-4">
                    <Feather name="edit-3" size={16} color="#3C584A" />
                  </View>
                  <View className="flex-1 flex-row justify-between items-center">
                    <View className="flex-1 mr-2">
                      <Text className="font-feather text-body text-textPrimary" numberOfLines={1}>
                        {BIBLE_BOOK_NAMES[note.bookId]} {note.chapter}:{note.verse}
                      </Text>
                      <Text
                        className="font-din text-sm text-description mt-1"
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {note.content}
                      </Text>
                    </View>
                    <Text className="font-din text-description text-sm ml-2">
                      {formatTimestamp(note.timestamp)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="bg-surfaceCreamLight/70 rounded-xl p-5 flex items-center justify-center">
            <Feather
              name="edit-3"
              size={48}
              color="#3C584A"
              style={{ opacity: 0.5, marginBottom: 12 }}
            />
            <Text className="font-feather text-heading text-textPrimary/70 text-center">
              {i18n.t('no_notes_yet')}
            </Text>
            <Text className="font-din text-body text-description text-center mt-1">
              {i18n.t('add_notes_hint')}
            </Text>
          </View>
        );

      case 'reflections':
      default:
        return recentReflections.length > 0 ? (
          <View className="space-y-4">
            {recentReflections.map((rf, i) => (
              <TouchableOpacity
                key={i}
                className="bg-surfaceCream rounded-xl p-4 my-2"
                onPress={() => handleReflectionPress(rf)}
                activeOpacity={0.7}>
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-surfaceCream items-center justify-center mr-4">
                    <Image source={journalIcon} className="w-12 h-12" />
                  </View>
                  <View className="flex-1 flex-row justify-between items-center">
                    <View className="flex-1 mr-2">
                      {rf.reflectionPrompt && (
                        <Text className="font-feather text-body text-textPrimary" numberOfLines={2}>
                          {rf.reflectionPrompt}
                        </Text>
                      )}
                      {rf.content && (
                        <Text
                          className="font-din text-sm text-description mt-1"
                          numberOfLines={1}
                          ellipsizeMode="tail">
                          {rf.content}
                        </Text>
                      )}
                    </View>
                    <Text className="font-din text-description text-sm ml-2">
                      {formatRelativeTime(rf.date)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="bg-surfaceCreamLight/70 rounded-xl p-5 flex items-center justify-center">
            <Image source={journalIcon} className="w-24 h-24 opacity-50 mb-3" />
            <Text className="font-feather text-heading text-textPrimary/70 text-center">
              {i18n.t('no_recent_reflections')}
            </Text>
            <Text className="font-din text-body text-description text-center mt-1">
              {i18n.t('reflect_hint')}
            </Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDEBB8' }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
        <ScrollView
          className="flex-1 bg-surfaceCream"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-8 pb-4 relative">
            <Text className="font-feather text-h2 text-textPrimary">{i18n.t('stats_title')}</Text>

            {/* Close button - right */}
            {onClose && (
              <View className="w-24 flex justify-end items-end pr-4">
                <TouchableOpacity
                  className="w-10 h-10 bg-black/30 rounded-full items-center justify-center z-10"
                  onPress={() => {
                    hapticLight();
                    onClose();
                  }}
                  activeOpacity={0.7}>
                  <FontAwesome name="times" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Heatmap Card */}
          <View className="mx-6 mt-4 bg-surfaceCreamLight rounded-[20px] p-6 shadow-card shadow-lg  border border-brownBorder">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-feather text-heading text-textPrimary ">{i18n.t('monthly_activity')}</Text>
              <TouchableOpacity
                className="bg-lightYellow px-4 py-1 rounded-full"
                onPress={handleMonthPress}
                activeOpacity={0.7}>
                <Text className="font-feather text-accentGold">{now.format('MMMM YYYY')}</Text>
              </TouchableOpacity>
            </View>

            {/* Day headers with proper spacing */}
            <View className="flex-row justify-between mb-2">
              {DAYS.map((d) => (
                <Text key={d} className="text-caption font-din text-description w-8 text-center">
                  {d}
                </Text>
              ))}
            </View>

            {/* Month grid */}
            {monthGrid.map((week, weekIdx) => (
              <View key={weekIdx} className="flex-row justify-between mt-2">
                {week.map((day, dayIdx) => {
                  if (!day)
                    return <View key={dayIdx} className="w-8 h-8 rounded-md bg-transparent" />;
                  const count = [day.reading, day.prayer, day.reflection].filter(Boolean).length;
                  return (
                    <TouchableOpacity
                      key={day.date}
                      className={`w-8 h-8 rounded-md ${COLORS[count]}`}
                      activeOpacity={0.8}
                      onPress={() => {
                        // Provide light haptic feedback
                        hapticLight();

                        // In the future, this could show detail for the specific day
                        console.log('Day pressed:', day.date);
                      }}
                    />
                  );
                })}
              </View>
            ))}

            <View className="flex-row justify-end mt-4">
              <View className="flex-row items-center mr-3">
                <View className="w-3 h-3 rounded-sm bg-pillBorder mr-1" />
                <Text className="font-din text-description text-xs">0</Text>
              </View>
              <View className="flex-row items-center mr-3">
                <View className="w-3 h-3 rounded-sm bg-accentGold/60 mr-1" />
                <Text className="font-din text-description text-xs">1</Text>
              </View>
              <View className="flex-row items-center mr-3">
                <View className="w-3 h-3 rounded-sm bg-accentGold/80 mr-1" />
                <Text className="font-din text-description text-xs">2</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-sm bg-accentGold mr-1" />
                <Text className="font-din text-description text-xs">3</Text>
              </View>
            </View>
          </View>

          {/* Activity Summary Card - Moved to bottom */}
          <View className="mx-6 mt-4 bg-surfaceCreamLight rounded-[20px] p-6 shadow-cardx mt-8 border border-brownBorder">
            <Text className="font-feather text-heading text-textPrimary mb-4 ">
              {i18n.t('activity_summary')}
            </Text>

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="items-center bg-surfaceCream rounded-xl px-3 py-3 flex-1 mx-1 border border-brownBorder"
                activeOpacity={0.8}
                onPress={() => {
                  hapticLight();
                  console.log('Readings summary pressed');
                }}>
                <Text className="font-feather text-h2 text-textPrimary">{totalBibleReadings}</Text>
                <Text className="font-din text-description text-center">{i18n.t('readings')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center bg-surfaceCream rounded-xl px-3 py-3 flex-1 mx-1 border border-brownBorder"
                activeOpacity={0.8}
                onPress={() => {
                  hapticLight();
                  console.log('Prayers summary pressed');
                }}>
                <Text className="font-feather text-h2 text-textPrimary">{totalPrayerSessions}</Text>
                <Text className="font-din text-description text-center">{i18n.t('prayers')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="items-center bg-surfaceCream rounded-xl px-3 py-3 flex-1 mx-1 border border-brownBorder"
                activeOpacity={0.8}
                onPress={() => {
                  hapticLight();
                  console.log('Reflections summary pressed');
                }}>
                <Text className="font-feather text-h2 text-textPrimary">{totalReflections}</Text>
                <Text className="font-din text-description text-center">{i18n.t('reflections')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent reflections */}
          <View className="mx-6 mt-8 bg-surfaceCreamLight rounded-[20px] p-6 shadow-card mb-24 border border-brownBorder">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-feather text-heading text-textPrimary ">{i18n.t('recent_activity')}</Text>

              {/* Dropdown for content type selection */}
              <View className="relative">
                <TouchableOpacity
                  ref={dropdownButtonRef}
                  className="bg-lightYellow px-4 py-2 rounded-full flex-row items-center"
                  onPress={handleDropdownToggle}
                  activeOpacity={0.7}>
                  <Text className="font-feather text-accentGold mr-2 capitalize">
                    {selectedContentType}
                  </Text>
                  <Feather
                    name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#F7B500"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {renderSelectedContent()}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Modal-based dropdown */}
      <Modal
        visible={isDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
          <View className="flex-1">
            <View
              className="absolute bg-surfaceCreamLight rounded-xl shadow-card border border-border min-w-[140px]"
              style={{
                top: dropdownPosition.top,
                right: dropdownPosition.right,
              }}>
              <TouchableOpacity
                className="px-4 py-3 border-b border-border"
                onPress={() => {
                  hapticLight();
                  handleContentTypeSelect('reflections');
                }}
                activeOpacity={0.7}>
                <Text className="font-din text-textPrimary">{i18n.t('reflections')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-3 border-b border-border"
                onPress={() => {
                  hapticLight();
                  handleContentTypeSelect('highlights');
                }}
                activeOpacity={0.7}>
                <Text className="font-din text-textPrimary">{i18n.t('highlights')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-3"
                onPress={() => {
                  hapticLight();
                  handleContentTypeSelect('notes');
                }}
                activeOpacity={0.7}>
                <Text className="font-din text-textPrimary">{i18n.t('notes')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Verse Detail Modal */}
      <Modal
        visible={isVerseModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseVerseModal}>
        <View className="flex-1 justify-center items-center p-6">
          <View className="bg-surfaceCreamLight rounded-[20px] p-6 w-full max-w-sm shadow-card">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="font-feather text-heading text-textPrimary">
                {selectedVerse?.bookName} {selectedVerse?.chapter}:{selectedVerse?.verse}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  handleCloseVerseModal();
                }}
                className="w-8 h-8 rounded-full bg-surfaceCream items-center justify-center"
                activeOpacity={0.7}>
                <Feather name="x" size={16} color="#3C584A" />
              </TouchableOpacity>
            </View>

            {/* Verse Text */}
            <View className="mb-6">
              {loadingVerse ? (
                <View className="py-4 items-center">
                  <Text className="font-din text-description">{i18n.t('loading_verse')}</Text>
                </View>
              ) : (
                <View
                  className="p-4 rounded-xl border-2"
                  style={{
                    backgroundColor:
                      selectedVerse?.type === 'highlight' && selectedVerse.highlight
                        ? HIGHLIGHT_COLORS[selectedVerse.highlight.colorKey]
                        : '#FFF9E6',
                    borderColor:
                      selectedVerse?.type === 'highlight' && selectedVerse.highlight
                        ? HIGHLIGHT_COLORS[selectedVerse.highlight.colorKey]
                        : '#FFE4A8',
                  }}>
                  <Text className="font-din text-textPrimary text-body leading-6">{verseText}</Text>
                </View>
              )}
            </View>

            {/* Highlight/Note Content */}
            {selectedVerse?.type === 'highlight' && selectedVerse.highlight && (
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <View
                    className="w-4 h-4 rounded-full mr-2"
                    style={{ backgroundColor: HIGHLIGHT_COLORS[selectedVerse.highlight.colorKey] }}
                  />
                  <Text className="font-feather text-body text-textPrimary">{i18n.t('highlighted')}</Text>
                </View>
                <Text className="font-din text-description text-sm">
                  {formatTimestamp(selectedVerse.highlight.timestamp)}
                </Text>
              </View>
            )}

            {selectedVerse?.type === 'note' && selectedVerse.note && (
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Feather name="edit-3" size={16} color="#3C584A" style={{ marginRight: 8 }} />
                  <Text className="font-feather text-body text-textPrimary">{i18n.t('note')}</Text>
                </View>
                <View className="bg-surfaceCream rounded-xl p-3 mb-2">
                  <Text className="font-din text-textPrimary text-body leading-5">
                    {selectedVerse.note.content}
                  </Text>
                </View>
                <Text className="font-din text-description text-sm">
                  {formatTimestamp(selectedVerse.note.timestamp)}
                </Text>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                handleCloseVerseModal();
              }}
              className="bg-accentGold rounded-xl py-3 items-center"
              activeOpacity={0.8}>
              <Text className="font-feather text-white text-body">{i18n.t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
