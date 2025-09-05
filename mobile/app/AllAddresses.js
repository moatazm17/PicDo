import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../src/contexts/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../src/constants/config';

export default function AllAddressesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get all addresses from route params
  const addresses = params.items ? JSON.parse(params.items) : [];
  
  const handleOpenMaps = (address) => {
    try {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
    } catch (error) {
      console.error('Error opening maps:', error);
    }
  };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.addressItem, { backgroundColor: colors.surface }]}
      onPress={() => handleOpenMaps(item)}
    >
      <View style={styles.addressInfo}>
        <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
          {item}
        </Text>
      </View>
      <View style={[styles.mapButton, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="location" size={20} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('result.allAddresses')}
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <FlatList
        data={addresses}
        renderItem={renderItem}
        keyExtractor={(item, index) => `address-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('common.noItems')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: SPACING.medium,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: SPACING.medium,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: SPACING.small,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addressInfo: {
    flex: 1,
    marginRight: SPACING.small,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '500',
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: SPACING.large,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
