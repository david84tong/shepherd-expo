import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNoteStore } from '~/app/stores/noteStore';
import analytics from '../utils/analytics';
import EmptyModal from './EmptyModal';

interface NoteEditorProps {
  isVisible: boolean;
  bookId: number;
  chapter: number;
  verse: number;
  verseText?: string;
  bookName?: string;
  onClose: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  isVisible,
  bookId,
  chapter,
  verse,
  verseText,
  bookName,
  onClose
}) => {
  // Note store methods
  const getNote = useNoteStore(state => state.getNote);
  const addOrUpdateNote = useNoteStore(state => state.addOrUpdateNote);
  const removeNote = useNoteStore(state => state.removeNote);
  
  // Local state
  const [noteContent, setNoteContent] = useState('');
  const [initialNoteContent, setInitialNoteContent] = useState('');
  const [isEdited, setIsEdited] = useState(false);
  const [localVisible, setLocalVisible] = useState(false);
  
  // Input ref for focusing
  const inputRef = useRef<TextInput>(null);

  // Handle visibility changes
  useEffect(() => {
    if (isVisible) {
      setLocalVisible(true);
    }
  }, [isVisible]);

  // Load existing note when bottom sheet opens
  useEffect(() => {
    if (isVisible) {
      const existingNote = getNote(bookId, chapter, verse);
      const content = existingNote?.content || '';
      setNoteContent(content);
      setInitialNoteContent(content);
      setIsEdited(false);
      
      // Focus the input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isVisible, bookId, chapter, verse, getNote]);

  // Check if content has changed from initial value
  useEffect(() => {
    setIsEdited(noteContent !== initialNoteContent);
  }, [noteContent, initialNoteContent]);

  // Handle close with animation
  const closeWithAnimation = () => {
    setLocalVisible(false);
    
    // Allow animation to complete before calling the parent's onClose
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Handle saving the note
  const handleSave = () => {
    const trimmedContent = noteContent.trim();
    
    if (trimmedContent) {
      // Add or update note
      addOrUpdateNote(bookId, chapter, verse, trimmedContent);
      
      // Provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Log analytics
      analytics.logEvent('BibleReader_Saved_Note', {
        bookId, 
        chapter, 
        verse,
        isNew: !initialNoteContent
      });
    } else if (initialNoteContent) {
      // If note is empty but had content before, remove it
      removeNote(bookId, chapter, verse);
      
      // Log analytics
      analytics.logEvent('BibleReader_Removed_Note', {
        bookId, 
        chapter, 
        verse
      });
    }
    
    // Close the bottom sheet with animation
    closeWithAnimation();
  };

  return (
    <EmptyModal visible={localVisible} onClose={closeWithAnimation}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={80}
      >
        <View style={styles.dragHandle} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Note</Text>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={closeWithAnimation}
          >
            <Feather name="x" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        {/* Verse reference and preview */}
        <View style={styles.verseContainer}>
          <Text style={styles.verseReference}>
            {bookName || 'Bible'} {chapter}:{verse}
          </Text>
          {verseText && (
            <ScrollView style={styles.verseTextScroll}>
              <Text style={styles.verseText}>{verseText}</Text>
            </ScrollView>
          )}
        </View>
        
        {/* Note input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.noteInput}
            value={noteContent}
            onChangeText={setNoteContent}
            multiline
            placeholder="Write your note here..."
            placeholderTextColor="#B89B4C"
            returnKeyType="default"
            blurOnSubmit={false}
            autoCapitalize="sentences"
          />
        </View>
        
        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.saveButton,
              (!isEdited) && styles.disabledButton
            ]} 
            onPress={handleSave}
            disabled={!isEdited}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </EmptyModal>
  );
};

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 30,
  },
  container: {
    padding: 20,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  disabledButton: {
    backgroundColor: '#DCB28077',
  },
  dragHandle: {
    alignSelf: 'center',
    backgroundColor: '#D0D0D0',
    borderRadius: 3,
    height: 6,
    marginBottom: 20,
    marginTop: -10,
    width: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    width: '100%',
  },
  inputContainer: {
    backgroundColor: 'rgba(220, 178, 128, 0.1)',
    borderColor: 'rgba(220, 178, 128, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    height: 160,
    padding: 16,
    width: '100%',
  },
  noteInput: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    height: '100%',
    textAlignVertical: 'top',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#DCB280',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: 'white',
    fontFamily: 'Feather Bold',
    fontSize: 16,
  },
  title: {
    color: '#3C584A',
    fontFamily: 'Feather Bold',
    fontSize: 18,
    textAlign: 'center',
  },
  verseContainer: {
    backgroundColor: 'rgba(220, 178, 128, 0.1)',
    borderColor: 'rgba(220, 178, 128, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    width: '100%',
  },
  verseReference: {
    color: '#B89B4C',
    fontFamily: 'Feather Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  verseText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  verseTextScroll: {
    maxHeight: 80,
  },
});

export default NoteEditor; 