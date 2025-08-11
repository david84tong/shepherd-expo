import appsFlyer from 'react-native-appsflyer';
import { appLog } from '../helper/helper';
import { useFriendStore } from '../stores/friendStore';
import analytics from '~/utils/analytics';

interface AppsFlyerConfig {
  devKey: string;
  appId: string;
  isDebug: boolean;
}

interface InviteLinkData {
  inviteCode: string;
  inviterUserId: string;
  inviterDisplayName: string;
}

class AppsFlyerService {
  private isInitialized = false;
  private config: AppsFlyerConfig;

  constructor() {
    this.config = {
      devKey: process.env.EXPO_PUBLIC_APPSFLYER_DEV_KEY || 'C43LbYriLHEuMFtNv7zhJT',
      appId: 'io.bytehouse',
      isDebug: __DEV__
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      appLog('[AppsFlyer] Service already initialized');
      return;
    }

    try {
      appLog('[AppsFlyer] Initializing service...');

      // Validate required configuration
      if (!this.config.devKey || this.config.devKey === 'C43LbYriLHEuMFtNv7zhJT') {
        appLog('[AppsFlyer] Warning: Using default dev key. Please set EXPO_PUBLIC_APPSFLYER_DEV_KEY');
      }

      // Initialize AppsFlyer SDK
      await appsFlyer.initSdk({
        devKey: this.config.devKey,
        isDebug: this.config.isDebug,
        appId: this.config.appId,
        onInstallConversionDataListener: true,
        onDeepLinkListener: true,
        timeToWaitForATTUserAuthorization: 10,
        manualStart: false
      },(success) => {
        appLog('[AppsFlyer] Service initialized successfully', success);
      },(error) => {
        appLog('[AppsFlyer] Error initializing service:', error);
        throw error;
      });

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      appLog('[AppsFlyer] Service initialized successfully');

      analytics.logEvent('appsflyer_initialized', {
        devKey: this.config.devKey,
        appId: this.config.appId
      });

    } catch (error) {
      appLog('[AppsFlyer] Error initializing service:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Listen for install conversion data (organic vs non-organic installs)
    appsFlyer.onInstallConversionData((data) => {
      appLog('[AppsFlyer] Install conversion data:', data);
      
      if (data?.data) {
        const installData = data.data;
        
        // Check if this is a non-organic install with invite data
        if (installData.is_first_launch && installData.invite_code) {
          this.handleInviteFromInstall(installData);
        }

        analytics.logEvent('appsflyer_install_data', {
          isFirstLaunch: installData.is_first_launch,
          source: installData.media_source,
          campaign: installData.campaign,
          hasInviteCode: !!installData.invite_code
        });
      }
    });
        // Listen for deep links
    appsFlyer.onDeepLink((data) => {
      appLog('[AppsFlyer] Deep link received:', data);
      
      if (data?.data?.deep_link_value) {
        this.handleDeepLink(data.data);
      }
    });
  }

  private async handleInviteFromInstall(data: any): Promise<void> {
    try {
      // According to UDL docs, for new users we should get deep_link_value and deep_link_sub1
      const deepLinkValue = data.deep_link_value;
      const inviteCode = data.deep_link_sub1 || data.invite_code;
      
      if (!inviteCode || deepLinkValue !== 'invite') {
        appLog('[AppsFlyer] No invite code found in install data or not an invite deep link');
        return;
      }

      appLog('[AppsFlyer] Handling invite from install:', { inviteCode, deepLinkValue });

      const friendStore = useFriendStore.getState();
      await friendStore.handleInviteFromDeepLink(inviteCode, {
        clickId: data.click_id,
        mediaSource: data.media_source,
        campaign: data.campaign,
        installTime: data.install_time,
        deepLinkValue: deepLinkValue,
        deepLinkSub1: data.deep_link_sub1,
        isDeferred: true
      });

    } catch (error) {
      appLog('[AppsFlyer] Error handling invite from install:', error);
    }
  }

  private async handleDeepLink(data: any): Promise<void> {
    try {
      const deepLinkValue = data.deep_link_value;
      const deepLinkSub1 = data.deep_link_sub1; // This should contain our invite code
      appLog('[AppsFlyer] Processing UDL deep link:', { deepLinkValue, deepLinkSub1, data });

      // According to AppsFlyer UDL docs, invite_code should be in deep_link_sub1
      let inviteCode: string | null = deepLinkSub1 || data.invite_code || null;

      // Fallback: parse from deep_link_value if it looks like a URL with query
      if (!inviteCode && typeof deepLinkValue === 'string') {
        try {
          let url: URL;
          try {
            url = new URL(deepLinkValue);
          } catch {
            url = new URL(deepLinkValue, 'https://shepherd-bible-pet.onelink.me');
          }
          inviteCode = url.searchParams.get('code');
        } catch {
          // ignore parsing errors
        }
      }

      if (inviteCode && deepLinkValue === 'invite') {
        const friendStore = useFriendStore.getState();
        await friendStore.handleInviteFromDeepLink(inviteCode, {
          clickId: data.click_id,
          mediaSource: data.media_source,
          campaign: data.campaign,
          deepLinkValue: deepLinkValue,
          deepLinkSub1: deepLinkSub1,
          isDeferred: false
        });
      }

    } catch (error) {
      appLog('[AppsFlyer] Error handling deep link:', error);
    }
  }

  // Set the OneLink ID for User Invite API - call this before generating links
  async setAppInviteOneLinkID(oneLinkID: string): Promise<void> {
    try {
      appLog('[AppsFlyer] Setting App Invite OneLink ID:', oneLinkID);
      
      return new Promise((resolve, reject) => {
        appsFlyer.setAppInviteOneLinkID(oneLinkID, (result: any) => {
          appLog('[AppsFlyer] App Invite OneLink ID set successfully:', result);
          resolve();
        });
      });
    } catch (error) {
      appLog('[AppsFlyer] Error setting App Invite OneLink ID:', error);
      throw error;
    }
  }

  async createInviteLink(inviteData: InviteLinkData): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      appLog('[AppsFlyer] Creating invite link using User Invite API:', inviteData);

      // Set the OneLink ID first (required for User Invite API)
      await this.setAppInviteOneLinkID('r9C1');

      // Use the official AppsFlyer User Invite API
      return new Promise((resolve, reject) => {
        appsFlyer.generateInviteLink(
          {
            channel: 'friend_share',
            campaign: 'friend_invite',
            customerID: inviteData.inviterUserId,
            userParams: {
              deep_link_value: 'invite',
              deep_link_sub1: inviteData.inviteCode,
              invite_code: inviteData.inviteCode,
              inviter_user_id: inviteData.inviterUserId,
              inviter_name: inviteData.inviterDisplayName,
              custom_param: 'friend_invite'
            }
          },
          (result: any) => {
            const link = result as string;
            appLog('[AppsFlyer] User Invite link generated successfully:', link);

            analytics.logEvent('appsflyer_invite_link_created', {
              inviteCode: inviteData.inviteCode,
              inviterUserId: inviteData.inviterUserId
            });

            // Track invite link creation (not sharing yet)
            appsFlyer.logEvent('invite_link_created', {
              invite_code: inviteData.inviteCode,
              inviter_user_id: inviteData.inviterUserId,
              inviter_name: inviteData.inviterDisplayName,
              invite_url: link,
              timestamp: Date.now()
            });

            resolve(link);
          },
          (error: any) => {
            appLog('[AppsFlyer] Error generating User Invite link:', error);
            
            // Fallback to manual OneLink construction if User Invite API fails
            const deepLinkUrl = `io.bytehouse://invite?code=${inviteData.inviteCode}`;
            const fallbackLink = `https://shepherd-bible-pet.onelink.me/r9C1?invite_code=${inviteData.inviteCode}&deep_link_value=invite&af_dp=${encodeURIComponent(deepLinkUrl)}`;
            
            appLog('[AppsFlyer] Using fallback OneLink:', fallbackLink);
            resolve(fallbackLink);
          }
        );
      });

    } catch (error) {
      appLog('[AppsFlyer] Error creating invite link:', error);
      return null;
    }
  }

