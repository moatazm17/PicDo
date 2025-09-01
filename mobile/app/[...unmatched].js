import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../src/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { SPACING } from '../src/constants/config';

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
    
    if (path.includes('/') && (path.includes('.jpg') || path.includes('.jpeg') || path.includes('.png') || path.includes('.JPG'))) {
      handlePotentialFilePath(path);
    } else {
      // If not a file path, redirect to home after a short delay
      setTimeout(() => {
        router.replace('/');
      }, 1500);
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
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      }
    } catch (error) {
      console.error('Error handling file path:', error);
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <Animatable.View animation="fadeInDown" style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('upload.processing')}
          </Text>
        </Animatable.View>
        
        <Animatable.View animation="fadeIn" delay={300} style={styles.iconContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </Animatable.View>
        
        <Animatable.View animation="fadeInUp" delay={600} style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[styles.progressIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="cloud-upload" size={24} color="white" />
            </View>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              {t('upload.extractingText')}
            </Text>
          </View>
        </Animatable.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xxl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.xxl,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  progressStep: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  progressIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  progressTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});
