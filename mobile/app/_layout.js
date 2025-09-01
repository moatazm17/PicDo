import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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

  // Get current segments to track navigation state
  const segments = useSegments();
  
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
      console.log('Received URL:', url);
      
      // Handle shared image URLs
      if (url.startsWith('picdo://')) {
        try {
          // Parse the URL
          const parsedUrl = Linking.parse(url);
          console.log('Parsed URL:', parsedUrl);
          
          // Check if it's a share action
          if (parsedUrl.path === 'share' && parsedUrl.queryParams?.uri) {
            const imageUri = parsedUrl.queryParams.uri;
            console.log('Image URI:', imageUri);
            
            // Copy the shared file to a temporary location if needed
            let finalUri = imageUri;
            if (imageUri.startsWith('file://')) {
              try {
                const fileName = imageUri.split('/').pop();
                const tempFilePath = FileSystem.cacheDirectory + fileName;
                await FileSystem.copyAsync({
                  from: imageUri,
                  to: tempFilePath,
                });
                finalUri = tempFilePath;
                console.log('Copied to:', finalUri);
              } catch (copyError) {
                console.error('Error copying file:', copyError);
                // Continue with original URI if copy fails
              }
            }
            
            // Navigate to upload screen with the shared image
            // Use replace instead of push to avoid navigation stack issues
            router.replace({
              pathname: '/upload',
              params: { imageUri: finalUri, source: 'share' }
            });
          } else {
            console.log('Not a recognized share URL format');
          }
        } catch (error) {
          console.error('Error handling shared URL:', error);
        }
      }
    };

    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', handleUrl);

    // Check if app was opened with a URL
    Linking.getInitialURL().then(url => {
      console.log('Initial URL:', url);
      if (url) {
        handleUrl({ url });
      }
    });

    return () => {
      // Clean up subscription
      subscription.remove();
    };
  }, [router]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('Error hiding splash screen:', error);
      }
    }
  }, [appIsReady]);

  // Always render the UI - don't wait for appIsReady
  // The splash screen will handle the loading state

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
