import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import './AuthThemeToggle.css';

type AuthThemeToggleProps = {
  className?: string;
};

/** Compact light/dark switch for auth pages (login, register). */
export const AuthThemeToggle: React.FC<AuthThemeToggleProps> = ({ className = '' }) => {
  const { isDark, toggleDark } = useTheme();
  const { t } = useTranslation();

  const label = isDark
    ? t('topbar.lightMode', 'Light mode')
    : t('topbar.darkMode', 'Dark mode');

  return (
    <button
      type="button"
      className={`auth-theme-toggle${className ? ` ${className}` : ''}${isDark ? ' is-dark' : ''}`}
      onClick={toggleDark}
      aria-label={label}
      title={label}
    >
      <span className="auth-theme-toggle-knob" aria-hidden>
        {isDark ? <Moon size={12} strokeWidth={2.25} /> : <Sun size={12} strokeWidth={2.25} />}
      </span>
    </button>
  );
};
