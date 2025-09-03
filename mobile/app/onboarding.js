import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
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

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Floating animation for the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle pulse for the button
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 2000);
  }, []);

  const handleGetStarted = async () => {
    try {
      await setOnboardingCompleted(true);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <LinearGradient
      colors={GRADIENTS.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.content}>
        {/* Floating Animated Icon */}
        <Animatable.View 
          animation="fadeInUp" 
          delay={300}
          style={styles.iconContainer}
        >
          <Animated.View
            style={[
              styles.iconBackground,
              {
                transform: [{ translateY: floatTranslate }],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
              style={styles.iconGradient}
            >
              <Ionicons name="scan" size={64} color={colors.primary} />
            </LinearGradient>
          </Animated.View>
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

        {/* Feature Highlights */}
        <Animatable.View 
          animation="fadeInUp" 
          delay={900}
          style={styles.featuresContainer}
        >
          <View style={styles.feature}>
            <Ionicons name="flash" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Instant AI Processing</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Privacy Protected</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="language" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.featureText}>Arabic + English</Text>
          </View>
        </Animatable.View>

        {/* Privacy Note */}
        <Animatable.View 
          animation="fadeInUp" 
          delay={1100}
          style={styles.privacyContainer}
        >
          <Ionicons name="information-circle" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={[
            styles.privacyText,
            { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }
          ]}>
            {t('onboarding.privacyNote')}
          </Text>
        </Animatable.View>
      </View>

      {/* Enhanced Get Started Button */}
      <Animatable.View 
        animation="fadeInUp" 
        delay={1300}
        style={styles.buttonContainer}
      >
        <Animated.View
          style={[
            styles.buttonWrapper,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.95)']}
              style={styles.buttonGradient}
            >
              <Text style={[styles.buttonText, { color: colors.primary }]}>
                {t('onboarding.getStarted')}
              </Text>
              <Ionicons 
                name={isRTL ? "chevron-back" : "chevron-forward"} 
                size={24} 
                color={colors.primary} 
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
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
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
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
  featuresContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
  buttonWrapper: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  button: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: SPACING.sm,
  },
});