  async trackInviteShared(inviteCode: string, shareMethod: string): Promise<void> {
    try {
      appLog('[AppsFlyer] Tracking invite shared:', { inviteCode, shareMethod });

      await appsFlyer.logEvent('invite_shared', {
        invite_code: inviteCode,
        share_method: shareMethod,
        timestamp: Date.now()
      });

      analytics.logEvent('invite_shared', {
        inviteCode,
        shareMethod,
        source: 'appsflyer'
      });

    } catch (error) {
      appLog('[AppsFlyer] Error tracking invite shared:', error);
    }
  }

  async trackInviteAccepted(inviteCode: string, inviterUserId: string): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        appLog('[AppsFlyer] Tracking invite accepted:', { inviteCode, inviterUserId, attempt: attempt + 1 });

        await appsFlyer.logEvent('invite_accepted', {
          invite_code: inviteCode,
          inviter_user_id: inviterUserId,
          timestamp: Date.now()
        });

        analytics.logEvent('invite_accepted', {
          inviteCode,
          inviterUserId,
          source: 'appsflyer'
        });

        return; // Success, exit function
      } catch (error) {
        attempt++;
        appLog('[AppsFlyer] Error tracking invite accepted (attempt ' + attempt + '):', error);
        
        if (attempt >= maxRetries) {
          appLog('[AppsFlyer] Failed to track invite accepted after ' + maxRetries + ' attempts');
          break;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  getInstallData(): Promise<any> {
    return new Promise((resolve) => {
      appsFlyer.onInstallConversionData((data) => {
        resolve(data);
      });
    });
  }
}

export const appsFlyerService = new AppsFlyerService();
export default appsFlyerService;