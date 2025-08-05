'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation'; 
import i18n from '../../i18n'; // make sure this path is correct

const LocaleContext = createContext();
export const useLocale = () => useContext(LocaleContext);


export default function TranslationProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const languages = ['om', 'am', 'en', 'sw']; // supported languages
  const { locale } = useParams();

  useEffect(() => {
    if (!languages.includes(locale)) {
      notFound();
      return null;
    }

    if (i18n.language !== locale) {
      i18n.changeLanguage(locale).then(() => setIsLoaded(true));
    } else {
      setIsLoaded(true);
    }
  }, [locale]);

  // Avoid rendering until i18n is ready to prevent mismatch
  if (!isLoaded) return null;

  return (
    <LocaleContext.Provider value={ locale }>
      {children}
    </LocaleContext.Provider>
  );
}
