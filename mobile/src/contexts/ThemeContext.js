import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getTheme, setTheme as storeTheme } from '../utils/storage';
import { COLORS } from '../constants/config';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('auto'); // 'auto', 'light', 'dark'
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    if (themeMode === 'auto') {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await getTheme();
      setThemeMode(savedTheme);
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setTheme = async (mode) => {
    try {
      setThemeMode(mode);
      await storeTheme(mode);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  };

  const theme = {
    isDark,
    mode: themeMode,
    colors: {
      primary: COLORS.primary,
      primaryDark: COLORS.primaryDark,
      secondary: COLORS.secondary,
      background: isDark ? COLORS.background.dark : COLORS.background.light,
      surface: isDark ? COLORS.surface.dark : COLORS.surface.light,
      text: isDark ? COLORS.text.dark : COLORS.text.light,
      textSecondary: isDark ? COLORS.textSecondary.dark : COLORS.textSecondary.light,
      border: isDark ? COLORS.border.dark : COLORS.border.light,
      success: COLORS.success,
      error: COLORS.error,
      warning: COLORS.warning,
      info: COLORS.info,
    },
    setTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
