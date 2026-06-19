import React, { useEffect, useRef, useState } from 'react';
import type { LocationItem } from '../../context/AppContext';

interface Props {
  location: LocationItem;
  isArchivedView: boolean;
  onEdit: (loc: LocationItem) => void;
  onArchive: (loc: LocationItem) => void;
  onRestore: (loc: LocationItem) => void;
  disabled?: boolean;
}

export const LocationRowActions: React.FC<Props> = ({
  location,
  isArchivedView,
  onEdit,
  onArchive,
  onRestore,
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

  const archived = location.status === 'archived' || isArchivedView;

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
          {archived ? (
            <button type="button" onClick={() => { onRestore(location); setOpen(false); }}>Restore</button>
          ) : (
            <button type="button" className="danger" onClick={() => { onArchive(location); setOpen(false); }}>Archive</button>
          )}
        </div>
      )}
    </div>
  );
};
