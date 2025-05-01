// authStore.ts

import { useState } from 'react';
import auth from '@react-native-firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import firestore from '@react-native-firebase/firestore';
import { useUserStore } from '../stores/userStore';

// useAuth.ts hook
export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Get user from the store
  const { getUser, setUser: updateUser, setCreatedAt, setUpdatedAt } = useUserStore();
  const user = getUser();
  
  const signInWithApple = async () => {
    try {
      setLoading(true);
      setError(null);

      // Start the Apple authentication flow using Expo
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase credential from Apple response
      const { identityToken } = credential;
      if (!identityToken) {
        throw new Error('No identity token provided from Apple');
      }

      // Create a Firebase credential
      const firebaseCredential = auth.AppleAuthProvider.credential(identityToken);

      // Sign in to Firebase with the Apple credential
      const userCredential = await auth().signInWithCredential(firebaseCredential);
      
      // Get user info
      const { uid, email } = userCredential.user;
      const displayName = credential.fullName?.givenName 
        ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`
        : 'Anonymous User';
      
      // Create or update user document in Firestore
      const userDoc = {
        uid,
        email,
        displayName,
        createdAt: firestore.Timestamp.now(),
        updatedAt: firestore.Timestamp.now(),
      };
      
      await firestore().collection('users').doc(uid).set(userDoc, { merge: true });
      
      // Update local store
      updateUser({
        id: uid,
        displayName,
        email: email || undefined
      });
      setCreatedAt(firestore.Timestamp.now());
      setUpdatedAt(firestore.Timestamp.now());

      return userCredential.user;
    } catch (err) {
      console.error('Apple sign in error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymously = async () => {
    try {
      setLoading(true);
      setError(null);

      // Sign in anonymously with Firebase
      const userCredential = await auth().signInAnonymously();
      const { uid } = userCredential.user;

      // Create anonymous user document
      const userDoc = {
        uid,
        displayName: 'Anonymous User',
        createdAt: firestore.Timestamp.now(),
        updatedAt: firestore.Timestamp.now(),
      };

      await firestore().collection('users').doc(uid).set(userDoc, { merge: true });

      // Update local store
      updateUser({
        id: uid,
        displayName: 'Anonymous User'
      });
      setCreatedAt(firestore.Timestamp.now());
      setUpdatedAt(firestore.Timestamp.now());

      return userCredential.user;
    } catch (err) {
      console.error('Anonymous sign in error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { 
    user, 
    loading, 
    error, 
    signInWithApple,
    signInAnonymously
  };
}