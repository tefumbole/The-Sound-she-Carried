import { createContext, useContext, useMemo, useState } from 'react';
import { STRINGS } from './strings';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('tssc_lang') || 'en');

  const value = useMemo(() => {
    const next = lang === 'fr' ? 'en' : 'fr';
    function toggle() {
      const v = lang === 'fr' ? 'en' : 'fr';
      localStorage.setItem('tssc_lang', v);
      setLang(v);
    }
    function set(v) {
      const code = v === 'fr' ? 'fr' : 'en';
      localStorage.setItem('tssc_lang', code);
      setLang(code);
    }
    return { lang, t: STRINGS[lang] || STRINGS.en, toggle, set, next };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

export function LangSwitch() {
  const { lang, set, t } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label={t.switch}>
      <button type="button" className={lang === 'en' ? 'is-on' : ''} onClick={() => set('en')}>EN</button>
      <button type="button" className={lang === 'fr' ? 'is-on' : ''} onClick={() => set('fr')}>FR</button>
    </div>
  );
}
