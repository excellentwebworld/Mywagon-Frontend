import React, { useState } from 'react';
import type { LocationItem } from '../../context/AppContext';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useTranslation } from '../../hooks/useTranslation';

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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false), open);

  const archived = location.status === 'archived' || isArchivedView;

  return (
    <div className="row-actions-wrap" ref={ref}>
      <button
        type="button"
        className="act-btn"
        title={t('abActions', 'Actions')}
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
          <button type="button" onClick={() => { onEdit(location); setOpen(false); }}>{t('edit', 'Edit')}</button>
          {archived ? (
            <button type="button" onClick={() => { onRestore(location); setOpen(false); }}>{t('abRestore', 'Restore')}</button>
          ) : (
            <button type="button" className="danger" onClick={() => { onArchive(location); setOpen(false); }}>{t('archive', 'Archive')}</button>
          )}
        </div>
      )} */}
    </div>
  );
};
