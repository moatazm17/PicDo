import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../contexts/ThemeContext';
import { SPACING } from '../constants/config';

const { width, height } = Dimensions.get('window');

const UploadModal = ({ visible, onUploadComplete, onUploadError, imageUri }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('preparing'); // preparing, uploading, completed, error
  const [error, setError] = useState(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && imageUri) {
      startUpload();
    }
  }, [visible, imageUri]);

  useEffect(() => {
    if (uploadStatus === 'uploading') {
      // Pulsing animation for upload icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotating animation for progress
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [uploadStatus]);

  const startUpload = async () => {
    try {
      setUploadStatus('preparing');
      setUploadProgress(0);
      setError(null);

      // Simulate preparation phase
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress(20);
      setUploadStatus('uploading');

      // Import API service dynamically to avoid circular imports
      const { default: apiService } = await import('../services/api');
      
      // Start upload with progress tracking
      const response = await apiService.uploadImage(imageUri, true, 'picker');
      
      setUploadProgress(100);
      setUploadStatus('completed');
      
      // Wait a moment to show completion
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Call success callback
      onUploadComplete(response);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      setError(error);
      
      // Wait a moment then call error callback
      setTimeout(() => {
        onUploadError(error);
      }, 1500);
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'preparing':
        return t('upload.preparing');
      case 'uploading':
        return t('upload.uploading');
      case 'completed':
        return t('upload.completed');
      case 'error':
        return t('upload.failed');
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'preparing':
        return 'hourglass-outline';
      case 'uploading':
        return 'cloud-upload-outline';
      case 'completed':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'cloud-upload-outline';
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'preparing':
        return colors.warning;
      case 'uploading':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'error':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <LinearGradient
            colors={[colors.background, colors.surface]}
            style={styles.modal}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('upload.title')}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('upload.subtitle')}
              </Text>
            </View>

            {/* Upload Icon */}
            <View style={styles.iconContainer}>
              <Animated.View
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: getStatusColor() + '20',
                    transform: [
                      { scale: pulseAnim },
                      {
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons
                  name={getStatusIcon()}
                  size={48}
                  color={getStatusColor()}
                />
              </Animated.View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: getStatusColor(),
                      width: `${uploadProgress}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {uploadProgress}%
              </Text>
            </View>

            {/* Status Text */}
            <Animatable.Text
              animation={uploadStatus === 'uploading' ? 'pulse' : undefined}
              iterationCount="infinite"
              style={[styles.statusText, { color: colors.text }]}
            >
              {getStatusText()}
            </Animatable.Text>

            {/* Error Message */}
            {error && (
              <Animatable.View
                animation="fadeIn"
                style={[styles.errorContainer, { backgroundColor: colors.error + '20' }]}
              >
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error.message || t('upload.error')}
                </Text>
              </Animatable.View>
            )}

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                {t('upload.instruction')}
              </Text>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
  },
  modal: {
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  errorText: {
    fontSize: 14,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  instructions: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default UploadModal;
