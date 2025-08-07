import React, { useEffect } from 'react';
import { View, Text, StatusBar, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useMutualFriends } from '../hooks/useMutualFriends';
import { MutualFriend } from '../../utils/mutualFriends';
import PrimaryButton from '../../components/PrimaryButton';
import analytics from '../../utils/analytics';
import { RPH } from '../helper/helper';
import { hapticLight } from '~/utils/haptics';
import i18n from '../utils/i18n';

export default function AlreadyOnShepherdScreen() {
  const router = useRouter();
  const { mutualFriends, loading } = useMutualFriends(true);

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
    analytics.logEvent("OnboardingAlreadyOnShepherdScreen_Viewed");

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

  // Animate content when mutual friends data is loaded
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        contentOpacity.value = withTiming(1, { duration: 600 });
        contentTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        
        setTimeout(() => {
          buttonOpacity.value = withTiming(1, { duration: 600 });
          buttonTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }, 200);
      }, 100);
      
      analytics.logEvent('OnboardingAlreadyOnShepherdScreen_FriendsFound', {
        mutualFriendsCount: mutualFriends.length
      });
    }
  }, [loading, mutualFriends.length]);



  const handleContinue = () => {
    hapticLight();
    analytics.logEvent('OnboardingAlreadyOnShepherdScreen_Continue', {
      mutualFriendsCount: mutualFriends.length
    });
    
    // Navigate to next screen in onboarding flow
    router.push('/onboarding/rating');
  };

  const renderMutualFriend = ({ item }: { item: MutualFriend }) => (
    <View
      className="flex-row items-center p-4 mx-4 my-1 bg-white border-2 border-border rounded-xl"
      style={{
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Avatar */}
      <View className="w-12 h-12 rounded-full bg-accentGold items-center justify-center mr-3">
        <Text className="font-feather text-lg text-textPrimary">
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      {/* User Info */}
      <View className="flex-1">
        <Text className="font-feather text-base text-textPrimary">
          {item.displayName}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="leaf" size={12} color="#24CA17" />
          <Text className="font-din text-sm text-description ml-1">
            Level {item.lamb?.level || 1} • Active on Shepherd
          </Text>
        </View>
      </View>
      
      {/* Shepherd Icon */}
      <View className="w-8 h-8 rounded-full bg-forestGreen50 items-center justify-center">
        <Ionicons name="leaf" size={16} color="#24CA17" />
      </View>
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
        {/* Title */}
        <Animated.View style={titleStyle}>
          <Text className="font-feather text-h1 text-center text-textPrimary mb-4 px-4">
            {loading ? 'Finding your friends...' : 
             mutualFriends.length > 0 ? 'Friends already on Shepherd!' : 
             'No friends found yet'}
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={subtitleStyle}>
          <Text className="font-din text-lg text-description text-center mt-0 mb-8">
            {loading ? 'We\'re checking your contacts...' :
             mutualFriends.length > 0 ? 
               `We found ${mutualFriends.length} of your contact${mutualFriends.length !== 1 ? 's' : ''} who ${mutualFriends.length === 1 ? 'is' : 'are'} already growing in faith with Shepherd.` :
               'Invite your friends to join you on your faith journey. The more the merrier!'
            }
          </Text>
        </Animated.View>

        {/* Content */}
        <Animated.View style={contentStyle} className="flex-1 mb-20">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#FCD34D" />
              <Text className="font-din text-base text-description mt-4">
                Searching your contacts...
              </Text>
            </View>
          ) : mutualFriends.length > 0 ? (
            <FlatList
              data={mutualFriends}
              renderItem={renderMutualFriend}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <View className="bg-accentGold rounded-full p-6 mb-6">
                <Ionicons name="person-add" size={RPH(6)} color="#795323" />
              </View>
              <Text className="font-feather text-xl text-textPrimary text-center mb-4 px-8">
                Be the first among your friends!
              </Text>
              <Text className="font-din text-base text-description text-center px-8">
                Start your spiritual journey and invite others to join you later.
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Continue Button - Fixed at bottom */}
        {!loading && (
          <Animated.View style={continueStyle}>
            <PrimaryButton
              title={mutualFriends.length > 0 ? 'Continue to Shepherd' : 'Start My Journey'}
              onPress={handleContinue}
              disabled={false}
              isActive={true}
            />
          </Animated.View>
        )}
      </Animated.View>
    </>
  );
}