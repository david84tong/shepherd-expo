import auth from '@react-native-firebase/auth';

export const isSignedInWithGoogle = () => {
  const user = auth().currentUser;
  return user?.providerData[0]?.providerId === 'google.com';
};

export const isSignedInWithApple = () => {
  const user = auth().currentUser;
  return user?.providerData[0]?.providerId === 'apple.com';
};
