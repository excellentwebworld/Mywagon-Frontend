import React, { useEffect, useRef, useState } from 'react';
import type { LocationItem } from '../../context/AppContext';

interface Props {
  location: LocationItem;
  onEdit: (loc: LocationItem) => void;
  onDuplicate: (loc: LocationItem) => void;
  onArchive: (loc: LocationItem) => void;
  onCopy: (text: string, msg: string) => void;
  disabled?: boolean;
}

export const LocationRowActions: React.FC<Props> = ({
  location,
  onEdit,
  onDuplicate,
  onArchive,
  onCopy,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div className="row-actions-wrap" ref={ref}>
      <button
        type="button"
        className="act-btn"
        title="Actions"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋯
      </button>
      {open && (
        <div className="row-actions-dd open">
          <button type="button" onClick={() => { onEdit(location); setOpen(false); }}>Edit</button>
          <button type="button" onClick={() => { onDuplicate(location); setOpen(false); }}>Duplicate</button>
          <button type="button" onClick={() => { onCopy(location.address, 'Address copied'); setOpen(false); }}>Copy address</button>
          {location.status === 'active' && (
            <button type="button" className="danger" onClick={() => { onArchive(location); setOpen(false); }}>Archive</button>
          )}
        </div>
      )}
    </div>
  );
};
