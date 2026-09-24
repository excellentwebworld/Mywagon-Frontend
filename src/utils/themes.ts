/**
 * themes.ts — MYVAGON Shipper brand (single palette).
 * Visual tokens live in mv-app-tokens.css; this map bridges JS consumers (T.*)
 * and sets legacy --accent / --bg aliases via applyThemeToDOM.
 */

export type ThemeKey = 'amethyst';

export interface ThemeTokens {
  bg: string;
  sf: string;
  sa: string;
  sh: string;
  bd: string;
  bf: string;
  t1: string;
  t2: string;
  t3: string;
  ac: string;
  al: string;
  ah: string;
  ap: string;
  nav: string;
  navT: string;
  navH: string;
  navA: string;
  navAT: string;
  navSec: string;
  navBd: string;
  navHov: string;
  logoC1: string;
  logoC2: string;
  grad1: string;
  grad2: string;
}

export interface ThemeDefinition {
  name: string;
  description: string;
  preview: string[];
  light: ThemeTokens;
  dark: ThemeTokens;
}

/** Brand-aligned Amethyst only (handoff mv-app-tokens). */
export const THEMES: Record<ThemeKey, ThemeDefinition> = {
  amethyst: {
    name: 'Amethyst',
    description: 'MYVAGON Shipper brand',
    preview: ['#1F1F41', '#9B51E0', '#F4F4F5'],
    light: {
      bg: '#F4F4F5',
      sf: '#FFFFFF',
      sa: '#F4F4F5',
      sh: '#FAFAFB',
      bd: '#E6E6E8',
      bf: '#C9C8CD',
      t1: '#000001',
      t2: '#6C6B70',
      t3: '#8B8A8F',
      ac: '#9B51E0',
      al: '#F3EAFC',
      ah: '#4E5CDC',
      ap: '#F3EAFC',
      nav: '#1F1F41',
      navT: 'rgba(255,255,255,0.72)',
      navH: '#FFFFFF',
      navA: 'rgba(155,81,224,0.22)',
      navAT: '#FFFFFF',
      navSec: '#8B8A8F',
      navBd: 'rgba(255,255,255,0.08)',
      navHov: 'rgba(255,255,255,0.06)',
      logoC1: '#8B8A8F',
      logoC2: '#FFFFFF',
      grad1: '#9B51E0',
      grad2: '#4E5CDC',
    },
    dark: {
      bg: '#17172F',
      sf: '#1F1F41',
      sa: '#1A1A38',
      sh: '#26264D',
      bd: '#2E2E58',
      bf: '#3D3D6E',
      t1: '#FFFFFF',
      t2: '#C9C8D6',
      t3: '#A3A2B8',
      ac: '#9B51E0',
      al: 'rgba(155,81,224,0.20)',
      ah: '#4E5CDC',
      ap: 'rgba(155,81,224,0.20)',
      nav: '#121226',
      navT: 'rgba(255,255,255,0.68)',
      navH: '#FFFFFF',
      navA: 'rgba(155,81,224,0.24)',
      navAT: '#FFFFFF',
      navSec: '#7A7994',
      navBd: 'rgba(255,255,255,0.06)',
      navHov: 'rgba(255,255,255,0.05)',
      logoC1: '#8B8A8F',
      logoC2: '#FFFFFF',
      grad1: '#9B51E0',
      grad2: '#4E5CDC',
    },
  },
};

export const STATUS_COLORS = {
  ok: { fg: '#1E7A4A', bg: '#E4F5EC' },
  warn: { fg: '#9A6508', bg: '#FCF1DB' },
  error: { fg: '#E03B4A', bg: '#FBE6E8' },
  info: { fg: '#4E5CDC', bg: '#E8EAFB' },
  pickup: { fg: '#000001', bg: '#FFFFFF' },
  delivery: { fg: '#FFFFFF', bg: '#000001' },
};

export function resolveTheme(_themeKey: string, isDark: boolean): ThemeTokens {
  return isDark ? THEMES.amethyst.dark : THEMES.amethyst.light;
}

/** Apply brand tokens + bridge to shipper CSS variables */
export function applyThemeToDOM(tokens: ThemeTokens) {
  const root = document.documentElement;
  const keys: (keyof ThemeTokens)[] = [
    'bg', 'sf', 'sa', 'sh', 'bd', 'bf', 't1', 't2', 't3', 'ac', 'al', 'ah', 'ap',
  ];
  keys.forEach((k) => {
    root.style.setProperty(`--mv-${k}`, tokens[k]);
    root.style.setProperty(`--${k}`, tokens[k]);
  });
  root.style.setProperty('--se', tokens.sh || tokens.sa);
  root.style.setProperty('--mv-nav', tokens.nav);
  root.style.setProperty('--mv-nav-t', tokens.navT);
  root.style.setProperty('--mv-nav-h', tokens.navH);
  root.style.setProperty('--mv-nav-a', tokens.navA);
  root.style.setProperty('--mv-nav-at', tokens.navAT);
  root.style.setProperty('--mv-nav-sec', tokens.navSec);
  root.style.setProperty('--mv-nav-bd', tokens.navBd);
  root.style.setProperty('--mv-nav-hov', tokens.navHov);
  root.style.setProperty('--mv-logo-c1', tokens.logoC1);
  root.style.setProperty('--mv-logo-c2', tokens.logoC2);
  root.style.setProperty('--mv-grad1', tokens.grad1);
  root.style.setProperty('--mv-grad2', tokens.grad2);

  root.style.setProperty('--accent', tokens.ac);
  root.style.setProperty('--accent-hover', tokens.ah);
  root.style.setProperty('--accent-light', tokens.al);
  root.style.setProperty('--accent-pale', tokens.ap);
  root.style.setProperty('--bg', tokens.bg);
  root.style.setProperty('--surface', tokens.sf);
  root.style.setProperty('--surface-alt', tokens.sa);
  root.style.setProperty('--border', tokens.bd);
  root.style.setProperty('--border-focus', tokens.bf);
  root.style.setProperty('--text-primary', tokens.t1);
  root.style.setProperty('--text-secondary', tokens.t2);
  root.style.setProperty('--text-tertiary', tokens.t3);
  root.style.setProperty('--nav-bg', tokens.nav);
  root.style.setProperty('--nav-text', tokens.navT);
  root.style.setProperty('--nav-text-hover', tokens.navH);
  root.style.setProperty('--nav-active', tokens.navA);
  root.style.setProperty('--nav-active-text', tokens.navAT);
  root.style.setProperty('--nav-section', tokens.navSec);
  root.style.setProperty('--nav-border', tokens.navBd);
  root.style.setProperty('--nav-hover', tokens.navHov);
}
