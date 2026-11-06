import AsyncStorage from '@react-native-async-storage/async-storage';
import { CurrencyCode } from '@/utils/currency';

export const SETTINGS_STORAGE_KEY = 'setting_data';

export interface AiPreferences {
  isVegetarian: boolean;
  avoidDairy: boolean;
  spiceLevel: 'mild' | 'medium' | 'hot' | string;
  allergens: string;
}

export interface Settings {
  currency: CurrencyCode | string;
  notificationsEnabled: boolean;
  theme: string;
  aiPreferences: AiPreferences;
}

export const INITIAL_SETTINGS: Settings = {
  currency: 'USD',
  notificationsEnabled: true,
  theme: 'system',
  aiPreferences: {
    isVegetarian: false,
    avoidDairy: false,
    spiceLevel: 'medium',
    allergens: '',
  },
};

export async function saveSetting(data: Settings): Promise<void> {
  try {
    const json = JSON.stringify(data);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, json);
  } catch (error) {
    console.error('Error saving setting:', error);
  }
}

export async function loadSetting(): Promise<Settings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!json) return INITIAL_SETTINGS;
    const parsed = JSON.parse(json);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return INITIAL_SETTINGS;
    }
    return {
      ...INITIAL_SETTINGS,
      ...parsed,
      aiPreferences: {
        ...INITIAL_SETTINGS.aiPreferences,
        ...(parsed.aiPreferences || {}),
      },
    };
  } catch (error) {
    console.error('Error loading setting:', error);
    return INITIAL_SETTINGS;
  }
}
