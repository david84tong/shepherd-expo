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
  alertBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 10,
    padding: 30,
    width: '80%',
  },
  icon: {
    height: 64,
    marginBottom: 16,
    width: 64,
  },
  message: {
    color: '#555',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#333',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default ForceUpdateModal;
