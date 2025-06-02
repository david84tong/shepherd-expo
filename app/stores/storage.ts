import {MMKVLoader} from 'react-native-mmkv-storage';
export const zuStandStorage = new MMKVLoader()
  .withInstanceID('mmkvWithEncryptionAndID')
  .withEncryption()
  .initialize();
