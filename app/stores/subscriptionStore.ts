import Purchases, { PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { create } from 'zustand';
import { Alert, Platform } from 'react-native';
import { useUserStore } from './userStore';
import analytics from '~/utils/analytics';
import { router } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_KEY } from '../models/Onboarding';
import Toast from 'react-native-toast-message';
import { isSignedIn } from '../hooks/authHook';
import { presentSuperwallPlacement } from '~/app/utils/superwallBridge';
import { appLog } from '../helper/helper';

// Add constant for tracking half-off paywall view
const HALF_OFF_PAYWALL_SEEN_KEY = 'half_off_paywall_seen';

async function moveUserToProMode(
  isRestored?: boolean,
  packageId?: string,
  productId?: string,
  fromPaywall?: string
) {
  useUserStore.getState().setIsProFromOnboarding(true);
  analytics.logEvent('subscription_purchase_success', {
    package_id: packageId || 'unknown',
    product_id: productId || 'unknown',
    fromPaywall: fromPaywall || 'unknown', // free trial, halfoff, or shepherd_paywall
    currentStreak: useUserStore.getState().getStreakCount(),
    isRestored: isRestored || false,
    fromScreen: useSubscriptionStore.getState().fromScreen,
    age: useUserStore.getState().ageRange,
  });

  let onboardingCompleted: string | null = null;
  useUserStore.getState().setProStatus('pro');
  
  // Update user properties in analytics platforms
  analytics.identifyUser(useUserStore.getState().id || 'anonymous', {
    isPro: true,
    proStatus: 'pro',
    subscriptionType: fromPaywall || 'unknown',
    packageId: packageId || 'unknown',
  });
  
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
      appLog('[moveUserToProMode] Firestore isPro set to true');
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
  // Navigate to ShepherdCommunity screen after successful purchase
  setTimeout(() => {
    router.push('/onboarding/pricing/ShepherdCommunity');
  }, 100);
}

const handleRestoreCompleted = async ({
  packageId,
  productId,
  fromPaywall,
}: {
  packageId?: string;
  productId?: string;
  fromPaywall?: string;
}) => {
  let result = '';
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (isActive) {
      useUserStore.getState().setIsProFromOnboarding(true);
      result = PAYWALL_RESULT.RESTORED;
      moveUserToProMode(true, packageId, productId, fromPaywall);
    } else {
      result = PAYWALL_RESULT.CANCELLED;
      Alert.alert(
        'No Active Subscription Found',
        'We could not find any active subscription to restore. If you believe this is an error, please contact support.'
      );
    }
  } catch (error) {
    console.error('Error retrieving profile:', error);
    result = PAYWALL_RESULT.ERROR;
  }
  return result;
};

interface SubscriptionState {
  customerInfo: any | null; // Allow AdaptyProfile or CustomerInfo
  isProMember: boolean;
  hasSeenHalfOffPaywall: boolean;
  isPaywallPresenting: boolean;
  hasEnteredCreateCode: boolean;
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
  // Force refresh pro status
  forceRefreshProStatus: () => Promise<void>;
  // Check if CREATE code has been entered
  checkHasEnteredCreateCode: () => Promise<void>;
  // Add other state and actions here
}

const ENTITLEMENT_ID = 'Super Shepherd'; // Define the entitlement ID

