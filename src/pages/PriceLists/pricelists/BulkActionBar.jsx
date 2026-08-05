/**
 * BulkActionBar — Floating action bar for Price Lists bulk operations.
 * Actions: Move to folder, Duplicate, Archive, Delete forever, Clear.
 * Appears when selectedIds.size > 0.
 */
import { useTranslation } from 'react-i18next';
import { Archive, X, Copy, Trash2, FolderPlus, ChevronDown } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useState, useRef, useEffect } from 'react';

export default function BulkActionBar({ count, onDuplicate, onArchive, onDelete, onClear, folders, onMoveToFolder }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setFolderMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl flex-wrap justify-center"
      style={{ background: T.t1, color: '#fff', zIndex: 50, minWidth: 380, maxWidth: '95vw' }}
    >
      <span className="font-semibold shrink-0" style={{ fontSize: 13 }}>
        {count} {t('priceLists.bulk.selected', 'selected')}
      </span>

      <div className="flex-1 min-w-[8px]" />

      {/* Move to folder */}
      {folders && folders.length > 0 && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setFolderMenuOpen(!folderMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold whitespace-nowrap"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12 }}
          >
            <FolderPlus size={14} />
            {t('priceLists.bulk.moveToFolder', 'Move to folder')}
            <ChevronDown size={12} />
          </button>
          {folderMenuOpen && (
            <div className="absolute bottom-10 left-0 rounded-lg shadow-xl overflow-hidden"
              style={{ background: T.sf, border: `1px solid ${T.bd}`, minWidth: 180, zIndex: 60 }}>
              {folders.map(f => (
                <button key={f.id}
                  onClick={() => { onMoveToFolder(f.id); setFolderMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer border-none text-left"
                  style={{ background: 'transparent', color: T.t1, fontSize: 12 }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.sh; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: f.color, flexShrink: 0 }} />
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
