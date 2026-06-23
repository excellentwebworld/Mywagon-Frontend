import React, { useState } from 'react';
import type { LocationItem } from '../../context/AppContext';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface Props {
  location: LocationItem;
  isArchivedView: boolean;
  onEdit: (loc: LocationItem) => void;
  onArchive: (loc: LocationItem) => void;
  onRestore: (loc: LocationItem) => void;
  disabled?: boolean;
  setSelectedLoc: (loc: LocationItem) => void;
}

export const LocationRowActions: React.FC<Props> = ({
  location,
  isArchivedView,
  onEdit,
  onArchive,
  onRestore,
  disabled,
  setSelectedLoc
}) => {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false), open);

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
          setSelectedLoc(location);
          // setOpen((v) => !v);
        }}
      >
        ⋯
      </button>
      {/* {open && (
        <div className="row-actions-dd open">
          <button type="button" onClick={() => { onEdit(location); setOpen(false); }}>Edit</button>
          {archived ? (
            <button type="button" onClick={() => { onRestore(location); setOpen(false); }}>Restore</button>
          ) : (
            <button type="button" className="danger" onClick={() => { onArchive(location); setOpen(false); }}>Archive</button>
          )}
        </div>
      )} */}
    </div>
  );
};
