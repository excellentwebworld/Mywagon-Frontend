/**
 * themes.ts — ported from MV_Web_Panel_React
 * Bridges --mv-* tokens to shipper CSS vars (--accent, --bg, etc.)
 */

export type ThemeKey = 'amethyst' | 'ivory' | 'carbon' | 'midnight' | 'slate' | 'crimson';

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

export const THEMES: Record<ThemeKey, ThemeDefinition> = {
  amethyst: {
    name: 'Amethyst',
    description: 'Purple accent',
    preview: ['#18181B', '#9B51E0', '#F5F5F7'],
    light: {
      bg: '#F5F5F7', sf: '#FFFFFF', sa: '#F0F0F3', sh: '#FAFAFC',
      bd: '#E4E4E8', bf: '#C8C8CF',
      t1: '#18181B', t2: '#5E5E6E', t3: '#8E8E9A',
      ac: '#9B51E0', al: '#F3E8FF', ah: '#7C3AED', ap: '#FAF5FF',
      nav: '#18181B', navT: 'rgba(255,255,255,0.55)', navH: 'rgba(255,255,255,0.75)',
      navA: 'rgba(155,81,224,0.24)', navAT: '#FFFFFF', navSec: 'rgba(255,255,255,0.22)',
      navBd: 'rgba(255,255,255,0.08)', navHov: 'rgba(255,255,255,0.06)',
      logoC1: '#8B8A8F', logoC2: '#FEFFFE',
      grad1: '#562C7C', grad2: '#9B51E0',
    },
    dark: {
      bg: '#0C0C14', sf: '#16162A', sa: '#1E1E36', sh: '#1A1A30',
      bd: '#2A2A48', bf: '#3A3A58',
      t1: '#E8E8F0', t2: '#A0A0B8', t3: '#6E6E88',
      ac: '#B07AE8', al: '#2A1F50', ah: '#C490FF', ap: '#1A1235',
      nav: '#0A0A0E', navT: 'rgba(255,255,255,0.45)', navH: 'rgba(255,255,255,0.65)',
      navA: 'rgba(176,122,232,0.22)', navAT: '#FFFFFF', navSec: 'rgba(255,255,255,0.18)',
      navBd: 'rgba(255,255,255,0.06)', navHov: 'rgba(255,255,255,0.05)',
      logoC1: '#8B8A8F', logoC2: '#E8E8F0',
      grad1: '#562C7C', grad2: '#9B51E0',
    },
  },
  ivory: {
    name: 'Ivory',
    description: 'White sidebar',
    preview: ['#FFFFFF', '#562C7C', '#F8F5FF'],
    light: {
      bg: '#F5F3F8', sf: '#FFFFFF', sa: '#EEEAF4', sh: '#F5F0FC',
      bd: '#DDD6E8', bf: '#CCC0DD',
      t1: '#1A1228', t2: '#5A4E6A', t3: '#8A7E9A',
      ac: '#7B3AAE', al: '#F0E0FF', ah: '#562C7C', ap: '#F8F0FF',
      nav: '#FFFFFF', navT: 'rgba(0,0,0,0.48)', navH: 'rgba(0,0,0,0.72)',
      navA: 'rgba(123,58,174,0.10)', navAT: '#562C7C', navSec: 'rgba(0,0,0,0.30)',
      navBd: '#E8E0F0', navHov: 'rgba(0,0,0,0.03)',
      logoC1: '#8B8A8F', logoC2: '#1A1228',
      grad1: '#562C7C', grad2: '#9B51E0',
    },
    dark: {
      bg: '#0E0C18', sf: '#181428', sa: '#221E36', sh: '#1C182A',
      bd: '#302A45', bf: '#403858',
      t1: '#E4DEF0', t2: '#9A90B0', t3: '#6A6080',
      ac: '#B88ADA', al: '#28184A', ah: '#C8A0E8', ap: '#1E1238',
      nav: '#141020', navT: 'rgba(255,255,255,0.45)', navH: 'rgba(255,255,255,0.68)',
      navA: 'rgba(184,138,218,0.22)', navAT: '#FFFFFF', navSec: 'rgba(255,255,255,0.18)',
      navBd: 'rgba(255,255,255,0.06)', navHov: 'rgba(255,255,255,0.04)',
      logoC1: '#8B8A8F', logoC2: '#E4DEF0',
      grad1: '#562C7C', grad2: '#9B51E0',
    },
  },
  carbon: {
    name: 'Carbon',
    description: 'Black & white',
    preview: ['#FFFFFF', '#18181B', '#F5F5F5'],
    light: {
      bg: '#F5F5F5', sf: '#FFFFFF', sa: '#EEEEEE', sh: '#FAFAFA',
      bd: '#E0E0E0', bf: '#BDBDBD',
      t1: '#18181B', t2: '#525252', t3: '#8C8C8C',
      ac: '#18181B', al: '#F0F0F0', ah: '#000000', ap: '#F7F7F7',
      nav: '#FFFFFF', navT: 'rgba(0,0,0,0.52)', navH: 'rgba(0,0,0,0.78)',
      navA: 'rgba(0,0,0,0.08)', navAT: '#18181B', navSec: 'rgba(0,0,0,0.32)',
      navBd: '#E5E5E5', navHov: 'rgba(0,0,0,0.04)',
      logoC1: '#8C8C8C', logoC2: '#18181B',
      grad1: '#333333', grad2: '#18181B',
    },
    dark: {
      bg: '#0A0A0A', sf: '#171717', sa: '#1F1F1F', sh: '#1A1A1A',
      bd: '#2E2E2E', bf: '#404040',
      t1: '#EEEEEE', t2: '#A0A0A0', t3: '#6B6B6B',
      ac: '#FFFFFF', al: '#252525', ah: '#E0E0E0', ap: '#1A1A1A',
      nav: '#0F0F0F', navT: 'rgba(255,255,255,0.50)', navH: 'rgba(255,255,255,0.75)',
      navA: 'rgba(255,255,255,0.10)', navAT: '#FFFFFF', navSec: 'rgba(255,255,255,0.22)',
      navBd: 'rgba(255,255,255,0.08)', navHov: 'rgba(255,255,255,0.05)',
      logoC1: '#6B6B6B', logoC2: '#EEEEEE',
      grad1: '#444444', grad2: '#FFFFFF',
    },
  },
  midnight: {
    name: 'Midnight',
    description: 'Blue accent',
    preview: ['#121217', '#4E8EF7', '#F0F4F8'],
    light: {
      bg: '#F0F4F8', sf: '#FFFFFF', sa: '#E8ECF4', sh: '#F5F7FA',
      bd: '#D5DBE8', bf: '#B8C0D0',
      t1: '#1A1D2E', t2: '#4A5068', t3: '#7E8598',
      ac: '#4E8EF7', al: '#EBF2FF', ah: '#3A6FD8', ap: '#F2F6FF',
      nav: '#121217', navT: 'rgba(255,255,255,0.50)', navH: 'rgba(255,255,255,0.70)',
      navA: 'rgba(78,142,247,0.22)', navAT: '#FFFFFF', navSec: 'rgba(255,255,255,0.20)',
      navBd: 'rgba(255,255,255,0.08)', navHov: 'rgba(255,255,255,0.06)',
      logoC1: '#8B8A8F', logoC2: '#FEFFFE',
      grad1: '#1A3A6C', grad2: '#4E8EF7',
    },
    dark: {
      bg: '#0A0C14', sf: '#141828', sa: '#1C2038', sh: '#181C30',
      bd: '#282E48', bf: '#384058',
      t1: '#E0E4EC', t2: '#8E95A8', t3: '#5C6478',
      ac: '#6B9AFF', al: '#1A2248', ah: '#8EB0FF', ap: '#141835',
      nav: '#08080E', navT: 'rgba(255,255,255,0.42)', navH: 'rgba(255,255,255,0.62)',
      navA: 'rgba(107,154,255,0.20)', navAT: '#FFFFFF', navSec: 'rgba(255,255,255,0.16)',
      navBd: 'rgba(255,255,255,0.06)', navHov: 'rgba(255,255,255,0.04)',
      logoC1: '#8B8A8F', logoC2: '#E0E4EC',
      grad1: '#1A3A6C', grad2: '#4E8EF7',
    },
  },
  slate: {
    name: 'Slate',
    description: 'White & blue',
    preview: ['#FFFFFF', '#4E8EF7', '#F0F4F8'],
    light: {
      bg: '#F0F4F8', sf: '#FFFFFF', sa: '#E8ECF4', sh: '#F5F7FA',
      bd: '#D5DBE8', bf: '#B8C0D0',
      t1: '#1A1D2E', t2: '#4A5068', t3: '#7E8598',
      ac: '#4E8EF7', al: '#EBF2FF', ah: '#3A6FD8', ap: '#F2F6FF',
      nav: '#FFFFFF', navT: 'rgba(0,0,0,0.48)', navH: 'rgba(0,0,0,0.72)',
      navA: 'rgba(78,142,247,0.10)', navAT: '#3A6FD8', navSec: 'rgba(0,0,0,0.30)',
      navBd: '#D5DBE8', navHov: 'rgba(0,0,0,0.03)',
      logoC1: '#8B8A8F', logoC2: '#1A1D2E',
      grad1: '#1A3A6C', grad2: '#4E8EF7',
    },
    dark: {
      bg: '#0A0C14', sf: '#141828', sa: '#1C2038', sh: '#181C30',
      bd: '#282E48', bf: '#384058',
      t1: '#E0E4EC', t2: '#8E95A8', t3: '#5C6478',
      ac: '#6B9AFF', al: '#1A2248', ah: '#8EB0FF', ap: '#141835',
      nav: '#0E1020', navT: 'rgba(255,255,255,0.45)', navH: 'rgba(255,255,255,0.68)',
      navA: 'rgba(107,154,255,0.22)', navAT: '#FFFFFF', navSec: 'rgba(255,255,255,0.18)',
      navBd: 'rgba(255,255,255,0.06)', navHov: 'rgba(255,255,255,0.04)',
      logoC1: '#8B8A8F', logoC2: '#E0E4EC',
      grad1: '#1A3A6C', grad2: '#4E8EF7',
    },
  },
  crimson: {
    name: 'Crimson',
    description: 'White & red',
    preview: ['#FFFFFF', '#DC2626', '#FBF5F5'],
    light: {
      bg: '#FBF5F5', sf: '#FFFFFF', sa: '#F5EDED', sh: '#FAF0F0',
      bd: '#EBDCDC', bf: '#D8C4C4',
      t1: '#1A1014', t2: '#5A4040', t3: '#8E7070',
      ac: '#DC2626', al: '#FEF2F2', ah: '#B91C1C', ap: '#FFF5F5',
      nav: '#FFFFFF', navT: 'rgba(0,0,0,0.48)', navH: 'rgba(0,0,0,0.72)',
      navA: 'rgba(220,38,38,0.10)', navAT: '#B91C1C', navSec: 'rgba(0,0,0,0.30)',
      navBd: '#EBDCDC', navHov: 'rgba(0,0,0,0.03)',
      logoC1: '#8E7070', logoC2: '#1A1014',
      grad1: '#991B1B', grad2: '#DC2626',
    },
    dark: {
      bg: '#0C0808', sf: '#1A1212', sa: '#241A1A', sh: '#1E1414',
      bd: '#3A2828', bf: '#504040',
      t1: '#F0E4E4', t2: '#B09090', t3: '#7A5E5E',
      ac: '#F87171', al: '#3A1818', ah: '#FCA5A5', ap: '#2A1010',
      nav: '#100A0A', navT: 'rgba(255,255,255,0.48)', navH: 'rgba(255,255,255,0.68)',
      navA: 'rgba(248,113,113,0.22)', navAT: '#FFFFFF', navSec: 'rgba(255,255,255,0.18)',
      navBd: 'rgba(255,255,255,0.06)', navHov: 'rgba(255,255,255,0.05)',
      logoC1: '#8B8A8F', logoC2: '#F0E4E4',
      grad1: '#991B1B', grad2: '#DC2626',
    },
  },
};

