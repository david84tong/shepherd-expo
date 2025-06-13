import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  FlatList,
  StyleSheet,
  StatusBar,
  Dimensions,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Reanimated, { 
  FadeIn,
  FadeInUp, 
  FadeInRight,
  FadeOutLeft,
  SlideInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../app/hooks/authHook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useSubscriptionStore from '../app/stores/subscriptionStore';
import analytics from '../utils/analytics';
import { getBibleVerseAIResponse } from '../app/api/ai';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface VerseChatViewProps {
  verse: {
    text: string;
    verse: number;
  };
  bookName: string;
  chapter: number;
  onClose: () => void;
  onMessageSent?: () => void;
}

const AnimatedSafeAreaView = Reanimated.createAnimatedComponent(SafeAreaView);

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
// Use visual tab bar height (not layout height which includes safe areas)
const TAB_BAR_HEIGHT = 35; 

// Key to store chat usage in AsyncStorage
const CHAT_USED_KEY = 'shepherd_bible_chat_used_global';
const CHAT_MESSAGE_COUNT_KEY = 'shepherd_bible_chat_message_count_global';

const VerseChatView: React.FC<VerseChatViewProps> = ({ 
  verse, 
  bookName, 
  chapter, 
  onClose,
  onMessageSent
}) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([])
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [hasUsedFreeMessage, setHasUsedFreeMessage] = useState(false);
  const [globalMessageCount, setGlobalMessageCount] = useState(0);
  const [inputMessage, setInputMessage] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(40);
  const inputSlideAnim = useSharedValue(80);
  
  const { getFirebaseIdToken } = useAuth();
  const { isProMember, presentPaywall } = useSubscriptionStore();
  
  // Check if user has already used their free message
  useEffect(() => {
    const checkFreeMessageUsage = async () => {
      try {
        const hasUsed = await AsyncStorage.getItem(CHAT_USED_KEY);
        setHasUsedFreeMessage(hasUsed === 'true');
        console.log("[VerseChatView] Free message already used:", hasUsed === 'true');
        
        // Load global message count
        const messageCountStr = await AsyncStorage.getItem(CHAT_MESSAGE_COUNT_KEY);
        const messageCount = messageCountStr ? parseInt(messageCountStr, 10) : 0;
        setGlobalMessageCount(messageCount);
        console.log("[VerseChatView] Global message count:", messageCount);
        console.log("[VerseChatView] Pro member status:", isProMember);

        // Track chat view opened
        analytics.logEvent("Bible_Chat_Opened", {
          book: bookName,
          chapter,
          verse: verse.verse,
          isProMember,
          globalMessageCount: messageCount,
          hasUsedFreeMessage: hasUsed === 'true'
        });
      } catch (error) {
        console.error('Error checking free message usage:', error);
      }
    };
    
    checkFreeMessageUsage();
  }, [isProMember, bookName, chapter, verse.verse]);
  
  const showPaywall = async () => {
    // Set the fromScreen property for tracking
    useSubscriptionStore.getState().setFromScreen('BibleChat');
    
    analytics.logEvent("Bible_Chat_PaywallShown", {
      book: bookName,
      chapter,
      verse: verse.verse,
      reason: "used_free_message"
    });
    
    // Try to present the main paywall first, if it fails, show free trial
    const result = await presentPaywall();
    console.log("[VerseChatView] presentPaywall result:", result);
    
    return result;
  }
  
  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 500 });
    
    slideAnim.value = withTiming(0, { duration: 600 });
    inputSlideAnim.value = withDelay(200, withTiming(0, { duration: 500 }));
    
    // Listen for layout changes in the FlatList
    const layoutSubscription = Dimensions.addEventListener('change', () => {
      if (flatListRef.current && messages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    });
    
    return () => {
      layoutSubscription.remove();
    };
  }, []); // Empty dependency array - only run once
  
  // Separate useEffect to handle initial message setup based on loaded state
  useEffect(() => {
    // If we already have messages, don't reset them
    if (messages.length > 0) {
      return;
    }
    
    // Wait a bit for the data to load, then set up initial message
    setTimeout(() => {
      // Pro members always get the normal welcome message
      if (isProMember) {
        console.log("[VerseChatView] Setting up welcome message for pro member");
        const initialMessage = `Welcome! I'm here to help you study ${bookName} ${chapter}:${verse.verse}. What would you like to know about this verse?`;
        
        setMessages([{
          id: Date.now().toString(),
          text: initialMessage,
          isUser: false,
          timestamp: new Date()
        }]);
      } else if (globalMessageCount >= 3) {
        // Non-pro users who have used all messages get upgrade message
        console.log("[VerseChatView] Setting up upgrade message for user who has used all messages");
        const upgradeMessage = {
          id: Date.now().toString(),
          text: "You've used your free messages for the entire app. Upgrade to Shepherd Super to unlock unlimited Bible conversations across all verses!",
          isUser: false,
          timestamp: new Date()
        };
        setMessages([upgradeMessage]);
      } else {
        // Non-pro users with remaining messages get normal welcome
        console.log("[VerseChatView] Setting up welcome message for non-pro user with remaining messages");
        const initialMessage = `Welcome! I'm here to help you study ${bookName} ${chapter}:${verse.verse}. What would you like to know about this verse?`;
        
        setMessages([{
          id: Date.now().toString(),
          text: initialMessage,
          isUser: false,
          timestamp: new Date()
        }]);
      }
    }, 500); // Increased delay to ensure data is loaded
  }, [globalMessageCount, hasUsedFreeMessage, isProMember, messages.length, bookName, chapter, verse.verse]);
  
  const handleSend = async () => {
    if (inputMessage.trim() === '') return;
    
    console.log("[VerseChatView] handleSend called", {
      isProMember,
      hasUsedFreeMessage,
      globalMessageCount,
      inputMessage: inputMessage.trim()
    });

    // Track message send attempt
    analytics.logEvent("Bible_Chat_MessageSent", {
      book: bookName,
      chapter,
      verse: verse.verse,
      isProMember,
      globalMessageCount,
      messageLength: inputMessage.trim().length,
      willGetAIResponse: isProMember || globalMessageCount < 2
    });
    
    // Pro members can always send messages with AI response
    if (isProMember) {
      console.log("[VerseChatView] Pro member - sending message with AI response");
      sendMessage(true);
      return;
    }
    
    // For non-pro members, check their message count
    if (globalMessageCount >= 3) {
      console.log("[VerseChatView] User has sent 3 messages - showing paywall on 4th attempt");
      
      // Track paywall trigger
      analytics.logEvent("Bible_Chat_PaywallTriggered", {
        book: bookName,
        chapter,
        verse: verse.verse,
        trigger: "message_limit_reached",
        globalMessageCount
      });
      
      showPaywall();
      return;
    }
    
    // User can send this message
    if (globalMessageCount < 2) {
      // First or second message - send with AI response
      console.log(`[VerseChatView] Allowing message ${globalMessageCount + 1} with AI response`);
      sendMessage(true); // true = get AI response
    } else {
      // Third message - send but no AI response, then add upgrade message
      console.log(`[VerseChatView] Allowing message ${globalMessageCount + 1} but no AI response, then adding upgrade message`);
      
      // Track final free message
      analytics.logEvent("Bible_Chat_FinalFreeMessage", {
        book: bookName,
        chapter,
        verse: verse.verse,
        globalMessageCount
      });
      
      sendMessage(false); // false = no AI response
      
      // Add upgrade message to chat after a short delay
      setTimeout(() => {
        const upgradeMessage = {
          id: (Date.now() + 1).toString(),
          text: "You've used your free messages for the entire app. Upgrade to Shepherd Super to unlock unlimited Bible conversations across all verses!",
          isUser: false,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, upgradeMessage]);
        
        // Scroll to bottom to show the upgrade message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        // Track upgrade message shown
        analytics.logEvent("Bible_Chat_UpgradeMessageShown", {
          book: bookName,
          chapter,
          verse: verse.verse,
          globalMessageCount: globalMessageCount + 1
        });
        
        // Also show the paywall automatically after the message appears
        setTimeout(() => {
          analytics.logEvent("Bible_Chat_AutoPaywallShown", {
            book: bookName,
            chapter,
            verse: verse.verse,
            delay: "after_upgrade_message"
          });
          showPaywall();
        }, 1500); // Show paywall 1.5 seconds after the upgrade message
      }, 1000);
    }
  };
  
  const sendMessage = async (getAIResponse: boolean) => {
    // Store user input before clearing it
    const userQuestion = inputMessage;
    
    // Add user message immediately
    const newMessage = {
      id: Date.now().toString(),
      text: userQuestion,
      isUser: true,
      timestamp: new Date()
    };
    
    // Clear input field
    setInputMessage('');
    
    // Add user message to chat
    setMessages(prev => [...prev, newMessage]);
    
    // Force scroll to bottom after a short delay
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // For non-pro members only, increment global message count
    if (!isProMember) {
      // Use a setTimeout to ensure this happens after the message state update
      setTimeout(async () => {
        const newMessageCount = globalMessageCount + 1;
        setGlobalMessageCount(newMessageCount);
        
        try {
          await AsyncStorage.setItem(CHAT_MESSAGE_COUNT_KEY, newMessageCount.toString());
          console.log(`[VerseChatView] Saved global message count: ${newMessageCount}`);
        } catch (error) {
          console.error('Error saving global message count:', error);
        }
        
        // If this is their first message ever globally, mark it as used
        if (!hasUsedFreeMessage) {
          try {
            await AsyncStorage.setItem(CHAT_USED_KEY, 'true');
            setHasUsedFreeMessage(true);
            console.log("[VerseChatView] Marked free message as used permanently");
            
            // Notify parent component that message was sent
            onMessageSent?.();
            
            analytics.logEvent("Bible_Chat_UsedFreeMessage", {
              book: bookName,
              chapter,
              verse: verse.verse,
              isGlobalFirstUse: true
            });
          } catch (error) {
            console.error('Error marking free message as used:', error);
          }
        }
      }, 50);
    } else {
      // For pro members, still notify parent if this is their first message
      if (!hasUsedFreeMessage) {
        onMessageSent?.();
        analytics.logEvent("Bible_Chat_ProMemberUsed", {
          book: bookName,
          chapter,
          verse: verse.verse
        });
      }
    }
    
    // Only make API call if we should get AI response
    if (!getAIResponse) {
      console.log("[VerseChatView] Skipping AI response for 3rd message");
      return;
    }
    
    // Show loading message
    setIsAiLoading(true);
    
    // Make API call with the user's input
    setTimeout(async () => {
      try {
        // Get Firebase ID token
        const idToken = await getFirebaseIdToken();
        
        if (!idToken) {
          console.error('Failed to get Firebase ID token');
          throw new Error('Authentication failed');
        }
        
        // Use the refactored AI API function
        const aiMessage = await getBibleVerseAIResponse(
          userQuestion,
          {
            bookName,
            chapter,
            verse: verse.verse,
            verseText: verse.text
          },
          idToken
        );
        
        // Track successful AI response
        analytics.logEvent("Bible_Chat_AIResponseReceived", {
          book: bookName,
          chapter,
          verse: verse.verse,
          responseLength: aiMessage.length,
          isProMember,
          globalMessageCount: globalMessageCount + 1
        });
        
        // Remove loading state
        setIsAiLoading(false);
        
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          text: aiMessage,
          isUser: false,
          timestamp: new Date()
        };
        
        // Add AI response and force scroll
        setMessages(prev => {
          const updatedMessages = [...prev, aiResponse];
          // Force scroll after state update
          requestAnimationFrame(() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          });
          return updatedMessages;
        });
      } catch (error) {
        console.error('Error calling AI API:', error);
        
        // Track API error with different event names based on error type
        if (error instanceof Error && error.message === 'Invalid API response format') {
          analytics.logEvent("Bible_Chat_AIResponseError", {
            book: bookName,
            chapter,
            verse: verse.verse,
            error: "invalid_response_format",
            isProMember,
            globalMessageCount: globalMessageCount + 1
          });
        } else {
          analytics.logEvent("Bible_Chat_APIError", {
            book: bookName,
            chapter,
            verse: verse.verse,
            error: error instanceof Error ? error.message : 'Unknown error',
            isProMember,
            globalMessageCount: globalMessageCount + 1
          });
        }
        
        // Remove loading state
        setIsAiLoading(false);
        
        // Fallback message in case of API error
        const errorResponse = {
          id: (Date.now() + 1).toString(),
          text: "I'm sorry, I couldn't process your request at the moment. Please try again later.",
          isUser: false,
          timestamp: new Date()
        };
        // Add error message and force scroll
        setMessages(prev => {
          const updatedMessages = [...prev, errorResponse];
          // Force scroll after state update
          requestAnimationFrame(() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          });
          return updatedMessages;
        });
      }
    }, 1000);
  };
  
  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        if (flatListRef.current && messages.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [messages.length]);
  
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.isUser;
    
    // If this is an upgrade prompt, render a special message with an upgrade button
    if (!isUser && (item.text.includes("Upgrade to Shepherd Super") || item.text.includes("You've used your free message"))) {
      return (
        <Reanimated.View
          entering={FadeInUp.duration(300).delay(200)}
          style={[
            styles.messageBubble,
            styles.aiBubble,
            styles.upgradePromptBubble
          ]}
        >
          <Text style={[
            styles.messageText,
            styles.aiText
          ]}>
            {item.text}
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              // Track upgrade button tap
              analytics.logEvent("Bible_Chat_UpgradeButtonTapped", {
                book: bookName,
                chapter,
                verse: verse.verse,
                source: "upgrade_message",
                globalMessageCount,
                isProMember
              });
              showPaywall();
            }}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </Reanimated.View>
      );
    }
    
    return (
      <Reanimated.View
        entering={isUser ? FadeInRight.duration(300) : FadeInUp.duration(300).delay(200)}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}
      >
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.aiText
        ]}>
          {item.text}
        </Text>
      </Reanimated.View>
    );
  };
  
  // Create animated styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: interpolate(fadeAnim.value, [0, 1], [20, 0]) }]
    };
  });
  
  const verseContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: slideAnim.value }],
      opacity: fadeAnim.value
    };
  });
  
  const inputContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: inputSlideAnim.value }],
      opacity: fadeAnim.value
    };
  });
  
  return (
    <AnimatedSafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF4DC" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={0}
      >
        <Reanimated.View 
          style={styles.header}
          entering={FadeInUp.duration(400)}
        >
          <TouchableOpacity 
            onPress={() => {
              // Track chat close
              analytics.logEvent("Bible_Chat_Closed", {
                book: bookName,
                chapter,
                verse: verse.verse,
                messagesExchanged: messages.length,
                isProMember,
                globalMessageCount,
                timeSpent: Date.now() - (messages[0]?.timestamp?.getTime() || Date.now())
              });
              onClose();
            }}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={22} color="#3C584A" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {bookName} {chapter}:{verse.verse}
          </Text>
          <View style={styles.placeholder} />
        </Reanimated.View>
        
        <Reanimated.View style={[styles.verseContainer, verseContainerStyle]}>
          <Text style={styles.verseText}>{verse.text}</Text>
        </Reanimated.View>
        
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListFooterComponent={isAiLoading ? 
              <Reanimated.View 
                entering={FadeInUp.duration(300)}
                style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}
              >
                <View style={styles.loadingContainer}>
                  <View style={styles.dot} />
                  <View style={[styles.dot, styles.dotMiddle]} />
                  <View style={styles.dot} />
                </View>
              </Reanimated.View> 
              : null
            }
          />
        </View>
        
        <Reanimated.View style={[styles.inputWrapper, inputContainerStyle]}>
          <View style={[styles.inputContainer, { 
            paddingBottom: Math.max(insets.bottom + TAB_BAR_HEIGHT, 16) 
          }]}>
            <TextInput
              style={styles.input}
              placeholder={!isProMember && globalMessageCount >= 3
                ? "Upgrade to continue chatting..." 
                : "Ask about this verse..."}
              placeholderTextColor="#B89B4C"
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
              selectTextOnFocus={true}
              autoCapitalize="none"
              editable={isProMember || globalMessageCount < 3}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!inputMessage.trim()) 
                  ? styles.sendButtonDisabled 
                  : {}
              ]}
              onPress={handleSend}
              disabled={!inputMessage.trim()}
              activeOpacity={0.8}
            >
              <Feather 
                name={!isProMember && globalMessageCount >= 3 ? "unlock" : "send"} 
                size={20} 
                color={(!inputMessage.trim()) ? "#CCCCCC" : "#FFFFFF"} 
              />
            </TouchableOpacity>
          </View>
        </Reanimated.View>
      </KeyboardAvoidingView>
    </AnimatedSafeAreaView>
  );
};

