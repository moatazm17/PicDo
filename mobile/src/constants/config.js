import Constants from 'expo-constants';

// Server configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000'
  : 'https://picdo-production.railway.app'; // Update this with your Railway URL

// Design tokens
export const COLORS = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  secondary: '#EC4899',
  background: {
    light: '#F8FAFC',
    dark: '#0F172A',
  },
  surface: {
    light: '#FFFFFF',
    dark: '#1E293B',
  },
  text: {
    light: '#0F172A',
    dark: '#F8FAFC',
  },
  textSecondary: {
    light: '#64748B',
    dark: '#94A3B8',
  },
  border: {
    light: '#E2E8F0',
    dark: '#334155',
  },
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const GRADIENTS = {
  primary: ['#7C3AED', '#EC4899'],
  background: ['#7C3AED', '#5B21B6'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const MONTHLY_LIMIT = 50;

// Animation durations
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 350,
};
