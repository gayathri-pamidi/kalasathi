import React, { createContext, useContext, useState, useEffect } from 'react';
import { LANGUAGES, DEFAULT_LANGUAGE } from './languages';

import en from './locales/en.json';
import te from './locales/te.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import mr from './locales/mr.json';
import bn from './locales/bn.json';
import gu from './locales/gu.json';
import pa from './locales/pa.json';
import or from './locales/or.json';

const dictionaries = { en, te, hi, ta, kn, ml, mr, bn, gu, pa, or };

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('app_language') || DEFAULT_LANGUAGE;
  });

  const changeLanguage = (langCode) => {
    if (dictionaries[langCode]) {
      setLanguageState(langCode);
      localStorage.setItem('app_language', langCode);
    }
  };

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  /**
   * Helper function to retrieve nested translation keys
   * e.g. t('dashboard.yourProductCatalog') or t('auth.resendIn', { seconds: 60 })
   */
  const t = (keyPath, params = {}) => {
    if (!keyPath) return '';

    const keys = keyPath.split('.');
    
    // Retrieve value from current language dictionary
    let result = keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined), dictionaries[language]);

    // Fallback to English if missing in selected language
    if (result === undefined && language !== 'en') {
      result = keys.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined), dictionaries.en);
    }

    // Fallback to keyPath if missing in both
    if (result === undefined) {
      return keyPath;
    }

    // Interpolate dynamic parameters like {{name}} or {{seconds}}
    if (typeof result === 'string' && params && typeof params === 'object') {
      Object.keys(params).forEach((paramKey) => {
        const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
        result = result.replace(regex, params[paramKey]);
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: changeLanguage,
        t,
        languages: LANGUAGES
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
