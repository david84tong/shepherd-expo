import { useEffect, useState } from 'react';
import remoteConfig from '@react-native-firebase/remote-config';
import { compareVersions } from 'compare-versions';
import Constants from 'expo-constants';

const useForceUpdateCheck = () => {
  // Temporarily disable force update check
  return { visibleForceUpdate: false };

  // Original code commented out for now
  /*
  const [visibleForceUpdate, setVisibleForceUpdate] = useState(false);
  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        await remoteConfig().setConfigSettings({
          minimumFetchIntervalMillis: 0,
        });
        await remoteConfig().setDefaults({
          force_update_version: '1.0.0',
          force_update_url_android: '',
          force_update_url_ios: '',
        });

        await remoteConfig().fetchAndActivate();
        const remoteVersion = remoteConfig().getValue('force_update_version').asString();
        const appVersion = Constants.expoConfig?.version;
        if (appVersion && compareVersions(appVersion, remoteVersion) < 0) {
          setTimeout(() => {
            setVisibleForceUpdate(true);
          }, 1000);
        }
      } catch (error) {
        console.warn('Remote Config error:', error);
      }
    };

    checkForUpdate();
  }, []);
  return { visibleForceUpdate };
  */
};

export default useForceUpdateCheck;
