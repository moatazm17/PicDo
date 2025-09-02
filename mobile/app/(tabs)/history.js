import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import apiService from '../../src/services/api';
import { SPACING, BORDER_RADIUS } from '../../src/constants/config';

const { width } = Dimensions.get('window');

const FilterTab = ({ title, isActive, onPress, colors }) => (
  <TouchableOpacity
    style={[
      styles.filterTab,
      {
        backgroundColor: isActive ? colors.primary : colors.surface,
        borderColor: colors.border,
      },
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.filterTabText,
        { color: isActive ? 'white' : colors.text },
      ]}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

const HistoryItem = ({ item, onPress, onDelete, onToggleFavorite, onEditTitle, colors, isRTL }) => {
  const [showActions, setShowActions] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(item.summary || item.fields?.title || '');

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleTitleSave = () => {
    if (newTitle.trim() && newTitle !== (item.summary || item.fields?.title)) {
      onEditTitle(item.jobId, newTitle.trim());
    }
    setEditingTitle(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDelete(item.jobId)
        }
      ]
    );
  };

  return (
    <View style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={() => onPress(item)}
        onLongPress={() => setShowActions(!showActions)}
        activeOpacity={0.7}
      >
        {/* Thumbnail or Icon */}
        <View style={[styles.itemIcon, { backgroundColor: colors.primary + '20' }]}>
          {item.thumb ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${item.thumb}` }}
              style={styles.thumbnail}
            />
          ) : (
            <Ionicons name={getTypeIcon(item.type)} size={24} color={colors.primary} />
          )}
        </View>

        {/* Content */}
        <View style={[styles.itemDetails, { marginLeft: SPACING.md }]}>
          {editingTitle ? (
            <TextInput
              style={[styles.titleInput, { color: colors.text, borderColor: colors.primary }]}
              value={newTitle}
              onChangeText={setNewTitle}
              onBlur={handleTitleSave}
              onSubmitEditing={handleTitleSave}
              autoFocus
              multiline
            />
          ) : (
            <Text style={[
              styles.itemTitle, 
              { 
                color: colors.text
              }
            ]} numberOfLines={2}>
              {item.summary || item.fields?.title || 'Untitled'}
            </Text>
          )}
          <Text style={[
            styles.itemSubtitle, 
            { 
              color: colors.textSecondary
            }
          ]} numberOfLines={1}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        {/* Status & Favorite */}
        <View style={styles.itemActions}>
          <TouchableOpacity
            onPress={() => onToggleFavorite(item.jobId, !item.isFavorite)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={item.isFavorite ? "heart" : "heart-outline"} 
              size={20} 
              color={item.isFavorite ? colors.error : colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {item.action.applied ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Action Menu */}
      {showActions && (
        <View style={[styles.actionMenu, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setEditingTitle(true);
              setShowActions(false);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Edit Title</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              onToggleFavorite(item.jobId, !item.isFavorite);
              setShowActions(false);
            }}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={item.isFavorite ? "heart-dislike" : "heart"} 
              size={16} 
              color={colors.warning} 
            />
            <Text style={[styles.actionText, { color: colors.warning }]}>
              {item.isFavorite ? 'Unfavorite' : 'Favorite'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              handleDelete();
              setShowActions(false);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function LibraryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const router = useRouter();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { key: 'all', title: t('history.filterAll') },
    { key: 'favorites', title: t('history.filterFavorites') },
    { key: 'event', title: t('history.filterEvents') },
    { key: 'expense', title: t('history.filterExpenses') },
    { key: 'contact', title: t('history.filterContacts') },
    { key: 'address', title: t('history.filterAddresses') },
    { key: 'note', title: t('history.filterNotes') },
  ];

  useEffect(() => {
    loadHistory();
  }, [activeFilter]);

  // Auto-refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = router.events?.on?.('routeChangeComplete', (url) => {
      if (url.includes('history')) {
        loadHistory();
      }
    });
    
    return () => unsubscribe?.();
  }, []);

  // Listen for new items from navigation state
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing) {
        loadHistory();
      }
    }, 10000); // Auto-refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [loading, refreshing]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      let type = activeFilter === 'all' || activeFilter === 'favorites' ? null : activeFilter;
      const response = await apiService.getHistory(50, null, type);
      
      let items = response.items;
      
      // Filter favorites if needed
      if (activeFilter === 'favorites') {
        items = items.filter(item => item.isFavorite);
      }
      
      setHistory(items);
    } catch (error) {
      console.error('Error loading history:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error.message || t('errors.unknownError'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await apiService.deleteJob(jobId);
      setHistory(prev => prev.filter(item => item.jobId !== jobId));
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('history.itemDeleted'),
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('errors.deleteFailed'),
      });
    }
  };

  const handleToggleFavorite = async (jobId, isFavorite) => {
    try {
      await apiService.toggleFavorite(jobId, isFavorite);
      setHistory(prev => prev.map(item => 
        item.jobId === jobId ? { ...item, isFavorite } : item
      ));
      Toast.show({
        type: 'success',
        text1: isFavorite ? t('history.favoriteAdded') : t('history.favoriteRemoved'),
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('errors.favoriteFailed'),
      });
    }
  };

  const handleEditTitle = async (jobId, newTitle) => {
    try {
      // Update only the summary (library title), not the fields.title (result screen title)
      await apiService.updateJob(jobId, { 
        summary: newTitle 
      });
      setHistory(prev => prev.map(item => 
        item.jobId === jobId ? { 
          ...item, 
          summary: newTitle
          // Keep fields.title unchanged for result screen
        } : item
      ));
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('history.titleUpdated'),
      });
    } catch (error) {
      console.error('Error updating title:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: t('errors.updateFailed'),
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [activeFilter]);

  const handleItemPress = (item) => {
    router.push({
      pathname: '/result',
      params: { jobId: item.jobId }
    });
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={80} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t('history.empty')}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {t('history.emptySubtitle')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('history.title')}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: SPACING.md }}
          renderItem={({ item }) => (
            <FilterTab
              title={item.title}
              isActive={activeFilter === item.key}
              onPress={() => setActiveFilter(item.key)}
              colors={colors}
            />
          )}
        />
      </View>

      {/* History List */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.jobId}
        renderItem={({ item }) => (
          <HistoryItem
            item={item}
            onPress={handleItemPress}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onEditTitle={handleEditTitle}
            colors={colors}
            isRTL={isRTL}
          />
        )}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
      />
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
  filterContainer: {
    marginBottom: SPACING.md,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: 4,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  historyItem: {
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  itemIcon: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
