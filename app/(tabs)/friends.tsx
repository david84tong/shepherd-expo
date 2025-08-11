import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useUserStore } from '../stores/userStore';
import { useFriendStore } from '../stores/friendStore';
import { useUIStore } from '../stores/uiStore';
import analytics from '../../utils/analytics';
import { hapticLight } from '~/utils/haptics';
import PrimaryButton from '../../components/PrimaryButton';
import InviteFriendsSheet, { InviteFriendsSheetRef } from '../components/InviteFriendsSheet';
import { appLog } from '../helper/helper';

interface FriendItemProps {
  friend: any;
  onAccept?: () => void;
  onDecline?: () => void;
  onNudge?: () => void;
  isIncomingRequest?: boolean;
}

const FriendItem: React.FC<FriendItemProps> = ({ 
  friend, 
  onAccept, 
  onDecline, 
  onNudge,
  isIncomingRequest = false 
}) => {
  // Cross-platform shadow styles
  const shadowStyle = Platform.select({
    ios: {
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  });

  return (
    <View className="bg-surfaceCream rounded-card p-6 mb-3" style={shadowStyle}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-heading font-feather text-textPrimary">
            {friend.friendDisplayName || friend.displayName || 'Friend'}
          </Text>
          {friend.friendUsername && (
            <Text className="text-body font-din text-description mt-1">
              @{friend.friendUsername}
            </Text>
          )}
          <View className="flex-row items-center mt-2">
            <Text className="text-caption font-din text-description">
              {isIncomingRequest ? 'Wants to be friends' : 'Friends since'} 
            </Text>
            {friend.createdAt && (
              <Text className="text-caption font-din text-description ml-1">
                {friend.createdAt.toDate().toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            )}
          </View>
        </View>

        {isIncomingRequest ? (
          <View className="flex-row space-x-2">
            <Pressable
              onPress={onAccept}
              className="bg-accentGold rounded-card px-4 py-2"
              style={Platform.select({
                ios: {
                  shadowColor: '#F7B500',
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                },
                android: {
                  elevation: 5,
                },
              })}
            >
              <Text className="text-body font-feather text-textPrimary">Accept</Text>
            </Pressable>
            <Pressable
              onPress={onDecline}
              className="bg-surfaceCreamLight border border-pillBorder rounded-card px-4 py-2"
            >
              <Text className="text-body font-feather text-description">Decline</Text>
            </Pressable>
          </View>
        ) : (
          <View className="bg-forestGreen50 rounded-card px-3 py-2">
            <Text className="text-caption font-din text-forestGreen80">✓ Friends</Text>
          </View>
        )}
      </View>
      
      {/* Nudge button for accepted friends */}
      {!isIncomingRequest && friend.status === 'accepted' && onNudge && (
        <View className="mt-4 pt-4 border-t border-pillBorder">
          <Pressable
            onPress={onNudge}
            className="bg-blue-500 rounded-card px-4 py-2 flex-row items-center justify-center"
            style={Platform.select({
              ios: {
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
              },
              android: {
                elevation: 3,
              },
            })}
          >
            <Text className="text-body font-feather text-white mr-2">🐑</Text>
            <Text className="text-body font-feather text-white">Send Nudge</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default function FriendsScreen() {
  const inviteSheetRef = useRef<InviteFriendsSheetRef>(null);
  
  const lamb = useUserStore((s) => s.getLamb?.());
  const lambName = useUserStore((s) => s.getLambName?.());
  const gems = useUserStore((s) => s.getGens?.());
  
  const {
    friends,
    incomingInvites,
    outgoingInvites,
    isLoading,
    error,
    loadFriends,
    acceptFriendRequest,
    declineFriendRequest,
    sendPrayerBuddyNudge,
    getFriendsCount
  } = useFriendStore();

  const { getUser } = useUserStore();
  const user = getUser();
  
  // Dev-only view states
  type FriendsViewState = 'invite' | 'pending' | 'connected';
  const [viewState, setViewState] = React.useState<FriendsViewState>('invite');
  
  // Enhanced friend type for simulation
  interface SimulatedFriend {
    id: string;
    friendId: string;
    friendDisplayName: string;
    friendUsername: string;
    friendAvatar: null;
    status: 'accepted';
    lastActiveAt: Date;
    streak: number;
    level: number;
    totalReadingDays: number;
    isPrayerBuddy: boolean;
    lastNudgeReceived: Date | null;
    lastNudgeSent: Date | null;
    fcmToken: string;
    createdAt: { toDate: () => Date };
  }

  // Simulation state for connected friends
  const [simulatedFriends, setSimulatedFriends] = useState<SimulatedFriend[]>([
    {
      id: 'sim_friend_1',
      friendId: 'user_sarahc2024',
      friendDisplayName: 'Sarah Chen',
      friendUsername: 'sarahc_prays2024', // Unique username
      friendAvatar: null,
      status: 'accepted',
      lastActiveAt: new Date(),
      streak: 15,
      level: 8,
      totalReadingDays: 42,
      isPrayerBuddy: true,
      lastNudgeReceived: null,
      lastNudgeSent: null,
      fcmToken: 'fake_fcm_token_sarah_123',
      createdAt: { toDate: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days ago
    },
    {
      id: 'sim_friend_2', 
      friendId: 'user_marcusj2024',
      friendDisplayName: 'Marcus Johnson',
      friendUsername: 'marcus_faithful_2024', // Unique username
      friendAvatar: null,
      status: 'accepted',
      lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      streak: 7,
      level: 4,
      totalReadingDays: 18,
      isPrayerBuddy: false,
      lastNudgeReceived: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      lastNudgeSent: null,
      fcmToken: 'fake_fcm_token_marcus_456',
      createdAt: { toDate: () => new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, // 14 days ago
    }
  ]);
  
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'friend_request' | 'friend_accepted' | 'nudge_received' | 'streak_milestone';
    title: string;
    message: string;
    timestamp: Date;
    friendName?: string;
    isRead: boolean;
  }>>([
    {
      id: 'initial_welcome',
      type: 'friend_accepted',
      title: '🎉 Welcome to your Prayer Circle!',
      message: 'Sarah Chen (@sarahc_prays2024) is your prayer buddy. Start encouraging each other on your faith journey!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      friendName: 'Sarah Chen',
      isRead: false,
    }
  ]);

  // Load friends when screen loads
  useEffect(() => {
    if (user?.id) {
      loadFriends();
    }
  }, [user?.id, loadFriends]);

  const handleAcceptRequest = async (friendId: string) => {
    appLog('[FriendsScreen] Accepting friend request from:', friendId);
    const success = await acceptFriendRequest(friendId);
    if (success) {
      analytics.logEvent('friend_request_accepted_ui', {
        friendId,
        userId: user.id
      });
    }
  };

  const handleDeclineRequest = async (friendId: string) => {
    appLog('[FriendsScreen] Declining friend request from:', friendId);
    const success = await declineFriendRequest(friendId);
    if (success) {
      analytics.logEvent('friend_request_declined_ui', {
        friendId,
        userId: user.id
      });
    }
  };

  const handleInviteFriends = () => {
    analytics.logEvent('invite_friends_opened', {
      userId: user.id,
      currentFriendsCount: getFriendsCount()
    });
    inviteSheetRef.current?.show();
  };

  const handleGemsPress = () => {
    hapticLight();
    analytics.logEvent('Friends_Tapped_Gems');
    const showStoreSheet = useUIStore.getState().showStoreSheet;
    if (showStoreSheet) showStoreSheet();
  };

  const handleInvite = async () => {
    try {
      hapticLight();
      analytics.trackEvent('Friends_InvitePrayerBuddy_Pressed');
      handleInviteFriends();
    } catch (err) {
      // noop
    }
  };

  const handleRefresh = () => {
    hapticLight();
    analytics.trackEvent('Friends_Pending_Refresh');
  };

  const handleNudge = () => {
    hapticLight();
    analytics.trackEvent('Friends_Pending_Nudge');
    handleInvite();
  };

  const handleSendNudge = async (friendId: string, friendName: string) => {
    try {
      hapticLight();
      appLog('[FriendsScreen] Sending nudge to friend:', friendId);
      
      // Simulate nudge for dev purposes
      if (__DEV__ && viewState === 'connected') {
        simulateNudgeSent(friendId, friendName);
        return;
      }
      
      const success = await sendPrayerBuddyNudge(friendId);
      
      if (success) {
        analytics.logEvent('prayer_buddy_nudge_sent_ui', {
          friendId,
          friendName,
          userId: user.id
        });
        
        // TODO: Show success toast/feedback
        appLog('[FriendsScreen] Nudge sent successfully');
      } else {
        // TODO: Show error toast/feedback
        appLog('[FriendsScreen] Failed to send nudge');
      }
    } catch (error) {
      console.error('[FriendsScreen] Error sending nudge:', error);
      // TODO: Show error toast/feedback
    }
  };

  // Simulation functions for dev/demo purposes
  const simulateCloudNotification = (friend: SimulatedFriend, currentUserName: string = 'You') => {
    // Trigger haptic feedback
    hapticLight();
    
    // Simulate Firebase Cloud Function call
    console.log('🔵 [CloudFunction] Prayer Nudge Request Started');
    appLog(`[CloudFunction] Sending prayer nudge notification to ${friend.friendUsername}`);
    appLog(`[CloudFunction] FCM Token: ${friend.fcmToken}`);
    
    const notificationPayload = {
      to: friend.fcmToken,
      notification: {
        title: '🐑 Your prayer buddy is thinking of you!',
        body: `${currentUserName} sent you a gentle nudge to spend time with the Shepherd today.`,
        sound: 'default',
        badge: 1,
        priority: 'high'
      },
      data: {
        type: 'prayer_buddy_nudge',
        senderId: user?.id || 'current_user',
        senderName: currentUserName,
        recipientUsername: friend.friendUsername,
        timestamp: new Date().toISOString(),
      }
    };
    
    console.log('📤 [CloudFunction] Notification payload:', notificationPayload);
    appLog(`[CloudFunction] Notification payload:`, notificationPayload);

    // Simulate cloud function processing time and response
    setTimeout(() => {
      console.log('✅ [CloudFunction] Notification sent successfully');
      appLog(`[CloudFunction] ✅ Notification sent successfully to ${friend.friendUsername}`);
      
      // Simulate analytics tracking
      analytics.logEvent('prayer_nudge_cloud_notification_sent', {
        senderId: user?.id || 'current_user',
        recipientId: friend.friendId,
        recipientUsername: friend.friendUsername,
        timestamp: new Date().toISOString()
      });
      
      // Simulate the receiving user getting the notification
      const receivedNotification = {
        id: `cloud_nudge_${Date.now()}`,
        type: 'nudge_received' as const,
        title: '🐑 Your prayer buddy is thinking of you!',
        message: `${currentUserName} sent you a gentle nudge to spend time with the Shepherd today.`,
        timestamp: new Date(),
        friendName: currentUserName,
        isRead: false,
      };
      
      setNotifications(prev => [receivedNotification, ...prev]);
      console.log('📱 [Simulation] Friend received notification on their device');
    }, 1200); // Simulate realistic network delay
  };

  const simulateNudgeSent = (friendId: string, friendName: string) => {
    const friend = simulatedFriends.find(f => f.friendId === friendId);
    if (!friend) return;

    // Simulate cloud notification
    simulateCloudNotification(friend, user?.displayName || 'Your Prayer Buddy');
    
    // Show immediate feedback
    Alert.alert(
      '🐑 Prayer Nudge Sent!',
      `${friendName} (@${friend.friendUsername}) will receive a cloud notification encouraging them to spend time with the Shepherd.`,
      [
        { text: 'Great!', style: 'default' },
        { 
          text: 'View Logs', 
          style: 'default', 
          onPress: () => {
            // In real app, this could open a debug panel
            console.log('Cloud notification logs would appear here');
          }
        }
      ]
    );
    
    // Update friend's last nudge time and our sent time
    setSimulatedFriends(prev => prev.map(f => 
      f.friendId === friendId 
        ? { ...f, lastNudgeReceived: new Date(), lastNudgeSent: new Date() }
        : f
    ));
  };

  const simulateFriendshipCreated = () => {
    const uniqueId = Date.now();
    const randomNames = [
      { display: 'Alex Rivera', username: `alex_devoted_${uniqueId}` },
      { display: 'Emma Thompson', username: `emma_faithful_${uniqueId}` },
      { display: 'David Kim', username: `david_walks_${uniqueId}` },
      { display: 'Sofia Martinez', username: `sofia_prays_${uniqueId}` },
      { display: 'Noah Wilson', username: `noah_believes_${uniqueId}` },
    ];
    
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    
    const newFriend: SimulatedFriend = {
      id: `sim_friend_${uniqueId}`,
      friendId: `user_${randomName.username}`,
      friendDisplayName: randomName.display,
      friendUsername: randomName.username, // Unique username with timestamp
      friendAvatar: null,
      status: 'accepted' as const,
      lastActiveAt: new Date(),
      streak: Math.floor(Math.random() * 10) + 1,
      level: Math.floor(Math.random() * 5) + 1,
      totalReadingDays: Math.floor(Math.random() * 20) + 1,
      isPrayerBuddy: false,
      lastNudgeReceived: null,
      lastNudgeSent: null,
      fcmToken: `fake_fcm_token_${uniqueId}`,
      createdAt: { toDate: () => new Date() },
    };

    setSimulatedFriends(prev => [...prev, newFriend]);

    // Add friendship notification
    const notification = {
      id: `friend_${uniqueId}`,
      type: 'friend_accepted' as const,
      title: '🎉 New Prayer Buddy!',
      message: `${newFriend.friendDisplayName} (@${newFriend.friendUsername}) is now your prayer buddy. Encourage each other on your faith journey!`,
      timestamp: new Date(),
      friendName: newFriend.friendDisplayName,
      isRead: false,
    };

    setNotifications(prev => [notification, ...prev]);

    Alert.alert(
      '🎉 New Friend Added!',
      `${newFriend.friendDisplayName} (@${newFriend.friendUsername}) has joined your prayer circle! They'll receive a welcome notification.`,
      [{ text: 'Awesome!', style: 'default' }]
    );
  };

  const simulateStreakMilestone = (friendName: string, streak: number) => {
    const notification = {
      id: `streak_${Date.now()}`,
      type: 'streak_milestone' as const,
      title: `🔥 ${friendName} hit ${streak} days!`,
      message: `Your prayer buddy is on fire! Send them some encouragement.`,
      timestamp: new Date(),
      friendName,
      isRead: false,
    };

    setNotifications(prev => [notification, ...prev]);
  };

  // Show error if any
  if (error) {
    return (
      <ScrollView className="flex-1 bg-surfaceCream px-6 pt-24">
        <View className="bg-lightRed border border-darkRed rounded-card p-6 m-4">
          <Text className="text-darkRed font-din text-body text-center">{error}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surfaceCream px-6 pt-24" contentContainerStyle={{ paddingBottom: 56 }}>
      {/* Header with Gems */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="font-feather text-h2 text-textPrimary">
            Your Flock
          </Text>
          <Text className="text-body font-din text-description mt-1">
            {getFriendsCount()} friends • {incomingInvites.length} pending
          </Text>
        </View>
        <TouchableOpacity onPress={handleGemsPress} className="flex-row items-center bg-surfaceCreamLight rounded-full border border-[#eed39d] px-3 py-1.5">
          <Image source={require('../../assets/icons/greenGemIcon.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
          <Text className="font-feather text-textPrimary ml-1">{gems ?? 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Dev-only state switcher */}
      {__DEV__ && (
        <View className="mb-4">
          <View className="flex-row items-center justify-center mb-2 gap-2">
          {([
            { id: 'invite', label: 'Need Invite' },
            { id: 'pending', label: 'Pending' },
            { id: 'connected', label: 'Connected' },
          ] as { id: FriendsViewState; label: string }[]).map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setViewState(opt.id)}
              className={`px-3 py-1.5 rounded-full border ${
                viewState === opt.id ? 'bg-accentGold border-buttonBorder' : 'bg-surfaceCreamLight border-[#eed39d]'
              }`}
            >
              <Text className={`font-din ${viewState === opt.id ? 'text-white' : 'text-textPrimary/80'}`}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          </View>
        </View>
      )}

      {/* Add Invite Button for existing friends */}
      {getFriendsCount() > 0 && (
        <View className="mb-6">
          <Pressable
            onPress={handleInviteFriends}
            className="bg-accentGold rounded-card px-6 py-3"
            style={Platform.select({
              ios: {
                shadowColor: '#F7B500',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 1,
                shadowRadius: 0,
              },
              android: {
                elevation: 5,
              },
            })}
          >
            <Text className="text-body font-feather text-textPrimary text-center">+ Invite More Friends</Text>
          </Pressable>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 justify-center items-center py-8">
          <ActivityIndicator size="large" color="#FCD34D" />
          <Text className="text-body font-din text-description mt-4">
            Loading your flock...
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          {/* Incoming Friend Requests */}
          {incomingInvites.length > 0 && (
            <View className="mb-6">
              <Text className="text-heading font-feather text-textPrimary mb-4">
                Friend Requests ({incomingInvites.length})
              </Text>
              <FlatList
                data={incomingInvites}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FriendItem
                    friend={item}
                    isIncomingRequest={true}
                    onAccept={() => handleAcceptRequest(item.userId)}
                    onDecline={() => handleDeclineRequest(item.userId)}
                  />
                )}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Friends List */}
          {friends.length > 0 ? (
            <View className="mb-6">
              <Text className="text-heading font-feather text-textPrimary mb-4">
                Friends ({friends.length})
              </Text>
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FriendItem 
                    friend={item} 
                    onNudge={() => handleSendNudge(
                      item.friendId || item.userId, 
                      item.friendDisplayName || item.friendUsername || 'Friend'
                    )}
                  />
                )}
                scrollEnabled={false}
              />
            </View>
          ) : (
            <></>
          )}

          {/* Outgoing Requests */}
          {outgoingInvites.length > 0 && (
            <View className="mb-6">
              <Text className="text-heading font-feather text-textPrimary mb-4">
                Pending Invites ({outgoingInvites.length})
              </Text>
              <FlatList
                data={outgoingInvites}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View className="bg-lightYellow border border-pillBorder rounded-card p-4 mb-3">
                    <Text className="text-body font-din text-textPrimary">
                      Invite sent to {item.friendDisplayName || 'friend'}
                    </Text>
                  </View>
                )}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      )}

      {/* Connected state - Simulated Friends */}
      {viewState === 'connected' && (
        <View className="flex-1">
    
          {/* Prayer Buddy Section */}
          {simulatedFriends.find(f => f.isPrayerBuddy) && (
            <View className="mb-6">
              <Text className="text-heading font-feather text-textPrimary mb-4">
                Your Prayer Buddy
              </Text>
              {(() => {
                const prayerBuddy = simulatedFriends.find(f => f.isPrayerBuddy)!;
                return (
                  <View className="bg-surfaceCreamLight rounded-card p-6 border border-pillBorder" style={Platform.select({
                    ios: {
                      shadowColor: 'rgba(0,0,0,0.08)',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 4,
                    },
                    android: {
                      elevation: 2,
                    },
                  })}>
                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="text-heading font-feather text-textPrimary">
                            {prayerBuddy.friendDisplayName}
                          </Text>
                          <View className="bg-accentGold rounded-full px-2 py-0.5 ml-2">
                            <Text className="text-caption font-din text-textPrimary">Buddy</Text>
                          </View>
                        </View>
                        <Text className="text-body font-din text-description mt-1">
                          @{prayerBuddy.friendUsername}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-caption font-din text-description">
                          {prayerBuddy.lastActiveAt.getTime() > Date.now() - 60 * 60 * 1000 ? '🟢 Active now' : '🟡 Recently active'}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="flex-row justify-between mb-4">
                      <View className="items-center">
                        <Text className="text-h3 font-feather text-textPrimary">{prayerBuddy.streak}</Text>
                        <Text className="text-caption font-din text-description">Day Streak</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-h3 font-feather text-textPrimary">LVL {prayerBuddy.level}</Text>
                        <Text className="text-caption font-din text-description">Lamb Level</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-h3 font-feather text-textPrimary">{prayerBuddy.totalReadingDays}</Text>
                        <Text className="text-caption font-din text-description">Total Days</Text>
                      </View>
                    </View>


                    {/* Send Prayer Nudge Button */}
                    <PrimaryButton
                      onPress={() => handleSendNudge(prayerBuddy.friendId, prayerBuddy.friendDisplayName)}
                      buttonType="blue"
                      buttonHeight={52}
                      width="100%"
                      title="Send Prayer Nudge"

                      />
                  </View>
                );
              })()}
            </View>
          )}
        </View>
      )}

      {/* Pending state */}
      {viewState === 'pending' && (
        <View className="mt-8 bg-surfaceCreamLight rounded-2xl p-5 shadow-card border border-[#eed39d]">
          <Text className="font-feather text-h3 text-textPrimary mb-2 text-center pt-4">Invitation sent</Text>
          <Text className="font-din text-textPrimary/70 text-center">Your friend hasn&#39;t joined yet. Give them a gentle nudge!</Text>
          <View className="flex-row items-stretch mt-5 gap-3 pb-2">
            <View className="flex-1">
              <PrimaryButton title="Refresh" onPress={handleRefresh} buttonType="default" buttonHeight={52} width="100%" />
            </View>
            <View className="flex-1">
              <PrimaryButton title="Nudge" onPress={handleNudge} buttonType="blue" buttonHeight={52} width="100%" />
            </View>
          </View>
        </View>
      )}

      {/* Invite state */}
      {viewState === 'invite' && (
        <View className="rounded-2xl p-0 shadow-none bg-transparent mt-12">
          <View className="rounded-2xl p-5" style={{ borderStyle: 'dashed', borderColor: '#DCB280', borderWidth: 2 }}>
            <Text className="font-feather text-h3 text-textPrimary mb-2 text-center">Reserve a spot</Text>
            <Text className="font-din text-textPrimary/70 text-center">1 spot reserved • You&#39;re 3x more likely to be consistent with a friend</Text>
            <View className="mt-5">
              <PrimaryButton title="Invite prayer buddy" onPress={handleInvite} buttonType="blue" buttonHeight={52} />
            </View>
          </View>
        </View>
      )}

      {/* Placeholder for future friends list */}
      <View className="mt-6">
        <Text className="font-din text-textPrimary/50">More friends coming soon...</Text>
      </View>

      {/* Invite Friends Sheet */}
      <InviteFriendsSheet ref={inviteSheetRef} />
    </ScrollView>
  );
}

