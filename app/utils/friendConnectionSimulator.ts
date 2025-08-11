import firestore from '@react-native-firebase/firestore';
import { appLog } from '../helper/helper';

/**
 * Utility for simulating friend connections in development
 * This helps test the prayer buddy nudge functionality
 */

interface SimulatedUser {
  id: string;
  username: string;
  displayName: string;
  fcmToken?: string;
}

export class FriendConnectionSimulator {
  /**
   * Create two simulated users for testing friend connections
   */
  static async createSimulatedUsers(): Promise<SimulatedUser[]> {
    // Generate unique usernames with timestamp to avoid conflicts
    const timestamp = Date.now().toString().slice(-6);
    
    const users: SimulatedUser[] = [
      {
        id: `sim_user_1_${timestamp}`,
        username: `prayerbuddy1_${timestamp}`,
        displayName: 'Prayer Buddy Alpha',
        fcmToken: `simulated_fcm_token_1_${timestamp}`
      },
      {
        id: `sim_user_2_${timestamp}`, 
        username: `prayerbuddy2_${timestamp}`,
        displayName: 'Prayer Buddy Beta',
        fcmToken: `simulated_fcm_token_2_${timestamp}`
      }
    ];

    try {
      // Create user documents in Firestore
      for (const user of users) {
        await firestore().collection('users').doc(user.id).set({
          ...user,
          email: `${user.username}@example.com`,
          spiritualGoal: 'Walk',
          experienceLevel: 'new',
          frequencyGoal: 'daily',
          covenantProgress: {
            currentStreak: 0,
            targetDays: 0,
            progress: 0,
            state: 'NOT_STARTED',
          },
          denomination: '',
          selectedPathId: 'chronological',
          lamb: {
            level: 1,
            xp: 0,
            mood: 'lamb-idle',
            hearts: 50,
            name: `${user.displayName}'s Lamb`,
            skin: 'default',
          },
          lastActivityDate: firestore.FieldValue.serverTimestamp(),
          lastReadingDate: firestore.FieldValue.serverTimestamp(),
          lastPrayerDate: firestore.FieldValue.serverTimestamp(),
          lastReflectionDate: firestore.FieldValue.serverTimestamp(),
          lastReadingPenaltyDate: firestore.FieldValue.serverTimestamp(),
          lastPrayerPenaltyDate: firestore.FieldValue.serverTimestamp(),
          lastReflectionPenaltyDate: firestore.FieldValue.serverTimestamp(),
          notificationTime: '19:00',
          streakCount: 1,
          versesReadTotal: 10,
          chaptersReadTotal: 2,
          bibleVersion: 'ESV',
          proStatus: 'free',
          gens: 200,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          completedReflections: [],
          completedPrayers: [],
          completedReadings: [],
          ageRange: '18-24',
          isProFromOnboarding: false,
          hasSeenWidgetModal: false,
          hasSeenBibleReaderTutorial: false,
          level: 1,
          xp: 0,
          streak: 1,
          streakFreezes: 2,
          streakFreezeUsedDates: [],
          isPro: false,
          isProWithReferral: false,
          completedMapPaths: [],
          skins: [],
          checkIns: [],
          customDevotionals: [],
          customDevotionalsLeft: 0,
        });
      }

      appLog('[Simulator] Created simulated users:', users);
      return users;
    } catch (error) {
      console.error('[Simulator] Error creating simulated users:', error);
      throw error;
    }
  }

  /**
   * Simulate a friend connection between two users
   */
  static async simulateFriendConnection(user1Id: string, user2Id: string): Promise<boolean> {
    try {
      // Create friendship documents (bidirectional)
      const friendshipId1 = `${user1Id}_${user2Id}`;
      const friendshipId2 = `${user2Id}_${user1Id}`;

      // User 1 -> User 2 friendship
      await firestore().collection('friends').doc(friendshipId1).set({
        userId: user1Id,
        friendId: user2Id,
        status: 'accepted',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        invitedVia: 'direct',
      });

      // User 2 -> User 1 friendship  
      await firestore().collection('friends').doc(friendshipId2).set({
        userId: user2Id,
        friendId: user1Id,
        status: 'accepted',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        invitedVia: 'direct',
      });

      appLog(`[Simulator] Created friendship between ${user1Id} and ${user2Id}`);
      return true;
    } catch (error) {
      console.error('[Simulator] Error creating friendship:', error);
      return false;
    }
  }

