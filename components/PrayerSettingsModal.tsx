import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Switch,
  TouchableWithoutFeedback,
} from 'react-native';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  prayerDuration: number;
  savePrayerDuration: (duration: number) => Promise<void>;
  hapticsEnabled: boolean;
  saveHapticsEnabled: (enabled: boolean) => Promise<void>;
  guidedPrayerEnabled: boolean;
  saveGuidedPrayerEnabled: (enabled: boolean) => Promise<void>;
}

const durationOptions = [
  { label: '10s', value: 10000 },
  { label: '20s', value: 20000 },
  { label: '30s', value: 30000 },
  { label: '1m', value: 60000 },
  { label: '2m', value: 120000 },
  { label: '5m', value: 300000 },
];

const PrayerSettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  prayerDuration,
  savePrayerDuration,
  hapticsEnabled,
  saveHapticsEnabled,
  guidedPrayerEnabled,
  saveGuidedPrayerEnabled,
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType='fade'
    onRequestClose={onClose}
  >
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={{
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}>
        <TouchableWithoutFeedback>
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}>
            {/* Header */}
            <Text style={{
              fontSize: 20,
              fontFamily: 'Nunito-Black',
              color: '#795323',
              textAlign: 'center',
              marginBottom: 24,
            }}>
              Prayer Settings
            </Text>

            {/* Duration Settings */}
            <Text style={{
              fontSize: 16,
              fontFamily: 'DIN Next Rounded LT W01 Regular',
              color: '#795323',
              marginBottom: 16,
            }}>
              Prayer Duration
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
              {durationOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => savePrayerDuration(option.value)}
                  style={{
                    backgroundColor: prayerDuration === option.value ? '#FF8800' : '#E9E2C7',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    width: '30%',
                    marginBottom: 10,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    color: prayerDuration === option.value ? 'white' : '#795323',
                    fontFamily: 'Nunito-Black',
                  }}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Haptics Row */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: '#E9E2C7',
              borderBottomWidth: 1,
              borderBottomColor: '#E9E2C7',
            }}>
              <Text style={{
                fontSize: 16,
                fontFamily: 'DIN Next Rounded LT W01 Regular',
                color: '#795323',
              }}>
                Haptic Feedback
              </Text>
              <Switch
                value={hapticsEnabled}
                onValueChange={saveHapticsEnabled}
                trackColor={{ false: '#E9E2C7', true: '#FF8800' }}
                thumbColor={hapticsEnabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>

            {/* Guided Prayer Row */}
            {/* <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 16,
            }}>
              <Text style={{
                fontSize: 16,
                fontFamily: 'DIN Next Rounded LT W01 Regular',
                color: '#795323',
              }}>
                Guided Prayer Mode
              </Text>
              <Switch
                value={guidedPrayerEnabled}
                onValueChange={saveGuidedPrayerEnabled}
                trackColor={{ false: '#E9E2C7', true: '#FF8800' }}
                thumbColor={guidedPrayerEnabled ? '#FFFFFF' : '#FFFFFF'}
              />
            </View> */}

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: '#FF8800',
                paddingVertical: 12,
                borderRadius: 12,
                marginTop: 20,
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontFamily: 'Nunito-Black',
                textAlign: 'center',
              }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

export default PrayerSettingsModal; 