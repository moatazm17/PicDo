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
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import apiService from '../../src/services/api';
import { SPACING, BORDER_RADIUS } from '../../src/constants/config';

const { width, height } = Dimensions.get('window');

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

const HistoryItem = ({ item, onPress, onDelete, onToggleFavorite, onEditTitle, onViewOriginal, colors, isRTL }) => {
  const [showActions, setShowActions] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(item.summary || '');

  const getTypeIcon = (type) => {
    switch (type) {
      case 'event': return 'calendar';
      case 'expense': return 'card';
      case 'contact': return 'person';
      case 'address': return 'location';
      case 'note': return 'document-text';
      case 'document': return 'document-attach';
      default: return 'document';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleTitleSave = () => {
    if (newTitle.trim() && newTitle !== item.summary) {
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
        <TouchableOpacity 
          style={[styles.itemIcon, { backgroundColor: colors.primary + '20' }]}
          onPress={() => item.thumb && onViewOriginal(item)}
          disabled={!item.thumb}
        >
          {item.thumb ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${item.thumb}` }}
              style={styles.thumbnail}
            />
          ) : (
            <Ionicons name={getTypeIcon(item.type)} size={24} color={colors.primary} />
          )}
        </TouchableOpacity>

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
              {item.summary || item.fields?.title || (i18n.language === 'ar' ? 'بدون عنوان' : 'Untitled')}
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

  const [allHistory, setAllHistory] = useState([]); // Cache all data
  const [displayHistory, setDisplayHistory] = useState([]); // What user sees
  const [history, setHistory] = useState([]); // Legacy compatibility (temporary)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, favorites
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  const filters = [
    { key: 'all', title: t('history.filterAll') },
    { key: 'favorites', title: t('history.filterFavorites') },
    { key: 'event', title: t('history.filterEvents') },
    { key: 'expense', title: t('history.filterExpenses') },
    { key: 'contact', title: t('history.filterContacts') },
    { key: 'address', title: t('history.filterAddresses') },
    { key: 'note', title: t('history.filterNotes') },
    { key: 'document', title: t('history.filterDocuments') },
  ];

  useEffect(() => {
    loadAllHistory(); // Load all data once
  }, []); // Only on mount

  useEffect(() => {
    filterAndDisplayHistory(); // Filter locally when filter/sort/search changes
  }, [allHistory, activeFilter, sortBy, searchQuery]);

  // Auto-refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = router.events?.on?.('routeChangeComplete', (url) => {
      if (url.includes('history')) {
        loadAllHistory();
      }
    });
    
    return () => unsubscribe?.();
  }, []);

  // Refresh when screen gets focus (coming from upload screen)
  useFocusEffect(
    useCallback(() => {
      // Refresh data when user navigates to this screen
      if (allHistory.length > 0) {
        // If we have cached data, do a background refresh
        loadAllHistory();
      }
    }, [])
  );

  // Gentle periodic refresh for new items
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if we have cached data and app is likely active
      if (allHistory.length > 0 && !loading && !refreshing) {
        loadAllHistory();
      }
    }, 20000); // Every 20 seconds (gentle refresh)
    
    return () => clearInterval(interval);
  }, [allHistory.length, loading, refreshing]);

  // Auto-refresh removed to prevent infinite API calls

  const filterAndDisplayHistory = () => {
    let filtered = [...allHistory];
    
    // Apply type filter (instant - no API call)
    if (activeFilter !== 'all') {
      if (activeFilter === 'favorites') {
        filtered = filtered.filter(item => item.isFavorite);
      } else {
        filtered = filtered.filter(item => item.type === activeFilter);
      }
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => {
        const title = (item.summary || '').toLowerCase();
        const content = Object.values(item.fields || {}).join(' ').toLowerCase();
        return title.includes(query) || content.includes(query);
      });
    }
    
    // Apply sorting
    filtered = sortItems(filtered, sortBy);
    
    setDisplayHistory(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearch(false);
    Keyboard.dismiss();
  };

  const sortItems = (items, sortType) => {
    const sorted = [...items];
    
    switch (sortType) {
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'favorites':
        return sorted.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt); // Then by date
        });
      default:
        return sorted;
    }
  };

  const showSortOptions = () => {
    const sortOptions = [
      { key: 'date_desc', title: t('history.sortNewest') },
      { key: 'date_asc', title: t('history.sortOldest') },
      { key: 'favorites', title: t('history.sortFavorites') },
    ];

    Alert.alert(
      t('history.sortBy'),
      '',
      [
        ...sortOptions.map(option => ({
          text: option.title,
          onPress: () => setSortBy(option.key),
          style: sortBy === option.key ? 'default' : 'cancel',
        })),
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  const loadAllHistory = async () => {
    try {
      setLoading(true);
      // Load ALL data without type filter for caching
      const response = await apiService.getHistory(100, null, null); // Increased limit, no type filter
      setAllHistory(response.items);
    } catch (error) {
      console.error('Error loading history:', error);
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error.message || t('errors.networkError'),
        visibilityTime: 4000,
        topOffset: 60,
        onPress: () => {
          Toast.hide();
          loadAllHistory(); // Retry on toast tap
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await apiService.deleteJob(jobId);
      setAllHistory(prev => prev.filter(item => item.jobId !== jobId));
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
        visibilityTime: 4000,
        topOffset: 60,
        onPress: () => {
          Toast.hide();
          handleDelete(jobId); // Retry on toast tap
        },
      });
    }
  };

  const handleToggleFavorite = async (jobId, isFavorite) => {
    try {
      await apiService.toggleFavorite(jobId, isFavorite);
      setAllHistory(prev => prev.map(item => 
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
        visibilityTime: 4000,
        topOffset: 60,
        onPress: () => {
          Toast.hide();
          handleToggleFavorite(jobId, isFavorite); // Retry on toast tap
        },
      });
    }
  };

  const handleEditTitle = async (jobId, newTitle) => {
    try {
      // Update only the summary (library title), not the fields.title (result screen title)
      await apiService.updateJob(jobId, { 
        summary: newTitle 
      });
      setAllHistory(prev => prev.map(item => 
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
        visibilityTime: 4000,
        topOffset: 60,
        onPress: () => {
          Toast.hide();
          handleEditTitle(jobId, newTitle); // Retry on toast tap
        },
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllHistory(); // Refresh all cached data
    setRefreshing(false);
  }, []);

  const handleViewOriginal = (item) => {
    setViewingImage(item);
  };

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
        {showSearch ? (
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { 
                color: colors.text, 
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }]}
              placeholder={t('history.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={clearSearch}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t('history.title')}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowSearch(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="search" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={showSortOptions}
                activeOpacity={0.7}
              >
                <Ionicons name="funnel" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        )}
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
      {loading && allHistory.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('common.loading')}...
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayHistory}
          keyExtractor={(item) => item.jobId}
        renderItem={({ item }) => (
          <HistoryItem
            item={item}
            onPress={handleItemPress}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onEditTitle={handleEditTitle}
            onViewOriginal={handleViewOriginal}
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
      )}

      {/* Image Viewing Modal */}
      <Modal
        visible={!!viewingImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: 'white' }]} numberOfLines={1}>
                {viewingImage?.summary || 'Original Image'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setViewingImage(null)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Full Size Image */}
            <View style={styles.modalImageContainer}>
              {viewingImage?.thumb && (
                <Image
                  source={{ uri: `data:image/jpeg;base64,${viewingImage.thumb}` }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Info */}
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoText}>
                {t('history.originalImage')}
              </Text>
              <Text style={styles.modalInfoSubtext}>
                {new Date(viewingImage?.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 16,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.md,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalImage: {
    width: width - SPACING.xl * 2,
    height: height * 0.7,
  },
  modalInfo: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  modalInfoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  modalInfoSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  loadingText: {
    fontSize: 16,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
});
