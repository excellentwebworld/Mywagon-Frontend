import React, { useState } from 'react';

interface DetailSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  bodyClassName?: string;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  defaultOpen = true,
  children,
  bodyClassName,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="dp-sec">
      <div className="dp-sec-header" onClick={() => setOpen(!open)} onKeyDown={(e) => e.key === 'Enter' && setOpen(!open)} role="button" tabIndex={0}>
        {title}
        <span className={`dp-chev ${open ? 'open' : ''}`}>▼</span>
      </div>
      {open && (
        <div className={`dp-sec-body ${bodyClassName || ''}`.trim()}>{children}</div>
      )}
    </div>
  );
};
