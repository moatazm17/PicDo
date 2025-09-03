import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, View, Image } from 'react-native';

import { useTheme } from '../../src/contexts/ThemeContext';

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'home') {
            // Custom PicDo icon for home tab with circle frame
            return (
              <View style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: focused ? colors.primary : colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: focused ? 0 : 1,
                borderColor: colors.border,
              }}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={{
                    width: size * 0.6,
                    height: size * 0.6,
                    tintColor: focused ? 'white' : color,
                  }}
                  resizeMode="contain"
                />
              </View>
            );
          }

          let iconName;
          if (route.name === 'history') {
            iconName = focused ? 'library' : 'library-outline';
          } else if (route.name === 'settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen 
        name="home" 
        options={{
          title: t('navigation.home', 'Home'),
        }}
      />
      <Tabs.Screen 
        name="history" 
        options={{
          title: t('navigation.history', 'History'),
        }}
      />
      <Tabs.Screen 
        name="settings" 
        options={{
          title: t('navigation.settings', 'Settings'),
        }}
      />
    </Tabs>
  );
}
