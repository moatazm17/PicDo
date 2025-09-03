import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  BackHandler,
  Alert,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../src/contexts/ThemeContext';
import apiService, { APIError } from '../src/services/api';
import { SPACING, ANIMATION } from '../src/constants/config';

const { width } = Dimensions.get('window');

const AnimatedProgressStep = ({ icon, title, isActive, isCompleted, colors, index }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isActive) {
      // Pulsing animation for active step
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

      // Gentle rotation for active step
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Scale up when becoming active
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else if (isCompleted) {
      // Scale up when completed
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animations for inactive steps
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      Animated.spring(scaleAnim, {
        toValue: 0.8,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, isCompleted]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animatable.View
      animation="fadeInUp"
      delay={index * 150}
      style={styles.progressStep}
    >
      <Animated.View
        style={[
          styles.progressIconContainer,
          {
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={
            isCompleted
              ? [colors.success, colors.success + 'DD']
              : isActive
              ? [colors.primary, colors.primary + 'DD']
              : [colors.border, colors.border]
          }
          style={styles.progressIcon}
        >
          <Animated.View
            style={{
              transform: isActive ? [{ rotate: rotateInterpolate }] : [],
            }}
          >
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : isActive ? 'sync' : icon}
              size={28}
              color={isCompleted || isActive ? 'white' : colors.textSecondary}
            />
          </Animated.View>
        </LinearGradient>
      </Animated.View>
      
      <Text
        style={[
          styles.progressTitle,
          {
            color: isCompleted || isActive ? colors.text : colors.textSecondary,
            fontWeight: isCompleted || isActive ? '700' : '500',
          },
        ]}
      >
        {title}
      </Text>
      
      {isActive && (
        <Animatable.View animation="fadeIn" delay={500}>
          <View style={[styles.activeIndicator, { backgroundColor: colors.primary + '30' }]}>
            <Text style={[styles.activeText, { color: colors.primary }]}>
              Processing...
            </Text>
          </View>
        </Animatable.View>
      )}
    </Animatable.View>
  );
};

export default function UploadScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const steps = [
    { icon: 'cloud-upload', title: t('upload.extractingText') },
    { icon: 'analytics', title: t('upload.analyzingContent') },
    { icon: 'checkmark-circle', title: t('upload.almostDone') },
  ];

  const maxPollAttempts = 20;
  const pollInterval = 2500;

  useEffect(() => {
    if (params.imageUri) {
      uploadImage();
    }

    // Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (jobId && pollCount < maxPollAttempts) {
      const timer = setTimeout(() => {
        pollJobStatus();
      }, pollInterval);

      return () => clearTimeout(timer);
    } else if (pollCount >= maxPollAttempts) {
      handleTimeout();
    }
  }, [jobId, pollCount]);

  const handleBackPress = () => {
    Alert.alert(
      t('common.warning'),
      t('upload.backgroundNote'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.continue'), onPress: () => router.back() },
      ]
    );
    return true;
  };

  const uploadImage = async () => {
    try {
      setCurrentStep(0);
      const response = await apiService.uploadImage(
        params.imageUri,
        true,
        params.source || 'picker'
      );
      setJobId(response.jobId);
    } catch (error) {
      handleError(error);
    }
  };

  const pollJobStatus = async () => {
    try {
      const response = await apiService.getJob(jobId);
      
      if (response.status === 'ready') {
        // Success - navigate to result
        router.replace({
          pathname: '/result',
          params: { jobId: response.jobId }
        });
        return;
      }

      if (response.status === 'failed') {
        // Create proper APIError with code for better error handling
        const errorCode = response.error?.code || 'processing_failed';
        const errorMessage = response.error?.message || 'Processing failed';
        const apiError = new APIError(errorCode, errorMessage);
        handleError(apiError);
        return;
      }

      // Update progress based on status
      switch (response.status) {
        case 'ocr_in_progress':
          setCurrentStep(0);
          break;
        case 'ocr_done':
        case 'ai_in_progress':
          setCurrentStep(1);
          break;
        default:
          setCurrentStep(2);
      }

      setPollCount(prev => prev + 1);
    } catch (error) {
      handleError(error);
    }
  };

  const handleTimeout = () => {
    setError(t('upload.backgroundNote'));
    setTimeout(() => {
      router.back();
    }, 3000);
  };

  const handleError = (error) => {
    console.error('Upload/Processing error:', error);
    
    let errorMessage = t('errors.unknownError');
    let isRetryable = true;
    
    if (error instanceof APIError) {
      switch (error.code) {
        case 'limit_reached':
          errorMessage = error.message;
          isRetryable = false;
          break;
        case 'processing_failed':
          errorMessage = t('errors.processingFailed');
          break;
        case 'network_error':
          errorMessage = t('errors.networkError');
          break;
        case 'no_text_detected':
          errorMessage = t('errors.noTextDetected');
          isRetryable = false;
          break;
        case 'invalid_image':
          errorMessage = t('errors.invalidImage');
          isRetryable = false;
          break;
        case 'inappropriate_content':
          errorMessage = t('errors.inappropriateContent');
          isRetryable = false;
          break;
        case 'maintenance_mode':
          errorMessage = t('errors.maintenanceMode');
          isRetryable = true; // Users can retry after maintenance
          break;
        default:
          errorMessage = error.message || t('errors.uploadFailed');
      }
    } else if (error.message && error.message.includes('No text detected')) {
      errorMessage = t('errors.noTextDetected');
      isRetryable = false;
    } else if (error.message && error.message.includes('Content not suitable for processing')) {
      errorMessage = t('errors.inappropriateContent');
      isRetryable = false;
    }

    setError({ message: errorMessage, isRetryable });
  };

  const handleRetry = () => {
    setError(null);
    setJobId(null);
    setPollCount(0);
    setCurrentStep(0);
    uploadImage();
  };

  if (error) {
    const getErrorIcon = () => {
      if (error.message.includes('No text detected') || error.message.includes('noTextDetected')) {
        return 'document-text-outline';
      }
      if (error.message.includes('network') || error.message.includes('Network')) {
        return 'wifi-outline';
      }
      if (error.message.includes('limit') || error.message.includes('Limit')) {
        return 'warning-outline';
      }
      if (error.message.includes('cannot be processed') || error.message.includes('inappropriate')) {
        return 'shield-outline';
      }
      return 'alert-circle';
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Animatable.View animation="bounceIn" style={styles.errorContent}>
            <Ionicons name={getErrorIcon()} size={80} color={colors.error} />
            <Text style={[styles.errorTitle, { color: colors.error }]}>
              {error.message.includes('No text detected') ? t('errors.noTextTitle') : t('common.error')}
            </Text>
            <Text style={[styles.errorMessage, { color: colors.text }]}>
              {error.message}
            </Text>
            
            {/* Action Buttons */}
            <View style={styles.errorActions}>
              {error.isRetryable && (
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={handleRetry}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color="white" />
                  <Text style={styles.retryButtonText}>
                    {t('common.retry')}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.backButton, { borderColor: colors.border }]}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={[styles.backButtonText, { color: colors.text }]}>
                  {t('common.back')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <Animatable.View animation="fadeInDown" style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('upload.processing')}
          </Text>
        </Animatable.View>

        {/* Animated Progress Steps */}
        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <AnimatedProgressStep
              key={index}
              icon={step.icon}
              title={step.title}
              isActive={index === currentStep}
              isCompleted={index < currentStep}
              colors={colors}
              index={index}
            />
          ))}
        </View>

        {/* Progress Bar */}
        <Animatable.View animation="fadeInUp" delay={800} style={styles.progressBarContainer}>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
            <Animatable.View
              animation="slideInLeft"
              duration={1000}
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.primary,
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressPercentage, { color: colors.primary }]}>
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </Text>
        </Animatable.View>

        {/* Background Note */}
        <Animatable.View
          animation="fadeInUp"
          delay={1000}
          style={styles.noteContainer}
        >
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            {t('upload.backgroundNote')}
          </Text>
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
    marginBottom: SPACING.xxl * 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  progressStep: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    minHeight: 120,
  },
  progressIconContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  progressIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    fontWeight: '600',
    maxWidth: width * 0.7,
  },
  activeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    width: '100%',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    maxWidth: width * 0.8,
  },
  noteText: {
    fontSize: 14,
    marginLeft: SPACING.sm,
    flex: 1,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorContent: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
