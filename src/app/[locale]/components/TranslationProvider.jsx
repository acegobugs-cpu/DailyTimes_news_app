'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import i18n from '../../../i18n'; // make sure this path is correct

const LocaleContext = createContext();
export const useLocale = () => useContext(LocaleContext);

export default function TranslationProvider({ lan, children }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (i18n.language !== lan) {
      i18n.changeLanguage(lan).then(() => setIsLoaded(true));
    } else {
      setIsLoaded(true);
    }
  }, [lan]);

  // Avoid rendering until i18n is ready to prevent mismatch
  if (!isLoaded) return null;

  return (
    <LocaleContext.Provider value={lan}>
      {children}
    </LocaleContext.Provider>
  );
}
