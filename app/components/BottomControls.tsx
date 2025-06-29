import { View, Animated } from 'react-native';
import CircleButton from '~/components/Shared/CircleButton';
import PrimaryButton from '~/components/PrimaryButton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_IOS } from '../utils/utils';

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
}: BottomControlsProps) {
  const insets = useSafeAreaInsets();
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
        <View className='flex-row items-center w-full justify-between mr-12'>
          <View className="flex-row gap-3">
            {/* <Image source={require('../../assets/icons/share.png')} style={{opacity:0.7}} />
            <Image source={require('../../assets/icons/bookmark.png')} style={{opacity:0.7}} /> */}
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