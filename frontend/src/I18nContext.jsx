import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { LANG_KEY, getStoredLang, t as translate } from './i18n';

const I18nContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => getStoredLang());

  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === 'my' ? 'my' : 'en';
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: (next) => setLangState(next === 'my' ? 'my' : 'en'),
      t: (key) => translate(lang, key),
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
