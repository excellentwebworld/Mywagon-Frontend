/**
 * Button — MYVAGON brand variants.
 * gradient: Vagon AI / New Shipment only
 * primary: purple → blue hover
 */
import { useState } from 'react';

const VARIANTS = {
  gradient: {
    background: 'var(--mv-grad-purple-blue)',
    color: 'var(--mv-white)',
    border: 'none',
    boxShadow: 'var(--sh-purple)',
  },
  primary: {
    background: 'var(--mv-purple)',
    color: 'var(--mv-white)',
    border: 'none',
  },
  navy: {
    background: 'var(--mv-navy)',
    color: 'var(--mv-white)',
    border: 'none',
  },
  secondary: {
    background: 'var(--app-surface)',
    color: 'var(--app-text)',
    border: '1px solid var(--app-border-strong)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--app-accent-text)',
    border: 'none',
  },
  danger: {
    background: 'var(--app-surface)',
    color: 'var(--mv-danger)',
    border: '1px solid var(--mv-danger-bg)',
  },
};

const SIZES = {
  sm: { height: 32, padding: '0 12px', fontSize: 13 },
  md: { height: 40, padding: '0 16px', fontSize: 14 },
  lg: { height: 40, padding: '0 20px', fontSize: 14 },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  icon: Icon,
  style,
  ...props
}) {
  const [hover, setHover] = useState(false);
  const base = VARIANTS[variant] || VARIANTS.primary;
  const sz = SIZES[size] || SIZES.md;

  let background = base.background;
  let color = base.color;
  if (!disabled && hover) {
    if (variant === 'primary') background = 'var(--app-primary-hover)';
    if (variant === 'ghost') color = 'var(--app-link-hover)';
  }

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-semibold cursor-pointer transition-all ${className}`}
      style={{
        ...sz,
        ...base,
        background,
        color,
        borderRadius: 'var(--r-button)',
        fontWeight: 600,
        gap: 8,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
        ...style,
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