const styles = StyleSheet.create({
  aiBubble: {
    backgroundColor: '#FFF9E6',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    marginRight: 60,
    borderColor: '#FFE4A8',
    borderWidth: 1,
  },
  aiText: {
    color: '#3C584A'
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(220, 178, 128, 0.2)',
    borderRadius: 20,
    flexDirection: 'row',
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 15,
    marginLeft: 4,
  },
  chatContainer: {
    flex: 1,
    position: 'relative',
  },
  container: {
    backgroundColor: '#FFF4DC',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B89B4C',
    marginHorizontal: 2,
    opacity: 0.7,
  },
  dotMiddle: {
    opacity: 0.9,
    transform: [{ scale: 1.2 }],
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFF4DC',
    borderBottomColor: '#FFE4A8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  headerText: {
    color: '#3C584A',
    fontFamily: 'Feather Bold',
    fontSize: 18,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  input: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFE4A8',
    borderRadius: 24,
    borderWidth: 1,
    color: '#3C584A',
    flex: 1,
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    textTransform: 'none',
  },
  inputContainer: {
    backgroundColor: '#FFF4DC',
    borderTopColor: '#FFE4A8',
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    width: '100%',
  },
  inputWrapper: {
    width: '100%',
  },
  loadingBubble: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    width: 100,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    borderRadius: 20,
    marginBottom: 12,
    maxWidth: '80%',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1, 
    elevation: 1,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageText: {
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    lineHeight: 22,
    textTransform: 'none',
  },
  placeholder: {
    height: 38,
    width: 100,
  },
  safeArea: {
    backgroundColor: '#FFF4DC',
    flex: 1,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: '#F7B500',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    width: 48,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5E5',
    shadowOpacity: 0,
    elevation: 0,
  },
  upgradeButton: {
    alignItems: 'center',
    backgroundColor: '#F7B500',
    borderRadius: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Feather Bold',
    fontSize: 14,
  },
  upgradePromptBubble: {
    backgroundColor: 'rgba(247, 181, 0, 0.15)',
    borderColor: 'rgba(247, 181, 0, 0.5)',
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FCD34D',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginLeft: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  userText: {
    color: '#3C584A'
  },
  verseContainer: {
    backgroundColor: 'rgba(220, 178, 128, 0.15)',
    borderBottomColor: '#FFE4A8',
    borderBottomWidth: 1,
    padding: 16,
  },
  verseText: {
    color: '#3C584A',
    fontFamily: 'DIN Next Rounded LT W01 Regular',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
  }
});

export default VerseChatView;