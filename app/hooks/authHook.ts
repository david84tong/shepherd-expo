// authStore.ts

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import Constants from 'expo-constants';

import { useUserStore } from '../stores/userStore';
import analytics from '../../utils/analytics';
import useSubscriptionStore from '../stores/subscriptionStore';

// Helper function to check if user is signed in
export const isSignedIn = () => {
  const currentUser = auth().currentUser;
  return currentUser !== null;
};

// Helper function to check if a user document exists in Firestore
export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await firestore().collection('users').doc(uid).get();
    return userDoc.exists;
  } catch (error) {
    console.log('Error checking if user exists:', error);
    return false;
  }
};

// useAuth.ts hook
export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get user from the store
  const {
    getUser,
    setUser: updateUser,
    setCreatedAt,
    setUpdatedAt,
    fetchFromFirestore,
  } = useUserStore();
  const user = getUser?.();

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setIsAuthenticated(user !== null);
    });

    return () => unsubscribe();
  }, []);

  const signInWithApple = async (isLoginMode = false) => {
    console.log('[Auth] signInWithApple() called');
    try {
      setLoading(true);
      setError(null);

      // Check if Apple Sign In is available on the device
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        console.log('[Auth] Apple Authentication is not available on this device');
        throw new Error('Apple Authentication is not available on this device');
      }

      // Start the Apple authentication flow using Expo
      console.log('[Auth] Launching AppleAuthentication.signInAsync');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Log full credential object (excluding sensitive data) for debugging
      console.log('[Auth] Apple credential received:', {
        user: credential?.user,
        fullName: credential?.fullName,
        email: credential?.email ? 'email-exists' : 'no-email',
        realUserStatus: credential?.realUserStatus,
        state: credential?.state,
        identityToken: credential?.identityToken ? 'token-exists' : 'no-token',
        authorizationCode: credential?.authorizationCode ? 'code-exists' : 'no-code',
      });

      // Create Firebase credential from Apple response
      const { identityToken, authorizationCode } = credential;
      if (!identityToken) {
        console.log('[Auth] No identityToken returned from Apple');
        throw new Error('Authentication incomplete: No identity token provided from Apple');
      }

      // Create a Firebase credential
      const firebaseCredential = auth.AppleAuthProvider.credential(
        identityToken,
        authorizationCode || undefined
      );
      console.log('[Auth] Firebase credential created successfully');

      // Sign in to Firebase with the Apple credential
      const userCredential = await auth().signInWithCredential(firebaseCredential);
      console.log('[Auth] Firebase sign-in successful, uid:', userCredential.user.uid);

      // In login mode, verify the user account exists
      if (isLoginMode) {
        const userExists = await checkUserExists(userCredential.user.uid);
        if (!userExists) {
          console.log('[Auth] Account not found during login attempt');
          // Force sign out since this is a login attempt but no account exists
          await auth().signOut();
          throw new Error(
            'No account found with this Apple ID. Please create a new account instead.'
          );
        }

        // In login mode, fetch the user's data from Firestore instead of creating new data
        console.log('[Auth] Login mode: fetching existing user data from Firestore');
        const success = await fetchFromFirestore?.();
        if (!success) {
          console.log('[Auth] Failed to fetch user data from Firestore');
          throw new Error('Failed to fetch your account data. Please try again.');
        }

        // Return the user credential after successful fetch
        return userCredential.user;
      }

      // If not in login mode (new user registration), proceed with user creation
      // Get user info from Firebase user and Apple credential
      const { uid, email: firebaseEmail } = userCredential.user;

      // Combine info from Apple credential and Firebase
      const email = firebaseEmail || credential.email || '';
      const displayName = credential.fullName?.givenName
        ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`
        : userCredential.user.displayName || 'Anonymous User';

      console.log('[Auth] User info combined:', {
        uid,
        displayName,
        email: email ? 'exists' : 'none',
      });

      // Create or update user document in Firestore
      const userDoc = {
        id: uid,
        email,
        displayName,
        createdAt: firestore.Timestamp.now(),
        updatedAt: firestore.Timestamp.now(),
      };

      await firestore().collection('users').doc(uid).set(userDoc, { merge: true });
      console.log('[Auth] User document updated in Firestore');

      // Update local store with the email and display name
      updateUser({
        id: uid,
        displayName,
        email: email || undefined,
      });
      setCreatedAt(firestore.Timestamp.now());
      setUpdatedAt(firestore.Timestamp.now());

      // Log successful sign in
      if (analytics.isInitialized) {
        analytics.logEvent('auth_success');
      }

      // Adapty: login user after successful sign in
      // if (userCredential?.user?.uid) {
      //   await useSubscriptionStore.getState().loginAdaptyUser(userCredential.user.uid);
      // }

      return userCredential.user;
    } catch (err) {
      const error = err as Error;
      console.log('[Auth] Apple sign in error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      // Check for specific Apple Authentication errors
      if (error.message?.includes("The operation couldn't be completed")) {
        console.log('[Auth] Apple Sign In process was interrupted or incomplete');
        error.message = 'Apple Sign In process was incomplete. Please try again.';
      } else if (error.message?.includes('canceled')) {
        console.log('[Auth] User canceled the Apple Sign In');
        error.message = 'Apple Sign In was canceled. Please try again.';
      }

      // Log authentication error
      if (analytics.isInitialized) {
        analytics.logError('Authentication error', 'apple_auth_failed', {
          error_message: error.message,
          error_name: error.name,
        });
      }

      setError(error);
      // Explicitly pass the error upward for the UI to handle
      throw error;
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
        id: uid,
        displayName: 'Anonymous User',
        createdAt: firestore.Timestamp.now(),
        updatedAt: firestore.Timestamp.now(),
      };

      await firestore().collection('users').doc(uid).set(userDoc, { merge: true });

      // Update local store
      updateUser({
        id: uid,
        displayName: 'Anonymous User',
      });
      setCreatedAt(firestore.Timestamp.now());
      setUpdatedAt(firestore.Timestamp.now());

      // Log successful anonymous sign in
      if (analytics.isInitialized) {
        analytics.logEvent('auth_success');
      }

      // Adapty: login user after successful anonymous sign in
      // if (userCredential?.user?.uid) {
      //   await useSubscriptionStore.getState().loginAdaptyUser(userCredential.user.uid);
      // }

      return userCredential.user;
    } catch (err) {
      const error = err as Error;
      console.log('[Auth] Anonymous sign in error:', error.message, error.stack);

      // Log authentication error
      if (analytics.isInitialized) {
        analytics.logError('Authentication error', 'anonymous_auth_failed', {
          error_message: error.message,
        });
      }

      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In (Android only)
  const signInWithGoogle = async (isLoginMode = false) => {
    if (Platform.OS !== 'android') {
      throw new Error('Google sign-in is only supported on Android.');
    }
    try {
      setLoading(true);
      setError(null);

      // Use dynamic web client ID from expo-constants (support both SDK 49+ and older)
      const webClientId =
        ((Constants.expoConfig as any)?.extra?.googleWebClientId as string | undefined) ||
        ((Constants.manifest as any)?.extra?.googleWebClientId as string | undefined);
      if (!webClientId) {
        throw new Error('Google Web Client ID is not configured.');
      }
      GoogleSignin.configure({ webClientId });

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      // idToken may be on userInfo.idToken or userInfo.user.idToken depending on version
      const idToken = (userInfo as any).idToken || (userInfo as any).data?.idToken;
      if (!idToken) {
        throw new Error('No idToken returned from Google sign-in.');
      }
      // Authenticate with Firebase
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      // In login mode, verify the user account exists
      if (isLoginMode) {
        const userExists = await checkUserExists(userCredential.user.uid);
        if (!userExists) {
          await auth().signOut();
          throw new Error(
            'No account found with this Google account. Please create a new account instead.'
          );
        }
        const success = await fetchFromFirestore?.();
        if (!success) {
          throw new Error('Failed to fetch your account data. Please try again.');
        }
        return userCredential.user;
      }

      // Save user info
      const { uid, email, displayName } = userCredential.user;
      const userDoc = {
        id: uid,
        email: email || '',
        displayName: displayName || 'Google User',
        createdAt: firestore.Timestamp.now(),
        updatedAt: firestore.Timestamp.now(),
      };
      console.log("userDoc ====>",userDoc);
      
      await firestore().collection('users').doc(uid).set(userDoc, { merge: true });
      console.log('userDoc set in firestore');
      
      updateUser({ id: uid, displayName: userDoc.displayName, email: userDoc.email });
      console.log('userDoc updated in store');
      setCreatedAt(firestore.Timestamp.now());
      setUpdatedAt(firestore.Timestamp.now());
      console.log('createdAt and updatedAt set in store');

      if (analytics.isInitialized) {
        analytics.logEvent('auth_success', {
          method: 'google',
          uid: uid.substring(0, 8),
        });
      }
      return userCredential.user;
    } catch (err) {
      const error = err as Error;
      if (analytics.isInitialized) {
        analytics.logError('Authentication error', 'google_auth_failed', {
          error_message: error.message,
        });
      }
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Add a signOut function that logs out Adapty as well
  const signOut = async () => {
    try {
      const currentUser = auth().currentUser;
      const isAnonymous = currentUser?.isAnonymous;

      await auth().signOut();

      if (Platform.OS === 'android' && !isAnonymous) {
        await GoogleSignin.revokeAccess?.();
      }

      // await subscriptionStore.logoutAdaptyUser();
    } catch (error) {
      console.log('[Auth] Error during sign out:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    signInWithApple,
    signInWithGoogle,
    signInAnonymously,
    checkUserExists,
    signOut,
  };
}

WebBrowser.maybeCompleteAuthSession();
