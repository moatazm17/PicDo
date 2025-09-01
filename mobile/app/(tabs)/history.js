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

const HistoryItem = ({ item, onPress, colors, isRTL }) => {
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

  return (
    <TouchableOpacity
      style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
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
        <View style={[styles.itemDetails, { marginLeft: isRTL ? 0 : SPACING.md, marginRight: isRTL ? SPACING.md : 0 }]}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.summary || item.fields?.title || 'Untitled'}
          </Text>
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        {/* Action Status */}
        <View style={styles.itemAction}>
          {item.action.applied ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          )}
        </View>
      </View>
    </TouchableOpacity>
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
    { key: 'event', title: t('history.filterEvents') },
    { key: 'expense', title: t('history.filterExpenses') },
    { key: 'contact', title: t('history.filterContacts') },
    { key: 'address', title: t('history.filterAddresses') },
    { key: 'note', title: t('history.filterNotes') },
  ];

  useEffect(() => {
    loadHistory();
  }, [activeFilter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const type = activeFilter === 'all' ? null : activeFilter;
      const response = await apiService.getHistory(50, null, type);
      setHistory(response.items);
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
  itemAction: {
    marginLeft: SPACING.sm,
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
