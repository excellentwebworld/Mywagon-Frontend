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
      className={`rounded-2xl mb-4 overflow-hidden bg-white border border-[#E4E4E8] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 ${className}`}
      style={{ breakInside: 'avoid' }}
    >
      <div className="w-full flex items-center justify-between px-4 py-3 select-none">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex-1 flex items-center gap-2.5 text-left rounded-lg p-1 -m-1 transition-colors hover:bg-[#F8F7FC] active:scale-[0.998] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
        >
          {icon && (
            <span className="flex-shrink-0 flex items-center text-[#9B51E0]">
              {icon}
            </span>
          )}
          <h3 className="font-semibold text-[14px] text-[#18181B] flex-1 flex items-center gap-2 m-0 leading-tight">
            {title}
            {count != null && count !== '' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F0F3] text-[#5E5E6E] tracking-tight">
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
            className="p-1.5 rounded-lg text-[#8E8E9A] hover:text-[#18181B] hover:bg-[#F8F7FC] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B51E0]/50"
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${
                expanded ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className={`animate-in fade-in duration-150 ${bodyClassName}`}>
          {children}
        </div>
      )}
    </section>
  );
};
