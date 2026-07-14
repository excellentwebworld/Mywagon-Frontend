import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Shipment } from '../../context/AppContext';
import { isShipmentEditable } from '../../pages/ManageShipments/utils/listingUtils';

interface RowActionsMenuProps {
  shipment: Shipment;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditBlocked?: () => void;
  t: (key: string) => string;
}

export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({
  shipment,
  onView,
  onEdit,
  onDelete,
  onEditBlocked,
  t,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 160),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const editable = isShipmentEditable(shipment.status);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="act-btn"
        title={t('more')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="row-actions-menu"
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onView();
              }}
            >
              {t('rowActionView')}
            </button>
            <button
              type="button"
              role="menuitem"
              className={!editable ? 'is-disabled' : undefined}
              onClick={() => {
                setOpen(false);
                if (!editable) {
                  onEditBlocked?.();
                  return;
                }
                onEdit();
              }}
            >
              {t('rowActionEdit')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              {t('rowActionDelete')}
            </button>
          </div>,
          document.body
        )}
    </>
  );
};
