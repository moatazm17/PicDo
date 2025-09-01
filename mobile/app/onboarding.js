import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Animatable from 'react-native-animatable';

import { useTheme } from '../src/contexts/ThemeContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { setOnboardingCompleted } from '../src/utils/storage';
import { GRADIENTS, SPACING, BORDER_RADIUS } from '../src/constants/config';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const router = useRouter();

  const handleGetStarted = async () => {
    try {
      await setOnboardingCompleted(true);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  return (
    <LinearGradient
      colors={GRADIENTS.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        {/* Icon */}
        <Animatable.View 
          animation="fadeInUp" 
          delay={300}
          style={styles.iconContainer}
        >
          <View style={styles.iconBackground}>
            <Ionicons name="camera-outline" size={60} color={colors.primary} />
          </View>
        </Animatable.View>

        {/* Title */}
        <Animatable.Text 
          animation="fadeInUp" 
          delay={500}
          style={[
            styles.title,
            { textAlign: isRTL ? 'right' : 'left' }
          ]}
        >
          {t('onboarding.title')}
        </Animatable.Text>

        {/* Subtitle */}
        <Animatable.Text 
          animation="fadeInUp" 
          delay={700}
          style={[
            styles.subtitle,
            { textAlign: isRTL ? 'right' : 'left' }
          ]}
        >
          {t('onboarding.subtitle')}
        </Animatable.Text>

        {/* Privacy Note */}
        <Animatable.View 
          animation="fadeInUp" 
          delay={900}
          style={styles.privacyContainer}
        >
          <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={[
            styles.privacyText,
            { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }
          ]}>
            {t('onboarding.privacyNote')}
          </Text>
        </Animatable.View>
      </View>

      {/* Get Started Button */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={1100}
        style={styles.buttonContainer}
      >
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>
            {t('onboarding.getStarted')}
          </Text>
          <Ionicons 
            name={isRTL ? "chevron-back" : "chevron-forward"} 
            size={20} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </Animatable.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: height * 0.15,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.xxl,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: SPACING.md,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: SPACING.xxl,
    lineHeight: 26,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xl,
  },
  privacyText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  button: {
    backgroundColor: 'white',
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
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
});
