import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';

import i18n from '../src/utils/i18n';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize i18n (it's already initialized in the import)
        // await i18n.loadLanguages(['en', 'ar']);
        
        // Artificial delay to show splash screen (remove in production)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <LanguageProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
              <StatusBar style="auto" />
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              />
              <Toast />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </LanguageProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
