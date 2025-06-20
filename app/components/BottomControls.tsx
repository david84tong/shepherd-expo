import { View, Animated } from 'react-native';
import CircleButton from '~/components/Shared/CircleButton';
import PrimaryButton from '~/components/PrimaryButton';
import BluePrimaryButton from '~/components/Shared/BluePrimaryButton';
import i18n from '../utils/i18n';

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
}: BottomControlsProps) {
  return (
    <Animated.View 
      style={[
        { opacity: bottomContentOpacity, transform: [{ translateY: bottomContentAnimY }] },
        {bottom: RPH(3)},
        { 
          opacity: showPrayerContent ? controlRowOpacity : 1,
          pointerEvents: showPrayerContent ? (isControlRowVisible ? 'auto' : 'none') : 'auto'
        }
      ]}
      className='px-10 absolute items-center w-full justify-between'>
      {/* {showDevotionalContent && (
        <View className='flex-row items-center w-full justify-between mr-12'>
          <View className="flex-row gap-3">
            <Image source={require('../../assets/icons/share.png')} style={{opacity:0.7}} />
            <Image source={require('../../assets/icons/bookmark.png')} style={{opacity:0.7}} />
          </View>
        </View>
      )} */}
      <View className="flex-row items-center justify-between w-full">
        {!showJournalContent && (
          <Animated.View style={{ width: '10%' }}>
            <CircleButton 
              icon='chevron-left' 
              size={53} 
              onPress={()=>{
                if(showDevotionalContent){
                  handleDevotionalClose({})
                  devotionalReaderRef.current?.handleClose();
                }
                if(showPrayerContent){
                  prayerViewRef.current?.handleBack();
                }
              }} 
            />
          </Animated.View>
        )}

        <Animated.View style={{ width: showPrayerContent ? '60%' : showJournalContent ? '100%' : '82%' }}>
          {showDevotionalContent ? (
            <PrimaryButton
              title={buttonTitle}
              onPress={handleDevotionalFinishPress}
              disabled={devotionalReaderRef.current?.isRewarding || !devotionalReadedFully}
              buttonType="blue"
              icon={require('../../assets/icons/starIcon.png')}
              reward={'+25'}
              opacity={!devotionalReadedFully ? 0.7 : 1}
            />
          ) : showPrayerContent ? (
            <BluePrimaryButton
              title={i18n.t('amen_button')}
              width="100%"
              disabled={isCompletePrayerDisabled}
              onPress={() => {
                prayerViewRef.current?.handleCompletePrayer();
              }}
            />
          ) : null}
        </Animated.View> 
        
        {showPrayerContent && (
          <Animated.View style={{ width: '10%' }}>
            <CircleButton
              icon="settings"
              size={50}
              onPress={() => {
                prayerViewRef.current?.handleSettings();
              }}
            />
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
} 