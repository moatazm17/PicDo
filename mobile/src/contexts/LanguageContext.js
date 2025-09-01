import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getLanguage, setLanguage as storeLanguage } from '../utils/storage';
import { isRTL } from '../utils/i18n';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
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
    
    // Force RTL layout if needed
    if (I18nManager.isRTL !== rtl) {
      I18nManager.forceRTL(rtl);
      // Note: In a real app, you might want to restart the app here
      // for the RTL change to take full effect
    }
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
      setCurrentLanguage(language);
      await i18n.changeLanguage(language);
      await storeLanguage(language);
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