const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  customerInfo: null,
  isProMember: false,
  hasSeenHalfOffPaywall: false,
  isPaywallPresenting: false,
  hasEnteredCreateCode: false,
  fromScreen: '',

  initializeRevenueCat: async (apiKey: string, userId: string | null) => {
    appLog('[SubscriptionStore] initializeRevenueCat called.');
    appLog(
      `[SubscriptionStore] API Key: ${apiKey ? 'Provided' : 'MISSING!'}, User ID: ${userId || 'Anonymous'}`
    );

    if (!apiKey) {
      console.error('[SubscriptionStore] RevenueCat API key is missing!');
      return;
    }

    appLog('[SubscriptionStore] Setting RevenueCat log level to DEBUG.');
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    try {
      if (userId) {
        appLog(`[SubscriptionStore] Attempting to logIn RevenueCat user: ${userId}`);
        await Purchases.logIn(userId);
        appLog('[SubscriptionStore] RevenueCat: User logged in successfully:', userId);
      } else {
        appLog(
          '[SubscriptionStore] RevenueCat: No userId provided, will initialize with anonymous user.'
        );
      }
      appLog('[SubscriptionStore] Attempting to configure RevenueCat SDK.');
      await Purchases.configure({ apiKey });
      appLog('[SubscriptionStore] RevenueCat SDK configured successfully.');

      appLog('[SubscriptionStore] Fetching initial customer info after configuration.');
      await get().getCustomerInfo(); // Fetch customer info on init

      // Check if user has seen half-off paywall before
      await get().checkHasSeenHalfOffPaywall();
      // Check if user has entered CREATE code before
      await get().checkHasEnteredCreateCode();
    } catch (e) {
      console.error('[SubscriptionStore] RevenueCat SDK configuration or login failed:', e);
      Alert.alert(
        'Error',
        'Failed to initialize subscription service. Please check your connection and try again.'
      );
    }
  },
  presentFreeTrialPaywall: async () => {
    appLog('[SubscriptionStore] presentFreeTrialPaywall called');
    
    // Ensure free trial paywall works for both iOS and Android
    appLog(`[SubscriptionStore] Platform: ${Platform.OS} - Free trial paywall supported`);
    
    // Make sure we have the latest pro status before showing any paywall
    await get().forceRefreshProStatus();
    // First check if user is already pro
    const currentState = get();
    if (currentState.isProMember) {
      appLog('[SubscriptionStore] User is already pro, skipping paywall');
      return PAYWALL_RESULT.CANCELLED;
    }

    // Also check user store pro status
    const userProStatus = useUserStore.getState().proStatus;
    if (userProStatus === 'pro') {
      appLog('[SubscriptionStore] User is pro according to userStore, skipping paywall');
      return PAYWALL_RESULT.CANCELLED;
    }

    // Check if a paywall is already presenting
    if (get().isPaywallPresenting) {
      appLog('[SubscriptionStore] Paywall already presenting, skipping free trial paywall');
      return PAYWALL_RESULT.CANCELLED;
    }
    
    try {
      set({ isPaywallPresenting: true });
      analytics.logEvent('presentFreeTrialPaywall', {
        fromScreen: get().fromScreen,
        platform: Platform.OS, // Track platform for analytics
      });
      await presentSuperwallPlacement('main_paywall');
      set({ isPaywallPresenting: false });
      return PAYWALL_RESULT.CANCELLED;
    } catch (error) {
      console.error('Superwall paywall error:', error);
      set({ isPaywallPresenting: false });
      analytics.logEvent('PricingScreen_Paywall_Error', {
        errorMessage: (error as Error)?.message || 'Unknown error',
      });
      return PAYWALL_RESULT.ERROR;
    }
  },
  presentHalfOffPaywall: async () => {
    // Skip showing half-off paywall during App Store review (remote config flag)
    if ((global as any)?.is_In_Review) {
      appLog('[SubscriptionStore] In review mode – skipping half-off paywall');
      return PAYWALL_RESULT.CANCELLED;
    }
    // Refresh pro status first
    await get().forceRefreshProStatus();
    // First check if user is already pro
    const currentState = get();
    if (currentState.isProMember) {
      appLog('[SubscriptionStore] User is already pro, skipping half-off paywall');
      return PAYWALL_RESULT.CANCELLED;
    }

    // Also check user store pro status
    const userProStatus = useUserStore.getState().proStatus;
    if (userProStatus === 'pro') {
      appLog('[SubscriptionStore] User is pro according to userStore, skipping half-off paywall');
      return PAYWALL_RESULT.CANCELLED;
    }

    // Check if a paywall is already presenting
    if (get().isPaywallPresenting) {
      appLog('[SubscriptionStore] Paywall already presenting, skipping half-off paywall');
      return PAYWALL_RESULT.CANCELLED;
    }

    analytics.logEvent('presentHalfOffPaywall', {
      fromScreen: get().fromScreen,
    });

    // Mark that user has now seen the half-off paywall
    await get().markHalfOffPaywallAsSeen();

    try {
      set({ isPaywallPresenting: true });
      await presentSuperwallPlacement('half_off');
      set({ isPaywallPresenting: false });
      return PAYWALL_RESULT.CANCELLED;
    } catch (error) {
      console.error('Superwall paywall error:', error);
      analytics.logEvent('PricingScreen_Paywall_Error', {
        errorMessage: (error as Error)?.message || 'Unknown error',
      });
      return PAYWALL_RESULT.ERROR;
    }
  },

  presentPaywall: async () => {
    // Refresh pro status first
    await get().forceRefreshProStatus();
    // First check if user is already pro
    const currentState = get();
    if (currentState.isProMember) {
      appLog('[SubscriptionStore] User is already pro, skipping paywall');
      return PAYWALL_RESULT.CANCELLED;
    }

    // Also check user store pro status
    const userProStatus = useUserStore.getState().proStatus;
    if (userProStatus === 'pro') {
      appLog('[SubscriptionStore] User is pro according to userStore, skipping paywall');
      return PAYWALL_RESULT.CANCELLED;
    }

    // Check if a paywall is already presenting
    if (get().isPaywallPresenting) {
      appLog('[SubscriptionStore] Paywall already presenting, skipping paywall');
      return PAYWALL_RESULT.CANCELLED;
    }

    analytics.logEvent('presentPaywall', {
      fromScreen: get().fromScreen,
    });
    
    try {
      set({ isPaywallPresenting: true });
      await presentSuperwallPlacement('main_paywall');
      set({ isPaywallPresenting: false });
      return PAYWALL_RESULT.CANCELLED;
    } catch (error) {
      console.error('Superwall paywall error:', error);
      analytics.logEvent('PricingScreen_Paywall_Error', {
        errorMessage: (error as Error)?.message || 'Unknown error',
      });
      return PAYWALL_RESULT.ERROR;
    }
  },

  purchasePackage: async (pack: PurchasesPackage, onSuccess?: () => void) => {
    appLog('[SubscriptionStore] purchasePackage called.');
    if (!pack) {
      console.error('[SubscriptionStore] No package selected for purchase.');
      analytics.logEvent('purchase_failed', {
        error: 'no_package_selected',
      });
      Alert.alert('Error', 'No subscription package selected.');
      return;
    }
    appLog(
      '[SubscriptionStore] Attempting to purchase package:',
      JSON.stringify(pack, null, 2)
    );
    analytics.logEvent('purchase_initiated', {
      package_id: pack.identifier,
      product_id: pack.product.identifier,
    });

    try {
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pack);
      appLog('[SubscriptionStore] Successfully purchased product:', productIdentifier);
      appLog(
        '[SubscriptionStore] Updated CustomerInfo after purchase:',
        JSON.stringify(customerInfo, null, 2)
      );

      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive || false;
      set({ customerInfo, isProMember: isPro });

      // Update user's pro status in userStore
      if (isPro) {
        useUserStore.getState().setProStatus('pro');
        
        // Update user properties in analytics platforms
        analytics.identifyUser(useUserStore.getState().id || 'anonymous', {
          isPro: true,
          proStatus: 'pro',
          subscriptionType: 'direct_purchase',
          packageId: pack.identifier,
          productId: productIdentifier,
        });

        // Show success toast
        Toast.show({
          type: 'success',
          text1: 'Congratulations! 🎉',
          text2: 'You are now a Shepherd Super user!',
          position: 'top',
          visibilityTime: 4000,
        });
      }
      analytics.logEvent('subscription_purchase_direct_success', {
        package_id: pack.identifier,
        product_id: productIdentifier,
        is_pro: isPro,
        currentScreen: get().fromScreen,
      });
      
      analytics.logEvent('subscription_purchase_success', {
        package_id: pack.identifier,
        product_id: productIdentifier,
        is_pro: isPro,
        currentScreen: get().fromScreen,
      });

      // Show success message
      Alert.alert('Success', 'Purchase successful!');
      appLog('[SubscriptionStore] Pro status after purchase:', get().isProMember);

      // Navigate to ShepherdCommunity screen if user is now a pro member
      if (isPro) {
        setTimeout(() => {
          router.push('/onboarding/pricing/ShepherdCommunity');
        }, 500);
      }

      // Call the onSuccess callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (e: any) {
      if (e.userCancelled) {
        appLog('[SubscriptionStore] User cancelled purchase of package:', pack.identifier);
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
    appLog('[SubscriptionStore] getCustomerInfo called (Adapty + Firestore version).');
    try {
      // 1. Check Adapty profile
      // const profile = await adapty.getProfile(); // Removed Adapty
      // appLog(
      //   '[SubscriptionStore] Adapty profile fetched successfully:',
      //   JSON.stringify(profile, null, 2)
      // );
      // appLog('[SubscriptionStore] Adapty accessLevels:', profile.accessLevels);
      // const isProAdapty =
      //   (profile.accessLevels && profile.accessLevels['premium']?.isActive) || false;
      // appLog(`[SubscriptionStore] User is pro member (premium/Adapty): ${isProAdapty}`);

      // 2. Check Firestore for custom pro/referral
      let isProFromFirebase = false;
      let isProWithReferralFromFirebase = false;
      let proExpiryDate: Date | null = null;
      const currentUser = auth().currentUser;
      if (currentUser) {
        try {
          const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
          const userData = userDoc.data();

          if (userData) {
            appLog('userData.isPro ===== >', userData.isPro);

            isProFromFirebase = userData.isPro;
            isProWithReferralFromFirebase = userData.isProWithReferral;
            // Check if proExpiryDate exists and has the correct format
            if (userData.userProExpiryDate) {
              if (userData.userProExpiryDate.toDate) {
                proExpiryDate = userData.userProExpiryDate.toDate();
              } else if (userData.userProExpiryDate._seconds) {
                proExpiryDate = new Date(
                  userData.userProExpiryDate._seconds * 1000 +
                    userData.userProExpiryDate._nanoseconds / 1000000
                );
              } else if (
                typeof userData.userProExpiryDate === 'string' ||
                typeof userData.userProExpiryDate === 'number'
              ) {
                proExpiryDate = new Date(userData.userProExpiryDate);
              }
            }
            // Check if pro status has expired
            if (proExpiryDate && proExpiryDate < new Date()) {
              // Pro status has expired
              await firestore().collection('users').doc(currentUser.uid).update({
                isPro: false,
              });
              isProWithReferralFromFirebase = false;
              proExpiryDate = null;
              // if (!isProAdapty) { // Removed Adapty
              set({ isProMember: false });
              // Update user properties in analytics platforms
              analytics.identifyUser(useUserStore.getState().id || 'anonymous', {
                isPro: false,
                proStatus: 'free',
                subscriptionType: 'expired',
              });
              // } // Removed Adapty
              useUserStore.getState().setProStatus('free');
              appLog('[SubscriptionStore] Pro status expired in Firestore, set to free.');
            }
          }
        } catch (error) {
          appLog('[SubscriptionStore] Error fetching user data from Firestore:', error);
        }
      }
      appLog('isProFromFirebase ==>', isProFromFirebase);

      // 3. Final pro status: Adapty OR Firestore (if not expired)
      const finalProStatus = isProFromFirebase || isProWithReferralFromFirebase;
      // Track status change if different from current state
      const prevIsPro = get().isProMember;
      if (prevIsPro !== finalProStatus) {
        analytics.logEvent('subscription_status_changed', {
          previous: prevIsPro ? 'pro' : 'free',
          current: finalProStatus ? 'pro' : 'free',
        });
      }
      set({ customerInfo: null, isProMember: finalProStatus }); // Removed Adapty
      useUserStore.getState().setProStatus(finalProStatus ? 'pro' : 'free');
      
      // Handle golden skin removal when user loses pro status
      if (prevIsPro && !finalProStatus) {
        appLog('[SubscriptionStore] User lost pro status, checking for golden skin removal');
        
        try {
          // Import the stores dynamically to avoid circular dependency issues
          const { useShopStore } = await import('./shopStore');
          const { useHomeStore } = await import('./homeStore');
          
          const shopStore = useShopStore.getState();
          const homeStore = useHomeStore.getState();
          
          // Check if user has golden skin equipped (skinNumber: 99)
          if (shopStore.equippedSkin === '99' || homeStore.currentSkin === '99') {
            appLog('[SubscriptionStore] Golden skin is equipped, removing and switching to normal skin');
            
            // Switch to normal skin (skinNumber: 0)
            shopStore.equipSkin('0');
            homeStore.setCurrentSkin('0');
            
            // Update Rive animation if available
            const riveRef = homeStore.riveRef;
            if (riveRef && riveRef.current && riveRef.current.setInputState) {
              try {
                riveRef.current.setInputState('State Machine 1', 'Skin-Number', 0);
                appLog('[SubscriptionStore] Updated Rive animation to normal skin');
              } catch (riveError) {
                appLog('[SubscriptionStore] Error updating Rive skin:', riveError);
              }
            }
            
            // Log analytics event for golden skin removal
            analytics.logEvent('golden_skin_removed_pro_expired', {
              previousSkin: '99',
              newSkin: '0',
              reason: 'pro_status_lost'
            });
            
            appLog('[SubscriptionStore] Successfully removed golden skin due to pro status loss');
          } else {
            appLog('[SubscriptionStore] Golden skin not equipped, no action needed');
          }
        } catch (error) {
          console.error('[SubscriptionStore] Error handling golden skin removal:', error);
        }
      }
      
      // Update user properties in analytics if status changed
      if (prevIsPro !== finalProStatus) {
        analytics.identifyUser(useUserStore.getState().id || 'anonymous', {
          isPro: finalProStatus,
          proStatus: finalProStatus ? 'pro' : 'free',
        });
      }
      
      appLog(
        '[SubscriptionStore] Customer info and pro status updated in store (Adapty + Firestore).'
      );
    } catch (e) {
      console.error('[SubscriptionStore] Error fetching Adapty profile or Firestore:', e);
      analytics.logEvent('subscription_error', {
        error: 'adapty_or_firestore_profile_fetch_failed',
        message: e?.toString?.(),
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
    const hasUsedYearly = usedReferralCodes.includes('YEARLY');
    const hasUsedCreator = usedReferralCodes.includes('CREATE');
    const hasUsedPermanent = usedReferralCodes.includes('WXES4S');

    // Prepare variables that might be needed in switch cases
    let monthExpiry: Date;
    let weekExpiry: Date;
    let yearExpiry: Date;
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
          userProExpiryDate: null, // null means permanent
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
          isProWithReferral: true,
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
          userProExpiryDate: monthExpiry,
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
          isProWithReferral: true,
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
          userProExpiryDate: weekExpiry,
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
          isProWithReferral: true,
        });
        break;

      case 'YEARLY':
        if (hasUsedYearly) {
          throw new Error('You have already used a yearly subscription code');
        }
        // One year pro access
        yearExpiry = new Date();
        yearExpiry.setFullYear(yearExpiry.getFullYear() + 1);

        await userRef.update({
          userProExpiryDate: yearExpiry,
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
          isProWithReferral: true,
        });
        break;

      case 'CREATE':
        if (hasUsedCreator) {
          throw new Error('You have already used a creator subscription code');
        }
        // Special creator code - permanent access
        await userRef.update({
          userProExpiryDate: null, // null means permanent for creators
          usedReferralCodes: firestore.FieldValue.arrayUnion(code),
          isProWithReferral: true,
          isPro: true, // Also set isPro to true for CREATE code
        });
        // Save creator status to AsyncStorage
        await AsyncStorage.setItem('isCreator', 'true');
        // Also set that CREATE code has been entered
        set({ hasEnteredCreateCode: true });
        break;

      default:
        throw new Error('Invalid referral code');
    }

    set({ isProMember: true });
    useUserStore.getState().setProStatus('pro');
    
    // Update user properties in analytics platforms
    analytics.identifyUser(useUserStore.getState().id || 'anonymous', {
      isPro: true,
      proStatus: 'pro',
      subscriptionType: 'referral_code',
      referralCode: code.toUpperCase(),
    });
    
    // Refresh customer info to ensure pro status is properly reflected
    await get().getCustomerInfo();
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
    appLog(`[SubscriptionStore] Setting fromScreen to: ${screenName}`);
    set({ fromScreen: screenName });
    analytics.logEvent('subscription_fromScreen', { screen: screenName });
  },

  loginAdaptyUser: async (userId: string) => {
    // Call adapty.identify to associate purchases with a specific user
    // try { // Removed Adapty
    //   await adapty.identify(userId); // Removed Adapty
    //   appLog(`[SubscriptionStore] Adapty identify successful for userId: ${userId}`); // Removed Adapty
    //   // Optionally refresh customer info after login // Removed Adapty
    //   await get().getCustomerInfo(); // Removed Adapty
    // } catch (e) { // Removed Adapty
    //   console.error('[SubscriptionStore] Error identifying Adapty user:', e); // Removed Adapty
    // } // Removed Adapty
  },
  logoutAdaptyUser: async () => {
    // Call adapty.logout to disassociate purchases from the current user
    // try { // Removed Adapty
    //   await adapty.logout(); // Removed Adapty
    //   appLog('[SubscriptionStore] Adapty logout successful'); // Removed Adapty
    //   // Optionally refresh customer info after logout // Removed Adapty
    //   await get().getCustomerInfo(); // Removed Adapty
    // } catch (e) { // Removed Adapty
    //   console.error('[SubscriptionStore] Error logging out Adapty user:', e); // Removed Adapty
    // } // Removed Adapty
  },
  checkHasSeenHalfOffPaywall: async () => {
    try {
      const hasSeenString = await AsyncStorage.getItem(HALF_OFF_PAYWALL_SEEN_KEY);
      const hasSeen = hasSeenString === 'true';
      set({ hasSeenHalfOffPaywall: hasSeen });
      appLog(`[SubscriptionStore] User has seen half-off paywall: ${hasSeen}`);
    } catch (error) {
      console.error('[SubscriptionStore] Error checking half-off paywall status:', error);
      set({ hasSeenHalfOffPaywall: false });
    }
  },
  markHalfOffPaywallAsSeen: async () => {
    try {
      await AsyncStorage.setItem(HALF_OFF_PAYWALL_SEEN_KEY, 'true');
      set({ hasSeenHalfOffPaywall: true });
      appLog('[SubscriptionStore] Marked half-off paywall as seen');
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
  
  checkHasEnteredCreateCode: async () => {
    try {
      const isCreator = await AsyncStorage.getItem('isCreator');
      const hasEnteredCreateCode = isCreator === 'true';
      set({ hasEnteredCreateCode });
      appLog(`[SubscriptionStore] User has entered CREATE code: ${hasEnteredCreateCode}`);
    } catch (error) {
      console.error('[SubscriptionStore] Error checking CREATE code status:', error);
      set({ hasEnteredCreateCode: false });
    }
  },
  
  // Force refresh pro status across all stores
  forceRefreshProStatus: async () => {
    appLog('[SubscriptionStore] Force refreshing pro status across all stores');
    
    // First get the latest customer info
    await get().getCustomerInfo();
    
    // Get the current pro status
    const isProMember = get().isProMember;
    
    // Also check Firestore directly
    const currentUser = auth().currentUser;
    if (currentUser) {
      try {
        const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (userData && (userData.isPro || userData.isProWithReferral)) {
          appLog('[SubscriptionStore] User is pro in Firestore, ensuring stores are updated');
          set({ isProMember: true });
          useUserStore.getState().setProStatus('pro');
          
          // Update analytics
          analytics.identifyUser(useUserStore.getState().id || 'anonymous', {
            isPro: true,
            proStatus: 'pro',
          });
        }
      } catch (error) {
        appLog('[SubscriptionStore] Error checking Firestore pro status:', error);
      }
    }
    
    appLog('[SubscriptionStore] Force refresh complete, isProMember:', get().isProMember);
  },
}));

