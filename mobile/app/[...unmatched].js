import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';

export default function CatchAllScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    console.log('Unmatched route params:', params);
    
    // Extract the file path from the unmatched segments
    const segments = params.unmatched || [];
    console.log('Segments:', segments);
    
    if (Array.isArray(segments) && segments.length > 0) {
      const path = segments.join('/');
      console.log('Reconstructed path:', path);
      
      if (path.includes('.jpg') || path.includes('.jpeg') || path.includes('.png') || path.includes('.JPG') || path.includes('.PNG')) {
        handleImageFile(path);
        return;
      }
    }
    
    // If not an image file, redirect to home
    router.replace('/');
  }, [params]);
  
  const handleImageFile = async (path) => {
    try {
      // Construct the full file URI
      const fileUri = `file:///${path}`;
      console.log('Processing shared image:', fileUri);
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log('File info:', fileInfo);
      
      if (fileInfo.exists) {
        // Copy to temp location
        const fileName = path.split('/').pop();
        const tempFilePath = FileSystem.cacheDirectory + fileName;
        
        await FileSystem.copyAsync({
          from: fileUri,
          to: tempFilePath
        });
        
        console.log('File copied to:', tempFilePath);
        
        // Navigate directly to the real upload screen
        router.replace({
          pathname: '/upload',
          params: { imageUri: tempFilePath, source: 'share' }
        });
      } else {
        console.log('File does not exist, redirecting to home');
        router.replace('/');
      }
    } catch (error) {
      console.error('Error processing shared image:', error);
      router.replace('/');
    }
  };
  
  // Show a minimal loading screen while processing
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#7C3AED' }}>
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}


