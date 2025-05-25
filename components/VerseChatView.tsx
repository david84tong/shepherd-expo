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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 65; 

// Key to store chat usage in AsyncStorage
const CHAT_USED_KEY = 'shepherd_bible_chat_used_global';

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
  const [inputMessage, setInputMessage] = useState('');
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
      } catch (error) {
        console.error('Error checking free message usage:', error);
      }
    };
    
    checkFreeMessageUsage();
  }, []);
  
  const showPaywall = async () => {
    // Set the fromScreen property for tracking
    useSubscriptionStore.getState().setFromScreen('BibleChat');
    
    analytics.logEvent("Bible_Chat_PaywallShown", {
      book: bookName,
      chapter,
      verse: verse.verse,
      reason: "used_free_message"
    });
    
    const result = await presentPaywall();
    console.log("[VerseChatView] presentPaywall result:", result);
    
    // If user didn't upgrade, close the chat view
    if (!result) {
      onClose();
    }
    return result;
  }
  
  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 500 });
    
    slideAnim.value = withTiming(0, { duration: 600 });
    inputSlideAnim.value = withDelay(200, withTiming(0, { duration: 500 }));
    
    setTimeout(() => {
      // Add clearer initial message about the one-time free message limit
      const initialMessage = hasUsedFreeMessage && !isProMember ?
        `You've already used your free message. Upgrade to Shepherd Super to continue the conversation!` :
        `Welcome! I'm here to help you study ${bookName} ${chapter}:${verse.verse}. What would you like to know about this verse?`;
      
      setMessages([{
        id: Date.now().toString(),
        text: initialMessage,
        isUser: false,
        timestamp: new Date()
      }]);
      
      if (Platform.OS === 'ios') {
        setTimeout(() => {
          // You would need to add ref to TextInput and use it here if you want auto-focus
        }, 1200);
      }
    }, 1000);
    
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
  }, []);
  
  
  const handleSend = async () => {
    if (inputMessage.trim() === '') return;
    
    // Check if user is pro or has not used their free message yet
    if (!isProMember) {
      if (hasUsedFreeMessage) {
        // User has already used their free message, show paywall
        showPaywall();
        return;
      } else {
        // Mark that the user has used their free message globally
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
    }
    
    // Add user message
    const newMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    const userQuestion = inputMessage; // Store user input before clearing it
    setInputMessage('');
    
    // Add message and force scroll to bottom
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage];
      // Force scroll after state update with a delay
      requestAnimationFrame(() => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      });
      return updatedMessages;
    });
    
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
        
        const response = await fetch('https://shepherd-dev-api.skylar.gg/oai/gpt?model=gpt-3.5-turbo', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({
            "messages": [
              {
                "role": "system",
                "content": `You are a Bible study assistant helping with ${bookName} ${chapter}:${verse.verse}: "${verse.text}"`
              },
              {
                "role": "user",
                "content": userQuestion
              }
            ]
          })
        });

        const data = await response.json();

        // Update to handle the new response format
        if (!data || !data.role || typeof data.content !== 'string') {
          console.error('Invalid API response structure:', data);
          throw new Error('Invalid API response format');
        }

        const aiMessage = data.content;
        
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
        
        // If not a pro user, show upgrade prompt after the first response
        if (!isProMember) {
          setTimeout(() => {
            const upgradePrompt = {
              id: (Date.now() + 2).toString(),
              text: "You've used your one free message for the entire app. Upgrade to Shepherd Super to unlock unlimited Bible conversations across all verses!",
              isUser: false,
              timestamp: new Date()
            };
            
            setMessages(prev => {
              const updatedMessages = [...prev, upgradePrompt];
              requestAnimationFrame(() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              });
              return updatedMessages;
            });
          }, 1000);
        }
      } catch (error) {
        console.error('Error calling AI API:', error);
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
  
  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      // Add a small delay to ensure the new message has been rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [messages]);
  
  // Additional scroll handler for when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        if (flatListRef.current && messages.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [messages.length]);
  
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.isUser;
    
    // If this is an upgrade prompt, render a special message with an upgrade button
    if (!isUser && item.text.includes("Upgrade to Shepherd Super")) {
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
            onPress={showPaywall}
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
  
  // Calculate safe bottom padding to avoid tab bar but allow input to be lower
  // Using a smaller offset to position the input field lower
  const bottomSafeArea = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 0);
  const tabBarSafeArea = TAB_BAR_HEIGHT + bottomSafeArea;
  
  // Position input container lower by reducing the container padding
  const containerPadding = Math.max(tabBarSafeArea - 25, 0); // Reduced by 25 to lower the input
  
  return (
    <AnimatedSafeAreaView style={[styles.safeArea, containerStyle]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF4DC" />
      <View style={[styles.container, { paddingBottom: containerPadding }]}>
        <Reanimated.View 
          style={styles.header}
          entering={FadeInUp.duration(400)}
        >
          <TouchableOpacity 
            onPress={onClose}
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
          
          <Reanimated.View style={[styles.inputWrapper, inputContainerStyle]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
              style={styles.inputContainer}
            >
              <TextInput
                style={styles.input}
                placeholder={!isProMember && hasUsedFreeMessage 
                  ? "Upgrade to Shepherd Super to continue..." 
                  : "Ask about this verse..."}
                placeholderTextColor="#B89B4C"
                value={inputMessage}
                onChangeText={setInputMessage}
                multiline
                autoFocus={true}
                selectTextOnFocus={true}
                autoCapitalize="none"
                editable={isProMember || !hasUsedFreeMessage}
              />
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  (!inputMessage.trim() || (!isProMember && hasUsedFreeMessage)) 
                    ? styles.sendButtonDisabled 
                    : {}
                ]}
                onPress={!isProMember && hasUsedFreeMessage ? showPaywall : handleSend}
                disabled={!inputMessage.trim() && (!isProMember && !hasUsedFreeMessage)}
                activeOpacity={0.8}
              >
                <Feather 
                  name={!isProMember && hasUsedFreeMessage ? "unlock" : "send"} 
                  size={20} 
                  color={(!inputMessage.trim() && (!isProMember && !hasUsedFreeMessage)) ? "#CCCCCC" : "#FFFFFF"} 
                />
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Reanimated.View>
        </View>
      </View>
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
    paddingTop: 12,
    width: '100%',
  },
  inputWrapper: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
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
    paddingBottom: 80, // Increased padding to ensure enough space at bottom
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