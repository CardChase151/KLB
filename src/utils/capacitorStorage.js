import { Preferences } from '@capacitor/preferences';

/**
 * Capacitor Storage adapter for Supabase Auth
 * Uses secure native storage on iOS/Android
 */
export const CapacitorStorage = {
  async getItem(key) {
    const { value } = await Preferences.get({ key });
    return value;
  },

  async setItem(key, value) {
    await Preferences.set({ key, value });
  },

  async removeItem(key) {
    await Preferences.remove({ key });
  }
};
