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

      // Initialize AppsFlyer SDK
      await appsFlyer.initSdk({
        devKey: this.config.devKey,
        isDebug: this.config.isDebug,
        appId: this.config.appId,
        onInstallConversionDataListener: true,
        onDeepLinkListener: true,
        timeToWaitForATTUserAuthorization: 10,
      },(success) => {
        appLog('[AppsFlyer] Service initialized successfully', success);
      },(error) => {
        appLog('[AppsFlyer] Error initializing service:', error);
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
        if (!installData.is_first_launch && installData.invite_code) {
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
      const inviteCode = data.invite_code;
      if (!inviteCode) return;

      appLog('[AppsFlyer] Handling invite from install:', { inviteCode });

      const friendStore = useFriendStore.getState();
      await friendStore.handleInviteFromDeepLink(inviteCode, {
        clickId: data.click_id,
        mediaSource: data.media_source,
        campaign: data.campaign,
        installTime: data.install_time,
        isDeferred: true
      });

    } catch (error) {
      appLog('[AppsFlyer] Error handling invite from install:', error);
    }
  }

  private async handleDeepLink(data: any): Promise<void> {
    try {
      const deepLinkValue = data.deep_link_value;
      appLog('[AppsFlyer] Processing deep link:', deepLinkValue);

      // Parse invite code from deep link
      // Expected format: "invite?code=ABC123"
      const url = new URL(deepLinkValue, 'https://shepherd-bible-pet.onelink.me');
      const inviteCode = url.searchParams.get('code');

      if (inviteCode) {
        const friendStore = useFriendStore.getState();
        await friendStore.handleInviteFromDeepLink(inviteCode, {
          clickId: data.click_id,
          mediaSource: data.media_source,
          campaign: data.campaign,
          isDeferred: false
        });
      }

    } catch (error) {
      appLog('[AppsFlyer] Error handling deep link:', error);
    }
  }

  async createInviteLink(inviteData: InviteLinkData): Promise<string | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      appLog('[AppsFlyer] Creating invite link:', inviteData);

      // Create AppsFlyer OneLink URL
      const oneLinkData = {
        campaign: 'friend_invite',
        source: 'friend_share',
        medium: 'invite_link',
        custom_parameters: {
          invite_code: inviteData.inviteCode,
          inviter_user_id: inviteData.inviterUserId,
          inviter_name: inviteData.inviterDisplayName
        }
      };

      // Generate the deep link URL
      const deepLinkValue = `invite?code=${inviteData.inviteCode}`;
      
      // Use your actual AppsFlyer OneLink
      const inviteUrl = `https://shepherd-bible-pet.onelink.me/r9C1?pid=friend_invite&c=friend_share&invite_code=${inviteData.inviteCode}&inviter_user_id=${inviteData.inviterUserId}&inviter_name=${encodeURIComponent(inviteData.inviterDisplayName)}&deep_link_value=${encodeURIComponent(deepLinkValue)}`;

      appLog('[AppsFlyer] Generated invite link:', inviteUrl);

      analytics.logEvent('appsflyer_invite_link_created', {
        inviteCode: inviteData.inviteCode,
        inviterUserId: inviteData.inviterUserId
      });

      appsFlyer.logEvent('invite_shared', {
        invite_code: inviteData.inviteCode,
        share_method: 'invite_link',
        inviter_user_id: inviteData.inviterUserId,
        inviter_name: inviteData.inviterDisplayName,
        invite_url: inviteUrl,
        timestamp: Date.now()
      });

      return inviteUrl;

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
    try {
      appLog('[AppsFlyer] Tracking invite accepted:', { inviteCode, inviterUserId });

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

    } catch (error) {
      appLog('[AppsFlyer] Error tracking invite accepted:', error);
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