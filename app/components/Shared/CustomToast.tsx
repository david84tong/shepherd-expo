import React from 'react';
import { View, Text } from 'react-native';
import { ToastConfig, ToastConfigParams } from 'react-native-toast-message';

const CustomToast: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View
      style={{
        backgroundColor: '#FDEBB8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#24CA17',
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
      }}>
      <Text style={{ fontFamily: 'Nunito-Black', fontSize: 16, color: '#3C584A' }}>{text1}</Text>
      {text2 && (
        <Text
          style={{
            fontFamily: 'DIN Next Rounded LT W01 Regular',
            fontSize: 14,
            color: '#B89B4C',
            marginTop: 4,
          }}>
          {text2}
        </Text>
      )}
    </View>
  ),
  error: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View
      style={{
        backgroundColor: '#FDEBB8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#DF4533',
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
      }}>
      <Text style={{ fontFamily: 'Nunito-Black', fontSize: 16, color: '#3C584A' }}>{text1}</Text>
      {text2 && (
        <Text
          style={{
            fontFamily: 'DIN Next Rounded LT W01 Regular',
            fontSize: 14,
            color: '#B89B4C',
            marginTop: 4,
          }}>
          {text2}
        </Text>
      )}
    </View>
  ),
  info: ({ text1, text2 }: ToastConfigParams<any>) => (
    <View
      style={{
        backgroundColor: '#FDEBB8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FCD34D',
        shadowColor: 'rgba(0,0,0,0.08)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
      }}>
      <Text style={{ fontFamily: 'Nunito-Black', fontSize: 16, color: '#3C584A' }}>{text1}</Text>
      {text2 && (
        <Text
          style={{
            fontFamily: 'DIN Next Rounded LT W01 Regular',
            fontSize: 14,
            color: '#B89B4C',
            marginTop: 4,
          }}>
          {text2}
        </Text>
      )}
    </View>
  ),
};

export default CustomToast; 