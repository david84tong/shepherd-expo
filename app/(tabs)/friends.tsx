import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useUserStore } from '../stores/userStore';
// Note: Avoid importing Reanimated directly in the screen file to keep Fast Refresh snappy.
// For subtle entrance effects, prefer lightweight RN animations or move Reanimated to child components.
import { useUIStore } from '../stores/uiStore';
import analytics from '../../utils/analytics';
import { hapticLight } from '~/utils/haptics';
import PrimaryButton from '../../components/PrimaryButton';

export default function FriendsScreen() {
  const lamb = useUserStore((s) => s.getLamb?.());
  const lambName = useUserStore((s) => s.getLambName?.());
  const gems = useUserStore((s) => s.getGens?.());
  
  // Dev-only view states
  type FriendsViewState = 'invite' | 'pending' | 'connected';
  const [viewState, setViewState] = React.useState<FriendsViewState>('invite');

  // Keep UI static in this screen file to preserve true Fast Refresh.

  const handleGemsPress = () => {
    hapticLight();
    analytics.logEvent('Friends_Tapped_Gems');
    const showStoreSheet = useUIStore.getState().showStoreSheet;
    if (showStoreSheet) showStoreSheet();
  };

  const handleInvite = async () => {
    try {
      hapticLight();
      analytics.trackEvent('Friends_InvitePrayerBuddy_Pressed');
      const message =
        "Join me on Shepherd as my prayer buddy! ‘Two are better than one, because they have a good reward for their toil.’ — Ecclesiastes 4:9\n\nGet the app: https://shepherd.app";
      await Share.share({ message, title: 'Invite a Prayer Buddy' });
    } catch (err) {
      // noop
    }
  };

  const handleRefresh = () => {
    hapticLight();
    analytics.trackEvent('Friends_Pending_Refresh');
  };

  const handleNudge = () => {
    hapticLight();
    analytics.trackEvent('Friends_Pending_Nudge');
    handleInvite();
  };

  return (
    <ScrollView className="flex-1 bg-surfaceCream px-6 pt-24" contentContainerStyle={{ paddingBottom: 56 }}>
      {/* Header with Gems */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="font-feather text-h2 text-textPrimary">
          Flock
        </Text>
        <TouchableOpacity onPress={handleGemsPress} className="flex-row items-center bg-surfaceCreamLight rounded-full border border-[#eed39d] px-3 py-1.5">
          <Image source={require('../../assets/icons/greenGemIcon.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
          <Text className="font-feather text-textPrimary ml-1">{gems ?? 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Dev-only state switcher */}
      {__DEV__ && (
        <View className="flex-row items-center justify-center mb-4 gap-2">
          {([
            { id: 'invite', label: 'Need Invite' },
            { id: 'pending', label: 'Pending' },
            { id: 'connected', label: 'Connected' },
          ] as { id: FriendsViewState; label: string }[]).map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setViewState(opt.id)}
              className={`px-3 py-1.5 rounded-full border ${
                viewState === opt.id ? 'bg-accentGold border-buttonBorder' : 'bg-surfaceCreamLight border-[#eed39d]'
              }`}
            >
              <Text className={`font-din ${viewState === opt.id ? 'text-white' : 'text-textPrimary/80'}`}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Connected state */}
      {viewState === 'connected' && (
        <View className="bg-surfaceCreamLight rounded-2xl p-4 shadow-card border border-[#eed39d] flex-row items-center">
          <Image source={require('../../assets/icons/profileIcon.png')} style={{ width: 72, height: 72 }} resizeMode="contain" />
          <View className="ml-4 flex-1">
            <Text className="font-feather text-h4 text-textPrimary">Prayer Buddy</Text>
            <Text className="font-din text-textPrimary/70 mt-1" numberOfLines={1}>
              Closest friend • Encourager • Keeps you consistent
            </Text>
            <Text className="font-din text-textPrimary/50 mt-1">
              Your lamb: {lambName || 'Unnamed'} • LVL {lamb?.level ?? 1}
            </Text>
          </View>
        </View>
      )}

      {/* Pending state */}
      {viewState === 'pending' && (
        <View className="mt-8 bg-surfaceCreamLight rounded-2xl p-5 shadow-card border border-[#eed39d]">
          <Text className="font-feather text-h3 text-textPrimary mb-2 text-center pt-4">Invitation sent</Text>
          <Text className="font-din text-textPrimary/70 text-center">Your friend hasn&#39;t joined yet. Give them a gentle nudge!</Text>
          <View className="flex-row items-stretch mt-5 gap-3 pb-2">
            <View className="flex-1">
              <PrimaryButton title="Refresh" onPress={handleRefresh} buttonType="default" buttonHeight={52} width="100%" />
            </View>
            <View className="flex-1">
              <PrimaryButton title="Nudge" onPress={handleNudge} buttonType="blue" buttonHeight={52} width="100%" />
            </View>
          </View>
        </View>
      )}

      {/* Invite state */}
      {viewState === 'invite' && (
        <View className="rounded-2xl p-0 shadow-none bg-transparent mt-12">
          <View className="rounded-2xl p-5" style={{ borderStyle: 'dashed', borderColor: '#DCB280', borderWidth: 2 }}>
            <Text className="font-feather text-h3 text-textPrimary mb-2 text-center">Reserve a spot</Text>
            <Text className="font-din text-textPrimary/70 text-center">1 spot reserved • You&#39;re 3x more likely to be consistent with a friend</Text>
            <View className="mt-5">
              <PrimaryButton title="Invite prayer buddy" onPress={handleInvite} buttonType="blue" buttonHeight={52} />
            </View>
          </View>
        </View>
      )}

      {/* Placeholder for future friends list */}
      <View className="mt-6">
        <Text className="font-din text-textPrimary/50">More friends coming soon...</Text>
      </View>
    </ScrollView>
  );
}

