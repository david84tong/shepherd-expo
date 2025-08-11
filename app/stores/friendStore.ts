import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import auth from '@react-native-firebase/auth';
import { Friend, InviteLink, FriendInvite } from '../models/Friend';
import { appLog } from '../helper/helper';
import analytics from '~/utils/analytics';
import appsFlyerService from '../services/appsflyerService';

interface FriendState {
  friends: Friend[];
  incomingInvites: Friend[];
  outgoingInvites: Friend[];
  inviteLinks: InviteLink[];
  pendingInvite: FriendInvite | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFriends: () => Promise<void>;
  sendFriendRequest: (friendId: string) => Promise<boolean>;
  acceptFriendRequest: (friendId: string) => Promise<boolean>;
  declineFriendRequest: (friendId: string) => Promise<boolean>;
  createInviteLink: () => Promise<string | null>;
  getInviteLink: () => Promise<string | null>;
  handleInviteFromDeepLink: (inviteCode: string, appsflyerData?: any) => Promise<boolean>;
  setPendingInvite: (invite: FriendInvite | null) => void;
  processPendingInvite: () => Promise<boolean>;
  clearPendingInvite: () => void;
  getFriendsCount: () => number;
  sendPrayerBuddyNudge: (friendId: string) => Promise<boolean>;
  resetStore: () => void;
}

// Firebase collection names
const FRIENDS_COLLECTION = 'friends';
const INVITE_LINKS_COLLECTION = 'inviteLinks';
const USERS_COLLECTION = 'users';

