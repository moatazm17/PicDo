import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';

import i18n from '../src/utils/i18n';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);

  const router = useRouter();

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

    // Set up URL listener for shared content
    const handleUrl = async ({ url }) => {
      if (!url) return;
      
      // Handle shared image URLs
      if (url.startsWith('picdo://') && url.includes('share')) {
        try {
          // Extract the shared image URI
          const imageUri = decodeURIComponent(url.split('share=')[1]);
          
          if (imageUri) {
            // Navigate to upload screen with the shared image
            router.push({
              pathname: '/upload',
              params: { imageUri }
            });
          }
        } catch (error) {
          console.error('Error handling shared URL:', error);
        }
      }
    };

    // Add event listener for deep links
    Linking.addEventListener('url', handleUrl);

    // Check if app was opened with a URL
    Linking.getInitialURL().then(url => {
      if (url) {
        handleUrl({ url });
      }
    });

    return () => {
      // Remove event listener when component unmounts
      // Note: In newer versions of expo-linking, this might not be necessary
      // as the listener is automatically cleaned up
      Linking.removeAllListeners('url');
    };
  }, [router]);

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
