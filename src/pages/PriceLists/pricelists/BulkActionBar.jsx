/**
 * BulkActionBar — Floating action bar for Price Lists bulk operations.
 */
import { useTranslation } from 'react-i18next';
import { Archive, X, Copy, Trash2 } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

export default function BulkActionBar({ count, onDuplicate, onArchive, onDelete, onClear }) {
  const { t } = useTranslation();
  const { T } = useTheme();

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl flex-wrap justify-center"
      style={{ background: T.t1, color: '#fff', zIndex: 50, minWidth: 380, maxWidth: '95vw' }}
    >
      <span className="font-semibold shrink-0" style={{ fontSize: 13 }}>
        {count} {t('priceLists.bulk.selected', 'selected')}
      </span>

      <div className="flex-1 min-w-[8px]" />

      <button
        onClick={onDuplicate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold whitespace-nowrap"
        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12 }}
      >
        <Copy size={14} />
        {t('priceLists.bulk.duplicate', 'Duplicate')}
      </button>

      <button
        onClick={onArchive}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold whitespace-nowrap"
        style={{ background: '#F59E0B', color: '#fff', fontSize: 12 }}
      >
        <Archive size={14} />
        {t('priceLists.bulk.archive', 'Archive')}
      </button>

      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold whitespace-nowrap"
        style={{ background: '#EF4444', color: '#fff', fontSize: 12 }}
      >
        <Trash2 size={14} />
        {t('priceLists.bulk.delete', 'Delete')}
      </button>

      <button
        onClick={onClear}
        className="p-1.5 rounded-lg cursor-pointer border-none shrink-0"
        style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