export const STATUS_COLORS = {
  ok: { fg: '#10B981', bg: '#ECFDF5' },
  warn: { fg: '#F59E0B', bg: '#FFFBEB' },
  error: { fg: '#EF4444', bg: '#FEF2F2' },
  info: { fg: '#0EA5E9', bg: '#F0F9FF' },
  pickup: { fg: '#2563EB', bg: '#EFF6FF' },
  delivery: { fg: '#7C3AED', bg: '#F3F0FF' },
};

export function resolveTheme(themeKey: string, isDark: boolean): ThemeTokens {
  const theme = THEMES[themeKey as ThemeKey] || THEMES.amethyst;
  return (isDark ? theme.dark : theme.light) || THEMES.amethyst.light;
}

/** Apply MV tokens + bridge to shipper design-system CSS variables */
export function applyThemeToDOM(tokens: ThemeTokens) {
  const root = document.documentElement;
  const keys: (keyof ThemeTokens)[] = [
    'bg', 'sf', 'sa', 'sh', 'bd', 'bf', 't1', 't2', 't3', 'ac', 'al', 'ah', 'ap',
  ];
  keys.forEach((k) => root.style.setProperty(`--mv-${k}`, tokens[k]));
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

  // Bridge → shipper globals.css tokens (existing modules)
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
