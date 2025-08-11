import React, { useEffect, useRef } from 'react';
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
  isIncomingRequest?: boolean;
}

const FriendItem: React.FC<FriendItemProps> = ({ 
  friend, 
  onAccept, 
  onDecline, 
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
    getFriendsCount
  } = useFriendStore();

  const { getUser } = useUserStore();
  const user = getUser();
  
  // Dev-only view states
  type FriendsViewState = 'invite' | 'pending' | 'connected';
  const [viewState, setViewState] = React.useState<FriendsViewState>('invite');

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
        <View className="flex-row items-center justify-center mb-4 gap-2">
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
                renderItem={({ item }) => <FriendItem friend={item} />}
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

      {/* Connected state */}
      {viewState === 'connected' && (
        <View className="bg-surfaceCreamLight rounded-2xl p-4 shadow-card border border-[#eed39d] flex-row items-center">
          <Image source={require('../../assets/icons/profileIcon.png')} style={{ width: 72, height: 72 }} resizeMode="contain" />
          <View className="ml-4 flex-1">
            <Text className="font-feather text-h4 text-textPrimary">Prayer Buddy</Text>
            <Text className="font-din text-textPrimary/70 mt-1" numberOfLines={1}>
              Closest friend • Encourager • Keeps you consistent
            </Text>
            <Text className="font-din text-textPrimary/50 mt-1">
              Your lamb: {lambName || 'Unnamed'} • LVL {lamb?.level ?? 1}
            </Text>
          </View>
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

