import { useState, useEffect, useCallback, useMemo } from 'react';
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
  
  // Memoize store selectors to prevent unnecessary re-renders
  const userContacts = useUserStore(state => state.getContacts());
  const userPhoneNumber = useUserStore(state => state.getPhoneNumber());

  const fetchMutualFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate inputs
      const contacts = userContacts || [];
      
      if (contacts.length === 0) {
        appLog('No contacts available for mutual friends search');
        setMutualFriends([]);
        return;
      }

      // Validate that contacts are strings
      const validContacts = contacts.filter(contact => 
        typeof contact === 'string' && contact.trim().length > 0
      );

      if (validContacts.length === 0) {
        appLog('No valid phone numbers in contacts');
        setMutualFriends([]);
        return;
      }

      const friends = await findMutualFriends(validContacts, userPhoneNumber);
      setMutualFriends(friends);
      
      appLog(`Found ${friends.length} mutual friends out of ${validContacts.length} valid contacts`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch mutual friends';
      setError(errorMessage);
      setMutualFriends([]); // Reset on error
      console.error('Error fetching mutual friends:', err);
    } finally {
      setLoading(false);
    }
  }, [userContacts, userPhoneNumber]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchMutualFriends();
    }
  }, [autoFetch, fetchMutualFriends]);

  // Memoize the mutualFriendsCount to avoid unnecessary recalculations
  const mutualFriendsCount = useMemo(() => mutualFriends.length, [mutualFriends.length]);

  return {
    mutualFriends,
    loading,
    error,
    refetch: fetchMutualFriends,
    mutualFriendsCount
  };
};

export default useMutualFriends;