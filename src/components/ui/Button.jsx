/**
 * Button — Shared button component.
 * Variants: primary, secondary, ghost, danger
 * Sizes: sm, md, lg
 * Used by: All pages
 */
import { useTheme } from '../../hooks/useTheme';

export default function Button({
  children, variant = 'primary', size = 'md', disabled = false,
  onClick, className = '', type = 'button', icon: Icon, ...props
}) {
  const { T } = useTheme();

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1',
    md: 'px-3.5 py-2 text-xs gap-1.5',
    lg: 'px-5 py-2.5 text-sm gap-2',
  };

  const variantStyles = {
    primary: { background: T.ac, color: '#fff', boxShadow: `0 2px 8px ${T.ac}40` },
    secondary: { background: 'transparent', color: T.ac, border: `1px solid ${T.bd}` },
    ghost: { background: 'transparent', color: T.t2 },
    danger: { background: '#EF4444', color: '#fff' },
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-semibold rounded-lg cursor-pointer border-none transition-all duration-150 ${sizeClasses[size]} ${className}`}
      style={{ ...variantStyles[variant], opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}
