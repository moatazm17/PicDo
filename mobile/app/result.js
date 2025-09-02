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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const FieldInput = ({ label, value, onChangeText, keyboardType, multiline, colors, isRTL, editable = true }) => (
  <View style={[styles.fieldContainer, { backgroundColor: colors.surface }]}>
    <Text style={[styles.fieldLabel, { color: colors.primary }]}>{label}</Text>
    <TextInput
      style={[
        styles.fieldInput,
        {
          color: colors.text,
          textAlign: isRTL ? 'right' : 'left',
          minHeight: multiline ? 80 : 44,
          opacity: editable ? 1 : 0.7,
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
      placeholder={editable ? `Enter ${label.toLowerCase()}` : ''}
      placeholderTextColor={colors.textSecondary}
      editable={editable}
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
  const [showFullImage, setShowFullImage] = useState(false);

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

  const handleSave = async () => {
    try {
      // Update the job on the server with new field values
      await apiService.updateJob(job.jobId, { fields });
      
      setJob(prev => ({ ...prev, fields }));
      setEditing(false);
      
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('result.fieldsSaved'),
      });
    } catch (error) {
      console.error('Error saving fields:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('errors.saveFailed'),
      });
    }
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
        await apiService.markAction(job.jobId, true, actionType);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({
          type: 'success',
          text1: t('common.success'),
          text2: t('result.successToast'),
        });
        
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
              editable={editing}
            />
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <FieldInput
                  label={t('fields.date')}
                  value={fields.date || ''}
                  onChangeText={(value) => handleFieldChange('date', value)}
                  colors={colors}
                  isRTL={isRTL}
                />
              </View>
              <View style={styles.fieldHalf}>
                <FieldInput
                  label={t('fields.time')}
                  value={fields.time || ''}
                  onChangeText={(value) => handleFieldChange('time', value)}
                  colors={colors}
                  isRTL={isRTL}
                />
              </View>
            </View>
            <FieldInput
              label={t('fields.location')}
              value={fields.location || ''}
              onChangeText={(value) => handleFieldChange('location', value)}
              colors={colors}
              isRTL={isRTL}
              editable={editing}
            />
          </>
        );

      case 'expense':
        return (
          <>
            <FieldInput
              label={t('fields.merchant')}
              value={fields.merchant || ''}
              onChangeText={(value) => handleFieldChange('merchant', value)}
              colors={colors}
              isRTL={isRTL}
              editable={editing}
            />
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <FieldInput
                  label={t('fields.amount')}
                  value={fields.amount?.toString() || ''}
                  onChangeText={(value) => handleFieldChange('amount', parseFloat(value) || 0)}
                  keyboardType="numeric"
                  colors={colors}
                  isRTL={isRTL}
                />
              </View>
              <View style={styles.fieldHalf}>
                <FieldInput
                  label={t('fields.currency')}
                  value={fields.currency || ''}
                  onChangeText={(value) => handleFieldChange('currency', value)}
                  colors={colors}
                  isRTL={isRTL}
                />
              </View>
            </View>
            <FieldInput
              label={t('fields.date')}
              value={fields.date || ''}
              onChangeText={(value) => handleFieldChange('date', value)}
              colors={colors}
              isRTL={isRTL}
              editable={editing}
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
              editable={editing}
            />
            <FieldInput
              label={t('fields.phone')}
              value={fields.phone || ''}
              onChangeText={(value) => handleFieldChange('phone', value)}
              keyboardType="phone-pad"
              colors={colors}
              isRTL={isRTL}
              editable={editing}
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
              editable={editing}
            />
            <FieldInput
              label={t('fields.address')}
              value={fields.full || ''}
              onChangeText={(value) => handleFieldChange('full', value)}
              multiline
              colors={colors}
              isRTL={isRTL}
              editable={editing}
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
              editable={editing}
            />
            <FieldInput
              label={t('fields.category')}
              value={fields.category || ''}
              onChangeText={(value) => handleFieldChange('category', value)}
              colors={colors}
              isRTL={isRTL}
              editable={editing}
            />
            <FieldInput
              label={t('fields.content')}
              value={fields.content || ''}
              onChangeText={(value) => handleFieldChange('content', value)}
              multiline
              colors={colors}
              isRTL={isRTL}
              editable={editing}
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
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t('errors.jobNotFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Clean Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: colors.surface, 
          borderBottomColor: colors.border
        }
      ]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        
        <Text style={[
          styles.headerTitle, 
          { 
            color: colors.text
          }
        ]} numberOfLines={1}>
          {fields.title || job?.summary || t('result.title')}
        </Text>
        
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setEditing(!editing)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={editing ? "checkmark" : "create"}
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Card */}
          {job.thumb && (
            <View style={[styles.imageCard, { backgroundColor: colors.surface }]}>
                          <TouchableOpacity 
              style={styles.imageContainer}
              onPress={() => setShowFullImage(true)}
              activeOpacity={0.95}
            >
              <Image
                source={{ uri: `data:image/jpeg;base64,${job.thumb}` }}
                style={styles.image}
                resizeMode="contain"
              />
              <View style={styles.imageOverlay}>
                <View style={[styles.expandIcon, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <Ionicons name="expand" size={16} color="white" />
                </View>
              </View>
            </TouchableOpacity>
              
              {/* Type Badge */}
              <View style={[styles.typeBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name={getTypeIcon(job.type)} size={14} color="white" />
                <Text style={styles.typeBadgeText}>{t(`types.${job.type}`)}</Text>
              </View>
            </View>
          )}

          {/* Data Card */}
          <View style={[styles.dataCard, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Information</Text>
              <View style={[styles.editBadge, { backgroundColor: editing ? colors.success + '20' : colors.primary + '20' }]}>
                <Ionicons 
                  name={editing ? "create" : "eye"} 
                  size={14} 
                  color={editing ? colors.success : colors.primary} 
                />
                <Text style={[styles.editBadgeText, { color: editing ? colors.success : colors.primary }]}>
                  {editing ? 'Editing' : 'View Only'}
                </Text>
              </View>
            </View>
            
            <View style={styles.fieldsContainer}>
              {renderFields()}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
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
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.actionGradient}
            >
              {actionLoading ? (
                <Text style={styles.actionText}>{t('common.loading')}</Text>
              ) : (
                <View style={styles.actionContent}>
                  <Ionicons
                    name={editing ? "checkmark-circle" : getTypeIcon(job.type)}
                    size={24}
                    color="white"
                  />
                  <Text style={styles.actionText}>
                    {editing ? t('common.save') : getActionText(job.type)}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
      >
        <View style={styles.fullScreenModal}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowFullImage(false)}
            activeOpacity={0.8}
          >
            <View style={[styles.closeButton, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <Ionicons name="close" size={24} color="white" />
            </View>
          </TouchableOpacity>
          
          <Image
            source={{ uri: `data:image/jpeg;base64,${job.thumb}` }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
          
          <View style={styles.modalInfo}>
            <View style={[styles.modalInfoContainer, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <Text style={styles.modalInfoText}>
                {fields.title || job?.summary || 'Scanned Image'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Layout
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Image Card
  imageCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  imageContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  expandIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Data Card
  dataCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  editBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Fields
  fieldsContainer: {
    gap: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldContainer: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Action Button
  actionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionButton: {
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  actionGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },

  // Full Screen Modal
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width - 40,
    height: height - 200,
  },
  modalInfo: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
  },
  modalInfoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalInfoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});