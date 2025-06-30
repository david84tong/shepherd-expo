import { View, Animated, TouchableOpacity } from 'react-native';
import CircleButton from '~/components/Shared/CircleButton';
import PrimaryButton from '~/components/PrimaryButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_IOS } from '../utils/utils';
import { FontAwesome6 } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { hapticLight } from '~/utils/haptics';
import { useDevotionalStore } from '../stores/devotionalStore';
import { useUserStore } from '../stores/userStore';
import firestore from '@react-native-firebase/firestore';
import analytics from '~/utils/analytics';

interface BottomControlsProps {
  bottomContentOpacity: Animated.Value;
  bottomContentAnimY: Animated.Value;
  showPrayerContent: boolean;
  controlRowOpacity: Animated.Value;
  isControlRowVisible: boolean;
  showDevotionalContent: boolean;
  showJournalContent: boolean;
  RPH: (value: number) => number;
  handleDevotionalClose: (params: any) => void;
  devotionalReaderRef: any;
  prayerViewRef: any;
  buttonTitle: string;
  handleDevotionalFinishPress: () => void;
  devotionalReadedFully: boolean;
  isCompletePrayerDisabled: boolean;
  showPrayerSuccess?: boolean;
  onSharePress?: () => void;
}

export default function BottomControls({
  bottomContentOpacity,
  bottomContentAnimY,
  showPrayerContent,
  controlRowOpacity,
  isControlRowVisible,
  showDevotionalContent,
  showJournalContent,
  RPH,
  handleDevotionalClose,
  devotionalReaderRef,
  prayerViewRef,
  buttonTitle,
  handleDevotionalFinishPress,
  devotionalReadedFully,
  isCompletePrayerDisabled,
  showPrayerSuccess = false,
  onSharePress,
}: BottomControlsProps) {
  const insets = useSafeAreaInsets();
  const [isLiked, setIsLiked] = useState(false);
  const [isShared, setIsShared] = useState(false);

  // Get store data
  const { customDevotional, updateLikeStatus, incrementShareCount } = useDevotionalStore();
  const currentUser = useUserStore.getState();

  // Check if current devotional is liked by user
  useEffect(() => {
    if (currentUser?.id && customDevotional?.likedBy) {
      setIsLiked(customDevotional.likedBy.includes(currentUser.id));
    }
  }, [customDevotional, currentUser]);

  // Debug showDevotionalContent
  useEffect(() => {
    console.log('🔍 BottomControls - showDevotionalContent changed:', showDevotionalContent);
  }, [showDevotionalContent]);

  const handleLikePress = async () => {
    if (!customDevotional?.id || !currentUser?.id) return;

    hapticLight();
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);

    try {
      // Update Firestore
      const devotionalRef = firestore().collection('customDevotionals').doc(customDevotional.id);
      await devotionalRef.update({
        likes: firestore.FieldValue.increment(newLikedState ? 1 : -1),
        likedBy: newLikedState
          ? firestore.FieldValue.arrayUnion(currentUser.id)
          : firestore.FieldValue.arrayRemove(currentUser.id),
      });

      // Update local store
      updateLikeStatus(customDevotional.id, newLikedState);

      // Log analytics
      analytics.logEvent('BottomControls_Like', {
        devotionalId: customDevotional.id,
        bibleReference: customDevotional.bibleReference,
        liked: newLikedState,
      });
    } catch (error) {
      console.error("Error updating like:", error);
      setIsLiked(!newLikedState); // Revert on error
    }
  };

  const handleSharePress = async () => {

    hapticLight();
    setIsShared(true);

    try {
      // Only update Firestore if we have a customDevotional with an ID
      if (customDevotional?.id) {
        console.log('🔍 Updating Firestore share count for customDevotional:', customDevotional.id);

        // Update Firestore share count
        const devotionalRef = firestore().collection('customDevotionals').doc(customDevotional.id);
        await devotionalRef.update({
          shares: firestore.FieldValue.increment(1),
        });

        // Update local store
        incrementShareCount(customDevotional.id);

        // Log analytics
        analytics.logEvent('BottomControls_Share', {
          devotionalId: customDevotional.id,
          bibleReference: customDevotional.bibleReference,
        });
      } else {
        console.log('🔍 No customDevotional ID, skipping Firestore update');
      }

      // Trigger full screen share card (this should always work)
      if (onSharePress) {
        onSharePress();
      } else {
        console.log('🔍 onSharePress function is not provided');
      }
    } catch (error) {
      console.error("Error updating share:", error);
      setIsShared(false); // Revert on error
    }
  };

  return (
    <Animated.View
      style={[
        { opacity: bottomContentOpacity, transform: [{ translateY: bottomContentAnimY }] },
        { bottom: RPH(1) + insets.bottom / 2 },
        {
          opacity: showPrayerContent ? controlRowOpacity : 1,
          pointerEvents: showPrayerContent ? (isControlRowVisible ? 'auto' : 'none') : 'auto'
        }
      ]}
      className='px-10 absolute items-center w-full justify-between'>
      {showDevotionalContent && (
        <View className='flex-row items-center w-full justify-between mr-12 -mb-4'>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => {
                handleLikePress();
              }}
              className="p-2 pl-8"
            >
              <FontAwesome6
                name="heart"
                size={20}
                color={isLiked ? "#FC8A02" : "#B89B4C"}
                solid
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                handleSharePress();
              }}
              className="py-2"
            >
              <FontAwesome6
                name="share-nodes"
                size={20}
                color={isShared ? "#FC8A02" : "#B89B4C"}
                solid
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View className="flex-row items-center justify-between w-full">
        <View className='flex-row items-center w-[20%] justify-between'>
          {!showJournalContent && !showPrayerSuccess && (
            <Animated.View style={{ width: '10%' }}>
              <CircleButton
                icon='chevron-left'
                onPress={() => {
                  if (showDevotionalContent) {
                    handleDevotionalClose({})
                    devotionalReaderRef.current?.handleClose();
                  }
                  if (showPrayerContent) {
                    prayerViewRef.current?.handleBack();
                  }
                }}
              />
            </Animated.View>
          )}
          {showPrayerContent && (
            <Animated.View style={{ width: '10%' }}>
              <CircleButton
                icon="settings"
                onPress={() => {
                  prayerViewRef.current?.handleSettings();
                }}
              />
            </Animated.View>
          )}

        </View>
        <Animated.View style={{ width: showPrayerContent ? (showPrayerSuccess ? '100%' : '60%') : showJournalContent ? '100%' : '82%' }}>
          {showDevotionalContent ? (
            <PrimaryButton
              title={buttonTitle}
              onPress={handleDevotionalFinishPress}
              disabled={devotionalReaderRef.current?.isRewarding || !devotionalReadedFully}
              buttonType="blue"
              icon={require('../../assets/icons/starIcon.png')}
              reward={'+50'}
              opacity={!devotionalReadedFully && IS_IOS ? 0.7 : 1}
            />
          ) : showPrayerContent ? (
            <View />
            // <BluePrimaryButton
            //   title={i18n.t('amen_button')}
            //   width="100%"
            //   disabled={isCompletePrayerDisabled}
            //   onPress={() => {
            //     prayerViewRef.current?.handleCompletePrayer();
            //   }}
            // />
          ) : null}
        </Animated.View>


      </View>
    </Animated.View>
  );
} 