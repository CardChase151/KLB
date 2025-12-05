import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.k2coach.klb',
  appName: 'KLB',
  webDir: 'build',
  ios: {
    contentInset: 'never',
    backgroundColor: '#000000'
  },
  android: {
    backgroundColor: '#000000'
  }
};

export default config;
