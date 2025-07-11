// authStore.ts

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { useState, useEffect } from 'react';
import { Platform, NativeModules } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useUserStore } from '../stores/userStore';
import { useSoundStore } from '../stores/soundStore';
import analytics from '../../utils/analytics';
import { fetchFromFirestore } from '../helper/firebaseHelper';
import { syncStreakDataToWidget } from '~/utils/widgetSync';
import { appLog } from '../helper/helper';
import { resetAnalyticsConfig } from '../../utils/analyticsConfig';

// Safely get WidgetDataSharer with error handling
const getWidgetDataSharer = () => {
  try {
    const { WidgetDataSharer } = NativeModules;
    if (!WidgetDataSharer) {
      console.warn('📱 WidgetDataSharer native module not found');
      return null;
    }
    return WidgetDataSharer;
  } catch (error) {
    console.error('📱 Error accessing WidgetDataSharer:', error);
    return null;
  }
};

// Helper function to safely call widget methods
const safeWidgetCall = (method: string, ...args: any[]) => {
  const widgetModule = getWidgetDataSharer();
  if (!widgetModule) {
    console.warn(`📱 Cannot call ${method} - WidgetDataSharer not available`);
    return;
  }
  
  try {
    if (method === 'updateVerseData' && widgetModule.updateVerseData) {
      widgetModule.updateVerseData(...args);
    } else if (method === 'updateWidgetStatus' && widgetModule.updateWidgetStatus) {
      widgetModule.updateWidgetStatus(...args);
    } else {
      console.warn(`📱 Method ${method} not available on WidgetDataSharer`);
    }
  } catch (error) {
    console.error(`📱 Error calling ${method}:`, error);
  }
};

// Helper function to check if user is signed in
export const isSignedIn = () => {
  const currentUser = auth().currentUser;
  return currentUser !== null;
};

// Helper function to check if pa user document exists in Firestore
export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await firestore().collection('users').doc(uid).get();
    return userDoc.exists;
  } catch (error) {
    appLog('Error checking if user exists:', error);
    return false;
  }
};

