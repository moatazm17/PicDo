import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  USER_ID: 'user_id',
  LANGUAGE: 'language',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  THEME: 'theme',
};

// User ID management
export const getUserId = async () => {
  try {
    let userId = await AsyncStorage.getItem(KEYS.USER_ID);
    if (!userId) {
      userId = uuidv4();
      await AsyncStorage.setItem(KEYS.USER_ID, userId);
    }
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return uuidv4(); // Fallback to new UUID
  }
};

// Language management
export const getLanguage = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.LANGUAGE) || 'en';
  } catch (error) {
    console.error('Error getting language:', error);
    return 'en';
  }
};

export const setLanguage = async (language) => {
  try {
    await AsyncStorage.setItem(KEYS.LANGUAGE, language);
  } catch (error) {
    console.error('Error setting language:', error);
  }
};

// Onboarding management
export const getOnboardingCompleted = async () => {
  try {
    const completed = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETED);
    return completed === 'true';
  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return false;
  }
};

export const setOnboardingCompleted = async (completed = true) => {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETED, completed.toString());
  } catch (error) {
    console.error('Error setting onboarding status:', error);
  }
};

// Theme management
export const getTheme = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.THEME) || 'auto';
  } catch (error) {
    console.error('Error getting theme:', error);
    return 'auto';
  }
};

export const setTheme = async (theme) => {
  try {
    await AsyncStorage.setItem(KEYS.THEME, theme);
  } catch (error) {
    console.error('Error setting theme:', error);
  }
};

// Generic storage utilities
export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error(`Error storing data for key ${key}:`, error);
  }
};

export const getData = async (key, defaultValue = null) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
  } catch (error) {
    console.error(`Error getting data for key ${key}:`, error);
    return defaultValue;
  }
};

export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Error clearing all data:', error);
  }
};
