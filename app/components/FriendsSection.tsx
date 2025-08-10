import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFriendStore } from '../stores/friendStore';
import { useUserStore } from '../stores/userStore';
import InviteFriendsSheet, { InviteFriendsSheetRef } from './InviteFriendsSheet';
import analytics from '~/utils/analytics';
import { appLog } from '../helper/helper';
import PrimaryButton from '~/components/PrimaryButton';

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
  return (
    <View className="bg-surfaceCream rounded-card p-6 mb-3" style={{
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 2,
    }}>
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
                {new Date(friend.createdAt.toDate()).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>

        {isIncomingRequest ? (
          <View className="flex-row space-x-2">
            <Pressable
              onPress={onAccept}
              className="bg-accentGold rounded-card px-4 py-2"
              style={{
                shadowColor: '#F7B500',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 5,
              }}
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

const FriendsSection: React.FC = () => {
  const inviteSheetRef = useRef<InviteFriendsSheetRef>(null);
  
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

  useEffect(() => {
    if (user?.id) {
      loadFriends();
    }
  }, [user?.id, loadFriends]);

  const handleAcceptRequest = async (friendId: string) => {
    appLog('[FriendsSection] Accepting friend request from:', friendId);
    const success = await acceptFriendRequest(friendId);
    if (success) {
      analytics.logEvent('friend_request_accepted_ui', {
        friendId,
        userId: user.id
      });
    }
  };

  const handleDeclineRequest = async (friendId: string) => {
    appLog('[FriendsSection] Declining friend request from:', friendId);
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

  if (error) {
    return (
      <View className="bg-lightRed border border-darkRed rounded-card p-6 m-4">
        <Text className="text-darkRed font-din text-body text-center">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View>
          <Text className="text-h2 font-feather text-textPrimary">
            Your Flock
          </Text>
          <Text className="text-body font-din text-description mt-1">
            {getFriendsCount()} friends • {incomingInvites.length} pending
          </Text>
        </View>
        
       {
        getFriendsCount() > 0 && (
          <Pressable
          onPress={handleInviteFriends}
          className="bg-accentGold rounded-card px-6 py-3"
          style={{
            shadowColor: '#F7B500',
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 5,
          }}
        >
          <Text className="text-body font-feather text-textPrimary">+ Invite</Text>
        </Pressable>
        )
       }
      </View>

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
            <View className="flex-1">
              <Text className="text-heading font-feather text-textPrimary mb-4">
                Friends ({friends.length})
              </Text>
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <FriendItem friend={item} />}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-h2 font-feather text-textPrimary mb-3 text-center">
                Start Your Flock!
              </Text>
              
              <PrimaryButton
                title="Invite Your First Friend"
                onPress={handleInviteFriends}
                buttonType="blue"
                width="100%"
                style='rounded-full'
              />
            </View>
          )}

          {/* Outgoing Requests */}
          {outgoingInvites.length > 0 && (
            <View className="mt-6">
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

      {/* Invite Friends Sheet */}
      <InviteFriendsSheet ref={inviteSheetRef} />
    </View>
  );
};

export default FriendsSection;