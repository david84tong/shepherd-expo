import React, { useEffect } from 'react';
import { useStatsigClient } from '../utils/statsig';
import { setStatsigClient } from '../../utils/analytics';

/**
 * Component that initializes Statsig client for analytics integration
 * This should be placed high in the component tree to ensure early initialization
 */
const StatsigAnalyticsInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { client } = useStatsigClient();

  useEffect(() => {
    if (client) {
      setStatsigClient(client);
      console.log('🧪 Statsig client initialized for analytics integration');
    } else {
      // Also check the global client set by provider wrapper
      const globalClient = (global as any)?.statsigClient;
      if (globalClient) {
        setStatsigClient(globalClient);
        console.log('🧪 Statsig client (global) initialized for analytics integration');
      } else {
        console.log('🧪 [STATSIG] useStatsigClient() returned null; waiting for provider init...');
      }
    }
  }, [client]);

  return <>{children}</>;
};

export default StatsigAnalyticsInitializer;