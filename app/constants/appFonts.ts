import {Platform} from 'react-native';
import {responsiveFontSize} from 'react-native-responsive-dimensions';
// const isTablet = DeviceInfo.deviceType === DeviceInfo.DeviceType.TABLET;
const isTablet = false;

const AppFonts = {
  8:  isTablet ? 8 : responsiveFontSize(1),
  9:  isTablet ? 10 : responsiveFontSize(1),
  10:  isTablet ? 10 : responsiveFontSize(1.31),
  11:  isTablet ? 11 : responsiveFontSize(1.48),
  12:  isTablet ? 12 : responsiveFontSize(1.58),
  13:  isTablet ? 13 : responsiveFontSize(1.7),
  // 14: responsiveFontSize(1.85),
  14:  isTablet ? 14 : responsiveFontSize(1.95),
  15:  isTablet ? 15 : responsiveFontSize(1.99),
  16:  isTablet ? 16 : responsiveFontSize(2.1),
  17:  isTablet ? 17 : responsiveFontSize(2.17),
  18:  isTablet ? 18 : responsiveFontSize(2.36),
  20:  isTablet ? 20 : responsiveFontSize(2.63),
  21:  isTablet ? 21 : responsiveFontSize(2.65),
  22:  isTablet ? 22 : responsiveFontSize(2.88),
  23:  isTablet ? 23 : responsiveFontSize(3.05),
  24:  isTablet ? 24 : responsiveFontSize(3.15),
  // 28: responsiveFontSize(3.67),
  28:  isTablet ? 28 : responsiveFontSize(3.75),
  32:  isTablet ? 32 : responsiveFontSize(4.19),
  56:  isTablet ? 56 : responsiveFontSize(7.33),
  input: Platform.select({
    ios:  isTablet ? 24 : responsiveFontSize(3.15),
    android:  isTablet ? 22 : responsiveFontSize(2.88),
  }),
};

const FontLineHeight = {
  10: AppFonts[10] + 8,
  12: AppFonts[12] + 8,
  14: AppFonts[14] + 8,
  16: AppFonts[16] + 8,
  18: AppFonts[18] + 8,
  22: AppFonts[22] + 8,
  24: AppFonts[24] + 8,
  28: AppFonts[28] + 8,
  32: AppFonts[32] + 8,
  56: AppFonts[56] + 8,
};

export {AppFonts, FontLineHeight};
