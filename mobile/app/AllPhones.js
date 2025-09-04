import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../src/contexts/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../src/constants/config';

export default function AllPhonesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  // Get all phone numbers from route params
  const phones = router.params?.phones || [];
  
  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.phoneItem, { backgroundColor: colors.surface }]}
      onPress={() => handleCall(item)}
    >
      <View style={styles.phoneInfo}>
        <Text style={[styles.phoneNumber, { color: colors.text }]}>{item}</Text>
      </View>
      <View style={[styles.callButton, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name="call" size={20} color={colors.primary} />
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>All Phone Numbers</Text>
        <View style={styles.placeholder} />
      </View>
      
      <FlatList
        data={phones}
        renderItem={renderItem}
        keyExtractor={(item, index) => `phone-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No phone numbers found</Text>
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
  phoneItem: {
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
  phoneInfo: {
    flex: 1,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  callButton: {
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