// useAuth.ts hook
export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get user from the store
  const { getUser, setUser: updateUser, setCreatedAt, setUpdatedAt } = useUserStore();
  const user = getUser?.();

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setIsAuthenticated(user !== null);
      if (user === null) {
        safeWidgetCall('updateWidgetStatus', 'loggedOut');
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithApple = async (isLoginMode = false) => {
    appLog('[Auth] signInWithApple() called');
    try {
      setLoading(true);
      setError(null);
      // Check if Apple Sign In is available on the device
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        appLog('[Auth] Apple Authentication is not available on this device');
        throw new Error('Apple Authentication is not available on this device');
      }

      // Start the Apple authentication flow using Expo
      appLog('[Auth] Launching AppleAuthentication.signInAsync');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Log full credential object (excluding sensitive data) for debugging
      appLog('[Auth] Apple credential received:', {
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
        appLog('[Auth] No identityToken returned from Apple');
        throw new Error('Authentication incomplete: No identity token provided from Apple');
      }
      // Create a Firebase credential
      const firebaseCredential = auth.AppleAuthProvider.credential(
        identityToken,
        authorizationCode || undefined
      );
      appLog('[Auth] Firebase credential created successfully');

      // Sign in to Firebase with the Apple credential
      const userCredential = await auth().signInWithCredential(firebaseCredential);
      appLog('[Auth] Firebase sign-in successful, uid:', userCredential.user.uid);

      // Check if user exists in Firestore
      const userExists = await checkUserExists(userCredential.user.uid);

      if (userExists && !isLoginMode) {
        // User exists but we're in signup mode
        await auth().signOut();
        throw new Error('EXISTS');
      } else if (!userExists && isLoginMode) {
        // User doesn't exist but we're in login mode
        await auth().signOut();
        throw new Error(
          'No account found with this Apple ID. Please create a new account instead.'
        );
      }

      if (isLoginMode) {
        // In login mode, fetch the user's data from Firestore
        appLog('[Auth] Login mode: fetching existing user data from Firestore');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const success = await fetchFromFirestore?.({ currentLoggedUser: userCredential?.user });
        if (!success) {
          appLog('[Auth] Failed to fetch user data from Firestore');
          throw new Error('Failed to fetch your account data. Please try again.');
        }
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

      appLog('[Auth] User info combined:', {
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
      appLog('[Auth] User document updated in Firestore');

      // Update local store
      updateUser({
        id: uid,
        displayName,
        email: email || undefined,
      });

      // Wait for auth state to be ready before fetching data
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Fetch the complete user data to ensure all fields are synced
      await fetchFromFirestore({ currentLoggedUser: userCredential.user });

      // Log successful sign in
      if (analytics.isInitialized) {
        analytics.logEvent('auth_success');
      }

      return userCredential.user;
    } catch (err) {
      const error = err as Error;
      appLog('[Auth] Apple sign in error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      // Check for specific Apple Authentication errors
      if (error.message?.includes("The operation couldn't be completed")) {
        appLog('[Auth] Apple Sign In process was interrupted or incomplete');
        error.message = 'Apple Sign In process was incomplete. Please try again.';
      } else if (error.message?.includes('canceled')) {
        appLog('[Auth] User canceled the Apple Sign In');
        error.message = 'Apple Sign In was canceled. Please try again.';
      } else if (error.message === 'EXISTS') {
        error.message =
          'An account with this Apple ID already exists. Would you like to login instead?';
      }

      // Log authentication error
      if (analytics.isInitialized) {
        analytics.logError('Authentication error', 'apple_auth_failed', {
          error_message: error.message,
          error_name: error.name,
        });
      }

      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInAnonymously = async () => {
    appLog('[Auth] signInAnonymously() called');
    try {
      setLoading(true);
      setError(null);

      // Sign in anonymously with Firebase
      appLog('[Auth] Calling auth().signInAnonymously');
      const userCredential = await auth().signInAnonymously();
      appLog('[Auth] Anonymous sign-in successful, uid:', userCredential.user.uid);

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

      syncStreakDataToWidget(0, firestore.Timestamp.now()?.toDate());
      // Log successful anonymous sign in
      if (analytics.isInitialized) {
        analytics.logEvent('auth_success_anonymously_by_clicking_skip_button');
      }

      // Adapty: login user after successful anonymous sign in
      // if (userCredential?.user?.uid) {
      //   await useSubscriptionStore.getState().loginAdaptyUser(userCredential.user.uid);
      // }

      return userCredential.user;
    } catch (err) {
      const error = err as Error;
      appLog('[Auth] Anonymous sign in error:', error.message, error.stack);

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

  const getFirebaseIdToken = async (): Promise<string | null> => {
    appLog('[Auth] getFirebaseIdToken() called');
    try {
      // Get current user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.error('[Auth] No authenticated user found');
        return null;
      }

      // Request a fresh token
      const idToken = await currentUser.getIdToken(true);
      appLog('[Auth] Firebase ID token fetched successfully');
      return idToken;
    } catch (error) {
      console.error('[Auth] Error getting ID token:', error);
      return null;
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

      // Check if user exists in Firestore
      const userExists = await checkUserExists(userCredential.user.uid);

      if (userExists && !isLoginMode) {
        // User exists but we're in signup mode
        await auth().signOut();
        throw new Error('EXISTS');
      } else if (!userExists && isLoginMode) {
        // User doesn't exist but we're in login mode
        await auth().signOut();
        throw new Error(
          'No account found with this Google account. Please create a new account instead.'
        );
      }

      if (isLoginMode) {
        // Wait for auth state to be ready before fetching data
        await new Promise((resolve) => setTimeout(resolve, 5000));
        appLog('userCredential?.user ===>', userCredential?.user);

        const success = await fetchFromFirestore({ currentLoggedUser: userCredential?.user });
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

      await firestore().collection('users').doc(uid).set(userDoc, { merge: true });

      // Wait for auth state to be ready before fetching data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update local store with basic info first
      updateUser({
        id: uid,
        displayName: userDoc.displayName,
        email: userDoc.email,
      });

      // Fetch the complete user data to ensure all fields are synced
      await fetchFromFirestore({ currentLoggedUser: userCredential?.user });

      if (analytics.isInitialized) {
        analytics.logEvent('auth_success', {
          method: 'google',
          uid: uid.substring(0, 8),
        });
      }
      return userCredential.user;
    } catch (err) {
      const error = err as Error;
      if (error.message === 'EXISTS') {
        error.message =
          'An account with this Google account already exists. Would you like to login instead?';
      }
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

      // Stop background music when signing out
      useSoundStore.getState().stopBackgroundMusic();

      if (Platform.OS === 'android' && !isAnonymous) {
        await GoogleSignin.revokeAccess?.();
      }

      // Clear widget data when signing out
      safeWidgetCall('updateWidgetStatus', 'loggedOut');

      // Reset analytics configuration on logout
      await resetAnalyticsConfig();

      // await subscriptionStore.logoutAdaptyUser();
    } catch (error) {
      appLog('[Auth] Error during sign out:', error);
      
      // Stop background music even if there was an error
      useSoundStore.getState().stopBackgroundMusic();
      
      throw error;
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string, displayName: string) => {
    appLog('[Auth] signUpWithEmailPassword() called');
    try {
      setLoading(true);
      setError(null);

      // Try to create the user directly - Firebase will throw an error if the email already exists
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      appLog('[Auth] Email/Password sign-up successful, uid:', userCredential.user.uid);

      // Update display name
      await userCredential.user.updateProfile({ displayName });

      // Create user document
      const { uid } = userCredential.user;
      const userDoc = {
        id: uid,
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
        email,
      });

      // Wait for auth state to be ready before fetching data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch the complete user data
      await fetchFromFirestore({ currentLoggedUser: userCredential.user });

      if (analytics.isInitialized) {
        analytics.logEvent('auth_success', {
          method: 'email',
          uid: uid.substring(0, 8),
        });
      }

      return userCredential.user;
    } catch (err: any) {
      const error = err as Error;
      
      // Handle specific Firebase auth errors
      if (err.code === 'auth/email-already-in-use') {
        error.message = 'An account with this email already exists. Would you like to login instead?';
      } else if (err.code === 'auth/invalid-email') {
        error.message = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        error.message = 'Password should be at least 6 characters long.';
      } else if (err.code === 'auth/operation-not-allowed') {
        error.message = 'Email/password accounts are not enabled. Please contact support.';
      } else {
        // Generic error for other cases
        error.message = 'Unable to create account. Please try again.';
      }
      
      if (analytics.isInitialized) {
        analytics.logError('Authentication error', 'email_signup_failed', {
          error_message: error.message,
          error_code: err.code,
        });
      }
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmailPassword = async (email: string, password: string, isLoginMode = false) => {
    appLog('[Auth] signInWithEmailPassword() called');
    try {
      setLoading(true);
      setError(null);

      // Sign in with email and password
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      appLog('[Auth] Email/Password sign-in successful, uid:', userCredential.user.uid);

      // In login mode, verify the user account exists
      if (isLoginMode) {
        const userExists = await checkUserExists(userCredential.user.uid);
        if (!userExists) {
          await auth().signOut();
          throw new Error('No account found with this email. Please create a new account instead.');
        }

        // Wait for auth state to be ready before fetching data
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const success = await fetchFromFirestore({ currentLoggedUser: userCredential.user });
        if (!success) {
          throw new Error('Failed to fetch your account data. Please try again.');
        }
        return userCredential.user;
      }

      // Update local store
      const { uid, displayName } = userCredential.user;
      updateUser({
        id: uid,
        displayName: displayName || 'Email User',
        email,
      });

      if (analytics.isInitialized) {
        analytics.logEvent('auth_success', {
          method: 'email',
          uid: uid.substring(0, 8),
        });
      }

      return userCredential.user;
    } catch (err) {
      const error = err as Error;
      if (analytics.isInitialized) {
        analytics.logError('Authentication error', 'email_signin_failed', {
          error_message: error.message,
        });
      }
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Separate function for handling anonymous to Apple upgrade from profile screen
  const upgradeAnonymousToApple = async () => {
    appLog('[Auth] Starting anonymous to Apple upgrade from profile');
    try {
      // First check if we have an anonymous user
      const currentUser = auth().currentUser;
      if (!currentUser?.isAnonymous) {
        appLog('[Auth] Current user is not anonymous, aborting upgrade');
        throw new Error('Current user is not anonymous');
      }

      // Get Apple credential
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!appleCredential.identityToken) {
        throw new Error('No identity token from Apple');
      }

      // Create Firebase credential
      const firebaseCredential = auth.AppleAuthProvider.credential(
        appleCredential.identityToken,
        appleCredential.authorizationCode || undefined
      );

      try {
        // First sign out the anonymous user
        appLog('[Auth] Signing out anonymous user');
        await auth().signOut();

        // Then sign in with Apple
        appLog('[Auth] Signing in with Apple');
        const result = await auth().signInWithCredential(firebaseCredential);

        // Update user profile with Apple info
        const email = result.user.email || appleCredential.email || '';
        const displayName = appleCredential.fullName?.givenName
          ? `${appleCredential.fullName.givenName} ${appleCredential.fullName.familyName || ''}`
          : result.user.displayName || 'Anonymous User';

        // Update Firestore document
        await firestore().collection('users').doc(result.user.uid).set(
          {
            email,
            displayName,
            isAnonymous: false,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        // Fetch and sync user data
        await fetchFromFirestore({ currentLoggedUser: result.user });

        appLog('[Auth] Successfully upgraded to Apple account');
        return result;
      } catch (error: any) {
        console.error('[Auth] Error during upgrade:', error);
        if (error.code === 'auth/credential-already-in-use') {
          // If the Apple ID is already in use, just sign in with it
          appLog('[Auth] Apple ID already in use, signing in with existing account');
          const result = await auth().signInWithCredential(firebaseCredential);
          await fetchFromFirestore({ currentLoggedUser: result.user });
          return result;
        }
        throw error;
      }
    } catch (error: any) {
      console.error('[Auth] Apple upgrade failed:', error);
      throw error;
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    signInWithApple,
    signInWithGoogle,
    signInAnonymously,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    checkUserExists,
    signOut,
    getFirebaseIdToken,
    upgradeAnonymousToApple,
  };
};

WebBrowser.maybeCompleteAuthSession();

// Default export for Expo Router compatibility
export default {}
