import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../src/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function CatchAllScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  useEffect(() => {
    console.log('Unmatched route params:', params);
    
    // If this looks like a file path, try to handle it
    const path = params['0'] || '';
    console.log('Path:', path);
    
    if (path.includes('/') && (path.includes('.jpg') || path.includes('.jpeg') || path.includes('.png'))) {
      handlePotentialFilePath(path);
    }
  }, [params]);
  
  const handlePotentialFilePath = async (path) => {
    try {
      // Try to construct a file URI
      const fileUri = `file:///${path}`;
      console.log('Attempting to access:', fileUri);
      
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
        console.log('Copied to temp:', tempFilePath);
        
        // Navigate to upload
        router.replace({
          pathname: '/upload',
          params: { imageUri: tempFilePath, source: 'share' }
        });
      } else {
        console.log('File does not exist');
      }
    } catch (error) {
      console.error('Error handling file path:', error);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Processing Image</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Please wait...</Text>
      <Button 
        title={t('common.goHome')} 
        onPress={() => router.replace('/')} 
        color={colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  }
});
