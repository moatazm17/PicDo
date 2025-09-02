import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
// import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';

import i18n from '../src/utils/i18n';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';

// Keep the splash screen visible while we fetch resources
// SplashScreen.preventAutoHideAsync().catch(() => {
//   // Ignore errors in development
//   console.warn('SplashScreen.preventAutoHideAsync failed');
// });

export default function RootLayout() {
  // const [appIsReady, setAppIsReady] = useState(false);

  const router = useRouter();

  // Get current segments to track navigation state
  const segments = useSegments();
  
  useEffect(() => {
    // Check for pending shared images from the share extension
    const checkPendingShare = async () => {
      try {
        const sharedDefaults = await Linking.getInitialURL();
        // Check UserDefaults for pending share (this would need native module)
        // For now, we'll check the shared container directly
        const sharedContainerPath = FileSystem.documentDirectory + '../Library/Application Support/group.com.picdo.app/images/';
        const files = await FileSystem.readDirectoryAsync(sharedContainerPath).catch(() => []);
        
        if (files.length > 0) {
          // Get the most recent file
          const mostRecentFile = files[files.length - 1];
          const filePath = sharedContainerPath + mostRecentFile;
          
          // Navigate to upload with this file
          router.replace({
            pathname: '/upload',
            params: { imageUri: filePath, source: 'share' }
          });
        }
      } catch (error) {
        console.log('No pending shared images');
      }
    };
    
    checkPendingShare();

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
          const isShareAction = parsedUrl.path === 'share' || parsedUrl.hostname === 'share' || parsedUrl.host === 'share';
          if (isShareAction && parsedUrl.queryParams?.uri) {
            let imageUri = parsedUrl.queryParams.uri;
            try { imageUri = decodeURIComponent(imageUri); } catch {}
            console.log('Image URI:', imageUri);
            
            // Copy the shared file to a temporary location if needed
            let finalUri = imageUri;
            // Normalize absolute paths to file:// URIs
            if (imageUri.startsWith('/')) {
              finalUri = `file://${imageUri}`;
            }
            if (finalUri.startsWith('file://')) {
              try {
                const fileName = finalUri.split('/').pop();
                const tempFilePath = FileSystem.cacheDirectory + fileName;
                await FileSystem.copyAsync({
                  from: finalUri,
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
      } else if (url.startsWith('file://')) {
        try {
          // Direct file URL (Copy to PicDo)
          let finalUri = url;
          const fileName = finalUri.split('/').pop();
          const tempFilePath = FileSystem.cacheDirectory + fileName;
          try {
            await FileSystem.copyAsync({ from: finalUri, to: tempFilePath });
            finalUri = tempFilePath;
            console.log('Copied file:// to cache:', finalUri);
          } catch (copyError) {
            console.warn('Copy file:// to cache failed, using original:', copyError);
          }
          router.replace({ pathname: '/upload', params: { imageUri: finalUri, source: 'copyto' } });
        } catch (e) {
          console.error('Error handling file:// URL:', e);
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

    // No splash screen handling

  // Always render the app immediately
  // No appIsReady check

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <LanguageProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
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
