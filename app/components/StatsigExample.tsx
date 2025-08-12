import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useFeatureGate, useStatsigClient } from '../utils/statsig';

/**
 * Example component showing how to use Statsig experiments and feature gates
 */
const StatsigExample: React.FC = () => {
  // Example: Use a feature gate
  const isNewFeatureEnabled = useFeatureGate('new_feature_enabled');
  
  // Get Statsig client for advanced usage
  const { client } = useStatsigClient();

  const handleLogEvent = () => {
    if (client) {
      client.logEvent('example_button_clicked', {
        timestamp: Date.now(),
        source: 'statsig_example_component'
      });
      Alert.alert('Event Logged', 'Successfully logged event to Statsig');
    } else {
      Alert.alert('Error', 'Statsig client not available');
    }
  };

  const handleCheckExperiment = () => {
    if (client) {
      try {
        const experiment = client.getExperiment('example_experiment');
        Alert.alert('Experiment Value', JSON.stringify(experiment.value || {}));
      } catch (error) {
        Alert.alert('Error', 'Failed to get experiment value');
      }
    } else {
      Alert.alert('Error', 'Statsig client not available');
    }
  };

  const handleCheckConfig = () => {
    if (client) {
      try {
        const config = client.getConfig('example_config');
        Alert.alert('Config Value', JSON.stringify(config.value || {}));
      } catch (error) {
        Alert.alert('Error', 'Failed to get config value');
      }
    } else {
      Alert.alert('Error', 'Statsig client not available');
    }
  };

  return (
    <View className="p-4 bg-white rounded-lg m-4">
      <Text className="font-feather text-lg text-textPrimary mb-4">
        🧪 Statsig Integration Example
      </Text>
      
      {/* Feature Gate Example */}
      <View className="mb-4">
        <Text className="font-din text-sm text-textSecondary mb-2">
          Feature Gate: &apos;new_feature_enabled&apos;
        </Text>
        <View className={`p-3 rounded-lg ${isNewFeatureEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
          <Text className={`font-din text-sm ${isNewFeatureEnabled ? 'text-green-800' : 'text-red-800'}`}>
            {isNewFeatureEnabled ? '✅ Feature is ENABLED' : '❌ Feature is DISABLED'}
          </Text>
        </View>
      </View>

      {/* Test Buttons */}
      <View className="space-y-2">
        <TouchableOpacity
          className="bg-blue-500 p-3 rounded-lg"
          onPress={handleLogEvent}>
          <Text className="font-din text-white text-center">Log Test Event</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-purple-500 p-3 rounded-lg"
          onPress={handleCheckExperiment}>
          <Text className="font-din text-white text-center">Check Experiment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-orange-500 p-3 rounded-lg"
          onPress={handleCheckConfig}>
          <Text className="font-din text-white text-center">Check Config</Text>
        </TouchableOpacity>
      </View>

      {/* Usage Instructions */}
      <View className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <Text className="font-din text-xs text-yellow-800">
          💡 This component demonstrates how to use Statsig feature gates, experiments, and configs.
          Create these in your Statsig console to see them in action.
        </Text>
      </View>
    </View>
  );
};

export default StatsigExample;