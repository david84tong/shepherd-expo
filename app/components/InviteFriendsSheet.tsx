import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Pressable,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFriendStore } from '../stores/friendStore';
import { useUserStore } from '../stores/userStore';
import appsFlyerService from '../services/appsflyerService';
import analytics from '~/utils/analytics';
import { appLog } from '../helper/helper';
import Toast from 'react-native-toast-message';

export interface InviteFriendsSheetRef {
  show: () => void;
  hide: () => void;
}

interface Props {
  onDismiss?: () => void;
}

const InviteFriendsSheet = forwardRef<InviteFriendsSheetRef, Props>(({ onDismiss }, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  
  const { getUser } = useUserStore();
  const { getInviteLink } = useFriendStore();
  const user = getUser();

  useImperativeHandle(ref, () => ({
    show: () => {
      setIsVisible(true);
      bottomSheetRef.current?.present();
      generateInviteLink();
    },
    hide: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const generateInviteLink = async () => {
    if (!user.id) return;

    try {
      setIsLoading(true);
      appLog('[InviteFriendsSheet] Generating invite link...');

      // Get or create invite code
      const inviteCode = await getInviteLink();
      if (!inviteCode) {
        throw new Error('Failed to create invite code');
      }

      // Create AppsFlyer deep link
      const appsflyerLink = await appsFlyerService.createInviteLink({
        inviteCode,
        inviterUserId: user.id,
        inviterDisplayName: user.displayName || 'A friend'
      });

      if (appsflyerLink) {
        setInviteLink(appsflyerLink);
        appLog('[InviteFriendsSheet] Invite link generated:', appsflyerLink);
      } else {
        // Fallback to direct OneLink
        const fallbackLink = `https://shepherd-bible-pet.onelink.me/r9C1?invite_code=${inviteCode}&deep_link_value=${encodeURIComponent(`invite?code=${inviteCode}`)}`;
        setInviteLink(fallbackLink);
        appLog('[InviteFriendsSheet] Using fallback OneLink:', fallbackLink);
      }

      analytics.logEvent('invite_link_generated', {
        inviteCode,
        userId: user.id,
        hasAppsFlyerLink: !!appsflyerLink
      });

    } catch (error) {
      appLog('[InviteFriendsSheet] Error generating invite link:', error);
      Alert.alert('Error', 'Failed to generate invite link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;

    try {
      const shareMessage = `Join me on Shepherd as my prayer buddy! ‘Two are better than one, because they have a good reward for their toil.’ — Ecclesiastes 4:9: ${inviteLink}`;
      
      const result = await Share.share({
        message: shareMessage,
        url: inviteLink,
        title: 'Join me on Shepherd!'
      });

      if (result.action === Share.sharedAction) {
        analytics.logEvent('invite_shared', {
          method: 'share_sheet',
          userId: user.id
        });

        // Track with AppsFlyer
        const inviteCode = new URL(inviteLink).searchParams.get('invite_code') || 
                          new URL(inviteLink).searchParams.get('code');
        if (inviteCode) {
          await appsFlyerService.trackInviteShared(inviteCode, 'share_sheet');
        }

        Toast.show({
          type: 'success',
          text1: 'Invite Sent!',
          text2: 'Your friend will automatically be added when they join.',
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      appLog('[InviteFriendsSheet] Error sharing invite:', error);
      Alert.alert('Error', 'Failed to share invite link. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await Clipboard.setString(inviteLink);
      
      analytics.logEvent('invite_link_copied', {
        userId: user.id
      });

      Toast.show({
        type: 'success',
        text1: 'Link Copied!',
        text2: 'Share it with your friends to invite them.',
        visibilityTime: 3000,
      });

      // Track with AppsFlyer
      const inviteCode = new URL(inviteLink).searchParams.get('invite_code') || 
                        new URL(inviteLink).searchParams.get('code');
      if (inviteCode) {
        await appsFlyerService.trackInviteShared(inviteCode, 'copy_link');
      }

    } catch (error) {
      appLog('[InviteFriendsSheet] Error copying link:', error);
      Alert.alert('Error', 'Failed to copy link. Please try again.');
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['50%']}
      backgroundStyle={{
        backgroundColor: '#FFF4D9',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
      }}
      handleIndicatorStyle={{
        backgroundColor: '#DCB280',
        height: 6,
        width: 60,
        borderRadius: 3,
      }}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      enablePanDownToClose
      enableDynamicSizing={false}
    >
      <BottomSheetView className="flex-1 p-6" style={{ paddingBottom: insets.bottom + 20 }}>
        <View className="items-center mb-8">
          <Text className="text-h1 font-feather text-textPrimary mb-3">
            Invite Friends 🐑
          </Text>
          <Text className="text-body font-din text-description text-center leading-6">
            Share Shepherd with your friends and they'll automatically be added to your flock!
          </Text>
        </View>

        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FCD34D" />
            <Text className="text-body font-din text-description mt-4">
              Generating your invite link...
            </Text>
          </View>
        ) : (
          <View className="flex-1">
            {/* Invite Link Display */}
            {inviteLink && (
              <View className="bg-surfaceCream border border-pillBorder rounded-card p-4 mb-6">
                <Text className="text-caption font-din text-description mb-2">Your Invite Link:</Text>
                <Text className="text-body font-din text-textPrimary" numberOfLines={2}>
                  {inviteLink}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="space-y-4">
              <Pressable
                onPress={handleShare}
                disabled={!inviteLink}
                className={`bg-accentGold rounded-card p-4 items-center ${
                  !inviteLink ? 'opacity-50' : ''
                }`}
                style={!inviteLink ? {} : {
                  shadowColor: '#F7B500',
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: 5,
                }}
              >
                <Text className="text-heading font-feather text-textPrimary">
                  📱 Share Invite Link
                </Text>
              </Pressable>

            </View>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

InviteFriendsSheet.displayName = 'InviteFriendsSheet';

export default InviteFriendsSheet;