const generateInviteCode = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useFriendStore = create<FriendState>()(
  persist(
    (set, get) => ({
      friends: [],
      incomingInvites: [],
      outgoingInvites: [],
      inviteLinks: [],
      pendingInvite: null,
      isLoading: false,
      error: null,

      loadFriends: async () => {
        const currentUser = auth().currentUser;
        if (!currentUser) {
          appLog('[FriendStore] No authenticated user, skipping friend load');
          return;
        }

        try {
          set({ isLoading: true, error: null });
          appLog('[FriendStore] Loading friends for user:', currentUser.uid);

          // Load friends where user is either the requester or the receiver
          const friendsSnapshot = await firestore()
            .collection(FRIENDS_COLLECTION)
            .where('userId', '==', currentUser.uid)
            .get();

          const receivedRequestsSnapshot = await firestore()
            .collection(FRIENDS_COLLECTION)
            .where('friendId', '==', currentUser.uid)
            .get();

          const friends: Friend[] = [];
          const incomingInvites: Friend[] = [];
          const outgoingInvites: Friend[] = [];

          // Process sent requests and enrich with user data
          for (const doc of friendsSnapshot.docs) {
            const friendData = { id: doc.id, ...doc.data() } as Friend;
            
            // Get friend's user data if not already stored
            if (!friendData.friendDisplayName && friendData.friendId) {
              try {
                const friendUserDoc = await firestore()
                  .collection(USERS_COLLECTION)
                  .doc(friendData.friendId)
                  .get();
                
                if (friendUserDoc.exists) {
                  const userData = friendUserDoc.data();
                  friendData.friendDisplayName = userData?.displayName;
                  friendData.friendUsername = userData?.username;
                  friendData.friendAvatar = userData?.avatar;
                }
              } catch (error) {
                appLog('[FriendStore] Error loading friend user data:', error);
              }
            }
            
            if (friendData.status === 'accepted') {
              friends.push(friendData);
            } else if (friendData.status === 'pending') {
              outgoingInvites.push(friendData);
            }
          }

          // Process received requests and enrich with user data  
          for (const doc of receivedRequestsSnapshot.docs) {
            const friendData = { id: doc.id, ...doc.data() } as Friend;
            
            // Get inviter's user data if not already stored
            if (!friendData.friendDisplayName && friendData.userId) {
              try {
                const inviterUserDoc = await firestore()
                  .collection(USERS_COLLECTION)
                  .doc(friendData.userId)
                  .get();
                
                if (inviterUserDoc.exists) {
                  const userData = inviterUserDoc.data();
                  friendData.friendDisplayName = userData?.displayName;
                  friendData.friendUsername = userData?.username;
                  friendData.friendAvatar = userData?.avatar;
                }
              } catch (error) {
                appLog('[FriendStore] Error loading inviter user data:', error);
              }
            }
            
            if (friendData.status === 'accepted') {
              friends.push(friendData);
            } else if (friendData.status === 'pending') {
              incomingInvites.push(friendData);
            }
          }

          // Load invite links
          const inviteLinksSnapshot = await firestore()
            .collection(INVITE_LINKS_COLLECTION)
            .where('userId', '==', currentUser.uid)
            .where('isActive', '==', true)
            .get();

          const inviteLinks = inviteLinksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as InviteLink[];

          set({
            friends,
            incomingInvites,
            outgoingInvites,
            inviteLinks,
            isLoading: false
          });

          appLog('[FriendStore] Loaded friends:', {
            friendsCount: friends.length,
            incomingCount: incomingInvites.length,
            outgoingCount: outgoingInvites.length,
            inviteLinksCount: inviteLinks.length
          });

        } catch (error) {
          appLog('[FriendStore] Error loading friends:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to load friends', isLoading: false });
        }
      },

      sendFriendRequest: async (friendId: string) => {
        const currentUser = auth().currentUser;
        if (!currentUser || friendId === currentUser.uid) {
          return false;
        }

        try {
          const friendRequest: Omit<Friend, 'id'> = {
            userId: currentUser.uid,
            friendId,
            status: 'pending',
            createdAt: firestore.Timestamp.now(),
            updatedAt: firestore.Timestamp.now(),
          };

          await firestore().collection(FRIENDS_COLLECTION).add(friendRequest);
          
          analytics.logEvent('friend_request_sent', {
            friendId,
            userId: currentUser.uid
          });

          // Reload friends to update UI
          await get().loadFriends();
          return true;
        } catch (error) {
          appLog('[FriendStore] Error sending friend request:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to send friend request' });
          return false;
        }
      },

      acceptFriendRequest: async (friendId: string) => {
        const currentUser = auth().currentUser;
        if (!currentUser) return false;

        try {
          // Find the friend request where current user is the receiver
          const friendRequestSnapshot = await firestore()
            .collection(FRIENDS_COLLECTION)
            .where('userId', '==', friendId)
            .where('friendId', '==', currentUser.uid)
            .where('status', '==', 'pending')
            .get();

          if (friendRequestSnapshot.empty) {
            throw new Error('Friend request not found');
          }

          const friendRequestDoc = friendRequestSnapshot.docs[0];
          await friendRequestDoc.ref.update({
            status: 'accepted',
            updatedAt: firestore.Timestamp.now()
          });

          analytics.logEvent('friend_request_accepted', {
            friendId,
            userId: currentUser.uid
          });

          await get().loadFriends();
          return true;
        } catch (error) {
          appLog('[FriendStore] Error accepting friend request:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to accept friend request' });
          return false;
        }
      },

      declineFriendRequest: async (friendId: string) => {
        const currentUser = auth().currentUser;
        if (!currentUser) return false;

        try {
          const friendRequestSnapshot = await firestore()
            .collection(FRIENDS_COLLECTION)
            .where('userId', '==', friendId)
            .where('friendId', '==', currentUser.uid)
            .where('status', '==', 'pending')
            .get();

          if (friendRequestSnapshot.empty) {
            throw new Error('Friend request not found');
          }

          const friendRequestDoc = friendRequestSnapshot.docs[0];
          await friendRequestDoc.ref.update({
            status: 'declined',
            updatedAt: firestore.Timestamp.now()
          });

          analytics.logEvent('friend_request_declined', {
            friendId,
            userId: currentUser.uid
          });

          await get().loadFriends();
          return true;
        } catch (error) {
          appLog('[FriendStore] Error declining friend request:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to decline friend request' });
          return false;
        }
      },

      createInviteLink: async () => {
        const currentUser = auth().currentUser;
        if (!currentUser) return null;

        try {
          const inviteCode = generateInviteCode();
          
          const inviteLink: Omit<InviteLink, 'id'> = {
            userId: currentUser.uid,
            inviteCode,
            appsflyerLink: '',
            clickCount: 0,
            installs: 0,
            friendsAdded: [],
            createdAt: firestore.Timestamp.now(),
            isActive: true
          };

          const docRef = await firestore().collection(INVITE_LINKS_COLLECTION).add(inviteLink);
          
          analytics.logEvent('invite_link_created', {
            inviteCode,
            userId: currentUser.uid
          });

          await get().loadFriends();
          return inviteCode;
        } catch (error) {
          appLog('[FriendStore] Error creating invite link:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to create invite link' });
          return null;
        }
      },

      getInviteLink: async () => {
        const { inviteLinks } = get();
        if (inviteLinks.length > 0) {
          return inviteLinks[0].inviteCode;
        }
        return await get().createInviteLink();
      },

      handleInviteFromDeepLink: async (inviteCode: string, appsflyerData?: any) => {
        const currentUser = auth().currentUser;
        appLog('[FriendStore] Handling invite from deep link:', { 
          inviteCode, 
          appsflyerData: {
            ...appsflyerData,
            // Don't log sensitive data in production
            clickId: appsflyerData?.clickId ? '[REDACTED]' : undefined
          }, 
          currentUser: !!currentUser 
        });

        try {
          // Find the invite link
          const inviteLinkSnapshot = await firestore()
            .collection(INVITE_LINKS_COLLECTION)
            .where('inviteCode', '==', inviteCode)
            .where('isActive', '==', true)
            .get();

          if (inviteLinkSnapshot.empty) {
            appLog('[FriendStore] Invite link not found or inactive');
            return false;
          }

          const inviteLinkDoc = inviteLinkSnapshot.docs[0];
          const inviteLink = inviteLinkDoc.data() as InviteLink;

          // Get inviter's info
          const inviterSnapshot = await firestore()
            .collection(USERS_COLLECTION)
            .doc(inviteLink.userId)
            .get();

          if (!inviterSnapshot.exists) {
            appLog('[FriendStore] Inviter user not found');
            return false;
          }

          const inviterData = inviterSnapshot.data();
          const pendingInvite: FriendInvite = {
            inviteCode,
            inviterUserId: inviteLink.userId,
            inviterDisplayName: inviterData?.displayName || 'Unknown User',
            inviterUsername: inviterData?.username,
            appsflyerClickId: appsflyerData?.clickId,
            createdAt: firestore.Timestamp.now()
          };

          // If user is logged in, process immediately
          if (currentUser) {
            // Check if they're the same user
            if (currentUser.uid === inviteLink.userId) {
              appLog('[FriendStore] User cannot invite themselves');
              return false;
            }

            // Check if already friends or have pending request
            const [sentRequests, receivedRequests] = await Promise.all([
              firestore()
                .collection(FRIENDS_COLLECTION)
                .where('userId', '==', currentUser.uid)
                .where('friendId', '==', inviteLink.userId)
                .get(),
              firestore()
                .collection(FRIENDS_COLLECTION)
                .where('userId', '==', inviteLink.userId)
                .where('friendId', '==', currentUser.uid)
                .get()
            ]);

            const existingFriendship = [...sentRequests.docs, ...receivedRequests.docs];

            if (existingFriendship.length > 0) {
              const existingFriend = existingFriendship[0].data() as Friend;
              appLog('[FriendStore] Users are already friends or have pending request', {
                status: existingFriend.status,
                inviteCode
              });
              
              // If they're already friends, still return true but don't create duplicate
              if (existingFriend.status === 'accepted') {
                analytics.logEvent('invite_already_friends', {
                  inviteCode,
                  inviterUserId: inviteLink.userId,
                  inviteeUserId: currentUser.uid
                });
                return true; // Consider this successful - they're already friends
              }
              
              return false;
            }

            // Create friendship
            const friendship: Omit<Friend, 'id'> = {
              userId: inviteLink.userId,
              friendId: currentUser.uid,
              status: 'accepted',
              createdAt: firestore.Timestamp.now(),
              updatedAt: firestore.Timestamp.now(),
              inviteCode,
              invitedVia: 'appsflyer',
              appsflyerClickId: appsflyerData?.clickId,
              inviteMetadata: appsflyerData
            };

            await firestore().collection(FRIENDS_COLLECTION).add(friendship);

            // Update invite link stats
            await inviteLinkDoc.ref.update({
              friendsAdded: firestore.FieldValue.arrayUnion(currentUser.uid),
              installs: firestore.FieldValue.increment(1)
            });

            analytics.logEvent('friend_added_via_invite', {
              inviteCode,
              inviterUserId: inviteLink.userId,
              inviteeUserId: currentUser.uid,
              source: 'appsflyer'
            });

            // Track with AppsFlyer
            if (appsflyerData?.clickId) {
              await appsFlyerService.trackInviteAccepted(inviteCode, inviteLink.userId);
            }

            await get().loadFriends();
            return true;
          } else {
            // Store pending invite for when user logs in
            set({ pendingInvite });
            appLog('[FriendStore] Stored pending invite for later processing');
            return true;
          }
        } catch (error) {
          appLog('[FriendStore] Error handling invite from deep link:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to process invite' });
          return false;
        }
      },

      setPendingInvite: (invite: FriendInvite | null) => {
        set({ pendingInvite: invite });
      },

      processPendingInvite: async () => {
        const { pendingInvite } = get();
        const currentUser = auth().currentUser;

        if (!pendingInvite || !currentUser) {
          return false;
        }

        appLog('[FriendStore] Processing pending invite:', pendingInvite);

        try {
          // Check if they're the same user
          if (currentUser.uid === pendingInvite.inviterUserId) {
            appLog('[FriendStore] User cannot invite themselves');
            get().clearPendingInvite();
            return false;
          }

          // Check if already friends or have pending request
          const [sentRequests, receivedRequests] = await Promise.all([
            firestore()
              .collection(FRIENDS_COLLECTION)
              .where('userId', '==', currentUser.uid)
              .where('friendId', '==', pendingInvite.inviterUserId)
              .get(),
            firestore()
              .collection(FRIENDS_COLLECTION)
              .where('userId', '==', pendingInvite.inviterUserId)
              .where('friendId', '==', currentUser.uid)
              .get()
          ]);

          const existingFriendship = [...sentRequests.docs, ...receivedRequests.docs];

          if (existingFriendship.length > 0) {
            appLog('[FriendStore] Users are already friends or have pending request');
            get().clearPendingInvite();
            return false;
          }

          // Create friendship
          const friendship: Omit<Friend, 'id'> = {
            userId: pendingInvite.inviterUserId,
            friendId: currentUser.uid,
            status: 'accepted',
            createdAt: firestore.Timestamp.now(),
            updatedAt: firestore.Timestamp.now(),
            inviteCode: pendingInvite.inviteCode,
            invitedVia: 'appsflyer',
            appsflyerClickId: pendingInvite.appsflyerClickId
          };

          await firestore().collection(FRIENDS_COLLECTION).add(friendship);

          // Update invite link stats
          const inviteLinkSnapshot = await firestore()
            .collection(INVITE_LINKS_COLLECTION)
            .where('inviteCode', '==', pendingInvite.inviteCode)
            .get();

          if (!inviteLinkSnapshot.empty) {
            await inviteLinkSnapshot.docs[0].ref.update({
              friendsAdded: firestore.FieldValue.arrayUnion(currentUser.uid),
              installs: firestore.FieldValue.increment(1)
            });
          }

          analytics.logEvent('friend_added_via_invite', {
            inviteCode: pendingInvite.inviteCode,
            inviterUserId: pendingInvite.inviterUserId,
            inviteeUserId: currentUser.uid,
            source: 'appsflyer_deferred'
          });

          get().clearPendingInvite();
          await get().loadFriends();
          return true;
        } catch (error) {
          appLog('[FriendStore] Error processing pending invite:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to process pending invite' });
          return false;
        }
      },

      clearPendingInvite: () => {
        set({ pendingInvite: null });
      },

      getFriendsCount: () => {
        return get().friends.length;
      },

      sendPrayerBuddyNudge: async (friendId: string) => {
        const currentUser = auth().currentUser;
        if (!currentUser) {
          appLog('[FriendStore] No authenticated user, cannot send nudge');
          return false;
        }

        try {
          appLog('[FriendStore] Sending prayer buddy nudge to:', friendId);
          
          // Call the cloud function to send the nudge
          const sendNudge = functions().httpsCallable('sendPrayerBuddyNudge');
          const result = await sendNudge({ targetUserId: friendId });
          
          if (result.data && (result.data as { success: boolean }).success) {
            appLog('[FriendStore] Prayer buddy nudge sent successfully');
            analytics.logEvent('prayer_buddy_nudge_sent', {
              senderUserId: currentUser.uid,
              targetUserId: friendId,
            });
            return true;
          } else {
            appLog('[FriendStore] Failed to send prayer buddy nudge:', (result.data as { message: string }).message);
            return false;
          }
        } catch (error) {
          console.error('[FriendStore] Error sending prayer buddy nudge:', error);
          return false;
        }
      },

      resetStore: () => {
        set({
          friends: [],
          incomingInvites: [],
          outgoingInvites: [],
          inviteLinks: [],
          pendingInvite: null,
          isLoading: false,
          error: null
        });
      }
    }),
    {
      name: 'friend-store',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);