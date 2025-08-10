import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendDisplayName?: string;
  friendUsername?: string;
  friendAvatar?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  inviteCode?: string;
  invitedVia?: 'link' | 'direct' | 'appsflyer';
  appsflyerClickId?: string;
  inviteMetadata?: Record<string, any>;
}

export interface InviteLink {
  id: string;
  userId: string;
  inviteCode: string;
  appsflyerLink: string;
  clickCount: number;
  installs: number;
  friendsAdded: string[];
  createdAt: FirebaseFirestoreTypes.Timestamp;
  expiresAt?: FirebaseFirestoreTypes.Timestamp;
  isActive: boolean;
}

export interface FriendInvite {
  inviteCode: string;
  inviterUserId: string;
  inviterDisplayName: string;
  inviterUsername?: string;
  appsflyerClickId?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}