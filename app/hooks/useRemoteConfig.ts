import { useEffect } from 'react';
import remoteConfig from '@react-native-firebase/remote-config';

export const useRemoteConfig = () => {
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Set minimum fetch interval to 0 for development
        await remoteConfig().setConfigSettings({
          minimumFetchIntervalMillis: 0,
        });

        // Set default values
        await remoteConfig().setDefaults({
          hide_google_login: false,
          show_email_password: false,
        });

        // Fetch and activate the config
        await remoteConfig().fetchAndActivate();
        const hide_google_login = remoteConfig().getValue('hide_google_login').asBoolean();
        const show_email_password = remoteConfig().getValue('show_email_password').asBoolean();
        const is_In_Review = remoteConfig().getValue('inReview').asBoolean();
         // Get the values
        (global as any).hideGoogleLogin = hide_google_login;
        (global as any).showEmailPassword = show_email_password;
        (global as any).is_In_Review = is_In_Review;
      } catch (error) {
        console.error('Error fetching remote config:', error);
      }
    };

    fetchConfig();
  }, []);

  return {};
};

// Default export for Expo Router compatibility
export default {}
