/**
 * DirectoryPane — Left-side tree filter for Price Lists.
 *
 * Nodes: All / Active / pricing methods / special groups / My Folders / By scope (collapsible) / status.
 * Custom folders: user-created with add/rename/delete.
 * By Scope section collapsible/expandable, nodes from scopePartnerIds.
 */
import { useCallback, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, FolderPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { isExpiringSoon, getPrimaryUnit, getScopeLabels } from '../../../mocks/priceListsData';

const FOLDER_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#BE185D'];
let nextFolderId = 100;

export default function DirectoryPane({ lanes, activeNode, onNodeClick, role, folders, setFolders, onMoveToFolder }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const [scopeOpen, setScopeOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editFolderId, setEditFolderId] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');

  const counts = useMemo(() => {
    const c = {
      all: lanes.length, active: 0, inactive: 0, archived: 0,
      ftl: 0, pallet: 0, km: 0, weight: 0,
      expiring: 0, roundTrip: 0, multiStop: 0,
      scopePartners: {}, // partnerId → { count, name }
      folders: {}, // folderId → count
    };
    lanes.forEach((l) => {
      if (l.status === 'active') c.active++;
      if (l.status === 'inactive') c.inactive++;
      if (l.status === 'archived') c.archived++;
      const unit = getPrimaryUnit(l);
      if (unit === 'load') c.ftl++;
      if (unit === 'pallet') c.pallet++;
      if (unit === 'km') c.km++;
      if (unit === 'tonne' || unit === 'kg') c.weight++;
      if (isExpiringSoon(l)) c.expiring++;
      if (l.isRoundTrip) c.roundTrip++;
      if (l.stops.length > 2) c.multiStop++;
      // Scope: count default vs per-partner
      if (l.scope === 'default') {
        c.scopePartners['default'] = c.scopePartners['default'] || { count: 0, name: null };
        c.scopePartners['default'].count++;
      }
      (l.scopePartnerIds || []).forEach(pid => {
        if (!c.scopePartners[pid]) {
          const names = getScopeLabels([pid]);
          c.scopePartners[pid] = { count: 0, name: names[0] || pid };
        }
        c.scopePartners[pid].count++;
      });
      // Folders
      (l.folderIds || []).forEach(fid => {
        c.folders[fid] = (c.folders[fid] || 0) + 1;
      });
    });
    return c;
  }, [lanes]);

  // Scope sub-nodes
  const scopeNodes = Object.entries(counts.scopePartners)
    .sort(([a], [b]) => (a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b)))
    .map(([key, { count, name }]) => ({
      key: `scope_${key}`,
      icon: key === 'default' ? '🌐' : '🏪',
      label: key === 'default' ? t('priceLists.directory.defaultScope', 'Default') : (name || key),
      count, indent: true,
    }));

  const handleAddFolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const id = `FLD-${String(nextFolderId++).padStart(3, '0')}`;
    setFolders(prev => [...prev, { id, name: newFolderName.trim(), color: FOLDER_COLORS[prev.length % FOLDER_COLORS.length] }]);
    setNewFolderName('');
    setAddingFolder(false);
  }, [newFolderName, setFolders]);

  const handleRenameFolder = useCallback((id) => {
    if (!editFolderName.trim()) return;
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: editFolderName.trim() } : f));
    setEditFolderId(null);
  }, [editFolderName, setFolders]);

  const handleDeleteFolder = useCallback((id) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    if (activeNode === `folder_${id}`) onNodeClick('all');
  }, [setFolders, activeNode, onNodeClick]);

  const NodeButton = ({ node }) => {
    const isActive = activeNode === node.key;
    return (
      <button
        onClick={() => onNodeClick(node.key)}
        className="flex items-center gap-2 w-full rounded-lg cursor-pointer border-none text-left"
        style={{
          padding: node.indent ? '6px 8px 6px 28px' : '6px 8px',
          fontSize: 12, fontWeight: isActive ? 600 : 400,
          color: isActive ? T.ac : T.t1,
          background: isActive ? T.al : 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = T.sh; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? T.al : 'transparent'; }}
      >
        <span style={{ width: 16, textAlign: 'center', fontSize: 13 }}>{node.icon}</span>
        <span className="flex-1 min-w-0 truncate">{node.label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>({node.count})</span>
      </button>
    );
  };

  const Sep = () => <div style={{ height: 1, background: T.bd, margin: '8px 8px' }} />;

  return (
    <div className="shrink-0 overflow-y-auto overflow-x-hidden" style={{ width: 230, borderRight: `1px solid ${T.bd}`, background: T.sf, padding: '12px 8px' }}>
      <NodeButton node={{ key: 'all', icon: '📋', label: t('priceLists.directory.all', 'All lanes'), count: counts.all }} />
      <NodeButton node={{ key: 'active', icon: '✅', label: t('priceLists.directory.active', 'Active'), count: counts.active }} />
      <Sep />
      <NodeButton node={{ key: 'ftl', icon: '📦', label: t('priceLists.directory.ftl', 'FTL / Per load'), count: counts.ftl }} />
      <NodeButton node={{ key: 'perPallet', icon: '📐', label: t('priceLists.directory.perPallet', 'Per pallet'), count: counts.pallet }} />
      <NodeButton node={{ key: 'perKm', icon: '📏', label: t('priceLists.directory.perKm', 'Per km'), count: counts.km }} />
      <NodeButton node={{ key: 'perWeight', icon: '⚖️', label: t('priceLists.directory.perWeight', 'Per weight'), count: counts.weight }} />
      <Sep />
      <NodeButton node={{ key: 'expiring', icon: '⏰', label: t('priceLists.directory.expiring', 'Expiring soon'), count: counts.expiring }} />
      <NodeButton node={{ key: 'roundTrips', icon: '🔄', label: t('priceLists.directory.roundTrips', 'Round trips'), count: counts.roundTrip }} />
      <NodeButton node={{ key: 'multiStop', icon: '📍', label: t('priceLists.directory.multiStop', 'Multi-stop'), count: counts.multiStop }} />
      <Sep />

      {/* ── My Folders (collapsible) ── */}
      <button onClick={() => setFoldersOpen(!foldersOpen)}
        className="flex items-center gap-2 w-full px-2 py-1.5 cursor-pointer border-none rounded-lg"
        style={{ background: 'transparent', fontSize: 11, fontWeight: 600, color: T.t3 }}>
        {foldersOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>📁 {t('priceLists.directory.myFolders', 'My Folders')}</span>
        <button onClick={(e) => { e.stopPropagation(); setAddingFolder(true); }}
          className="ml-auto p-0.5 rounded cursor-pointer border-none" style={{ background: 'transparent', color: T.t3 }}>
          <Plus size={11} />
        </button>
      </button>
      {foldersOpen && (
        <>
          {(folders || []).map(folder => {
            const isActive = activeNode === `folder_${folder.id}`;
            const fCount = counts.folders[folder.id] || 0;
            if (editFolderId === folder.id) {
              return (
                <div key={folder.id} className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: 28 }}>
                  <input autoFocus value={editFolderName} onChange={e => setEditFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setEditFolderId(null); }}
                    className="flex-1 rounded px-2 py-1 outline-none"
                    style={{ fontSize: 11, border: `1px solid ${T.ac}`, background: T.sf, color: T.t1 }} />
                  <button onClick={() => handleDeleteFolder(folder.id)} className="p-0.5 border-none cursor-pointer" style={{ background: 'transparent', color: '#EF4444' }}><X size={11} /></button>
                </div>
              );
            }
            return (
              <div key={folder.id} className="group relative">
                <button
                  onClick={() => onNodeClick(`folder_${folder.id}`)}
                  onDoubleClick={() => { setEditFolderId(folder.id); setEditFolderName(folder.name); }}
                  className="flex items-center gap-2 w-full rounded-lg cursor-pointer border-none text-left"
                  style={{ padding: '6px 8px 6px 28px', fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? T.ac : T.t1, background: isActive ? T.al : 'transparent' }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = T.sh; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? T.al : 'transparent'; }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: folder.color, flexShrink: 0 }} />
                  <span className="flex-1 min-w-0 truncate">{folder.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: T.t3, fontFamily: "'JetBrains Mono', monospace" }}>({fCount})</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'transparent', color: T.t3 }}
                  title={t('priceLists.directory.deleteFolder', 'Delete folder')}
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
          {addingFolder && (
            <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: 28 }}>
              <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') setAddingFolder(false); }}
                placeholder={t('priceLists.directory.newFolder', 'New folder')}
                className="flex-1 rounded px-2 py-1 outline-none"
                style={{ fontSize: 11, border: `1px solid ${T.ac}`, background: T.sf, color: T.t1 }} />
            </div>
          )}
          {!folders?.length && !addingFolder && (
            <div style={{ paddingLeft: 28, fontSize: 11, color: T.t3, padding: '4px 8px 4px 28px' }}>
              {t('priceLists.directory.noFolders', 'No folders yet')}
            </div>
          )}
        </>
      )}
      <Sep />

      {/* ── By Scope (collapsible) ── */}
      <button onClick={() => setScopeOpen(!scopeOpen)}
        className="flex items-center gap-2 w-full px-2 py-1.5 cursor-pointer border-none rounded-lg"
        style={{ background: 'transparent', fontSize: 11, fontWeight: 600, color: T.t3 }}>
        {scopeOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>👤 {t('priceLists.directory.byScope', 'By scope')}</span>
      </button>
      {scopeOpen && scopeNodes.map((node) => <NodeButton key={node.key} node={node} />)}
      <Sep />

      <NodeButton node={{ key: 'inactive', icon: '📁', label: t('priceLists.directory.inactive', 'Inactive'), count: counts.inactive }} />
      <NodeButton node={{ key: 'archived', icon: '🗄️', label: t('priceLists.directory.archived', 'Archived'), count: counts.archived }} />
    </div>
  );
}
