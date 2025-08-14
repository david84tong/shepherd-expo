import { BottomSheetModal } from '@gorhom/bottom-sheet';
import firestore from '@react-native-firebase/firestore';
import { useRouter, usePathname } from 'expo-router';
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, ScrollView, Alert, TextInput } from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeStore, SuccessAnimationType } from '../app/stores/homeStore';
import { useUserStore } from '../app/stores/userStore';
import { usePathStore } from '../app/stores/pathStore';
import { useDevotionalStore } from '../app/stores/devotionalStore';
import { useAuth, isSignedIn } from '../app/hooks/authHook';
import SuccessAnimation from './SuccessAnimation'; // Import the full SuccessAnimation component
import SuccessAnimationContent from './SuccessAnimation'; // Assuming SuccessAnimation is in the same components dir
import { HalfModalType } from '../app/halfModal';
import { calculateExpForLevel } from '../utils/levelUtils';
import { syncWithFirestore } from '~/app/helper/firebaseHelper';
import { useCheckInStore } from '~/app/stores/checkInStore';
import dayjs from 'dayjs';
import { appLog } from '~/app/helper/helper';
import EvolutionScreen from './EvolutionScreen';
import { getStatsigClient } from '../utils/analytics';

// Debug screen destinations
interface DebugScreen {
  name: string;
  route: string;
  params?: Record<string, string>;
}

// Onboarding screens for debugging
const ONBOARDING_SCREENS: DebugScreen[] = [
  { name: 'Onboarding 1 - Welcome', route: '/onboarding/1' },
  { name: 'Onboarding 2 - Lamb Name', route: '/onboarding/2' },
  { name: 'Onboarding 3 - Intent', route: '/onboarding/3' },
  { name: 'Onboarding 4 - Bible Familiarity', route: '/onboarding/4' },
  { name: 'Onboarding 5 - Reading Time', route: '/onboarding/5' },
  { name: 'Onboarding 6 - Custom Plan', route: '/onboarding/6' },
  { name: 'Onboarding 7 - Notifications', route: '/onboarding/7' },
  { name: 'Onboarding 9 - Notification Permission', route: '/onboarding/9' },
  { name: 'Onboarding 10 - Reminder Time', route: '/onboarding/10' },
  { name: 'Onboarding 11 - Streak Commitment', route: '/onboarding/streakCommitment' },
  { name: 'Loading Screen', route: '/onboarding/LoadingScreen' },
  { name: 'Lamb Growth Explainer', route: '/onboarding/explainer' },
];

// Feature screens for debugging
const FEATURE_SCREENS: DebugScreen[] = [{ name: 'Streak Screen', route: '/streak' }];

// Custom toast config with tailwind styling
const toastConfig: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-darkGreen shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
  error: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-red shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
  info: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View className="bg-surfaceCream rounded-xl px-4 py-3 mx-4 mb-4 border-l-4 border-accentGold shadow-md">
      <Text className="font-feather text-base text-textPrimary">{text1}</Text>
      {text2 && <Text className="font-din text-sm text-description mt-1">{text2}</Text>}
    </View>
  ),
};

// ExperimentCard component to display Statsig experiment data
interface ExperimentCardProps {
  experimentName: string;
}

function ExperimentCard({ experimentName }: ExperimentCardProps) {
  // Initialize experiment data with proper error handling
  const [experimentData, setExperimentData] = useState({
    value: null,
    groupName: 'unknown',
    allocated: false,
    error: null as string | null
  });

  // Get experiment data in useEffect to avoid hooks rules violations
  React.useEffect(() => {
    const getExperimentData = async () => {
      try {
        // Try to access Statsig client through multiple methods
        let statsigExperiment = null;
        let experimentValue = null;
        let groupName = 'unknown';
        let ruleID = null;
        
        // Method 1: Try to access through global scope and analytics module
        const globalStatsig = (global as any)?.statsigClient || 
                            (window as any)?.statsigClient || 
                            null;
        
        // Method 1b: Try to access through analytics module (should be set by StatsigAnalyticsInitializer)
        const analyticsStatsigClient = getStatsigClient();
        appLog('🧪 [STATSIG] Analytics module Statsig client available:', !!analyticsStatsigClient);
        if (analyticsStatsigClient) {
          appLog('🧪 [STATSIG] Analytics Statsig client methods:', Object.getOwnPropertyNames(analyticsStatsigClient));
        }
        
        // Use whichever client is available
        const availableStatsigClient = globalStatsig || analyticsStatsigClient;
        
        if (availableStatsigClient) {
          try {
            statsigExperiment = availableStatsigClient.getExperiment(experimentName);
            appLog(`🧪 [STATSIG] Raw experiment object for ${experimentName}:`, statsigExperiment);
            
            if (statsigExperiment) {
              // Check what methods are available on the experiment object
              appLog(`🧪 [STATSIG] Experiment object methods:`, Object.getOwnPropertyNames(statsigExperiment));
              
              // Try different ways to get the value
              if (typeof statsigExperiment.getValue === 'function') {
                experimentValue = statsigExperiment.getValue();
              } else if (typeof statsigExperiment.get === 'function') {
                // Try .get() method instead - for specific experiments, get the specific parameter
                if (experimentName === 'path_feature') {
                  experimentValue = statsigExperiment.get('path_shown', false);
                } else if (experimentName === 'gpt-model') {
                  experimentValue = { gptModel: statsigExperiment.get('gptModel', 'gpt-5-nano') };
                } else if (experimentName === 'prayer_gen_on') {
                  experimentValue = statsigExperiment.get('generate_prayer_for_user', false);
                } else if (experimentName === 'exp_streak_after_daily_reading') {
                  experimentValue = statsigExperiment.get('streak_after_reading_flag', false);
                } else {
                  experimentValue = statsigExperiment.get('value', null);
                }
              } else if (statsigExperiment.value !== undefined) {
                // Direct value property - for specific experiments, extract specific parameters
                if (experimentName === 'path_feature' && statsigExperiment.value.path_shown !== undefined) {
                  experimentValue = statsigExperiment.value.path_shown;
                } else if (experimentName === 'gpt-model' && statsigExperiment.value.gptModel !== undefined) {
                  experimentValue = { gptModel: statsigExperiment.value.gptModel };
                } else if (experimentName === 'prayer_gen_on' && statsigExperiment.value.generate_prayer_for_user !== undefined) {
                  experimentValue = statsigExperiment.value.generate_prayer_for_user;
                } else if (experimentName === 'exp_streak_after_daily_reading' && statsigExperiment.value.streak_after_reading_flag !== undefined) {
                  experimentValue = statsigExperiment.value.streak_after_reading_flag;
                } else {
                  experimentValue = statsigExperiment.value;
                }
              } else {
                // For specific experiments, try to get the specific parameter
                if (experimentName === 'path_feature') {
                  experimentValue = statsigExperiment.path_shown ?? null;
                } else if (experimentName === 'gpt-model') {
                  experimentValue = { gptModel: statsigExperiment.gptModel ?? 'gpt-5-nano' };
                } else if (experimentName === 'prayer_gen_on') {
                  experimentValue = statsigExperiment.generate_prayer_for_user ?? false;
                } else if (experimentName === 'exp_streak_after_daily_reading') {
                  experimentValue = statsigExperiment.streak_after_reading_flag ?? false;
                }
              }
              
              // Try different ways to get group name
              if (typeof statsigExperiment.getGroupName === 'function') {
                groupName = statsigExperiment.getGroupName();
              } else if (statsigExperiment.groupName) {
                groupName = statsigExperiment.groupName;
              } else if (statsigExperiment.allocation) {
                groupName = statsigExperiment.allocation;
              }
              
              ruleID = statsigExperiment.getRuleID?.() || statsigExperiment.ruleID || null;
              
              appLog(`🧪 [STATSIG] Got experiment data for ${experimentName}:`, {
                experimentValue,
                groupName,
                ruleID,
                statsigExperiment
              });
            }
          } catch (statsigError) {
            appLog(`🧪 [STATSIG] Error accessing global experiment ${experimentName}:`, statsigError);
          }
        }
        
        // If we found experiment data, set it
        if (experimentValue !== null || groupName !== 'unknown') {
          setExperimentData({
            value: experimentValue,
            groupName,
            allocated: true,
            error: null
          });
          return;
        }
        
        // Method 2: For path_feature, try to access via useHomeScreen context (only as fallback)
        if (experimentName === 'path_feature' && !statsigExperiment) {
          // We know this experiment is implemented in useHomeScreen hook
          // but we can't access it directly from here due to React hooks rules
          appLog(`🧪 [STATSIG] path_feature is implemented in useHomeScreen hook but client unavailable`);
          appLog(`  - Check useHomeScreen.ts line 64: useExperiment("path_feature")`);
          appLog(`  - Returns: pathFeatureExperiment.value controls showCustomPathButton`);
          experimentValue = null; // Unknown - need to check implementation
          groupName = 'unknown_check_needed';
        }
        
        // Fallback to hardcoded experiment data for known experiments
        if (experimentName === 'path_feature') {
          // For path_feature, we know it's implemented but can't access the value directly
          setExperimentData({
            value: null,
            groupName: 'unknown_check_needed',
            allocated: true,
            error: null
          });
        } else {
          // Unknown experiment
          setExperimentData({
            value: null,
            groupName: 'unknown',
            allocated: false,
            error: 'Experiment not found in Statsig'
          });
        }
      } catch (error) {
        appLog('❌ Error in getExperimentData:', error);
        setExperimentData(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Component error' 
        }));
      }
    };
    
    getExperimentData();
  }, [experimentName]);

  const getStatusColor = () => {
    if (experimentData.error) return 'bg-[#FFE0E0]'; // Light red for errors
    
    // Handle specific experiment logic 
    if (experimentName === 'path_feature') {
      // For path_feature: Control = path_shown:true (green), Test = path_shown:false (blue)
      if (experimentData.value === true) return 'bg-[#E8F5E8]'; // Light green for control group (keep path)
      if (experimentData.value === false) return 'bg-[#E3F2FD]'; // Light blue for test group (remove path)
    } else {
      // Generic experiment handling
      if (experimentData.value === true) return 'bg-[#E3F2FD]'; // Light blue for test group
      if (experimentData.value === false) return 'bg-[#E8F5E8]'; // Light green for control group
    }
    
    if (!experimentData.allocated) return 'bg-[#FFEBEE]'; // Light red for not allocated
    return 'bg-[#FFF8E1]'; // Light yellow for unknown/check needed
  };

  const getStatusText = () => {
    if (experimentData.error) return '⚠️ Not Available';
    
    // Handle specific experiment logic based on Statsig configuration
    if (experimentName === 'path_feature') {
      // For path_feature: Control = path_shown:true (keep), Test = path_shown:false (remove)
      if (experimentData.value === true) return '✅ Control Group';  // path_shown = true (keep path)
      if (experimentData.value === false) return '🔄 Test Group';   // path_shown = false (remove path)
      if (experimentData.groupName === 'unknown_check_needed') return '🔍 Check Home Screen';
    }
    
    // Generic experiment handling
    if (experimentData.value === true) return '✅ Test Group';
    if (experimentData.value === false) return '🔄 Control Group';
    if (experimentData.groupName && experimentData.groupName !== 'unknown') {
      return `📋 ${experimentData.groupName}`;
    }
    if (!experimentData.allocated) return '🚫 Not Allocated';
    return '❓ Unknown Status';
  };

  const getDescription = () => {
    switch (experimentName) {
      case 'path_feature':
        return 'Controls custom path button visibility in home screen';
      case 'prayer_gen_on':
        return 'Controls prayer generation feature for users';
      case 'gpt-model':
        return 'Controls which GPT model is used for AI responses';
      case 'exp_streak_after_daily_reading':
        return 'Controls when streak screen shows (after reading vs after all 3 tasks)';
      default:
        return 'Experiment configuration';
    }
  };

  return (
    <TouchableOpacity
      className={`${getStatusColor()} p-3 rounded-lg border border-[#87CEEB] mb-2`}
      onPress={() => {
        try {
          appLog(`🧪 [EXPERIMENT] ${experimentName} details:`, experimentData);
          appLog(`  - Description: ${getDescription()}`);
          appLog(`  - Group: ${experimentData.groupName}`);
          appLog(`  - Value: ${experimentData.value}`);
          appLog(`  - Allocated: ${experimentData.allocated}`);
          
          if (experimentName === 'path_feature') {
            appLog(`  - To see the actual experiment value, check the useHomeScreen hook`);
            appLog(`  - Look for showCustomPathButton in the home screen state`);
            appLog(`  - The experiment controls whether the custom path button is visible`);
          }
          
          let toastMessage = '';
          if (experimentData.groupName === 'unknown_check_needed') {
            toastMessage = 'Check Home screen for "Create Custom Path" button';
          } else if (experimentData.value !== null) {
            const statusText = getStatusText();
            toastMessage = `${statusText} | Value: ${experimentData.value}`;
          } else {
            toastMessage = `Status: ${getStatusText()} | Allocated: ${experimentData.allocated}`;
          }
          
          Toast.show({
            type: 'info',
            text1: `${experimentName} Experiment`,
            text2: toastMessage,
            position: 'top',
            visibilityTime: 4000,
          });
        } catch (error) {
          appLog('❌ Error accessing experiment data:', error);
        }
      }}>
      <View className="flex-row justify-between items-center">
        <Text className="font-din text-sm text-textPrimary font-semibold">{experimentName}</Text>
        <View className="bg-[#4FB8FE] px-2 py-1 rounded-full">
          <Text className="font-din text-xs text-white">EXPERIMENT</Text>
        </View>
      </View>
      <Text className="font-din text-xs text-[#6A8A94] mt-1">{getDescription()}</Text>
      
      {/* Experiment Status */}
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-din text-xs font-semibold text-[#4F7A8A]">
          {getStatusText()}
        </Text>
        <Text className="font-din text-xs text-[#6A8A94]">
          {experimentData.allocated ? `Allocated: ✅` : `Allocated: ❌`}
        </Text>
      </View>
      
      {/* Raw Value Display */}
      <View className="mt-1 bg-black/5 px-2 py-1 rounded">
        <Text className="font-din text-xs text-[#666]">
          {experimentName === 'path_feature' ? 
            `path_shown: ${experimentData.value === null ? 'unknown' : experimentData.value}` :
            experimentName === 'gpt-model' ?
            `gptModel: ${experimentData.value?.gptModel || 'unknown'}` :
            experimentName === 'prayer_gen_on' ?
            `generate_prayer_for_user: ${experimentData.value === null ? 'unknown' : experimentData.value}` :
            experimentName === 'exp_streak_after_daily_reading' ?
            `streak_after_reading_flag: ${experimentData.value === null ? 'unknown' : experimentData.value}` :
            `Experiment value: ${JSON.stringify(experimentData.value)}`
          }
        </Text>
      </View>

      {/* Special instruction for path_feature */}
   
    </TouchableOpacity>
  );
}

