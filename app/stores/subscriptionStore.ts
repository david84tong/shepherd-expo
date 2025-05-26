import Purchases, { PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { create } from 'zustand';
import { Alert, Linking } from 'react-native';
import { useUserStore } from './userStore';
import analytics from '~/utils/analytics';
import { router } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';
import Toast from 'react-native-toast-message';
import { isSignedIn } from '../hooks/authHook';
import { adapty } from 'react-native-adapty';
import { createPaywallView } from '@adapty/react-native-ui';

// Add constant for tracking half-off paywall view
const HALF_OFF_PAYWALL_SEEN_KEY = 'half_off_paywall_seen';

async function moveUserToProMode(isRestored?: boolean) {
  console.log('===>purrchase completed');
  let onboardingCompleted: string | null = null;
  useUserStore.getState().setProStatus('pro');
  // Set isPro: true and proExpiryDate: null in Firestore for the current user
  try {
    const currentUser = auth().currentUser;
    if (currentUser) {
      await firestore().collection('users').doc(currentUser.uid).set(
        {
          isPro: true,
          proExpiryDate: null,
        },
        { merge: true }
      );
      console.log('[moveUserToProMode] Firestore isPro set to true');
    }
  } catch (e) {
    console.error('[moveUserToProMode] Error setting isPro in Firestore:', e);
  }
  // Show success toast
  Toast.show({
    type: 'success',
    text1: isRestored ? 'Subscription Restored! 🎉' : 'Congratulations! 🎉',
    text2: isRestored ? 'Welcome back to Shepherd Super!' : 'You are now a Shepherd Super user!',
    position: 'top',
    visibilityTime: 4000,
  });
  // Check if onboarding is completed
  onboardingCompleted = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
  // Navigate based on onboarding status
  setTimeout(handlePostPurchaseNavigation, 100);
}
interface SubscriptionState {
  customerInfo: any | null; // Allow AdaptyProfile or CustomerInfo
  isProMember: boolean;
  hasSeenHalfOffPaywall: boolean;
  initializeRevenueCat: (apiKey: string, userId: string | null) => Promise<void>;
  presentPaywall: () => Promise<PAYWALL_RESULT | null>;
  presentHalfOffPaywall: () => Promise<PAYWALL_RESULT | null>;
  presentFreeTrialPaywall: () => Promise<PAYWALL_RESULT | null>;
  purchasePackage: (pack: PurchasesPackage, onSuccess?: () => void) => Promise<void>;
  getCustomerInfo: () => Promise<void>;
  handleReferralCode: (code: string) => Promise<void>;
  getUsedReferralCodes: () => Promise<string[]>;
  fromScreen: string;
  setFromScreen: (screenName: string) => void;
  // Adapty login/logout
  loginAdaptyUser: (userId: string) => Promise<void>;
  logoutAdaptyUser: () => Promise<void>;
  // New methods for half-off paywall tracking
  checkHasSeenHalfOffPaywall: () => Promise<void>;
  markHalfOffPaywallAsSeen: () => Promise<void>;
  shouldShowFreeTrialPaywall: () => boolean;
  // Add other state and actions here
}

const ENTITLEMENT_ID = 'Super Shepherd'; // Define the entitlement ID

const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  customerInfo: null,
  isProMember: false,
  hasSeenHalfOffPaywall: false,
  fromScreen: '',

  initializeRevenueCat: async (apiKey: string, userId: string | null) => {
    console.log('[SubscriptionStore] initializeRevenueCat called.');
    console.log(
      `[SubscriptionStore] API Key: ${apiKey ? 'Provided' : 'MISSING!'}, User ID: ${userId || 'Anonymous'}`
    );

    if (!apiKey) {
      console.error('[SubscriptionStore] RevenueCat API key is missing!');
      return;
    }

    console.log('[SubscriptionStore] Setting RevenueCat log level to DEBUG.');
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    try {
      if (userId) {
        console.log(`[SubscriptionStore] Attempting to logIn RevenueCat user: ${userId}`);
        await Purchases.logIn(userId);
        console.log('[SubscriptionStore] RevenueCat: User logged in successfully:', userId);
      } else {
        console.log(
          '[SubscriptionStore] RevenueCat: No userId provided, will initialize with anonymous user.'
        );
      }
      console.log('[SubscriptionStore] Attempting to configure RevenueCat SDK.');
      await Purchases.configure({ apiKey });
      console.log('[SubscriptionStore] RevenueCat SDK configured successfully.');

      console.log('[SubscriptionStore] Fetching initial customer info after configuration.');
      await get().getCustomerInfo(); // Fetch customer info on init
      
      // Check if user has seen half-off paywall before
      await get().checkHasSeenHalfOffPaywall();
    } catch (e) {
      console.error('[SubscriptionStore] RevenueCat SDK configuration or login failed:', e);
      Alert.alert(
        'Error',
        'Failed to initialize subscription service. Please check your connection and try again.'
      );
    }
  },
  presentFreeTrialPaywall: async () => {
    try {
      analytics.logEvent('presentFreeTrialPaywall', {
        fromScreen: get().fromScreen,
      });
      const paywall = await adapty.getPaywall('free-trial');
      console.log('Fetched paywall:', JSON.stringify(paywall, null, 2));
      const view = await createPaywallView(paywall);

      let result: PAYWALL_RESULT | null = null;

      view.registerEventHandlers({
        onCloseButtonPress() {
          result = PAYWALL_RESULT.CANCELLED;
          return true;
        },
        onPurchaseCompleted() {
          result = PAYWALL_RESULT.PURCHASED;
          moveUserToProMode();
          return true;
        },
        onRestoreCompleted() {
          result = PAYWALL_RESULT.RESTORED;
          moveUserToProMode(true);
          return true;
        },
        onProductSelected() {
          console.log('===>product selected');
        },
        onPurchaseStarted() {
          console.log('===>purrchase started');
        },
        onPurchaseCancelled() {
          result = PAYWALL_RESULT.CANCELLED;
          console.log('cancelled');
        },
        onPurchaseFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
        onRestoreFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
        onRenderingFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
        onLoadingProductsFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
      });
      await view.present();
      const products = await adapty.getPaywallProducts(paywall);
      console.log('products ==>', products);
      return result;
    } catch (error) {
      console.error('Adapty paywall error:', error);
      analytics.logEvent('PricingScreen_Paywall_Error', {
        errorMessage: (error as Error)?.message || 'Unknown error',
      });
      return PAYWALL_RESULT.ERROR;
    }
  },
  presentHalfOffPaywall: async () => {
    analytics.logEvent('presentHalfOffPaywall', {
      fromScreen: get().fromScreen,
    });
    
    // Mark that user has now seen the half-off paywall
    await get().markHalfOffPaywallAsSeen();
    
    try {
      const paywall = await adapty.getPaywall('halfoff');
      console.log('Fetched paywall:', JSON.stringify(paywall, null, 2));
      const view = await createPaywallView(paywall);

      let result: PAYWALL_RESULT | null = null;

      view.registerEventHandlers({
        onCloseButtonPress() {
          result = PAYWALL_RESULT.CANCELLED;
          Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {
            console.log('Could not open subscription management');
          });
          return true;
        },
        onPurchaseCompleted() {
          result = PAYWALL_RESULT.PURCHASED;
          moveUserToProMode();
          return true;
        },
        onRestoreCompleted() {
          result = PAYWALL_RESULT.RESTORED;
          moveUserToProMode(true);
          return true;
        },
        onProductSelected() {
          console.log('===>product selected');
        },
        onPurchaseStarted() {
          console.log('===>purrchase started');
        },
        onPurchaseCancelled() {
          setTimeout(() => {
            get().presentFreeTrialPaywall();
           }, 500);
            result = PAYWALL_RESULT.CANCELLED;
            return true;
        },
        onPurchaseFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
        onRestoreFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
        onRenderingFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
        onLoadingProductsFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
      });
      await view.present();
      const products = await adapty.getPaywallProducts(paywall);
      console.log('products ==>', products);
      return result;
    } catch (error) {
      console.error('Adapty paywall error:', error);
      analytics.logEvent('PricingScreen_Paywall_Error', {
        errorMessage: (error as Error)?.message || 'Unknown error',
      });
      return PAYWALL_RESULT.ERROR;
    }
  },

  presentPaywall: async () => {
    analytics.logEvent('presentPaywall', {
      fromScreen: get().fromScreen,
    });
    try {
      const paywall = await adapty.getPaywall('shepherd_paywall');
      console.log('Fetched paywall:', JSON.stringify(paywall, null, 2));
      const view = await createPaywallView(paywall);

      let result: PAYWALL_RESULT | null = null;

      view.registerEventHandlers({
        onCloseButtonPress() {        
          result = PAYWALL_RESULT.CANCELLED;
          return true;
        },
        onPurchaseCompleted() {
          result = PAYWALL_RESULT.PURCHASED;
          moveUserToProMode();
          return true;
        },
        onRestoreCompleted() {
          result = PAYWALL_RESULT.RESTORED;
          moveUserToProMode(true);
          return true;
        },
        onProductSelected() {
          console.log('===>product selected');
        },
        onPurchaseStarted() {
          console.log('===>purrchase started');
        },
        onPurchaseCancelled() {
          setTimeout(() => {
            get().presentHalfOffPaywall();
           }, 500);
            result = PAYWALL_RESULT.CANCELLED;
            return true;
        },
        onPurchaseFailed() {
          setTimeout(() => {
            get().presentHalfOffPaywall();
           }, 500);
            result = PAYWALL_RESULT.CANCELLED;
            return true;
        },
        onRestoreFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
        onRenderingFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
        onLoadingProductsFailed() {
          result = PAYWALL_RESULT.ERROR;
        },
      });
      await view.present();
      const products = await adapty.getPaywallProducts(paywall);
      console.log('products ==>', products);
      return result;
    } catch (error) {
      console.error('Adapty paywall error:', error);
      analytics.logEvent('PricingScreen_Paywall_Error', {
        errorMessage: (error as Error)?.message || 'Unknown error',
      });
      return PAYWALL_RESULT.ERROR;
    }
  },

  purchasePackage: async (pack: PurchasesPackage, onSuccess?: () => void) => {
    console.log('[SubscriptionStore] purchasePackage called.');
    if (!pack) {
      console.error('[SubscriptionStore] No package selected for purchase.');
      analytics.logEvent('purchase_failed', {
        error: 'no_package_selected',
      });
      Alert.alert('Error', 'No subscription package selected.');
      return;
    }
    console.log(
      '[SubscriptionStore] Attempting to purchase package:',
      JSON.stringify(pack, null, 2)
    );
    analytics.logEvent('purchase_initiated', {
      package_id: pack.identifier,
      product_id: pack.product.identifier,
    });

    try {
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pack);
      console.log('[SubscriptionStore] Successfully purchased product:', productIdentifier);
      console.log(
        '[SubscriptionStore] Updated CustomerInfo after purchase:',
        JSON.stringify(customerInfo, null, 2)
      );

      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive || false;
      set({ customerInfo, isProMember: isPro });

      // Update user's pro status in userStore
      if (isPro) {
        useUserStore.getState().setProStatus('pro');

        // Show success toast
        Toast.show({
          type: 'success',
          text1: 'Congratulations! 🎉',
          text2: 'You are now a Shepherd Super user!',
          position: 'top',
          visibilityTime: 4000,
        });
      }

      analytics.logEvent('subscription_purchase_success', {
        package_id: pack.identifier,
        product_id: productIdentifier,
        is_pro: isPro,
        currentScreen: get().fromScreen,
      });

      // Show success message
      Alert.alert('Success', 'Purchase successful!');
      console.log('[SubscriptionStore] Pro status after purchase:', get().isProMember);

      // Navigate based on onboarding status if user is now a pro member
      if (isPro) {
        setTimeout(handlePostPurchaseNavigation, 500);
      }

      // Call the onSuccess callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (e: any) {
      if (e.userCancelled) {
        console.log('[SubscriptionStore] User cancelled purchase of package:', pack.identifier);
        analytics.logEvent('subscription_purchase_cancelled', {
          package_id: pack.identifier,
          offering_id: pack.offeringIdentifier,
          product_id: pack.product.identifier,
          reason: 'user_cancelled',
        });
      } else {
        console.error('[SubscriptionStore] Error purchasing package:', pack.identifier, e);
        analytics.logEvent('subscription_purchase_failed', {
          package_id: pack.identifier,
          offering_id: pack.offeringIdentifier,
          product_id: pack.product.identifier,
          error: e.message || 'unknown_error',
        });
        Alert.alert('Purchase Error', e.message || 'An error occurred while making the purchase.');
      }
    }
  },

  getCustomerInfo: async () => {
    console.log('[SubscriptionStore] getCustomerInfo called (Adapty + Firestore version).');
    try {
      // 1. Check Adapty profile
      const profile = await adapty.getProfile();
      console.log(
        '[SubscriptionStore] Adapty profile fetched successfully:',
        JSON.stringify(profile, null, 2)
      );
      console.log('[SubscriptionStore] Adapty accessLevels:', profile.accessLevels);
      const isProAdapty =
        (profile.accessLevels && profile.accessLevels['premium']?.isActive) || false;
      console.log(`[SubscriptionStore] User is pro member (premium/Adapty): ${isProAdapty}`);

      // 2. Check Firestore for custom pro/referral
      let isProFromFirebase = false;
      let proExpiryDate: Date | null = null;
      const currentUser = auth().currentUser;
      if (currentUser) {
        try {
          const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
          const userData = userDoc.data();

          if (userData) {
            isProFromFirebase = userData.isPro;
            // Check if proExpiryDate exists and has the correct format
            if (userData.proExpiryDate) {
              if (userData.proExpiryDate.toDate) {
                proExpiryDate = userData.proExpiryDate.toDate();
              } else if (userData.proExpiryDate._seconds) {
                proExpiryDate = new Date(
                  userData.proExpiryDate._seconds * 1000 +
                    userData.proExpiryDate._nanoseconds / 1000000
                );
              } else if (
                typeof userData.proExpiryDate === 'string' ||
                typeof userData.proExpiryDate === 'number'
              ) {
                proExpiryDate = new Date(userData.proExpiryDate);
              }
            }
            // Check if pro status has expired
            if (proExpiryDate && proExpiryDate < new Date()) {
              // Pro status has expired
              await firestore().collection('users').doc(currentUser.uid).update({
                isPro: false,
              });
              isProFromFirebase = false;
              proExpiryDate = null;
              set({ isProMember: false });
              useUserStore.getState().setProStatus('free');
              console.log('[SubscriptionStore] Pro status expired in Firestore, set to free.');
            }
          }
        } catch (error) {
          console.log('[SubscriptionStore] Error fetching user data from Firestore:', error);
        }
      }

      // 3. Final pro status: Adapty OR Firestore (if not expired)
      const finalProStatus = isProAdapty && isProFromFirebase;
      // Track status change if different from current state
      const prevIsPro = get().isProMember;
      if (prevIsPro !== finalProStatus) {
        analytics.logEvent('subscription_status_changed', {
          previous: prevIsPro ? 'pro' : 'free',
          current: finalProStatus ? 'pro' : 'free',
        });
      }
      set({ customerInfo: profile, isProMember: finalProStatus });
      useUserStore.getState().setProStatus(finalProStatus ? 'pro' : 'free');
      console.log(
        '[SubscriptionStore] Customer info and pro status updated in store (Adapty + Firestore).'
      );
    } catch (e) {
      console.error('[SubscriptionStore] Error fetching Adapty profile or Firestore:', e);
      analytics.logEvent('subscription_error', {
        error: 'adapty_or_firestore_profile_fetch_failed',
        message: e?.toString(),
      });
    }
  },
  handleReferralCode: async (code: string) => {
    // Validate code format
    if (code.length !== 6) {
      throw new Error('Invalid code format');
    }

    // Get current user
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user doc ref
    const userRef = firestore().collection('users').doc(user.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // Check if user has already used this code
    if (userData?.usedReferralCodes?.includes(code)) {
      throw new Error('You have already used this referral code');
    }

    // Check subscription type restrictions
    const usedReferralCodes = userData?.usedReferralCodes || [];
    const hasUsedWeekly = usedReferralCodes.includes('WEEKLY');
    const hasUsedMonthly = usedReferralCodes.includes('MONTHL');
    const hasUsedCreator = usedReferralCodes.includes('CREATE');
    const hasUsedPermanent = usedReferralCodes.includes('WXES4S');

    // Prepare variables that might be needed in switch cases
    let monthExpiry: Date;
    let weekExpiry: Date;
    analytics.logEvent('handleReferralCode', {
      code: code,
    });
    switch (code.toUpperCase()) {
      case 'WXES4S':
        if (hasUsedPermanent) {
          throw new Error('You have already used a permanent subscription code');
        }
        // Permanent pro access
        await userRef.update({
          isPro: true,
          userProExpiryDate: null, // null means permanent
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
        });
        break;

      case 'MONTHL':
        if (hasUsedMonthly) {
          throw new Error('You have already used a monthly subscription code');
        }
        // One month pro access
        monthExpiry = new Date();
        monthExpiry.setMonth(monthExpiry.getMonth() + 1);

        await userRef.update({
          isPro: true,
          userProExpiryDate: monthExpiry,
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
        });
        break;

      case 'WEEKLY':
        if (hasUsedWeekly) {
          throw new Error('You have already used a weekly subscription code');
        }
        // One week pro access
        weekExpiry = new Date();
        weekExpiry.setDate(weekExpiry.getDate() + 7);

        await userRef.update({
          isPro: true,
          userProExpiryDate: weekExpiry,
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
        });
        break;
      case 'CREATE':
        if (hasUsedCreator) {
          throw new Error('You have already used a creator subscription code');
        }
        // One month pro access
        await userRef.update({
          isPro: true,
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
        });
        // Save creator status to AsyncStorage
        await AsyncStorage.setItem('isCreator', 'true');
        break;

      default:
        throw new Error('Invalid referral code');
    }

    set({ isProMember: true });
    useUserStore.getState().setProStatus('pro');
  },
  getUsedReferralCodes: async () => {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userDoc = await firestore().collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    return userData?.usedReferralCodes || [];
  },

  setFromScreen: (screenName: string) => {
    console.log(`[SubscriptionStore] Setting fromScreen to: ${screenName}`);
    set({ fromScreen: screenName });
    analytics.logEvent('subscription_fromScreen', { screen: screenName });
  },

  loginAdaptyUser: async (userId: string) => {
    // Call adapty.identify to associate purchases with a specific user
    try {
      await adapty.identify(userId);
      console.log(`[SubscriptionStore] Adapty identify successful for userId: ${userId}`);
      // Optionally refresh customer info after login
      await get().getCustomerInfo();
    } catch (e) {
      console.error('[SubscriptionStore] Error identifying Adapty user:', e);
    }
  },
  logoutAdaptyUser: async () => {
    // Call adapty.logout to disassociate purchases from the current user
    try {
      await adapty.logout();
      console.log('[SubscriptionStore] Adapty logout successful');
      // Optionally refresh customer info after logout
      await get().getCustomerInfo();
    } catch (e) {
      console.error('[SubscriptionStore] Error logging out Adapty user:', e);
    }
  },
  checkHasSeenHalfOffPaywall: async () => {
    try {
      const hasSeenString = await AsyncStorage.getItem(HALF_OFF_PAYWALL_SEEN_KEY);
      const hasSeen = hasSeenString === 'true';
      set({ hasSeenHalfOffPaywall: hasSeen });
      console.log(`[SubscriptionStore] User has seen half-off paywall: ${hasSeen}`);
    } catch (error) {
      console.error('[SubscriptionStore] Error checking half-off paywall status:', error);
      set({ hasSeenHalfOffPaywall: false });
    }
  },
  markHalfOffPaywallAsSeen: async () => {
    try {
      await AsyncStorage.setItem(HALF_OFF_PAYWALL_SEEN_KEY, 'true');
      set({ hasSeenHalfOffPaywall: true });
      console.log('[SubscriptionStore] Marked half-off paywall as seen');
      analytics.logEvent('halfoff_paywall_first_view', {
        fromScreen: get().fromScreen,
      });
    } catch (error) {
      console.error('[SubscriptionStore] Error marking half-off paywall as seen:', error);
    }
  },
  shouldShowFreeTrialPaywall: () => {
    return get().hasSeenHalfOffPaywall;
  },
}));

// Helper function for navigation after purchase/restore
function handlePostPurchaseNavigation() {
  if (isSignedIn()) {
    console.log('isSignedIn');
    router.replace('/(tabs)');
  } else {
    console.log('notSignedIn');
    router.replace('/onboarding/11');
  }
}

export default useSubscriptionStore;
