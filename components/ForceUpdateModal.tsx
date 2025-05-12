import {
  Modal,
  View,
  Text,
  StyleSheet,
  Platform,
  Linking,
  Image,
} from 'react-native';
import remoteConfig from '@react-native-firebase/remote-config';
import sheepIcon from '../assets/icons/sheepIcon.png';
import PrimaryButton from './PrimaryButton';

const ForceUpdateModal = ({ visible }: { visible: boolean }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Image
            source={sheepIcon}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>
            A new version of the app is available. Please update to continue using the app.
          </Text>
          <PrimaryButton title="Update Now" onPress={() => {
            const storeUrl =
              Platform.OS === 'android'
                ? remoteConfig().getValue('force_update_url_android').asString()
                : remoteConfig().getValue('force_update_url_ios').asString(); Linking.openURL(storeUrl)
          }} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 16,
    width: '80%',
    alignItems: 'center',
    elevation: 10,
  },
  icon: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default ForceUpdateModal;
