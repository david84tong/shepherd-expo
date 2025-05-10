import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { create } from 'zustand';
import { Alert } from 'react-native';

interface SubscriptionState {
  customerInfo: CustomerInfo | null;
  isProMember: boolean;
  initializeRevenueCat: (apiKey: string, userId: string | null) => Promise<void>;
  presentPaywall: () => Promise<PAYWALL_RESULT | null>;
  purchasePackage: (pack: PurchasesPackage) => Promise<void>;
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
    try {
      const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();
      console.log('[SubscriptionStore] Paywall presented, result:', paywallResult);

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
          console.log('[SubscriptionStore] Purchase completed successfully from paywall. Updating customer info...');
          Alert.alert("Success", "Purchase completed!");
          await get().getCustomerInfo(); 
          break;
        case PAYWALL_RESULT.RESTORED:
          console.log('[SubscriptionStore] Purchase restored successfully from paywall. Updating customer info...');
          Alert.alert("Success", "Purchases restored!");
          await get().getCustomerInfo(); 
          break;
        case PAYWALL_RESULT.CANCELLED:
          console.log('[SubscriptionStore] Paywall cancelled by user.');
          break;
        case PAYWALL_RESULT.ERROR:
          console.log('[SubscriptionStore] Error occurred during paywall presentation or purchase.');
          Alert.alert("Error", "An error occurred during the purchase process.");
          break;
      }
      return paywallResult;
    } catch (error) {
      console.error('[SubscriptionStore] Error presenting paywall:', error);
      Alert.alert("Error", "Could not display subscription options. Please try again later.");
      return null;
    }
  },

  purchasePackage: async (pack: PurchasesPackage) => {
    console.log("[SubscriptionStore] purchasePackage called.");
    if (!pack) {
        console.error("[SubscriptionStore] No package selected for purchase.");
        Alert.alert("Error", "No subscription package selected.");
        return;
    }
    console.log("[SubscriptionStore] Attempting to purchase package:", JSON.stringify(pack, null, 2));
    try {
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pack);
      console.log('[SubscriptionStore] Successfully purchased product:', productIdentifier);
      console.log('[SubscriptionStore] Updated CustomerInfo after purchase:', JSON.stringify(customerInfo, null, 2));
      set({ customerInfo, isProMember: customerInfo.entitlements.active[ENTITLEMENT_ID]?.isActive || false });
      Alert.alert("Success", "Purchase successful!");
      console.log('[SubscriptionStore] Pro status after purchase:', get().isProMember);
    } catch (e: any) {
      if (e.userCancelled) {
        console.log('[SubscriptionStore] User cancelled purchase of package:', pack.identifier);
      } else {
        console.error('[SubscriptionStore] Error purchasing package:', pack.identifier, e);
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
      set({ customerInfo, isProMember: isPro });
      console.log('[SubscriptionStore] Customer info and pro status updated in store.');
    } catch (e) {
      console.error('[SubscriptionStore] Error fetching customer info:', e);
    }
  },
}));

export default useSubscriptionStore;
