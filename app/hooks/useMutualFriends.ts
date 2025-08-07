import { useState, useEffect } from 'react';
import { useUserStore } from '../stores/userStore';
import { findMutualFriends, MutualFriend } from '../../utils/mutualFriends';
import { appLog } from '../helper/helper';

export interface UseMutualFriendsResult {
  mutualFriends: MutualFriend[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutualFriendsCount: number;
}

/**
 * Hook to fetch and manage mutual friends data
 * @param autoFetch Whether to automatically fetch on mount (default: true)
 * @returns Object with mutual friends data and utilities
 */
export const useMutualFriends = (autoFetch: boolean = true): UseMutualFriendsResult => {
  const [mutualFriends, setMutualFriends] = useState<MutualFriend[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  
  const { getContacts, getPhoneNumber } = useUserStore();

  const fetchMutualFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userContacts = getContacts() || [];
      const userPhoneNumber = getPhoneNumber();
      
      if (userContacts.length === 0) {
        appLog('No contacts available for mutual friends search');
        setMutualFriends([]);
        return;
      }

      const friends = await findMutualFriends(userContacts, userPhoneNumber);
      setMutualFriends(friends);
      
      appLog(`Found ${friends.length} mutual friends`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch mutual friends';
      setError(errorMessage);
      console.error('Error fetching mutual friends:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchMutualFriends();
    }
  }, [autoFetch]);

  return {
    mutualFriends,
    loading,
    error,
    refetch: fetchMutualFriends,
    mutualFriendsCount: mutualFriends.length
  };
};

export default useMutualFriends;