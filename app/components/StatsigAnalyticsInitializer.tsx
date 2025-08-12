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
      // Set the Statsig client for analytics integration
      setStatsigClient(client);
      console.log('🧪 Statsig client initialized for analytics integration');
    }
  }, [client]);

  return <>{children}</>;
};

export default StatsigAnalyticsInitializer;