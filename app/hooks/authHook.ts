// authStore.ts

import { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import firestore from '@react-native-firebase/firestore';
import { useUserStore } from '../stores/userStore';

// Helper function to check if user is signed in
export const isSignedIn = () => {
  const currentUser = auth().currentUser;
  return currentUser !== null;
};

// useAuth.ts hook
export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Get user from the store
  const { getUser, setUser: updateUser, setCreatedAt, setUpdatedAt } = useUserStore();
  const user = getUser();

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setIsAuthenticated(user !== null);
    });

    return () => unsubscribe();
  }, []);
  
  const signInWithApple = async () => {
    console.log('[Auth] signInWithApple() called');
    try {
      setLoading(true);
      setError(null);

      // Start the Apple authentication flow using Expo
      console.log('[Auth] Launching AppleAuthentication.signInAsync');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log('[Auth] Apple credential obtained:', credential);

      // Create Firebase credential from Apple response
      const { identityToken } = credential;
      if (!identityToken) {
        console.log('[Auth] No identityToken returned from Apple');
        throw new Error('No identity token provided from Apple');
      }
      console.log('[Auth] identityToken length:', identityToken.length);

      // Create a Firebase credential
      const firebaseCredential = auth.AppleAuthProvider.credential(identityToken);
      console.log('[Auth] Firebase credential created');

      // Sign in to Firebase with the Apple credential
      const userCredential = await auth().signInWithCredential(firebaseCredential);
      console.log('[Auth] Firebase sign-in successful, uid:', userCredential.user.uid);
      
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
    console.log('[Auth] signInAnonymously() called');
    try {
      setLoading(true);
      setError(null);

      // Sign in anonymously with Firebase
      console.log('[Auth] Calling auth().signInAnonymously');
      const userCredential = await auth().signInAnonymously();
      console.log('[Auth] Anonymous sign-in successful, uid:', userCredential.user.uid);

      // Create anonymous user document
      const { uid } = userCredential.user;
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
    isAuthenticated,
    signInWithApple,
    signInAnonymously
  };
}