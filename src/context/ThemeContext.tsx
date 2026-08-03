import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { resolveTheme, applyThemeToDOM, type ThemeTokens } from '../utils/themes';

export interface ThemeContextValue {
  theme: string;
  isDark: boolean;
  T: ThemeTokens;
  navMode: string;
  setTheme: (v: string) => void;
  setIsDark: (v: boolean) => void;
  toggleDark: () => void;
  setNavMode: (v: string) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_THEME = 'amethyst';
const STORAGE_KEY_THEME = 'mv_theme';
const STORAGE_KEY_DARK = 'mv_dark';
const STORAGE_KEY_NAV = 'mv_nav_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // PDS-937: theme picker removed — lock brand palette to amethyst (dark/light still apply)
  const [theme, setThemeState] = useState(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, DEFAULT_THEME);
    } catch {
      /* ignore */
    }
    return DEFAULT_THEME;
  });

  const [isDark, setIsDarkState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DARK);
      if (stored !== null) return stored === 'true';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        try {
          if (localStorage.getItem(STORAGE_KEY_DARK) !== null) return;
        } catch {
          /* ignore */
        }
        setIsDarkState(e.matches);
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } catch {
      return undefined;
    }
  }, []);

  const [navMode, setNavModeState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_NAV) || 'sidebar';
    } catch {
      return 'sidebar';
    }
  });

  const T = useMemo(() => resolveTheme(theme, isDark), [theme, isDark]);

  useEffect(() => {
    applyThemeToDOM(T);
    document.documentElement.classList.toggle('dark', isDark);
    document.body.style.background = T.bg;
    document.body.style.color = T.t1;
  }, [T, isDark]);

  const setTheme = useCallback((_v: string) => {
    setThemeState(DEFAULT_THEME);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, DEFAULT_THEME);
    } catch {
      /* ignore */
    }
  }, []);

  const setIsDark = useCallback((v: boolean) => {
    setIsDarkState(v);
    try {
      localStorage.setItem(STORAGE_KEY_DARK, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleDark = useCallback(() => setIsDark(!isDark), [isDark, setIsDark]);

  const setNavMode = useCallback((v: string) => {
    setNavModeState(v);
    try {
      localStorage.setItem(STORAGE_KEY_NAV, v);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      T,
      navMode,
      setTheme,
      setIsDark,
      toggleDark,
      setNavMode,
    }),
    [theme, isDark, T, navMode, setTheme, setIsDark, toggleDark, setNavMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
