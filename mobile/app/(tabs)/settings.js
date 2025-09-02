import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { SPACING, BORDER_RADIUS } from '../../src/constants/config';

const SettingItem = ({ icon, title, value, onPress, colors, isRTL, showChevron = true }) => (
  <TouchableOpacity
    style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.settingContent}>
      <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={[styles.settingText, { marginLeft: SPACING.md }]}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {value && (
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>
        )}
      </View>
      {showChevron && (
        <Ionicons 
          name="chevron-forward"
          size={20} 
          color={colors.textSecondary} 
        />
      )}
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, mode, setTheme } = useTheme();
  const { currentLanguage, changeLanguage, availableLanguages, isRTL } = useLanguage();

  const handleLanguageChange = () => {
    Alert.alert(
      t('settings.language'),
      '',
      availableLanguages.map(lang => ({
        text: lang.name,
        onPress: () => changeLanguage(lang.code),
        style: currentLanguage === lang.code ? 'default' : 'cancel',
      }))
    );
  };

  const handleThemeChange = () => {
    const themes = [
      { key: 'auto', name: t('settings.themeAuto') },
      { key: 'light', name: t('settings.themeLight') },
      { key: 'dark', name: t('settings.themeDark') },
    ];

    Alert.alert(
      t('settings.theme'),
      '',
      themes.map(theme => ({
        text: theme.name,
        onPress: () => setTheme(theme.key),
        style: mode === theme.key ? 'default' : 'cancel',
      }))
    );
  };

  const handleHelp = () => {
    Alert.alert(
      t('settings.help'),
      'For support, please contact us at support@picdo.app',
      [{ text: t('common.ok') }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      t('settings.privacy'),
      'We only process the text extracted from your images. No images are stored on our servers.',
      [{ text: t('common.ok') }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      t('settings.about'),
      'PicDo v1.0.0\n\nTurn any screenshot into actionable items with AI.',
      [{ text: t('common.ok') }]
    );
  };

  const getCurrentLanguageName = () => {
    const lang = availableLanguages.find(l => l.code === currentLanguage);
    return lang ? lang.name : currentLanguage;
  };

  const getCurrentThemeName = () => {
    switch (mode) {
      case 'auto': return t('settings.themeAuto');
      case 'light': return t('settings.themeLight');
      case 'dark': return t('settings.themeDark');
      default: return mode;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <SettingItem
            icon="language"
            title={t('settings.language')}
            value={getCurrentLanguageName()}
            onPress={handleLanguageChange}
            colors={colors}
            isRTL={isRTL}
          />
          <SettingItem
            icon="color-palette"
            title={t('settings.theme')}
            value={getCurrentThemeName()}
            onPress={handleThemeChange}
            colors={colors}
            isRTL={isRTL}
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <SettingItem
            icon="help-circle"
            title={t('settings.help')}
            onPress={handleHelp}
            colors={colors}
            isRTL={isRTL}
          />
          <SettingItem
            icon="shield-checkmark"
            title={t('settings.privacy')}
            onPress={handlePrivacy}
            colors={colors}
            isRTL={isRTL}
          />
          <SettingItem
            icon="information-circle"
            title={t('settings.about')}
            onPress={handleAbout}
            colors={colors}
            isRTL={isRTL}
          />
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            {t('settings.version')} 1.0.0
          </Text>
        </View>
      </ScrollView>
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
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  settingItem: {
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
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
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  versionText: {
    fontSize: 14,
  },
});
