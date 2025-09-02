import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nManager, Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getLanguage, setLanguage as storeLanguage } from '../utils/storage';
import { isRTL } from '../utils/i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    console.warn('useLanguage called outside LanguageProvider, using defaults');
    return {
      currentLanguage: 'en',
      isRTL: false,
      changeLanguage: () => {},
      availableLanguages: [
        { code: 'en', name: 'English' },
        { code: 'ar', name: 'العربية' },
      ],
    };
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isRTLLayout, setIsRTLLayout] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    const rtl = isRTL();
    setIsRTLLayout(rtl);
    
    // Keep interface layout consistent - no RTL flipping
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  }, [currentLanguage]);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await getLanguage();
      setCurrentLanguage(savedLanguage);
      await i18n.changeLanguage(savedLanguage);
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (language) => {
    try {
      const previousLanguage = currentLanguage;
      setCurrentLanguage(language);
      await i18n.changeLanguage(language);
      await storeLanguage(language);
      
      // Show restart prompt if language actually changed
      if (previousLanguage !== language) {
        Alert.alert(
          'Language Changed',
          'Please close and reopen the app to apply all language changes properly.',
          [
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const value = {
    currentLanguage,
    isRTL: isRTLLayout,
    changeLanguage,
    availableLanguages: [
      { code: 'en', name: 'English' },
      { code: 'ar', name: 'العربية' },
    ],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
