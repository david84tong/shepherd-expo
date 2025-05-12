import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { create } from 'zustand';
import { Alert } from 'react-native';
import { useUserStore } from './userStore';
import analytics from '~/utils/analytics';
import { router } from 'expo-router';

interface SubscriptionState {
  customerInfo: CustomerInfo | null;
  isProMember: boolean;
  initializeRevenueCat: (apiKey: string, userId: string | null) => Promise<void>;
  presentPaywall: () => Promise<PAYWALL_RESULT | null>;
  purchasePackage: (pack: PurchasesPackage, onSuccess?: () => void) => Promise<void>;
  getCustomerInfo: () => Promise<void>;
  // Add other state and actions here
}

const ENTITLEMENT_ID = 'Super Shepherd'; // Define the entitlement ID

const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  customerInfo: null,
  isProMember: false,

  initializeRevenueCat: async (apiKey: string, userId: string | null) => {
    console.log('[SubscriptionStore] initializeRevenueCat called.');
    console.log(`[SubscriptionStore] API Key: ${apiKey ? 'Provided' : 'MISSING!'}, User ID: ${userId || 'Anonymous'}`);

    if (!apiKey) {
      console.error("[SubscriptionStore] RevenueCat API key is missing!");
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
        console.log('[SubscriptionStore] RevenueCat: No userId provided, will initialize with anonymous user.');
      }
      console.log('[SubscriptionStore] Attempting to configure RevenueCat SDK.');
      await Purchases.configure({ apiKey });
      console.log('[SubscriptionStore] RevenueCat SDK configured successfully.');
      
      console.log('[SubscriptionStore] Fetching initial customer info after configuration.');
      await get().getCustomerInfo(); // Fetch customer info on init
    } catch (e) {
      console.error('[SubscriptionStore] RevenueCat SDK configuration or login failed:', e);
      Alert.alert("Error", "Failed to initialize subscription service. Please check your connection and try again.");
    }
  },

  presentPaywall: async () => {
    
    console.log("[SubscriptionStore] presentPaywall called.");
    analytics.logEvent('paywall_viewed');
    try {
      const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();
      console.log('[SubscriptionStore] Paywall presented, result:', paywallResult);

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
          console.log('[SubscriptionStore] Purchase completed successfully from paywall. Updating customer info...');
          analytics.logEvent("subscription_purchase_success", { 
            source: 'paywall'
          });
          await get().getCustomerInfo(); 
          // Update user's pro status in userStore
          useUserStore.getState().setProStatus('pro');
          // Navigate to home screen after successful purchase
          router.replace('/(tabs)');
          // Return PURCHASED so PricingScreen can redirect
          return PAYWALL_RESULT.PURCHASED;
        case PAYWALL_RESULT.RESTORED:
          console.log('[SubscriptionStore] Purchase restored successfully from paywall. Updating customer info...');
          analytics.logEvent('subscription_restored', { 
            source: 'paywall'
          });
          Alert.alert("Success", "Purchases restored!");
          await get().getCustomerInfo(); 
          // Update user's pro status in userStore
          useUserStore.getState().setProStatus('pro');
          // Navigate to home screen after successful restore
          router.replace('/(tabs)');
          // Return RESTORED so PricingScreen can redirect
          return PAYWALL_RESULT.RESTORED;
        case PAYWALL_RESULT.CANCELLED:
          console.log('[SubscriptionStore] Paywall cancelled by user.');
          analytics.logEvent('purchase_cancelled', { 
            source: 'paywall'
          });
          break;
        case PAYWALL_RESULT.ERROR:
          console.log('[SubscriptionStore] Error occurred during paywall presentation or purchase.');
          analytics.logEvent('purchase_failed', { 
            source: 'paywall', 
            error: 'presentation_error'
          });
          Alert.alert("Error", "An error occurred during the purchase process.");
          break;
      }
      return paywallResult;
    } catch (error) {
      console.error('[SubscriptionStore] Error presenting paywall:', error);
      analytics.logEvent('purchase_failed', { 
        source: 'paywall', 
        error: 'exception', 
        message: error?.toString()
      });
      Alert.alert("Error", "Could not display subscription options. Please try again later.");
      return null;
    }
  },

  purchasePackage: async (pack: PurchasesPackage, onSuccess?: () => void) => {
    console.log("[SubscriptionStore] purchasePackage called.");
    if (!pack) {
        console.error("[SubscriptionStore] No package selected for purchase.");
        analytics.logEvent('purchase_failed', { 
          error: 'no_package_selected'
        });
        Alert.alert("Error", "No subscription package selected.");
        return;
    }
    console.log("[SubscriptionStore] Attempting to purchase package:", JSON.stringify(pack, null, 2));
    analytics.logEvent('purchase_initiated', { 
      package_id: pack.identifier,
      offering_id: pack.offeringIdentifier,
      product_id: pack.product.identifier
    });
    
    try {
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pack);
      console.log('[SubscriptionStore] Successfully purchased product:', productIdentifier);
      console.log('[SubscriptionStore] Updated CustomerInfo after purchase:', JSON.stringify(customerInfo, null, 2));
      
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive || false;
      set({ customerInfo, isProMember: isPro });
      
      // Update user's pro status in userStore
      if (isPro) {
        useUserStore.getState().setProStatus('pro');
      }
      
      analytics.logEvent('subscription_purchase_success', { 
        package_id: pack.identifier,
        offering_id: pack.offeringIdentifier,
        product_id: productIdentifier,
        is_pro: isPro
      });
      
      // Show success message
      Alert.alert("Success", "Purchase successful!");
      console.log('[SubscriptionStore] Pro status after purchase:', get().isProMember);
      
      // Navigate to home screen after successful purchase
      if (isPro) {
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 500); // Short delay to allow Alert to be seen
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
          reason: 'user_cancelled'
        });
      } else {
        console.error('[SubscriptionStore] Error purchasing package:', pack.identifier, e);
        analytics.logEvent('subscription_purchase_failed', { 
          package_id: pack.identifier,
          offering_id: pack.offeringIdentifier,
          product_id: pack.product.identifier,
          error: e.message || 'unknown_error'
        });
        Alert.alert("Purchase Error", e.message || "An error occurred while making the purchase.");
      }
    }
  },

  getCustomerInfo: async () => {
    console.log("[SubscriptionStore] getCustomerInfo called.");
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('[SubscriptionStore] CustomerInfo fetched successfully:', JSON.stringify(customerInfo, null, 2));
      const isPro = customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive || false;
      console.log(`[SubscriptionStore] User is pro member (${ENTITLEMENT_ID}): ${isPro}`);
      
      // Track status change if different from current state
      const prevIsPro = get().isProMember;
      if (prevIsPro !== isPro) {
        analytics.logEvent('subscription_status_changed', { 
          previous: prevIsPro ? 'pro' : 'free',
          current: isPro ? 'pro' : 'free'
        });
      }
      
      set({ customerInfo, isProMember: isPro });
      
      // Update user's pro status in userStore based on current entitlement status
      // This ensures if a user cancels their subscription, their status is properly updated
      useUserStore.getState().setProStatus(isPro ? 'pro' : 'free');
      
      console.log('[SubscriptionStore] Customer info and pro status updated in store.');
    } catch (e) {
      console.error('[SubscriptionStore] Error fetching customer info:', e);
      analytics.logEvent('subscription_error', { 
        error: 'customer_info_fetch_failed',
        message: e?.toString()
      });
    }
  },
}));

export default useSubscriptionStore;
