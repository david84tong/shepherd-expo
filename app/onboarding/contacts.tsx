import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StatusBar, FlatList, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useUserStore } from '../stores/userStore';
import PrimaryButton from '../../components/PrimaryButton';
import analytics from '../../utils/analytics';
import { appLog, RPH } from '../helper/helper';
import { hapticLight } from '~/utils/haptics';
import i18n from '../utils/i18n';

interface ContactItem {
  id: string;
  name: string;
  phoneNumbers: string[];
}

export default function ContactsScreen() {
  const router = useRouter();
  const { setResponse } = useOnboardingStore();
  const { setContacts } = useUserStore();
  
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [contacts, setContactsLocal] = useState<ContactItem[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showContacts, setShowContacts] = useState(false);

  // Animation values
  const screenOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(40);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(40);

  useEffect(() => {
    analytics.logEvent("OnboardingContactsScreen_Viewed");

    // Reset animation values and start entrance animations
    screenOpacity.value = 0;
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    subtitleOpacity.value = 0;
    subtitleTranslateY.value = 40;
    contentOpacity.value = 0;
    contentTranslateY.value = 40;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 40;

    // Staggered animations matching onboarding pattern
    const animateComponent = (opacity: any, translateY: any, delay: number) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 200 }));
    };

    screenOpacity.value = withTiming(1, { duration: 300 });
    animateComponent(titleOpacity, titleTranslateY, 100);
    animateComponent(subtitleOpacity, subtitleTranslateY, 200);
    animateComponent(contentOpacity, contentTranslateY, 300);
    animateComponent(buttonOpacity, buttonTranslateY, 400);
  }, []);

  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // If it's a US number (10 digits), add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // If it already starts with 1 and is 11 digits, add +
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    // Return as is if it's already formatted or international
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  };

  const requestContactsPermission = async () => {
    try {
      setLoading(true);
      hapticLight();
      
      const { status } = await Contacts.requestPermissionsAsync();

      appLog('Contacts permission status:', status);
      
      if (status === 'granted') {
        setPermissionGranted(true);
        await loadContacts();
        analytics.logEvent('OnboardingContactsScreen_PermissionGranted');
      }
    } catch (error) {
      console.error('Contacts permission error:', error);
      Alert.alert('Error', 'Failed to access contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkContactsPermission().then(status => {
      if (status) {
        loadContacts();
      }
    });
  }, []);

  const checkContactsPermission = async () => {
    const { status } = await Contacts.getPermissionsAsync();
    return status === 'granted' ;
  };

  const loadContacts = async () => {
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      // Filter and format contacts
      const formattedContacts: ContactItem[] = data
        .filter(contact => 
          contact.name && 
          contact.phoneNumbers && 
          contact.phoneNumbers.length > 0
        )
        .map(contact => ({
          id: contact.id || Math.random().toString(),
          name: contact.name || 'Unknown',
          phoneNumbers: contact.phoneNumbers!
            .map(phone => normalizePhoneNumber(phone.number || ''))
        }))
        .filter(contact => contact.phoneNumbers.length > 0)
        .slice(0, 500); // Limit to first 500 contacts for performance

      setContactsLocal(formattedContacts);
      setShowContacts(true);
      
      // Re-animate content when contacts are loaded
      contentOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
      contentTranslateY.value = withDelay(100, withSpring(0, { damping: 20, stiffness: 200 }));
      
      analytics.logEvent('OnboardingContactsScreen_ContactsLoaded', {
        contactCount: formattedContacts.length
      });
      
    } catch (error) {
      console.error('Load contacts error:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    }
  };

  const toggleContactSelection = (contactId: string) => {
    hapticLight();
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleContinue = async () => {
    try {
      hapticLight();
      
      // Get all phone numbers from selected contacts
      const allPhoneNumbers: string[] = [];
      selectedContacts.forEach(contactId => {
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
          allPhoneNumbers.push(...contact.phoneNumbers);
        }
      });

      // Remove duplicates
      const uniquePhoneNumbers = [...new Set(allPhoneNumbers)];
      
      // Save to stores
      await setResponse('contacts', uniquePhoneNumbers);
      setContacts(uniquePhoneNumbers);
      
      analytics.logEvent('OnboardingContactsScreen_ContactsSaved', {
        selectedContactsCount: selectedContacts.length,
        phoneNumbersCount: uniquePhoneNumbers.length
      });
      
      // Navigate to next screen (already on shepherd)
      router.push('/onboarding/alreadyOnShepherd');
      
    } catch (error) {
      console.error('Save contacts error:', error);
      Alert.alert('Error', 'Failed to save contacts. Please try again.');
    }
  };

  const handleSkip = () => {
    hapticLight();
    analytics.logEvent('OnboardingContactsScreen_Skipped');
    router.push('/onboarding/alreadyOnShepherd');
  };

  const renderContact = ({ item }: { item: ContactItem }) => (
    <View 
      className={`flex-row items-center p-4 mx-4 my-1 rounded-xl ${
        selectedContacts.includes(item.id) ? 'bg-accentGold border-2 border-accentGold' : 'bg-white border-2 border-border'
      }`}
      style={{
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Pressable
        onPress={() => toggleContactSelection(item.id)}
        className="flex-1 flex-row items-center"
      >
        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          selectedContacts.includes(item.id) ? 'bg-white' : 'bg-surfaceCream'
        }`}>
          <Text className={`font-feather text-lg ${
            selectedContacts.includes(item.id) ? 'text-textPrimary' : 'text-description'
          }`}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View className="flex-1">
          <Text className={`font-feather text-base ${
            selectedContacts.includes(item.id) ? 'text-textPrimary' : 'text-textPrimary'
          }`}>
            {item.name}
          </Text>
          <Text className={`font-din text-sm ${
            selectedContacts.includes(item.id) ? 'text-brown' : 'text-description'
          }`}>
            {item.phoneNumbers[0]}
          </Text>
        </View>
        
        <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
          selectedContacts.includes(item.id) 
            ? 'bg-white border-white' 
            : 'border-description'
        }`}>
          {selectedContacts.includes(item.id) && (
            <Ionicons name="checkmark" size={16} color="#795323" />
          )}
        </View>
      </Pressable>
    </View>
  );

  // Animated styles
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const continueStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Animated.View style={[screenStyle, { flex: 1 }]} className="bg-surfaceCream px-6 pt-12 pb-24">
        {!showContacts ? (
          // Permission Request Screen
          <>
            {/* Title */}
            <Animated.View style={titleStyle}>
              <Text className="font-feather text-h2 text-center text-textPrimary mb-4 px-4">
                Find friends on Shepherd
              </Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View style={subtitleStyle}>
              <Text className="font-din text-lg text-description text-center mt-0 mb-8">
                We'll help you discover which of your contacts are already using Shepherd so you can encourage each other in your faith journey.
              </Text>
            </Animated.View>

            {/* Content Spacer */}
            <Animated.View style={contentStyle} className="flex-1 items-center justify-center mb-8">
              <View className="bg-accentGold rounded-full p-6 mb-6">
                <Ionicons name="people-circle-outline" size={RPH(6)} color="#795323" />
              </View>
              <Text className="font-feather text-2xl text-h2  text-description text-center px-8">
                Import your contacts 
              </Text>
            </Animated.View>

            {/* Continue Button - Fixed at bottom */}
            <Animated.View style={continueStyle}>
              <PrimaryButton
                title={loading ? 'Loading...' : 'Allow Access to Contacts'}
                onPress={requestContactsPermission}
                disabled={loading}
                isActive={!loading}
                loading={loading}
              />
              
              {/* Skip Button */}
              <View className="items-center mt-4">
                <Text 
                  onPress={handleSkip}
                  className="font-din text-base text-description"
                >
                  Skip for now
                </Text>
              </View>
            </Animated.View>
          </>
        ) : (
          // Contacts Selection Screen
          <>
            {/* Title */}
            <Animated.View style={titleStyle}>
              <Text className="font-feather text-h1 text-center text-textPrimary mb-2">
                Select Contacts
              </Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View style={subtitleStyle}>
              <Text className="font-din text-lg text-description text-center mt-0 mb-4">
                Choose contacts to help find mutual friends
              </Text>
              {selectedContacts.length > 0 && (
                <Text className="font-din text-sm text-accentGold text-center">
                  {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
                </Text>
              )}
            </Animated.View>

            {/* Contacts List */}
            <Animated.View style={contentStyle} className="flex-1 mt-4 mb-20">
              <FlatList
                data={contacts}
                renderItem={renderContact}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </Animated.View>

            {/* Continue Button - Fixed at bottom */}
            <Animated.View style={continueStyle}>
              <PrimaryButton
                title={`Continue (${selectedContacts.length})`}
                onPress={handleContinue}
                disabled={false}
                isActive={true}
              />
              
              {/* Skip Button */}
              <View className="items-center mt-4">
                <Text 
                  onPress={handleSkip}
                  className="font-din text-base text-description"
                >
                  Skip
                </Text>
              </View>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </>
  );
}