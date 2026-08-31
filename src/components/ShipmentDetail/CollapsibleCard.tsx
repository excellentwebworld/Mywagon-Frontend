import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleCardProps {
  id?: string;
  icon?: React.ReactNode;
  title: React.ReactNode;
  count?: number | string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  id,
  icon,
  title,
  count,
  expanded,
  onToggle,
  children,
  headerExtra,
  className = '',
  bodyClassName = 'px-4 pb-4',
}) => {
  return (
    <section
      id={id}
      className={`rounded-2xl mb-4 overflow-hidden transition-shadow ${className}`}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E8',
        boxShadow: '0 1px 2px rgba(0,0,0,.03)',
        breakInside: 'avoid',
      }}
    >
      <div className="w-full flex items-center justify-between px-4 py-3">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 text-left transition-colors hover:bg-black/[0.01] cursor-pointer"
          style={{ background: 'transparent', border: 'none', padding: 0 }}
        >
          {icon && (
            <span className="flex-shrink-0 flex items-center" style={{ color: '#9B51E0' }}>
              {icon}
            </span>
          )}
          <h3
            className="font-semibold flex-1 flex items-center gap-2 m-0"
            style={{ fontSize: '14px', color: '#18181B' }}
          >
            {title}
            {count != null && count !== '' && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: '#F0F0F3', color: '#8E8E9A' }}
              >
                {count}
              </span>
            )}
          </h3>
        </button>

        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {headerExtra && (
            <div className="flex items-center gap-1.5">
              {headerExtra}
            </div>
          )}
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className="p-1 text-[#8E8E9A] hover:text-[#18181B] cursor-pointer"
            style={{ background: 'transparent', border: 'none' }}
          >
            <ChevronDown
              size={15}
              style={{
                transform: expanded ? 'none' : 'rotate(-90deg)',
                transition: 'transform .15s',
              }}
            />
          </button>
        </div>
      </div>

      {expanded && <div className={bodyClassName}>{children}</div>}
    </section>
  );
};
