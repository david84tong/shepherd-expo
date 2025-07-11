import auth from '@react-native-firebase/auth';
import { Dimensions } from 'react-native';

export const isSignedInWithGoogle = () => {
  const user = auth().currentUser;
  return user?.providerData[0]?.providerId === 'google.com';
};

export const isSignedInWithApple = () => {
  const user = auth().currentUser;
  return user?.providerData[0]?.providerId === 'apple.com';
};


export const RPW = (width: number) => {
  return Dimensions.get('window').width * width / 100;
}

export const RPH = (height: number) => {
  return Dimensions.get('window').height * height / 100;
}

export function appLog(log: any, ...optionalParams: any[]) {
  if (__DEV__) {
    console.log(log, ...optionalParams);
  }
}

// Default export for Expo Router compatibility
export default {}