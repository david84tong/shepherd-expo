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
import { useTranslation } from '../app/hooks/useTranslation';
import sheepIcon from '../assets/icons/sheepIcon.png';
import PrimaryButton from './PrimaryButton';

const ForceUpdateModal = ({ visible }: { visible: boolean }) => {
  const { t } = useTranslation();
  
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Image
            source={sheepIcon}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('forceUpdate.title')}</Text>
          <Text style={styles.message}>
            {t('forceUpdate.message')}
          </Text>
          <PrimaryButton title={t('forceUpdate.updateNow')} onPress={() => {
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