// FeatureGateCard component to display Statsig feature gate data
interface FeatureGateCardProps {
  gateName: string;
}

function FeatureGateCard({ gateName }: FeatureGateCardProps) {
  const [gateData, setGateData] = useState({
    enabled: false,
    allocated: false,
    error: null as string | null
  });

  React.useEffect(() => {
    const getGateData = async () => {
      try {
        let gateEnabled = false;
        let allocated = false;
        
        // Try to access Statsig client
        const globalStatsig = (global as any)?.statsigClient || 
                            (window as any)?.statsigClient || 
                            null;
        
        const analyticsStatsigClient = getStatsigClient();
        const availableStatsigClient = globalStatsig || analyticsStatsigClient;
        
        if (availableStatsigClient) {
          try {
            gateEnabled = availableStatsigClient.checkGate(gateName);
            allocated = true;
            appLog(`🚪 [STATSIG] Feature gate ${gateName}:`, gateEnabled);
          } catch (statsigError) {
            appLog(`🚪 [STATSIG] Error checking gate ${gateName}:`, statsigError);
          }
        }
        
        setGateData({
          enabled: gateEnabled,
          allocated,
          error: null
        });
      } catch (error) {
        appLog('❌ Error in getGateData:', error);
        setGateData(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Component error' 
        }));
      }
    };
    
    getGateData();
  }, [gateName]);

  const getStatusColor = () => {
    if (gateData.error) return 'bg-[#FFE0E0]'; // Light red for errors
    if (!gateData.allocated) return 'bg-[#FFEBEE]'; // Light red for not allocated
    return gateData.enabled ? 'bg-[#E8F5E8]' : 'bg-[#FFF8E1]'; // Green for enabled, yellow for disabled
  };

  const getStatusText = () => {
    if (gateData.error) return '⚠️ Not Available';
    if (!gateData.allocated) return '🚫 Not Allocated';
    return gateData.enabled ? '✅ Enabled' : '🔄 Disabled';
  };

  const getDescription = () => {
    switch (gateName) {
      case 'path_feature_gate':
        return 'Controls custom path feature availability';
      default:
        return 'Feature gate configuration';
    }
  };

  return (
    <TouchableOpacity
      className={`${getStatusColor()} p-3 rounded-lg border border-[#87CEEB] mb-2`}
      onPress={() => {
        try {
          appLog(`🚪 [FEATURE GATE] ${gateName} details:`, gateData);
          appLog(`  - Description: ${getDescription()}`);
          appLog(`  - Enabled: ${gateData.enabled}`);
          appLog(`  - Allocated: ${gateData.allocated}`);
          
          Toast.show({
            type: 'info',
            text1: `${gateName} Feature Gate`,
            text2: `${getStatusText()} | Enabled: ${gateData.enabled}`,
            position: 'top',
            visibilityTime: 4000,
          });
        } catch (error) {
          appLog('❌ Error accessing feature gate data:', error);
        }
      }}>
      <View className="flex-row justify-between items-center">
        <Text className="font-din text-sm text-textPrimary font-semibold">{gateName}</Text>
        <View className="bg-[#9B59B6] px-2 py-1 rounded-full">
          <Text className="font-din text-xs text-white">GATE</Text>
        </View>
      </View>
      <Text className="font-din text-xs text-[#6A8A94] mt-1">{getDescription()}</Text>
      
      {/* Gate Status */}
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-din text-xs font-semibold text-[#4F7A8A]">
          {getStatusText()}
        </Text>
        <Text className="font-din text-xs text-[#6A8A94]">
          {gateData.allocated ? `Allocated: ✅` : `Allocated: ❌`}
        </Text>
      </View>
      
      {/* Raw Value Display */}
      <View className="mt-1 bg-black/5 px-2 py-1 rounded">
        <Text className="font-din text-xs text-[#666]">
          Gate enabled: {JSON.stringify(gateData.enabled)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// DebugButton component
export function DebugButton() {
  // Export the component
  const router = useRouter();
  const pathname = usePathname();
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [isDebugButtonVisible, setIsDebugButtonVisible] = useState(true);
  const [devotionalUploadModalVisible, setDevotionalUploadModalVisible] = useState(false);
  const [devotionalJsonInput, setDevotionalJsonInput] = useState('');
  const [evolutionModalVisible, setEvolutionModalVisible] = useState(false);
  const [evolutionLevel, setEvolutionLevel] = useState(1);
  const [activeTab, setActiveTab] = useState<'debug' | 'experiments'>('debug');
  const { signOut } = useAuth();

  // Reference to the success bottom sheet modal
  const successSheetRef = useRef<BottomSheetModal>(null);

  // Reference to the Rive animation from homeStore
  const riveRef = useHomeStore(state => state.riveRef);

  // Snap points for success animation
  const successSnapPoints = useMemo(() => ['90%'], []);

  // Helper function to safely set Rive skin
  const setRiveSkin = useCallback((skinNumber: number, actionNumber: number = 0) => {
    appLog('🔍 Debug setRiveSkin called:', {
      skinNumber,
      actionNumber,
      riveRef: !!riveRef,
      riveRefCurrent: !!riveRef?.current,
      setInputState: !!riveRef?.current?.setInputState
    });

    // Special logging for armor skin
    if (skinNumber === 9) {
      appLog('🛡️ ARMOR SKIN DEBUG: Attempting to set armor skin (9)');
    }

    // Update homeStore currentSkin to prevent handleRivePlay from overriding our debug change
    const setCurrentSkin = useHomeStore.getState().setCurrentSkin;
    setCurrentSkin(skinNumber.toString());
    appLog(`🏠 Updated homeStore currentSkin to: ${skinNumber}`);

    if (riveRef && riveRef.current && riveRef.current.setInputState) {
      try {
        appLog('🎯 Setting Rive skin:', skinNumber, 'action:', actionNumber);

        // Set action first, then skin
        riveRef.current.setInputState('State Machine 1', 'Action-Number', actionNumber);
        riveRef.current.setInputState('State Machine 1', 'Skin-Number', skinNumber);

        // Special logging for armor skin
        if (skinNumber === 9) {
          appLog('🛡️ ARMOR SKIN DEBUG: Successfully called setInputState for skin 9');

          // Try to read back the current state if possible
          setTimeout(() => {
            appLog('🛡️ ARMOR SKIN DEBUG: Checking if skin 9 was applied...');
          }, 500);
        }

        Toast.show({
          type: 'success',
          text1: `Skin ${skinNumber} applied!`,
          text2: skinNumber === 9 ? 'Armor skin should be visible' : 'Rive animation updated successfully',
          position: 'top',
          visibilityTime: 2000,
        });
      } catch (error) {
        appLog(`❌ Error setting skin ${skinNumber}:`, error);

        // Special error logging for armor skin
        if (skinNumber === 9) {
          appLog('🛡️ ARMOR SKIN DEBUG: Failed to set armor skin!', error);
        }

        Toast.show({
          type: 'error',
          text1: `Failed to set skin ${skinNumber}`,
          text2: `Error: ${error}`,
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } else {
      const reasons = [];
      if (!riveRef) reasons.push('riveRef is null');
      if (!riveRef?.current) reasons.push('riveRef.current is null');
      if (!riveRef?.current?.setInputState) reasons.push('setInputState not available');

      appLog('❌ Rive ref not available:', reasons.join(', '));

      // Special logging for armor skin
      if (skinNumber === 9) {
        appLog('🛡️ ARMOR SKIN DEBUG: Cannot set armor skin - Rive not ready!', reasons);
      }

      Toast.show({
        type: 'info',
        text1: 'Rive not ready',
        text2: `Issues: ${reasons.join(', ')}`,
        position: 'top',
        visibilityTime: 4000,
      });
    }
  }, [riveRef]);

  // Helper function to safely set Rive action
  const setRiveAction = useCallback((actionNumber: number) => {
    appLog('🔍 Debug setRiveAction called:', {
      actionNumber,
      riveRef: !!riveRef,
      riveRefCurrent: !!riveRef?.current,
      setInputState: !!riveRef?.current?.setInputState
    });

    if (riveRef && riveRef.current && riveRef.current.setInputState) {
      try {
        appLog('🎯 Setting Rive action:', actionNumber);
        riveRef.current.setInputState('State Machine 1', 'Action-Number', actionNumber);
        Toast.show({
          type: 'success',
          text1: `Action ${actionNumber} applied!`,
          text2: 'Rive animation updated successfully',
          position: 'top',
          visibilityTime: 2000,
        });
      } catch (error) {
        appLog(`❌ Error setting action ${actionNumber}:`, error);
        Toast.show({
          type: 'error',
          text1: `Failed to set action ${actionNumber}`,
          text2: `Error: ${error}`,
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } else {
      const reasons = [];
      if (!riveRef) reasons.push('riveRef is null');
      if (!riveRef?.current) reasons.push('riveRef.current is null');
      if (!riveRef?.current?.setInputState) reasons.push('setInputState not available');

      appLog('❌ Rive ref not available:', reasons.join(', '));
      Toast.show({
        type: 'info',
        text1: 'Rive not ready',
        text2: `Issues: ${reasons.join(', ')}`,
        position: 'top',
        visibilityTime: 4000,
      });
    }
  }, [riveRef]);

  // Present the success animation directly (not using bottom sheet)
  const handleShowSuccessSheet = useCallback(() => {
    setModalVisible(false);
    // Set success type to READING for demo purposes
    useHomeStore.getState().setSuccessType(SuccessAnimationType.READING);
    setTimeout(() => {
      setSuccessModalVisible(true);
    }, 300);
  }, []);

  // Dismiss the success animation
  const handleDismissSuccessSheet = useCallback(() => {
    setSuccessModalVisible(false);
  }, []);

  // Handler for showing a test modal
  const handleShowPenaltyModal = useCallback(() => {
    // Show a penalty modal for testing
    const params = {
      type: HalfModalType.HEART_PENALTY,
      message: 'Test Penalty Modal',
      subMessage: 'This is a test penalty modal',
      penalty: 5,
      daysMissed: 3,
    };

    // Use global showHalfModal instead of router.push
    if (typeof global !== 'undefined' && (global as any).showHalfModal) {
      (global as any).showHalfModal(params);
    } else {
      appLog('showHalfModal not available on global object');
    }
  }, []);

  // Toast message handlers
  const showSuccessToast = useCallback(() => {
    Toast.show({
      type: 'success',
      text1: 'Daily bread completed!',
      text2: "You've earned 5 hearts for your lamb.",
      position: 'top',
      visibilityTime: 4000,
    });
  }, []);

  const showErrorToast = useCallback(() => {
    Toast.show({
      type: 'error',
      text1: "Prayer couldn't be saved",
      text2: 'Please check your connection and try again.',
      position: 'top',
      visibilityTime: 4000,
    });
  }, []);

  const showInfoToast = useCallback(() => {
    Toast.show({
      type: 'info',
      text1: 'Streak reminder set',
      text2: "We'll remind you to read Scripture daily.",
      position: 'top',
      visibilityTime: 4000,
    });
  }, []);

  // Handler to set all activity dates to N days ago
  const setAllActivityDates = useCallback((daysAgo: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const timestamp = firestore.Timestamp.fromDate(targetDate);

    // Set activity dates to N days ago
    useUserStore.getState().setLastActivityDate(timestamp);
    useUserStore.getState().setLastReadingDate(timestamp);
    useUserStore.getState().setLastPrayerDate(timestamp);
    useUserStore.getState().setLastReflectionDate(timestamp);

    // Set penalty dates to (N+1) days ago to ensure the condition "daysSince > daysSincePenalty" can be met
    const penaltyDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (daysAgo + 1));
    const penaltyTimestamp = firestore.Timestamp.fromDate(penaltyDate);
    useUserStore.getState().setLastReadingPenaltyDate(penaltyTimestamp);
    useUserStore.getState().setLastPrayerPenaltyDate(penaltyTimestamp);
    useUserStore.getState().setLastReflectionPenaltyDate(penaltyTimestamp);

    Alert.alert(
      'Set Dates',
      `Activity dates: ${daysAgo} day(s) ago\nPenalty dates: ${daysAgo + 1} day(s) ago`
    );
  }, []);



  // Handler to set lamb hearts to a specific value
  const setLambHearts = useCallback((hearts: number) => {
    const userStore = useUserStore.getState();
    userStore.setLambHearts(hearts);
    
    // Update lamb mood based on new heart value
    const getLambMoodByHearts = (hearts: number) => {
      if (hearts <= 10) return 'lamb-skinny dying';
      if (hearts <= 20) return 'lamb-angry';
      if (hearts <= 40) return 'lamb-sleepy';
      if (hearts <= 80) return 'lamb-idle';
      return 'lamb-full';
    };
    
    const newMood = getLambMoodByHearts(hearts);
    userStore.setLambMood(newMood);
    
    // Force sync to Firestore
    syncWithFirestore();
    
    // Trigger a re-render of the Rive animation with new mood
    const homeStore = useHomeStore.getState();
    const riveRef = homeStore.riveRef;
    
    if (riveRef && riveRef.current && riveRef.current.setInputState) {
      try {
        // Get the state input for the new mood
        const moodToStateInput: Record<string, number> = {
          'lamb-idle': 0,
          'lamb-sleepy': 4,
          'lamb-angry': 5,
          'lamb-chubby dying': 6,
          'lamb-skinny dying': 7,
          'smoking': 8,
          'lamb-full': 3,
        };
        
        const targetStateInput = moodToStateInput[newMood] || 0;
        riveRef.current.setInputState('State Machine 1', 'Action-Number', targetStateInput);
        
        appLog(`Updated lamb hearts to ${hearts}, mood to ${newMood}, Rive state to ${targetStateInput}`);
        
        Toast.show({
          type: 'success',
          text1: `Hearts set to ${hearts}!`,
          text2: `Lamb mood: ${newMood}`,
          position: 'top',
          visibilityTime: 2000,
        });
      } catch (error) {
        appLog('Error updating Rive state after heart change:', error);
      }
    }
    
    Alert.alert('Set Hearts', `Lamb hearts set to ${hearts}\nMood: ${newMood}`);
  }, []);

  // Sync activity dates with penalty dates
  const syncActivityAndPenaltyDates = useCallback(() => {
    const state = useUserStore.getState();
    const readingPenaltyDate = state.getLastReadingPenaltyDate();
    const prayerPenaltyDate = state.getLastPrayerPenaltyDate();
    const reflectionPenaltyDate = state.getLastReflectionPenaltyDate();

    if (readingPenaltyDate) state.setLastReadingDate(readingPenaltyDate);
    if (prayerPenaltyDate) state.setLastPrayerDate(prayerPenaltyDate);
    if (reflectionPenaltyDate) state.setLastReflectionDate(reflectionPenaltyDate);

    Alert.alert('Sync Dates', 'Activity dates synced with their respective penalty dates.');
  }, []);

  // Handler to reset HomeStore data and clear completedReadings
  const handleResetCompletionData = useCallback(() => {
    Alert.alert(
      'Reset Completion Data',
      'This will reset all completion states, collected bonus, and clear reading history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Reset homeStore data
            const homeStore = useHomeStore.getState();
            homeStore.resetCompletionStates();
            homeStore.setMode('DEFAULT');
            homeStore.setSuccessType(null);
            homeStore.setSawDailyBonus(false); // Reset collected bonus state
            homeStore.setSawStreakToday(false); // Reset streak shown today flag

            // Clear completedReadings, completedPrayers, and completedReflections from userStore
            const userStore = useUserStore.getState();
            userStore.setCompletedReadings([] as any);
            userStore.setCompletedPrayers([] as any);
            userStore.setCompletedReflections([] as any);

            // Reset devotionalStore data
            const devotionalStore = useDevotionalStore.getState();
            devotionalStore.reset();

            // Sync with Firestore to save changes
            syncWithFirestore();

            Alert.alert('Reset Complete', 'HomeStore data, collected bonus, streak flag, and completed readings have been reset.');
          },
        },
      ]
    );
  }, []);

  // Handler to delete all app data
  const handleDeleteAllData = useCallback(() => {
    Alert.alert(
      'Delete All Data',
      'WARNING: This will delete ALL user data and reset the app to a fresh state. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear AsyncStorage first to ensure clean slate
              appLog('Clearing all AsyncStorage data...');
              await AsyncStorage.clear();

              // Reset home store
              const homeStore = useHomeStore.getState();
              homeStore.resetCompletionStates();
              homeStore.setMode('DEFAULT');
              homeStore.setSuccessType(null);

              // Reset user store completely
              const userStore = useUserStore.getState();
              userStore.resetUserStore(); // Use existing method instead of resetUserData
              userStore.setCompletedReadings([] as any);
              userStore.setCompletedPrayers([] as any);
              userStore.setCompletedReflections([] as any);
              userStore.setLambHearts(0);
              userStore.setStreakCount(0); // Use setStreakCount instead of resetStreak

              // Reset path store by setting values to defaults
              const pathStore = usePathStore.getState();
              pathStore.setSelectedPath(null as any);
              pathStore.setCurrentPath(null);
              pathStore.setPathInProgress(false);

              // Sync changes to Firestore
              syncWithFirestore();

              Toast.show({
                type: 'success',
                text1: 'All data deleted',
                text2: 'The app has been reset to a fresh state.',
                position: 'top',
                visibilityTime: 4000,
              });
            } catch (error) {
              appLog('Failed to delete all data:', error);
              Toast.show({
                type: 'error',
                text1: 'Failed to delete all data',
                text2: 'An error occurred while trying to reset the app.',
                position: 'top',
                visibilityTime: 4000,
              });
            }
          },
        },
      ]
    );
  }, []);

  // Available routes grouped by type
  const ROUTE_GROUPS = {
    'Tab Routes': [
      { name: 'Tabs Home', route: '/(tabs)' },
      { name: 'Home Tab', route: '/(tabs)/home' },
      { name: 'Map Tab', route: '/(tabs)/map' },
      { name: 'Bible Tab', route: '/(tabs)/bible' },
      { name: 'Stats Tab', route: '/(tabs)/stats' },
      { name: 'Profile Tab', route: '/(tabs)/profile' },
    ],
    'Modal Routes': [
      { name: 'Half Modal', route: '/halfModal' },
      { name: 'Streak', route: '/streak' },
    ],
    'Feature Routes': [
      { name: 'Settings', route: '/settings' },
      { name: 'Prayer', route: '/prayer' },
      { name: 'Reflection', route: '/reflection' },
      { name: 'Pricing', route: '/PricingScreen' },
      { name: 'Rating', route: '/onboarding/rating' },
    ],
  };

  // Handler for showing sitemap
  const handleShowSitemap = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => {
      router.push('/sitemap' as any);
    }, 300);
  }, [router]);

  // Handler for showing Prayer Modal
  const handleShowPrayerModal = useCallback(() => {
    setModalVisible(false);

    // Use global showPrayerModal if available
    setTimeout(() => {
      if (typeof global !== 'undefined' && (global as any).showPrayerModal) {
        (global as any).showPrayerModal();
      } else {
        appLog('showPrayerModal not available on global object');
      }
    }, 300);
  }, []);

  // Handler for sign out
  const handleSignOut = useCallback(async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setModalVisible(false);
            await signOut();
            useUserStore.getState().resetUserStore();
            router.replace('/(auth)');

            Toast.show({
              type: 'success',
              text1: 'Signed out successfully',
              text2: 'You have been signed out of your account.',
              position: 'top',
              visibilityTime: 3000,
            });
          } catch (error) {
            appLog('Error signing out:', error);
            Toast.show({
              type: 'error',
              text1: 'Sign out failed',
              text2: 'Please try again.',
              position: 'top',
              visibilityTime: 3000,
            });
          }
        },
      },
    ]);
  }, [signOut, router]);

  // Handler to hide debug button
  const handleHideDebugButton = useCallback(() => {
    Alert.alert(
      'Hide Debug Button',
      'This will hide the debug button from the screen. You can show it again by restarting the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: () => {
            setIsDebugButtonVisible(false);
            setModalVisible(false);
            Toast.show({
              type: 'info',
              text1: 'Debug button hidden',
              text2: 'Restart the app to show it again.',
              position: 'top',
              visibilityTime: 3000,
            });
          },
        },
      ]
    );
  }, []);

  const navigateTo = (item: DebugScreen) => {
    setModalVisible(false);
    router.push(item.route as any);
  };

  // Function to upload devotionals to Firestore
  const handleUploadDevotionals = useCallback(async () => {
    try {
      // Parse the JSON input
      let devotionals;
      try {
        devotionals = JSON.parse(devotionalJsonInput);
      } catch (parseError) {
        Alert.alert('Invalid JSON', 'Please ensure your input is valid JSON format.');
        return;
      }

      // Ensure it's an array
      if (!Array.isArray(devotionals)) {
        devotionals = [devotionals];
      }

      // Get reference to dailyDevotionals collection
      const devotionalsRef = firestore().collection('dailyDevotionals');

      let newCount = 0;
      let overriddenCount = 0;
      let errorCount = 0;

      // Process each devotional
      for (const devotional of devotionals) {
        try {
          // Create document ID from chapter and verse name instead of date
          const bibleReference = devotional.verse || devotional.bibleReference || '';
          let documentId = bibleReference;

          // Clean up the bible reference to make it a valid document ID
          if (bibleReference) {
            // Remove spaces, colons, and other special characters, replace with underscores
            documentId = bibleReference
              .replace(/[^a-zA-Z0-9]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '')
              .toLowerCase();
          }

          // Fallback to original ID if no bible reference
          if (!documentId) {
            documentId = devotional.id || `devotional_${Date.now()}`;
          }

          const docRef = devotionalsRef.doc(documentId);
          const doc = await docRef.get();

          // Check if document exists and override if it does
          let shouldOverride = false;
          if (doc.exists) {
            const existingData = doc.data();
            const existingId = existingData?.id;
            const existingDate = existingData?.date;
            const newId = devotional.id;
            const newDate = devotional.date;

            // Override any existing document with the same bible reference (document ID)
            shouldOverride = true;
            overriddenCount++;
            appLog(`Overriding devotional with document ID: ${documentId}`);
            appLog(`  Existing: ID=${existingId}, Date=${existingDate}`);
            appLog(`  New: ID=${newId}, Date=${newDate}`);
          } else {
            newCount++;
          }

          // Format the devotional according to Devotional.ts interface
          const formattedDevotional = {
            id: devotional.id,
            title: devotional.title || '',
            content: devotional.content || '',
            createdAt: devotional.createdAt || new Date().toISOString(),
            context: typeof devotional.context === 'object' ? devotional.context : devotional.context || '',
            bibleReference: devotional.verse || devotional.bibleReference || '',
            prayer: typeof devotional.prayer === 'object' ? devotional.prayer : { en: devotional.prayer || '' },
            reflectionPrompt: typeof devotional.reflection === 'object' ? devotional.reflection : { en: devotional.reflection || devotional.reflectionPrompt || '' },
            likes: devotional.likes || devotional.liked || Math.floor(Math.random() * (1000 - 800 + 1)) + 800,
            shares: devotional.shares || devotional.shared || Math.floor(Math.random() * (500 - 400 + 1)) + 400,
            completed: devotional.completed || 0,
            date: devotional.date || devotional.id || new Date().toISOString().split('T')[0],
            imageURL: devotional.imageURL || '',
            verse: devotional.verse || devotional.bibleReference || ''
          };

          // Upload to Firestore (this will override if document exists)
          await docRef.set(formattedDevotional);
          appLog(`Successfully ${shouldOverride ? 'overrode' : 'uploaded'} devotional with document ID: ${documentId} (Original ID: ${devotional.id})`);
        } catch (error) {
          errorCount++;
          console.error(`Error uploading devotional ${devotional.id}:`, error);
        }
      }

      // Show results
      Alert.alert(
        'Upload Complete',
        `Results:\n- New devotionals added: ${newCount}\n- Devotionals overridden: ${overriddenCount}\n- Errors: ${errorCount}`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (newCount > 0 || overriddenCount > 0) {
                setDevotionalJsonInput('');
                setDevotionalUploadModalVisible(false);
              }
            }
          }
        ]
      );

      // Show toast for quick feedback
      if (newCount > 0 || overriddenCount > 0) {
        Toast.show({
          type: 'success',
          text1: 'Devotionals Uploaded!',
          text2: `Added ${newCount}, overridden ${overriddenCount}`,
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error('Error uploading devotionals:', error);
      Alert.alert('Upload Failed', 'An error occurred while uploading devotionals. Check console for details.');
    }
  }, [devotionalJsonInput]);

  const handleSyncFirestoreData = async () => {
    try {
      // Get current user ID from Zustand store
      const userId = useUserStore.getState().id;
      if (!userId) {
        Alert.alert('No user ID', 'User ID not found in store.');
        return;
      }
      // Fetch user doc from Firestore
      const doc = await firestore().collection('users').doc(userId).get();
      if (!doc.exists) {
        Alert.alert('Not found', 'No Firestore user document found.');
        return;
      }
      // Call syncFirestoreData with Firestore data
      const data = doc.data();
      if (!data) {
        Alert.alert('No data', 'Firestore document has no data.');
        return;
      }
      await useUserStore.getState().syncFirestoreData(data as any); // Type assertion for UserDoc
      Toast.show({ type: 'success', text1: 'Synced Firestore data to store!' });
    } catch (err) {
      console.error('Sync Firestore error', err);
      Alert.alert('Sync error', String(err));
    }
  };

  // Test custom devotional creation and refresh
  const handleTestCustomDevotional = async () => {
    try {
      appLog('🧪 Testing custom devotional creation...');
      
      // Create a test custom devotional
      const testDevotional = {
        id: 'test-custom',
        title: 'Test Custom Devotional',
        content: 'This is a test custom devotional for debugging.',
        createdAt: new Date().toISOString(),
        context: 'This is a test context for debugging purposes.',
        bibleReference: 'John 3:16',
        prayer: 'Thank you for this test devotional.',
        reflectionPrompt: 'What does this test devotional mean to you?',
        likes: 0,
        shares: 0,
        completed: 0,
        date: dayjs().format('YYYY-MM-DD'),
        imageURL: 'https://example.com/test.jpg',
        verse: 'For God so loved the world...'
      };

      // Use the devotional store to create it
      await useDevotionalStore.getState().createCustomDevotionalFromCheckIn(testDevotional);
      
      Toast.show({ 
        type: 'success', 
        text1: 'Test custom devotional created!',
        text2: 'Check console for details'
      });
      
      appLog('✅ Test custom devotional created successfully');
    } catch (error) {
      console.error('❌ Error creating test custom devotional:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Failed to create test devotional',
        text2: String(error)
      });
    }
  };

  // Test recent devotionals refresh
  const handleTestRefreshDevotionals = async () => {
    try {
      appLog('🔄 Testing recent devotionals refresh...');
      
      const fetchRecentDevotionals = useDevotionalStore.getState().fetchRecentDevotionals;
      if (fetchRecentDevotionals) {
        await fetchRecentDevotionals();
        Toast.show({ 
          type: 'success', 
          text1: 'Recent devotionals refreshed!',
          text2: 'Check console for details'
        });
        appLog('✅ Recent devotionals refreshed successfully');
      } else {
        throw new Error('fetchRecentDevotionals function not available');
      }
    } catch (error) {
      console.error('❌ Error refreshing recent devotionals:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Failed to refresh devotionals',
        text2: String(error)
      });
    }
  };

  return (
    <>
      {/* Floating Debug Button */}
      {isDebugButtonVisible && (
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="absolute bottom-6 left-6 bg-forestGreen80/80 rounded-3xl w-12 h-12 justify-center items-center z-50 shadow-md">
          <Text className="text-white text-2xl">🐛</Text>
        </TouchableOpacity>
      )}

      {/* Debug Navigation Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView className="flex-1 bg-black/50">
          <View className="m-5 mt-[60px] bg-surfaceCream rounded-[20px] flex-1 shadow-lg">
            <View className="border-b border-b-buttonBorder">
              <View className="flex-row items-center justify-between p-4">
                <Text className="font-feather text-xl text-textPrimary">Debug Menu</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="w-8 h-8 rounded-full bg-forestGreen80 items-center justify-center">
                  <Text className="text-white text-base font-bold">✕</Text>
                </TouchableOpacity>
              </View>
              
              {/* Tab Navigation */}
              <View className="flex-row bg-lightCream/50">
                <TouchableOpacity
                  className={`flex-1 py-3 px-4 ${activeTab === 'debug' ? 'bg-surfaceCream border-b-2 border-forestGreen80' : ''}`}
                  onPress={() => setActiveTab('debug')}>
                  <Text className={`font-feather text-center ${activeTab === 'debug' ? 'text-forestGreen80 font-bold' : 'text-textSecondary'}`}>
                    Debug
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-3 px-4 ${activeTab === 'experiments' ? 'bg-surfaceCream border-b-2 border-forestGreen80' : ''}`}
                  onPress={() => setActiveTab('experiments')}>
                  <Text className={`font-feather text-center ${activeTab === 'experiments' ? 'text-forestGreen80 font-bold' : 'text-textSecondary'}`}>
                    Experiments
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="p-4">
              {activeTab === 'debug' && (
                <>
                {/* Sync Firestore Data Button */}
                <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Sync Firestore Data</Text>
                <TouchableOpacity
                  className="bg-[#E0F7FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FB8FE]"
                  onPress={handleSyncFirestoreData}
                >
                  <Text className="font-feather text-base text-textPrimary">Sync Firestore → Store</Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">Call syncFirestoreData with Firestore user doc</Text>
                </TouchableOpacity>
              </View>

              {/* Custom Devotional Testing Section */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Custom Devotional Testing</Text>
                <TouchableOpacity
                  className="bg-[#FFE6E6] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleTestCustomDevotional}
                >
                  <Text className="font-feather text-base text-textPrimary">Create Test Custom Devotional</Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">Create a test custom devotional for debugging</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-[#E6F3FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FB8FE]"
                  onPress={handleTestRefreshDevotionals}
                >
                  <Text className="font-feather text-base text-textPrimary">Refresh Recent Devotionals</Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">Manually refresh recent devotionals</Text>
                </TouchableOpacity>
              </View>
                </>
              )}

              {activeTab === 'experiments' && (
                <>
              {/* Statsig Experiments Section */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Statsig Experiments</Text>
                
                {/* Experiments */}
                <View className="mb-3">
                  <Text className="font-feather text-base text-textPrimary mb-2">🧪 Experiments</Text>
                  
                  {/* Path Feature Experiment */}
                  <ExperimentCard experimentName="path_feature" />
                  
                  {/* Prayer Generation Experiment */}
                  <ExperimentCard experimentName="prayer_gen_on" />
                  
                  {/* GPT Model Experiment */}
                  <ExperimentCard experimentName="gpt-model" />
                  
                  {/* Streak Timing Experiment */}
                  <ExperimentCard experimentName="exp_streak_after_daily_reading" />
                </View>

                {/* Feature Gates */}
                <View className="mb-3">
                  <Text className="font-feather text-base text-textPrimary mb-2">🚪 Feature Gates</Text>
                  
                  {/* Path Feature Gate */}
                  <FeatureGateCard gateName="path_feature_gate" />
                </View>

                {/* Dynamic Configs */}
                <View className="mb-3">
                  <Text className="font-feather text-base text-textPrimary mb-2">⚙️ Dynamic Configs</Text>
                  <View className="bg-[#F3E5F5] p-3 rounded-lg border border-[#BA68C8]">
                    <Text className="font-din text-sm text-[#6A4A6E]">No dynamic configs configured yet</Text>
                  </View>
                </View>

                {/* Statsig Controls */}
                <TouchableOpacity
                  className="bg-[#E8F5E8] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4CAF50]"
                  onPress={() => {
                    try {
                      appLog('🧪 [STATSIG DEBUG] Current experiment information:');
                      appLog('  - path_feature: Controls custom path button visibility');
                      appLog('  - Implementation: Check useHomeScreen hook for useExperiment("path_feature")');
                      appLog('  - Parameter: "path_shown" configured in Statsig dashboard');
                      
                      // Try to access Statsig client directly
                      appLog('🔍 [DEBUG] Checking for Statsig client availability:');
                      appLog('  - global.statsigClient:', !!(global as any)?.statsigClient);
                      appLog('  - window.statsigClient:', !!(window as any)?.statsigClient);
                      
                      // Also try analytics module
                      const analyticsStatsigClient = getStatsigClient();
                      appLog('  - analytics.getStatsigClient():', !!analyticsStatsigClient);
                      
                      appLog('  - global object keys:', global ? Object.keys(global).filter(k => k.includes('statsig') || k.includes('Statsig')) : 'no global');
                      
                      const globalStatsig = (global as any)?.statsigClient || (window as any)?.statsigClient;
                      const availableStatsigClient = globalStatsig || analyticsStatsigClient;
                      
                      if (availableStatsigClient) {
                        try {
                          const pathExperiment = availableStatsigClient.getExperiment('path_feature');
                          if (pathExperiment) {
                            const value = pathExperiment.getValue();
                            const pathShown = pathExperiment.get('path_shown', false);
                            const groupName = pathExperiment.getGroupName?.() || 'unknown';
                            const ruleID = pathExperiment.getRuleID?.() || null;
                            
                            appLog('🎯 [LIVE EXPERIMENT DATA]:');
                            appLog('  - Overall value:', value);
                            appLog('  - path_shown parameter:', pathShown);
                            appLog('  - Group name:', groupName);
                            appLog('  - Rule ID:', ruleID);
                            appLog('  - Full config:', pathExperiment);
                            
                            Toast.show({
                              type: 'success',
                              text1: `Experiment Live Data`,
                              text2: `path_shown: ${pathShown}, Group: ${groupName}`,
                              position: 'top',
                              visibilityTime: 4000,
                            });
                          } else {
                            appLog('⚠️ path_feature experiment not found in Statsig client');
                            Toast.show({
                              type: 'error',
                              text1: 'Experiment Not Found',
                              text2: 'path_feature not available in Statsig client',
                              position: 'top',
                              visibilityTime: 3000,
                            });
                          }
                        } catch (experimentError) {
                          appLog('❌ Error accessing experiment:', experimentError);
                          Toast.show({
                            type: 'error',
                            text1: 'Experiment Error',
                            text2: 'Could not read path_feature experiment',
                            position: 'top',
                            visibilityTime: 3000,
                          });
                        }
                      } else {
                        appLog('⚠️ Statsig client not available globally');
                        Toast.show({
                          type: 'info',
                          text1: 'Statsig Client Not Available',
                          text2: 'Check console for implementation details',
                          position: 'top',
                          visibilityTime: 3000,
                        });
                      }
                      
                      // Try to get user store info for context
                      const userStore = useUserStore.getState();
                      appLog('  - Current user ID:', userStore.id);
                      appLog('  - User authenticated:', !!userStore.id);
                      
                    } catch (error) {
                      appLog('❌ Error accessing Statsig debug info:', error);
                      Toast.show({
                        type: 'error',
                        text1: 'Debug Error',
                        text2: 'Could not access debug information',
                        position: 'top',
                        visibilityTime: 3000,
                      });
                    }
                  }}>
                  <Text className="font-feather text-base text-textPrimary">Debug Statsig State</Text>
                  <Text className="font-din text-sm text-[#2E7D32] mt-1">
                    Log current experiments and configs to console
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-[#FFF3E0] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF9800]"
                  onPress={() => {
                    try {
                      // Force refresh Statsig data
                      const userStore = useUserStore.getState();
                      const userId = userStore.id;
                      
                      if (!userId) {
                        Toast.show({
                          type: 'error',
                          text1: 'No User ID',
                          text2: 'User must be logged in to refresh Statsig',
                          position: 'top',
                          visibilityTime: 3000,
                        });
                        return;
                      }

                      appLog('🔄 [STATSIG] Forcing refresh for user:', userId);
                      
                      Toast.show({
                        type: 'info',
                        text1: 'Refreshing Statsig',
                        text2: 'Fetching latest experiment configurations',
                        position: 'top',
                        visibilityTime: 3000,
                      });
                    } catch (error) {
                      appLog('❌ Error refreshing Statsig:', error);
                      Toast.show({
                        type: 'error',
                        text1: 'Refresh Failed',
                        text2: 'Could not refresh Statsig data',
                        position: 'top',
                        visibilityTime: 3000,
                      });
                    }
                  }}>
                  <Text className="font-feather text-base text-textPrimary">Refresh Statsig</Text>
                  <Text className="font-din text-sm text-[#F57C00] mt-1">
                    Force fetch latest experiment configurations
                  </Text>
                </TouchableOpacity>
              </View>
                </>
              )}

              {activeTab === 'debug' && (
                <>
              {/* Feature Screens Navigation */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Feature Screens</Text>
                <View className="flex-row flex-wrap gap-2">
                  {FEATURE_SCREENS.map((screen) => (
                    <TouchableOpacity
                      key={screen.route}
                      className="bg-[#F0E6FF] px-3 py-2 rounded-lg border border-[#9B7FFE] mb-1"
                      onPress={() => navigateTo(screen)}>
                      <Text className="font-din text-sm text-textPrimary">{screen.name}</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Kids Bible Reader Button */}
                  <TouchableOpacity
                    className="bg-[#FFF4D9] px-3 py-2 rounded-lg border border-[#F7B500] mb-1"
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => {
                        router.push({
                          pathname: '/newBibleReader',
                          params: { bookId: 43, chapter: 3, translation: 'ESV' },
                        } as any);
                      }, 300);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">Kids Bible Reader</Text>
                  </TouchableOpacity>

                  {/* Self Funded Mission Button */}
                  <TouchableOpacity
                    className="bg-gradient-to-r from-purple-100 to-yellow-100 px-3 py-2 rounded-lg border border-purple-300 mb-1"
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => {
                        router.push('/onboarding/pricing/selfFundedMission' as any);
                      }, 300);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">Self Funded Mission</Text>
                  </TouchableOpacity>

                  {/* Free Offer Button */}
                  <TouchableOpacity
                    className="bg-gradient-to-r from-blue-100 to-blue-200 px-3 py-2 rounded-lg border border-blue-300 mb-1"
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => {
                        router.push('/onboarding/pricing/FreeOffer' as any);
                      }, 300);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">Free Offer</Text>
                  </TouchableOpacity>

                  {/* Shepherd Community Button */}
                  <TouchableOpacity
                    className="bg-gradient-to-r from-green-100 to-green-200 px-3 py-2 rounded-lg border border-green-300 mb-1"
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => {
                        router.push('/onboarding/pricing/ShepherdCommunity' as any);
                      }, 300);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">Shepherd Community</Text>
                  </TouchableOpacity>

                  {/* Old Pricing Screen Button */}
                  <TouchableOpacity
                    className="bg-gradient-to-r from-orange-100 to-orange-200 px-3 py-2 rounded-lg border border-orange-300 mb-1"
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => {
                        router.push('/onboarding/pricing/OldPricingScreen' as any);
                      }, 300);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">Old Pricing Screen</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Heart & Penalty System */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">
                  Heart & Penalty System
                </Text>

                {/* Set Lamb Hearts Buttons */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">
                    Set Lamb Hearts
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[0, 10, 20, 30, 40, 50, 100].map((hearts) => (
                      <TouchableOpacity
                        key={hearts}
                        className="bg-[#FFE0E8] px-3 py-2 rounded-lg border border-[#FF80A0] mb-1"
                        onPress={() => {
                          if (hearts === 0) {
                            // Special handling for 0 hearts - set to dead state
                            const userStore = useUserStore.getState();
                            userStore.setLambHearts(0);
                            userStore.setLambMood('dead');
                            
                            // Force sync to Firestore
                            syncWithFirestore();
                            
                            // Set Rive animation to dead state (8)
                            const homeStore = useHomeStore.getState();
                            const riveRef = homeStore.riveRef;
                            
                            if (riveRef && riveRef.current && riveRef.current.setInputState) {
                              try {
                                riveRef.current.setInputState('State Machine 1', 'Action-Number', 8);
                                appLog('Set lamb to dead state (0 hearts, Action-Number: 8)');
                                
                                Toast.show({
                                  type: 'info',
                                  text1: '💀 Lamb is dead!',
                                  text2: 'Hearts set to 0, animation set to dead state',
                                  position: 'top',
                                  visibilityTime: 3000,
                                });
                              } catch (error) {
                                appLog('Error setting Rive to dead state:', error);
                              }
                            }
                            
                            Alert.alert('💀 Dead', 'Lamb hearts set to 0\nState: Dead');
                          } else {
                            // Normal heart setting for other values
                            setLambHearts(hearts);
                          }
                        }}>
                        <Text className="font-din text-sm text-textPrimary">{`${hearts} ❤️`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Set Lamb Level Buttons */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">
                    Set Lamb Level
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[1, 3, 7, 10, 20, 33].map((level) => (
                      <TouchableOpacity
                        key={level}
                        className="bg-[#E8F3FF] px-3 py-2 rounded-lg border border-[#80BFFF] mb-1"
                        onPress={() => {
                          // Set level in UserStore
                          const userStore = useUserStore.getState();

                          // Calculate XP for this level using the level utility function
                          const xpForLevel = calculateExpForLevel(level);

                          // Set XP to be exactly 3 points away from next level
                          const xpForNextLevel = calculateExpForLevel(level + 1);
                          const newXp = xpForNextLevel - 3;

                          // Update both level and XP in UserStore
                          userStore.setLambLevel(level);
                          userStore.setLambXp(newXp);

                          // Force sync to Firestore
                          syncWithFirestore();

                          // Try to refresh the UI state by updating key properties
                          const updatedLamb = userStore.getLamb();
                          appLog(`Debug: Set lamb to level ${level} (${newXp} XP)`);
                          appLog(
                            `Debug: Level ${level} requires ${xpForLevel} XP, next level needs ${xpForNextLevel} XP`
                          );
                          appLog(`Debug: Updated lamb: ${JSON.stringify(updatedLamb)}`);

                          Alert.alert(
                            'Level Set',
                            `Lamb level set to ${level} (${newXp} XP)\nJust 3 XP away from level ${level + 1}!`
                          );
                        }}>
                        <Text className="font-din text-sm text-textPrimary">{`Level ${level} ⭐`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Set Gems Button */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">
                    Set Gems
                  </Text>
                <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                    className="bg-[#E0FFE0] px-4 py-3 rounded-lg border border-[#4FD675] mb-1 w-32"
                    onPress={() => {
                      const userStore = useUserStore.getState();
                      userStore.setGens(10000);

                      // Force sync to Firestore
                      syncWithFirestore();

                      appLog('Debug: Set gems to 1000');

                      Toast.show({
                        type: 'success',
                        text1: 'Gems Set!',
                        text2: 'You now have 1000 gems 💎',
                        position: 'top',
                        visibilityTime: 3000,
                      });
                    }}>
                    <Text className="font-din text-sm text-textPrimary text-center">{`10000 💎`}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#E0FFE0] px-4 py-3 rounded-lg border border-[#4FD675] mb-1 w-32"
                    onPress={() => {
                      const userStore = useUserStore.getState();
                      userStore.setGens(80);

                      // Force sync to Firestore
                      syncWithFirestore();

                      appLog('Debug: Set gems to 1000');

                      Toast.show({
                        type: 'success',
                        text1: 'Gems Set!',
                        text2: 'You now have 1000 gems 💎',
                        position: 'top',
                        visibilityTime: 3000,
                      });
                    }}>
                    <Text className="font-din text-sm text-textPrimary text-center">{`80 💎`}</Text>
                  </TouchableOpacity>
                </View>
                </View>

                {/* Set Streak Count Buttons */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">
                    Set Streak Count
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[0, 1, 3, 7, 14, 30, 50, 100].map((streak) => (
                      <TouchableOpacity
                        key={streak}
                        className="bg-[#FFE0E8] px-3 py-2 rounded-lg border border-[#FF80A0] mb-1"
                        onPress={() => {
                          const userStore = useUserStore.getState();
                          userStore.setStreakCount(streak);

                          // Force sync to Firestore
                          syncWithFirestore();

                          appLog(`Debug: Set streak count to ${streak}`);

                          Toast.show({
                            type: 'success',
                            text1: 'Streak Set!',
                            text2: `Streak count set to ${streak} 🔥`,
                            position: 'top',
                            visibilityTime: 3000,
                          });
                        }}>
                        <Text className="font-din text-sm text-textPrimary">{`${streak} 🔥`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>


                {/* Test Covenant Success */}
                <View className="mb-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">
                    🏆 Test Covenant Success
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[3, 7, 21].map((days) => (
                      <TouchableOpacity
                        key={days}
                        className="bg-[#E0F0FF] px-3 py-2 rounded-lg border border-[#4A90E2] mb-1"
                        onPress={() => {
                          //const userStore = useUserStore.getState();
                          const homeStore = useHomeStore.getState();
                          homeStore.handleCovenantSuccess(days);

                          appLog(`🏆 Debug: Testing ${days}-day covenant completion`);

                          Toast.show({
                            type: 'success',
                            text1: `${days}-Day Covenant!`,
                            text2: 'Success modal should appear! 🎉',
                            position: 'top',
                            visibilityTime: 3000,
                          });
                        }}>
                        <Text className="font-din text-sm text-textPrimary">{`${days} Day 🏆`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>




                {/* Reset Test State */}
                <TouchableOpacity
                  className="bg-[#F5F5F5] p-4 rounded-xl my-2 border-l-4 border-l-[#808080]"
                  onPress={() => {
                    Alert.alert(
                      'Reset Test State',
                      'This will reset your reading date to today and restore normal state.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Reset', 
                          onPress: () => {
                            try {
                              const userStore = useUserStore.getState();
                              const now = new Date();
                              const timestamp = require('@react-native-firebase/firestore').Timestamp.fromDate(now);
                              
                              userStore.setLastReadingDate(timestamp);
                              userStore.setLastActivityDate(timestamp);
                              
                              Toast.show({
                                type: 'success',
                                text1: '✅ State Reset',
                                text2: 'Reading date reset to today',
                                position: 'top',
                                visibilityTime: 2000,
                              });
                              
                              appLog('🧪 [DEBUG TEST] State reset - dates set to now');
                            } catch (error) {
                              appLog('🧪 [DEBUG TEST] Error resetting state:', error);
                              Alert.alert('Reset Error', 'Failed to reset state: ' + (error instanceof Error ? error.message : String(error)));
                            }
                          }
                        }
                      ]
                    );
                  }}>
                  <Text className="font-feather text-base text-textPrimary">🔄 Reset Test State</Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">
                    Reset reading date to today (normal state)
                  </Text>
                </TouchableOpacity>




                {/* Sync Activity/Penalty Dates Button */}
                <TouchableOpacity
                  className="bg-[#E0F2F7] p-4 rounded-xl my-2 border-l-4 border-l-[#4FC3F7]"
                  onPress={syncActivityAndPenaltyDates}>
                  <Text className="font-feather text-base text-textPrimary">
                    Sync Activity & Penalty Dates
                  </Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">
                    Set activity dates = penalty dates
                  </Text>
                </TouchableOpacity>
              </View>

              {/* UI Testing */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">UI Testing</Text>

                {/* Night Mode Toggle Button */}
                <TouchableOpacity
                  className="bg-[#2D2D2D] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FFD629]"
                  onPress={() => {
                    // Override the current time to simulate night mode (7 PM)
                    const isCurrentlyNight = new Date().getHours() >= 19;

                    if (isCurrentlyNight) {
                      // Currently night mode, switch to day mode (12 PM)
                      Date.prototype.getHours = function () {
                        return 12;
                      };
                    } else {
                      // Currently day mode, switch to night mode (8 PM)
                      Date.prototype.getHours = function () {
                        return 20;
                      };
                    }

                    // Show toast instead of alert to avoid presentation conflicts
                    Toast.show({
                      type: 'info',
                      text1: isCurrentlyNight ? 'Day Mode Activated' : 'Night Mode Activated',
                      text2: isCurrentlyNight
                        ? 'Light background enabled'
                        : 'Dark background enabled',
                      position: 'top',
                      visibilityTime: 2000,
                    });

                    // Close modal to see the changes
                    setModalVisible(false);
                  }}>
                  <Text className="font-feather text-base text-white">Toggle Night Mode</Text>
                  <Text className="font-din text-sm text-white/80 mt-1">
                    {new Date().getHours() >= 19 ? 'Switch to Day Mode' : 'Switch to Night Mode'}
                  </Text>
                </TouchableOpacity>

                {/* Reset Time Override Button */}
                <TouchableOpacity
                  className="bg-[#E0F7FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FB8FE]"
                  onPress={() => {
                    // Reset the Date.prototype.getHours to original
                    delete (Date.prototype as any).getHours;

                    // Show toast instead of alert
                    Toast.show({
                      type: 'success',
                      text1: 'Time Reset',
                      text2: 'Using actual system time now',
                      position: 'top',
                      visibilityTime: 2000,
                    });

                    // Close modal to see the changes
                    setModalVisible(false);
                  }}>
                  <Text className="font-feather text-base text-textPrimary">
                    Reset to System Time
                  </Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">
                    Current time: {new Date().getHours()}:00 (
                    {new Date().getHours() >= 19 ? 'Night' : 'Day'})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Local Storage */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">Data Management</Text>

                {/* Reset Completion Data Button */}
                <TouchableOpacity
                  className="bg-[#FFEDED] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF6B6B]"
                  onPress={handleResetCompletionData}>
                  <Text className="font-feather text-base text-textPrimary">
                    Reset Completion Data
                  </Text>
                  <Text className="font-din text-sm text-[#A57070] mt-1">
                    Reset HomeStore and clear completed readings
                  </Text>
                </TouchableOpacity>

                {/* Reset Check In Button */}
                <TouchableOpacity
                  className="bg-[#E8E0FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#9B7FFE]"
                  onPress={() => {
                    Alert.alert(
                      'Reset Check In',
                      'This will clear all check-in history and reset the timer. Continue?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset',
                          style: 'destructive',
                          onPress: () => {
                            const checkInStore = useCheckInStore.getState();
                            checkInStore.resetCheckInData();
                            
                            Toast.show({
                              type: 'success',
                              text1: 'Check In Reset',
                              text2: 'All check-in data has been cleared',
                              position: 'top',
                              visibilityTime: 3000,
                            });
                            
                            appLog('✅ Check-in data reset successfully');
                          },
                        },
                      ]
                    );
                  }}>
                  <Text className="font-feather text-base text-textPrimary">
                    Reset Check In
                  </Text>
                  <Text className="font-din text-sm text-[#7C6F94] mt-1">
                    Clear all check-in history and reset timer
                  </Text>
                </TouchableOpacity>

                {/* Delete All Data Button */}
                <TouchableOpacity
                  className="bg-[#FF6666] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FF0000]"
                  onPress={handleDeleteAllData}>
                  <Text className="font-feather text-base text-white">Delete All Data</Text>
                  <Text className="font-din text-sm text-white/80 mt-1">
                    WARNING: Permanently delete all user data and reset app
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Devotional Testing */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">
                  Devotional Testing
                </Text>

                {/* Bible Cache Test Button */}
                <TouchableOpacity
                  className="bg-[#E8F4FD] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FB8FE]"
                  onPress={() => {
                    setModalVisible(false);
                    setTimeout(() => {
                      router.push('/bibleCacheTest' as any);
                    }, 300);
                  }}>
                  <Text className="font-feather text-base text-textPrimary">
                    Bible Cache Test
                  </Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">
                    Test Bible API caching and batch fetching optimizations
                  </Text>
                </TouchableOpacity>

                {/* Upload Devotionals Button */}
                <TouchableOpacity
                  className="bg-[#F0E6FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#9B7FFE]"
                  onPress={() => {
                    setDevotionalUploadModalVisible(true);
                  }}>
                  <Text className="font-feather text-base text-textPrimary">
                    Upload Devotionals to Firestore
                  </Text>
                  <Text className="font-din text-sm text-[#7C6F94] mt-1">
                    Bulk upload devotionals from JSON
                  </Text>
                </TouchableOpacity>

                {/* Fetch Today's Devotional Button */}
                <TouchableOpacity
                  className="bg-[#E8F3E0] p-4 rounded-xl my-1.5 border-l-4 border-l-[#A0D468]"
                  onPress={() => {
                    appLog('🔍 DEBUG: Manual devotional fetch triggered from DebugModal');
                    const devotionalStore = useDevotionalStore.getState();
                    devotionalStore.fetchTodaysDevotional();
                  }}>
                  <Text className="font-feather text-base text-textPrimary">
                    Fetch Today&apos;s Devotional
                  </Text>
                  <Text className="font-din text-sm text-[#7C927E] mt-1">
                    Test fetching devotional from Firestore and Bible API
                  </Text>
                </TouchableOpacity>




                {/* Clear Devotional Data Button */}
                <TouchableOpacity
                  className="bg-[#FFF4D9] p-4 rounded-xl my-1.5 border-l-4 border-l-[#FCD34D]"
                  onPress={() => {
                    appLog('🔍 DEBUG: Clearing devotional data');
                    const devotionalStore = useDevotionalStore.getState();
                    devotionalStore.reset();
                    Alert.alert('Devotional Data Cleared', 'All devotional data has been reset.');
                  }}>
                  <Text className="font-feather text-base text-textPrimary">
                    Clear Devotional Data
                  </Text>
                  <Text className="font-din text-sm text-[#B89B4C] mt-1">
                    Reset devotional store to empty state
                  </Text>
                </TouchableOpacity>

                {/* Clear Path Data Button */}
                <TouchableOpacity
                  className="bg-[#E0F7FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FB8FE]"
                  onPress={async () => {
                    try {
                      appLog('🔍 DEBUG: Clearing path and nextUnit data from store and AsyncStorage');
                      const pathStore = usePathStore.getState();
                      
                      // Clear path data from store
                      pathStore.setCurrentPath(null);
                      pathStore.setSelectedPath(null as any);
                      pathStore.setPathInProgress(false);
                      pathStore.setNextUnitPreview(null);
                      
                      // Clear path data from AsyncStorage
                      appLog('🗑️ Clearing AsyncStorage key: shepherd-path-storage');
                      await AsyncStorage.removeItem('shepherd-path-storage');
                      
                      // Also clear any user selectedPathId from userStore
                      const userStore = useUserStore.getState();
                      userStore.setSelectedPathId('');
                      
                      // Sync with Firestore
                      syncWithFirestore();
                      
                      Toast.show({
                        type: 'success',
                        text1: 'Path Data Wiped',
                        text2: 'All path data cleared from store & AsyncStorage',
                        position: 'top',
                        visibilityTime: 3000,
                      });
                    } catch (error) {
                      console.error('❌ Error clearing path data:', error);
                      Toast.show({
                        type: 'error',
                        text1: 'Clear Failed',
                        text2: 'Error clearing path data - check console',
                        position: 'top',
                        visibilityTime: 3000,
                      });
                    }
                  }}>
                  <Text className="font-feather text-base text-textPrimary">
                    Clear Path & NextUnit Data
                  </Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">
                    Hard wipe from store & AsyncStorage
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Skin Change Section */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">
                  Change Lamb Skin
                </Text>

                {/* Debug Info Button */}
                <TouchableOpacity
                  className="bg-[#E0F7FF] p-4 rounded-xl my-1.5 border-l-4 border-l-[#4FB8FE] mb-3"
                  onPress={() => {
                    const debugInfo = {
                      riveRef: !!riveRef,
                      riveRefCurrent: !!riveRef?.current,
                      setInputState: !!riveRef?.current?.setInputState,
                      riveRefType: typeof riveRef?.current,
                      riveRefKeys: riveRef?.current ? Object.keys(riveRef.current) : [],
                    };
                    appLog('🔍 Complete Rive Debug Info:', debugInfo);
                    Toast.show({
                      type: 'info',
                      text1: 'Debug Info Logged',
                      text2: 'Check console for detailed Rive state',
                      position: 'top',
                      visibilityTime: 3000,
                    });
                  }}>
                  <Text className="font-feather text-base text-textPrimary">Debug Rive State</Text>
                  <Text className="font-din text-sm text-[#6A8A94] mt-1">
                    Check console for detailed Rive ref info
                  </Text>
                </TouchableOpacity>

                <View className="flex-row flex-wrap gap-2">
                  <TouchableOpacity
                    className="bg-[#E0F7FF] px-3 py-2 rounded-lg border border-[#4FB8FE] mb-1"
                    onPress={() => setRiveAction(0)}>
                    <Text className="font-din text-sm text-textPrimary">0 Idle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#FFF4D9] px-3 py-2 rounded-lg border border-[#F7B500] mb-1"
                    onPress={() => setRiveAction(1)}>
                    <Text className="font-din text-sm text-textPrimary">1 Raising Hand</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#E8F3E0] px-3 py-2 rounded-lg border border-[#A0D468] mb-1"
                    onPress={() => setRiveSkin(0, 0)}>
                    <Text className="font-din text-sm text-textPrimary">0 Normal Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#FFEDED] px-3 py-2 rounded-lg border border-[#FF80A0] mb-1"
                    onPress={() => setRiveSkin(99, 0)}>
                    <Text className="font-din text-sm text-textPrimary">99 Gold Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#E0F7FF] px-3 py-2 rounded-lg border border-[#4FB8FE] mb-1"
                    onPress={() => setRiveSkin(1, 0)}>
                    <Text className="font-din text-sm text-textPrimary">1 Pink Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#F0E6FF] px-3 py-2 rounded-lg border border-[#9B7FFE] mb-1"
                    onPress={() => setRiveSkin(2, 0)}>
                    <Text className="font-din text-sm text-textPrimary">2 Noah Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#FFF4D9] px-3 py-2 rounded-lg border border-[#F7B500] mb-1"
                    onPress={() => setRiveSkin(3, 0)}>
                    <Text className="font-din text-sm text-textPrimary">3 Cloak Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#E8F3E0] px-3 py-2 rounded-lg border border-[#A0D468] mb-1"
                    onPress={() => setRiveSkin(4, 0)}>
                    <Text className="font-din text-sm text-textPrimary">4 Banana Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#FFEDED] px-3 py-2 rounded-lg border border-[#FF80A0] mb-1"
                    onPress={() => setRiveSkin(5, 0)}>
                    <Text className="font-din text-sm text-textPrimary">5 10 Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#E0F7FF] px-3 py-2 rounded-lg border border-[#4FB8FE] mb-1"
                    onPress={() => setRiveSkin(6, 0)}>
                    <Text className="font-din text-sm text-textPrimary">6 Apple Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#F0E6FF] px-3 py-2 rounded-lg border border-[#9B7FFE] mb-1"
                    onPress={() => setRiveSkin(7, 0)}>
                    <Text className="font-din text-sm text-textPrimary">7 Lion Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#FFF4D9] px-3 py-2 rounded-lg border border-[#F7B500] mb-1"
                    onPress={() => setRiveSkin(8, 0)}>
                    <Text className="font-din text-sm text-textPrimary">8 Whale Skin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#E8F3E0] px-3 py-2 rounded-lg border border-[#A0D468] mb-1"
                    onPress={() => {
                      appLog('🛡️ Attempting to set Armor skin (9)');
                      setRiveSkin(9, 0);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">9 Armor Skin</Text>
                  </TouchableOpacity>

                  {/* Additional test buttons for armor skin debugging */}
                  <TouchableOpacity
                    className="bg-[#FFE0E8] px-3 py-2 rounded-lg border border-[#FF80A0] mb-1"
                    onPress={() => {
                      appLog('🔥 Setting Phoenix skin (10)');
                      setRiveSkin(10, 0);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">10 Phoenix</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="bg-[#E0FFE0] px-3 py-2 rounded-lg border border-[#4FD675] mb-1"
                    onPress={() => {
                      appLog('🛡️ Testing armor with action 1');
                      setRiveSkin(9, 1);
                    }}>
                    <Text className="font-din text-sm text-textPrimary">9 Armor + Action</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Evolution Animation Section */}
                <View className="mt-4">
                  <Text className="font-feather text-base text-textPrimary mb-2">
                    Evolution Animation
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <TouchableOpacity
                      className="bg-[#FFE0E8] px-3 py-2 rounded-lg border border-[#FF80A0] mb-1"
                      onPress={() => {
                        appLog('🦋 Evolution Animation - Level 1');
                        setEvolutionLevel(1);
                        setModalVisible(false);
                        setTimeout(() => {
                          setEvolutionModalVisible(true);
                        }, 300);
                      }}>
                      <Text className="font-din text-sm text-textPrimary">Evolve 1</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      className="bg-[#E8E0FF] px-3 py-2 rounded-lg border border-[#9B7FFE] mb-1"
                      onPress={() => {
                        appLog('🦋 Evolution Animation - Level 2');
                        setEvolutionLevel(2);
                        setModalVisible(false);
                        setTimeout(() => {
                          setEvolutionModalVisible(true);
                        }, 300);
                      }}>
                      <Text className="font-din text-sm text-textPrimary">Evolve 2</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Onboarding Navigation */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">
                  Onboarding Screens
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {ONBOARDING_SCREENS.map((screen) => (
                    <TouchableOpacity
                      key={screen.route}
                      className="bg-[#E0F7FF] px-3 py-2 rounded-lg border border-[#4FB8FE] mb-1"
                      onPress={() => navigateTo(screen)}>
                      <Text className="font-din text-sm text-textPrimary">
                        {screen.name.replace('Onboarding ', '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sitemap Section */}
              <View className="mb-4">
                <Text className="font-feather text-lg text-textPrimary mb-3">App Routes</Text>

                {Object.entries(ROUTE_GROUPS).map(([groupName, routes]) => (
                  <View key={groupName} className="mb-4">
                    <Text className="font-feather text-base text-textPrimary mb-2">
                      {groupName}
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {routes.map((route) => (
                        <TouchableOpacity
                          key={route.route}
                          className="bg-[#E0F7E6] px-3 py-2 rounded-lg border border-[#4FD675] mb-1"
                          onPress={() => {
                            setModalVisible(false);
                            setTimeout(() => {
                              router.push(route.route as any);
                            }, 300);
                          }}>
                          <Text className="font-din text-sm text-textPrimary">
                            {route.name}
                            {pathname === route.route ? ' (current)' : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>

              {/* Show Current Covenant Status */}
              <View className="mb-4">
                <Text className="font-feather text-base text-textPrimary mb-2">
                  📊 Current Covenant Status
                </Text>
                <TouchableOpacity
                  className="bg-[#F0F0FF] px-4 py-3 rounded-lg border border-[#9090FF] mb-1"
                  onPress={() => {
                    const userStore = useUserStore.getState();
                    const covenantProgress = userStore.getCovenantProgress();
                    const currentStreak = userStore.getStreakCount();
                    
                    appLog('📊 Current Covenant Status:', {
                      streakCount: currentStreak,
                      covenantProgress,
                      rawCovenantData: userStore.covenantProgress
                    });

                    Alert.alert(
                      'Covenant Status',
                      `Current Streak: ${currentStreak}\n` +
                      `Target Days: ${covenantProgress.targetDays}\n` +
                      `Progress: ${covenantProgress.progress.toFixed(1)}%\n` +
                      `State: ${covenantProgress.state}\n\n` +
                      `Next streak increment will ${currentStreak + 1 >= covenantProgress.targetDays ? 'TRIGGER SUCCESS MODAL! 🎉' : `make progress ${currentStreak + 1}/${covenantProgress.targetDays}`}`
                    );
                  }}>
                  <Text className="font-din text-sm text-textPrimary text-center">Show Covenant Info 📊</Text>
                </TouchableOpacity>
              </View>


              {/* Hide Debug Button */}
              <View className="mt-6 pt-4 border-t border-buttonBorder">
                <TouchableOpacity
                  className="bg-orange-500 p-4 rounded-xl border-l-4 border-l-orange-600"
                  onPress={handleHideDebugButton}>
                  <Text className="font-feather text-base text-white text-center">Hide Debug Button</Text>
                  <Text className="font-din text-sm text-white/80 mt-1 text-center">
                    Hide the debug button from screen
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign Out Button - Only show if user is signed in */}
              {isSignedIn() && (
                <View className="mt-6 pt-4 border-t border-buttonBorder">
                  <TouchableOpacity
                    className="bg-red p-4 rounded-xl border-l-4 border-l-[#FF0000]"
                    onPress={handleSignOut}>
                    <Text className="font-feather text-base text-white text-center">Sign Out</Text>
                    <Text className="font-din text-sm text-white/80 mt-1 text-center">
                      Sign out of your account
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
                </>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Success Animation Modal - Full Screen */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={successModalVisible}
        onRequestClose={handleDismissSuccessSheet}>
        <SuccessAnimation
          message="Great job!"
          subMessage="You triggered the success animation from debug menu."
          onClose={handleDismissSuccessSheet}
        />
      </Modal>

      {/* Keep the bottom sheet for backwards compatibility */}
      <BottomSheetModal
        ref={successSheetRef}
        index={0}
        snapPoints={successSnapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#FFF4D9' }}
        handleIndicatorStyle={{ backgroundColor: '#DCB280' }}>
        <SuccessAnimationContent
          message="Great job!"
          subMessage="You triggered the success animation from debug menu."
          onClose={handleDismissSuccessSheet}
        />
      </BottomSheetModal>

      {/* Register custom toast config */}
      <Toast config={toastConfig} />


      {/* Devotional Upload Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={devotionalUploadModalVisible}
        onRequestClose={() => setDevotionalUploadModalVisible(false)}>
        <SafeAreaView className="flex-1 bg-black/50">
          <View className="m-5 mt-[60px] bg-surfaceCream rounded-[20px] flex-1 shadow-lg">
            <View className="flex-row items-center justify-between border-b border-b-buttonBorder p-4">
              <Text className="font-feather text-xl text-textPrimary">Upload Devotionals</Text>
              <TouchableOpacity
                onPress={() => setDevotionalUploadModalVisible(false)}
                className="w-8 h-8 rounded-full bg-forestGreen80 items-center justify-center">
                <Text className="text-white text-base font-bold">✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="p-4 flex-1" keyboardShouldPersistTaps="handled">
              <Text className="font-din text-base text-textPrimary mb-2">
                Paste your devotionals JSON below. The format should match the Devotional.ts interface.
              </Text>

              <Text className="font-din text-sm text-description mb-4">
                Example format: {`[{"id": "2025-01-01", "title": "New Year", "verse": "John 3:16", ...}]`}
              </Text>

              <TextInput
                multiline
                numberOfLines={15}
                value={devotionalJsonInput}
                onChangeText={setDevotionalJsonInput}
                placeholder="Paste your JSON here..."
                placeholderTextColor="#B89B4C"
                className="bg-surfaceCreamLight border border-buttonBorder rounded-xl p-4 font-din text-textPrimary mb-4"
                style={{ minHeight: 300, textAlignVertical: 'top' }}
              />

              {/* Padding bottom so content doesn't hide behind action area */}
              <View style={{ height: 120 }} />
            </ScrollView>

            {/* Fixed action area */}
            <View className="p-4 border-t border-buttonBorder bg-surfaceCreamLight">
              <TouchableOpacity
                className="bg-accentGold p-4 rounded-xl border-l-4 border-l-buttonBorder"
                onPress={handleUploadDevotionals}>
                <Text className="font-feather text-base text-white text-center">
                  Upload Devotionals
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-3 bg-surfaceCream p-4 rounded-xl border border-buttonBorder"
                onPress={() => {
                  setDevotionalJsonInput('');
                  setDevotionalUploadModalVisible(false);
                }}>
                <Text className="font-feather text-base text-textPrimary text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Evolution Animation Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={evolutionModalVisible}
        presentationStyle="pageSheet"
        onRequestClose={() => setEvolutionModalVisible(false)}>
        <EvolutionScreen
          evolutionLevel={evolutionLevel}
          onClose={() => setEvolutionModalVisible(false)}
        />
      </Modal>
    </>
  );
}
