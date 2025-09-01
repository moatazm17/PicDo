import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useTheme } from '../src/contexts/ThemeContext';
import apiService, { APIError } from '../src/services/api';
import { SPACING, ANIMATION } from '../src/constants/config';

const { width } = Dimensions.get('window');

const ProgressStep = ({ icon, title, isActive, isCompleted, colors }) => (
  <View style={styles.progressStep}>
    <View
      style={[
        styles.progressIcon,
        {
          backgroundColor: isCompleted
            ? colors.success
            : isActive
            ? colors.primary
            : colors.border,
        },
      ]}
    >
      <Ionicons
        name={isCompleted ? 'checkmark' : icon}
        size={24}
        color={isCompleted || isActive ? 'white' : colors.textSecondary}
      />
    </View>
    <Text
      style={[
        styles.progressTitle,
        {
          color: isCompleted || isActive ? colors.text : colors.textSecondary,
          fontWeight: isCompleted || isActive ? '600' : '400',
        },
      ]}
    >
      {title}
    </Text>
  </View>
);

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
        handleError(new Error(response.error?.message || 'Processing failed'));
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
    
    if (error instanceof APIError) {
      switch (error.code) {
        case 'limit_reached':
          errorMessage = error.message;
          break;
        case 'processing_failed':
          errorMessage = t('errors.processingFailed');
          break;
        case 'network_error':
          errorMessage = t('errors.networkError');
          break;
        default:
          errorMessage = error.message || t('errors.uploadFailed');
      }
    }

    setError(errorMessage);
    
    Toast.show({
      type: 'error',
      text1: t('common.error'),
      text2: errorMessage,
      onHide: () => router.back(),
    });
  };

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={80} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            {t('common.error')}
          </Text>
          <Text style={[styles.errorMessage, { color: colors.text }]}>
            {error}
          </Text>
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

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <Animatable.View
              key={index}
              animation={index <= currentStep ? 'fadeInUp' : 'fadeIn'}
              delay={index * 200}
            >
              <ProgressStep
                icon={step.icon}
                title={step.title}
                isActive={index === currentStep}
                isCompleted={index < currentStep}
                colors={colors}
              />
            </Animatable.View>
          ))}
        </View>

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
    minHeight: 80,
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
    maxWidth: width * 0.7,
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
  },
});
