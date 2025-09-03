import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { requestMediaLibraryPermission, requestCameraPermission } from '../../src/utils/permissions';
import { SPACING, BORDER_RADIUS } from '../../src/constants/config';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const router = useRouter();

  const handlePickImage = async () => {
    try {
      // Check permission
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) {
        Alert.alert(
          t('common.error'),
          t('errors.permissionDenied'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6, // Reduced from 0.8 for faster uploads
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        router.push({
          pathname: '/upload',
          params: { imageUri, source: 'picker' }
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('errors.unknownError'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.retry'), onPress: handlePickImage },
        ]
      );
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Check camera permission
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          t('common.error'),
          t('errors.cameraPermissionDenied'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6, // Reduced from 0.8 for faster uploads
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        router.push({
          pathname: '/upload',
          params: { imageUri, source: 'picker' }
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(
        t('common.error'),
        error.message || t('errors.unknownError'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.retry'), onPress: handleTakePhoto },
        ]
      );
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      t('home.selectSource'),
      t('home.selectSourceMessage'),
      [
        {
          text: t('home.takePhoto'),
          onPress: handleTakePhoto,
        },
        {
          text: t('home.pickFromGallery'),
          onPress: handlePickImage,
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          PicDo
        </Text>
      </View>

      {/* Empty State */}
      <View style={styles.content}>
        <Animatable.View 
          animation="fadeInUp" 
          delay={300}
          style={styles.emptyState}
        >
          {/* Illustration */}
          <View style={[styles.illustrationContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="image-outline" size={80} color={colors.textSecondary} />
          </View>

          {/* Title */}
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('home.emptyTitle')}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t('home.emptySubtitle')}
          </Text>
        </Animatable.View>
      </View>

      {/* Action Buttons */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={600}
        style={styles.actionContainer}
      >
        {/* Primary Action - Camera */}
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleTakePhoto}
          activeOpacity={0.9}
        >
          <Ionicons name="camera" size={24} color="white" />
          <Text style={styles.actionButtonText}>
            {t('home.takePhoto')}
          </Text>
        </TouchableOpacity>

        {/* Secondary Action - Gallery */}
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, { 
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }]}
          onPress={handlePickImage}
          activeOpacity={0.9}
        >
          <Ionicons name="images" size={24} color={colors.primary} />
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>
            {t('home.pickFromGallery')}
          </Text>
        </TouchableOpacity>

        {/* Hint */}
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('home.shareHint')}
        </Text>
      </Animatable.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyState: {
    alignItems: 'center',
    maxWidth: width * 0.8,
  },
  illustrationContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    minWidth: width * 0.6,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    // Primary button styling - already has backgroundColor from colors.primary
  },
  secondaryButton: {
    borderWidth: 2,
    shadowOpacity: 0.1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    lineHeight: 20,
  },
});