  /**
   * Simulate the complete flow: create users and connect them as friends
   */
  static async simulateCompleteFlow(): Promise<{ users: SimulatedUser[]; connected: boolean }> {
    try {
      appLog('[Simulator] Starting complete friend connection simulation...');

      // Create simulated users
      const users = await this.createSimulatedUsers();

      // Connect them as friends
      const connected = await this.simulateFriendConnection(users[0].id, users[1].id);

      appLog('[Simulator] Simulation complete', {
        users: users.map(u => ({ id: u.id, username: u.username })),
        connected
      });

      return { users, connected };
    } catch (error) {
      console.error('[Simulator] Error in complete simulation:', error);
      throw error;
    }
  }

  /**
   * Clean up simulated data
   */
  static async cleanupSimulatedData(userIds?: string[]): Promise<void> {
    try {
      let idsToClean = userIds;
      
      // If no specific IDs provided, find all simulated users
      if (!idsToClean) {
        const usersSnapshot = await firestore()
          .collection('users')
          .where('username', '>=', 'prayerbuddy1_')
          .where('username', '<=', 'prayerbuddy2_\uf8ff')
          .get();
        
        idsToClean = usersSnapshot.docs.map(doc => doc.id);
      }

      // Delete user documents
      for (const userId of idsToClean) {
        await firestore().collection('users').doc(userId).delete();
      }

      // Delete friendship documents
      const friendshipsSnapshot = await firestore()
        .collection('friends')
        .where('userId', 'in', idsToClean.length > 0 ? idsToClean : ['dummy'])
        .get();
      
      for (const doc of friendshipsSnapshot.docs) {
        await doc.ref.delete();
      }

      // Also check reverse friendships
      if (idsToClean.length > 0) {
        const reverseFriendshipsSnapshot = await firestore()
          .collection('friends')
          .where('friendId', 'in', idsToClean)
          .get();
        
        for (const doc of reverseFriendshipsSnapshot.docs) {
          await doc.ref.delete();
        }
      }

      appLog(`[Simulator] Cleaned up simulated data for ${idsToClean.length} users`);
    } catch (error) {
      console.error('[Simulator] Error cleaning up simulated data:', error);
    }
  }
}

/**
 * Development-only function to test friend connections
 * Call this from the dev menu or debug panel
 */
export const testFriendConnection = async (): Promise<void> => {
  if (!__DEV__) {
    console.warn('testFriendConnection should only be called in development');
    return;
  }

  try {
    // Clean up any existing simulated data first
    await FriendConnectionSimulator.cleanupSimulatedData();

    // Run the simulation
    const result = await FriendConnectionSimulator.simulateCompleteFlow();

    console.log('🎉 Friend connection simulation completed successfully!');
    console.log('📱 You can now test nudge functionality between these users:');
    console.log(`   • ${result.users[0].username} (${result.users[0].id})`);
    console.log(`   • ${result.users[1].username} (${result.users[1].id})`);
    console.log('💌 Try sending a nudge from one to the other!');
    console.log('🧪 Users have unique usernames and FCM tokens for testing');

    // Store user IDs for cleanup
    const userIds = result.users.map(u => u.id);

    // Optionally, clean up after a delay for testing
    setTimeout(async () => {
      console.log('🧹 Cleaning up simulated data...');
      await FriendConnectionSimulator.cleanupSimulatedData(userIds);
      console.log('✅ Cleanup complete');
    }, 300000); // 5 minutes
  } catch (error) {
    console.error('❌ Friend connection simulation failed:', error);
  }
};

export default FriendConnectionSimulator;