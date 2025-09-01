import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../src/contexts/ThemeContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import apiService from '../src/services/api';
import { executeAction } from '../src/utils/actions';
import { SPACING, BORDER_RADIUS } from '../src/constants/config';

const { width, height } = Dimensions.get('window');

const FieldInput = ({ label, value, onChangeText, keyboardType, multiline, colors, isRTL }) => (
  <View style={styles.fieldContainer}>
    <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
    <TextInput
      style={[
        styles.fieldInput,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          color: colors.text,
          textAlign: isRTL ? 'right' : 'left',
          minHeight: multiline ? 80 : 44,
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
      placeholder={label}
      placeholderTextColor={colors.textSecondary}
    />
  </View>
);

export default function ResultScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (params.jobId) {
      loadJob();
    }
  }, [params.jobId]);

  const loadJob = async () => {
    try {
      setLoading(true);
      const response = await apiService.getJob(params.jobId);
      setJob(response);
      setFields(response.fields || {});
    } catch (error) {
      console.error('Error loading job:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error.message || t('errors.unknownError'),
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setFields(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setJob(prev => ({ ...prev, fields }));
    setEditing(false);
    Toast.show({
      type: 'success',
      text1: t('common.success'),
      text2: t('result.successToast'),
    });
  };

  const handleAction = async () => {
    try {
      setActionLoading(true);
      
      let actionType;
      switch (job.type) {
        case 'event':
          actionType = 'calendar';
          break;
        case 'expense':
          actionType = 'expense';
          break;
        case 'contact':
          actionType = 'contact';
          break;
        case 'address':
          actionType = 'maps';
          break;
        case 'note':
          actionType = 'note';
          break;
        default:
          throw new Error('Unknown action type');
      }

      const result = await executeAction(actionType, fields);
      
      if (result.success) {
        // Mark action as applied on server
        await apiService.markAction(job.jobId, true, actionType);
        
        // Show success feedback
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: 'success',
          text1: t('common.success'),
          text2: t('result.successToast'),
        });
        
        // Navigate back to home
        setTimeout(() => {
          router.push('/(tabs)/home');
        }, 1500);
        
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error executing action:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      let errorMessage = t('errors.unknownError');
      if (error.message.includes('permission')) {
        errorMessage = t('errors.permissionDenied');
      }
      
      Alert.alert(
        t('common.error'),
        errorMessage,
        [{ text: t('common.ok') }]
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'event': return 'calendar';
      case 'expense': return 'card';
      case 'contact': return 'person';
      case 'address': return 'location';
      case 'note': return 'document-text';
      default: return 'document';
    }
  };

  const getActionText = (type) => {
    switch (type) {
      case 'event': return t('result.addToCalendar');
      case 'expense': return t('result.saveAsExpense');
      case 'contact': return t('result.saveContact');
      case 'address': return t('result.openInMaps');
      case 'note': return t('result.saveNote');
      default: return t('common.save');
    }
  };

  const renderFields = () => {
    if (!job || !job.type) return null;

    switch (job.type) {
      case 'event':
        return (
          <>
            <FieldInput
              label={t('fields.title')}
              value={fields.title || ''}
              onChangeText={(value) => handleFieldChange('title', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.date')}
              value={fields.date || ''}
              onChangeText={(value) => handleFieldChange('date', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.time')}
              value={fields.time || ''}
              onChangeText={(value) => handleFieldChange('time', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.location')}
              value={fields.location || ''}
              onChangeText={(value) => handleFieldChange('location', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.url')}
              value={fields.url || ''}
              onChangeText={(value) => handleFieldChange('url', value)}
              keyboardType="url"
              colors={colors}
              isRTL={isRTL}
            />
          </>
        );

      case 'expense':
        return (
          <>
            <FieldInput
              label={t('fields.title')}
              value={fields.title || ''}
              onChangeText={(value) => handleFieldChange('title', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.amount')}
              value={fields.amount?.toString() || ''}
              onChangeText={(value) => handleFieldChange('amount', parseFloat(value) || 0)}
              keyboardType="numeric"
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.currency')}
              value={fields.currency || ''}
              onChangeText={(value) => handleFieldChange('currency', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.merchant')}
              value={fields.merchant || ''}
              onChangeText={(value) => handleFieldChange('merchant', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.date')}
              value={fields.date || ''}
              onChangeText={(value) => handleFieldChange('date', value)}
              colors={colors}
              isRTL={isRTL}
            />
          </>
        );

      case 'contact':
        return (
          <>
            <FieldInput
              label={t('fields.name')}
              value={fields.name || ''}
              onChangeText={(value) => handleFieldChange('name', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.phone')}
              value={fields.phone || ''}
              onChangeText={(value) => handleFieldChange('phone', value)}
              keyboardType="phone-pad"
              colors={colors}
              isRTL={isRTL}
            />
          </>
        );

      case 'address':
        return (
          <>
            <FieldInput
              label={t('fields.title')}
              value={fields.title || ''}
              onChangeText={(value) => handleFieldChange('title', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.address')}
              value={fields.full || ''}
              onChangeText={(value) => handleFieldChange('full', value)}
              multiline
              colors={colors}
              isRTL={isRTL}
            />
          </>
        );
        
      case 'note':
        return (
          <>
            <FieldInput
              label={t('fields.title')}
              value={fields.title || ''}
              onChangeText={(value) => handleFieldChange('title', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.category')}
              value={fields.category || ''}
              onChangeText={(value) => handleFieldChange('category', value)}
              colors={colors}
              isRTL={isRTL}
            />
            <FieldInput
              label={t('fields.content')}
              value={fields.content || ''}
              onChangeText={(value) => handleFieldChange('content', value)}
              multiline
              colors={colors}
              isRTL={isRTL}
            />
          </>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {t('errors.unknownError')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header with thumbnail */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          {job.thumb && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${job.thumb}` }}
              style={styles.headerImage}
              blurRadius={2}
            />
          )}
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              onPress={() => router.back()}
            >
              <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
              onPress={() => setEditing(!editing)}
            >
              <Ionicons name={editing ? "checkmark" : "create"} size={20} color="white" />
              <Text style={styles.editButtonText}>
                {editing ? t('common.save') : t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Type and Title */}
          <View style={styles.titleContainer}>
            <View style={[styles.typeIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={getTypeIcon(job.type)} size={32} color={colors.primary} />
            </View>
            <Text style={[styles.typeText, { color: colors.textSecondary }]}>
              {t(`types.${job.type}`)}
            </Text>
            <Text style={[styles.jobTitle, { color: colors.text }]}>
              {fields.title || job.summary || 'Untitled'}
            </Text>
          </View>

          {/* Fields */}
          <View style={styles.fieldsContainer}>
            {renderFields()}
          </View>

          {/* Auto-extracted note */}
          <View style={styles.noteContainer}>
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              {t('result.autoExtracted')}
            </Text>
          </View>
        </ScrollView>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.primary,
                opacity: actionLoading ? 0.7 : 1,
              },
            ]}
            onPress={editing ? handleSave : handleAction}
            disabled={actionLoading}
            activeOpacity={0.9}
          >
            {actionLoading ? (
              <Text style={styles.actionButtonText}>
                {t('common.loading')}
              </Text>
            ) : (
              <>
                <Ionicons
                  name={editing ? "checkmark" : getTypeIcon(job.type)}
                  size={24}
                  color="white"
                />
                <Text style={styles.actionButtonText}>
                  {editing ? t('common.save') : getActionText(job.type)}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 200,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.md,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  titleContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginTop: -50,
  },
  typeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: width * 0.8,
  },
  fieldsContainer: {
    marginBottom: SPACING.xl,
  },
  fieldContainer: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xl,
  },
  noteText: {
    fontSize: 14,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  actionContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
  },
});
