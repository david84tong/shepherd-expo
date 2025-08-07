import firestore from '@react-native-firebase/firestore';
import { appLog } from '../app/helper/helper';

export interface MutualFriend {
  id: string;
  displayName: string;
  phoneNumber: string;
  lamb?: {
    level?: number;
    skin?: string;
    xp?: number;
  };
  streakCount?: number;
  lastActivityDate?: any;
}

/**
 * Find mutual friends based on phone numbers
 * @param userContacts Array of phone numbers from user's contacts
 * @param excludePhoneNumber Phone number to exclude (current user)
 * @returns Array of mutual friends found on Shepherd
 */
export const findMutualFriends = async (
  userContacts: string[],
  excludePhoneNumber?: string
): Promise<MutualFriend[]> => {
  try {
    if (!userContacts || userContacts.length === 0) {
      appLog('No contacts provided for mutual friends search');
      return [];
    }

    appLog('Finding mutual friends for contacts:', userContacts.length);
    
    // Query Firestore for users whose phone numbers match our contacts
    // We'll do this in batches to handle Firestore's 'in' query limit of 10
    const batchSize = 10;
    const allMutualFriends: MutualFriend[] = [];
    
    for (let i = 0; i < userContacts.length; i += batchSize) {
      const batch = userContacts.slice(i, i + batchSize);
      
      try {
        const querySnapshot = await firestore()
          .collection('users')
          .where('phoneNumber', 'in', batch)
          .get();
        
        querySnapshot.forEach(doc => {
          const userData = doc.data();
          
          // Don't include the current user
          if (userData.phoneNumber !== excludePhoneNumber && userData.phoneNumber) {
            allMutualFriends.push({
              id: doc.id,
              displayName: userData.displayName || 'Shepherd User',
              phoneNumber: userData.phoneNumber,
              lamb: userData.lamb,
              streakCount: userData.streakCount || 0,
              lastActivityDate: userData.lastActivityDate
            });
          }
        });
      } catch (batchError) {
        console.error('Error in batch query:', batchError);
        // Continue with next batch even if one fails
      }
    }

    // Remove duplicates (in case a user has multiple numbers)
    const uniqueFriends = allMutualFriends.filter((friend, index, self) =>
      index === self.findIndex(f => f.id === friend.id)
    );

    appLog(`Found ${uniqueFriends.length} mutual friends out of ${userContacts.length} contacts`);
    
    return uniqueFriends;
    
  } catch (error) {
    console.error('Error finding mutual friends:', error);
    return [];
  }
};

/**
 * Calculate mutual friends count for analytics or display
 * @param userContacts Array of phone numbers from user's contacts
 * @param excludePhoneNumber Phone number to exclude (current user)
 * @returns Number of mutual friends
 */
export const getMutualFriendsCount = async (
  userContacts: string[],
  excludePhoneNumber?: string
): Promise<number> => {
  const mutualFriends = await findMutualFriends(userContacts, excludePhoneNumber);
  return mutualFriends.length;
};

/**
 * Check if a specific phone number belongs to a Shepherd user
 * @param phoneNumber Phone number to check
 * @returns User data if found, null otherwise
 */
export const checkIfUserOnShepherd = async (phoneNumber: string): Promise<MutualFriend | null> => {
  try {
    const querySnapshot = await firestore()
      .collection('users')
      .where('phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const userData = doc.data();
      
      return {
        id: doc.id,
        displayName: userData.displayName || 'Shepherd User',
        phoneNumber: userData.phoneNumber,
        lamb: userData.lamb,
        streakCount: userData.streakCount || 0,
        lastActivityDate: userData.lastActivityDate
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking if user on Shepherd:', error);
    return null;
  }
};

/**
 * Get mutual friends with additional filtering and sorting options
 * @param userContacts Array of phone numbers from user's contacts
 * @param excludePhoneNumber Phone number to exclude (current user)
 * @param sortBy Sort criteria ('name', 'level', 'streak', 'recent')
 * @param limit Maximum number of results
 * @returns Sorted and filtered array of mutual friends
 */
export const getMutualFriendsWithOptions = async (
  userContacts: string[],
  excludePhoneNumber?: string,
  sortBy: 'name' | 'level' | 'streak' | 'recent' = 'name',
  limit?: number
): Promise<MutualFriend[]> => {
  const mutualFriends = await findMutualFriends(userContacts, excludePhoneNumber);
  
  // Sort based on criteria
  let sortedFriends = [...mutualFriends];
  
  switch (sortBy) {
    case 'name':
      sortedFriends.sort((a, b) => a.displayName.localeCompare(b.displayName));
      break;
    case 'level':
      sortedFriends.sort((a, b) => (b.lamb?.level || 0) - (a.lamb?.level || 0));
      break;
    case 'streak':
      sortedFriends.sort((a, b) => (b.streakCount || 0) - (a.streakCount || 0));
      break;
    case 'recent':
      sortedFriends.sort((a, b) => {
        const aDate = a.lastActivityDate?.toDate?.() || new Date(0);
        const bDate = b.lastActivityDate?.toDate?.() || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
      break;
  }
  
  // Apply limit if specified
  if (limit && limit > 0) {
    sortedFriends = sortedFriends.slice(0, limit);
  }
  
  return sortedFriends;
};

// Export default for compatibility
export default {
  findMutualFriends,
  getMutualFriendsCount,
  checkIfUserOnShepherd,
  getMutualFriendsWithOptions
};