// Helper function for navigation after purchase/restore
function handlePostPurchaseNavigation() {
  if (isSignedIn()) {
    appLog('isSignedIn');
    router.replace('/(tabs)');
  } else {
    appLog('notSignedIn');
    router.replace('/onboarding/11');
  }
}

// Helper function to safely present paywall only if user is not pro
export const safelyPresentPaywall = async (paywallType: 'free' | 'halfoff' | 'normal' = 'free') => {
  const store = useSubscriptionStore.getState();
  
  appLog(`[safelyPresentPaywall] Called with paywallType: ${paywallType}, Platform: ${Platform.OS}`);
  
  // Force refresh to get latest status
  await store.forceRefreshProStatus();
  
  // Check if user is pro
  if (store.isProMember || useUserStore.getState().proStatus === 'pro') {
    appLog('[safelyPresentPaywall] User is pro, not presenting paywall');
    return PAYWALL_RESULT.CANCELLED;
  }
  
  // Present the appropriate paywall - works on both iOS and Android
  switch (paywallType) {
    case 'free':
      return store.presentFreeTrialPaywall();
    case 'halfoff':
      return store.presentHalfOffPaywall();
    case 'normal':
      return store.presentPaywall();
    default:
      return store.presentFreeTrialPaywall();
  }
};

export default useSubscriptionStore;
