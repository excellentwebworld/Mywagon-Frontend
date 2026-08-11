import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

interface SupportCollapsibleSectionProps {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  badge?: string;
  collapsed: boolean;
  onToggle: () => void;
  sectionRef?: (node: HTMLElement | null) => void;
  children: React.ReactNode;
}

export function SupportCollapsibleSection({
  id,
  icon,
  iconBg,
  title,
  badge,
  collapsed,
  onToggle,
  sectionRef,
  children,
}: SupportCollapsibleSectionProps) {
  const { T } = useTheme();

  return (
    <section
      id={`sec-${id}`}
      ref={sectionRef}
      className="support-section"
      style={{
        marginBottom: 20,
        borderRadius: 16,
        background: T.sf,
        border: `1px solid ${T.bd}`,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        className="support-section-header"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={`sec-body-${id}`}
      >
        <span className="support-section-icon" style={{ background: iconBg }}>
          {icon}
        </span>
        <span className="support-section-title">{title}</span>
        {badge ? <span className="support-section-badge">{badge}</span> : null}
        <ChevronDown
          size={20}
          className={`support-section-chevron${collapsed ? ' collapsed' : ''}`}
          style={{ color: T.t3 }}
        />
      </button>
      <div
        id={`sec-body-${id}`}
        className={`support-section-body${collapsed ? ' collapsed' : ''}`}
      >
        <div className="support-section-inner">{children}</div>
      </div>
    </section>
  );
}
