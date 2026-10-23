import Constants from 'expo-constants';

// Dev varyantı (APP_VARIANT=development) ya da Metro'lu debug build. Dev araçları __DEV__ yerine bununla sarılır;
// store build'inde (EAS production) false'tur.
export const IS_DEV_MODE: boolean =
  __DEV__ || Constants.expoConfig?.extra?.appVariant === 'development';
