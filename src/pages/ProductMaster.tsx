import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Category, ProductType, SKU } from '../context/AppContext';

const ICONS = ['📦', '🍷🥨', '🧱', '⚗️', '🛒', '💻', '💊', '👕', '🔧', '🍭', '🍿', '🍶', '🧴', '🍕', '☕'];

export const ProductMaster: React.FC = () => {
  const {
    categories,
    addCategory,
    productTypes,
    addProductType,
    updateProductType,
    skus,
    addSku,
    updateSku,
    lang,
    t,
    showToast,
  } = useApp();

  // Local state
  const [viewMode, setViewMode] = useState<'skus' | 'types'>('skus');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [activeType, setActiveType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<SKU | ProductType | null>(null);
  const [selectedKind, setSelectedKind] = useState<'sku' | 'type' | ''>('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter overrides
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterSync, setFilterSync] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [filterUnmapped, setFilterUnmapped] = useState<boolean>(false);
  const [kpiFilter, setKpiFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');

  // Modals state
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [newType, setNewType] = useState({
    catId: '',
    name: '',
    temp: 'Ambient',
    hazard: false,
    stackable: true,
    palletType: 'EUR',
  });

  const [isSkuOpen, setIsSkuOpen] = useState(false);
  const [editSkuMode, setEditSkuMode] = useState(false);
  const [newSku, setNewSku] = useState({
    catId: '',
    typeId: '',
    name: '',
    number: '',
    barcode: '',
    uom: 'Case',
    weight: '',
    active: true,
    tags: '',
  });

  const [isCatOpen, setIsCatOpen] = useState(false);
  const [newCat, setNewCat] = useState({
    name: '',
    icon: '📦',
  });

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState('');
  const [renameName, setRenameName] = useState('');

  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeSrc, setMergeSrc] = useState<ProductType | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>('');

  const [isBulkMapOpen, setIsBulkMapOpen] = useState(false);
  const [bulkMapTarget, setBulkMapTarget] = useState<string>('');

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);

  const [isSyncLogOpen, setIsSyncLogOpen] = useState(false);

  // Toggle detail sections
  const [secCollapsed, setSecCollapsed] = useState<Record<string, boolean>>({});

  const toggleSec = (key: string) => {
    setSecCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterSource('');
    setFilterSync('');
    setFilterActive('');
    setFilterUnmapped(false);
    setKpiFilter('');
    setActiveCat('all');
    setActiveType('all');
    setViewMode('skus');
    setSelectedItem(null);
    setSelectedKind('');
    setSelectedIds(new Set());
    showToast(t('filtersCleared'));
  };

  // KPI Calculations
  const totalSkusCount = skus.filter((s) => s.active).length;
  const erpSyncedCount = skus.filter((s) => s.source === 'erp' && s.active).length;
  const manualCount = skus.filter((s) => s.source === 'manual' && s.active).length;
  const syncIssuesCount = skus.filter((s) => s.erp.status === 'error' || s.erp.status === 'conflict').length;
  const unmappedCount = skus.filter((s) => !s.typeId && s.active).length;
  const inactiveCount = skus.filter((s) => !s.active).length;

  const handleKpiClick = (k: string) => {
    setKpiFilter(kpiFilter === k ? '' : k);
    setSelectedItem(null);
    setSelectedKind('');
  };

  const getFilteredSkus = () => {
    return skus
      .filter((s) => {
        // KPI filters
        if (!kpiFilter) return true;
        if (kpiFilter === 'total') return s.active;
        if (kpiFilter === 'erp') return s.source === 'erp' && s.active;
        if (kpiFilter === 'manual') return s.source === 'manual' && s.active;
        if (kpiFilter === 'errors') return s.erp.status === 'error' || s.erp.status === 'conflict';
        if (kpiFilter === 'unmapped') return !s.typeId && s.active;
        if (kpiFilter === 'inactive') return !s.active;
        return true;
      })
      .filter((s) => {
        // Facet & search bar filters
        if (filterSource && s.source !== filterSource) return false;
        if (filterSync) {
          if (s.source !== 'erp') return false;
          if (s.erp.status !== filterSync) return false;
        }
        if (filterActive === 'active' && !s.active) return false;
        if (filterActive === 'inactive' && s.active) return false;
        if (filterUnmapped && (s.typeId || !s.active)) return false;

        if (activeCat === 'unmapped') {
          return !s.typeId && s.active;
        }
        if (activeCat !== 'all' && s.catId !== activeCat) return false;
        if (activeType !== 'all' && activeType !== 'unmapped-cat' && s.typeId !== activeType) return false;
        if (activeType === 'unmapped-cat' && s.typeId) return false;

        return true;
      })
      .filter((s) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const tp = productTypes.find((x) => x.id === s.typeId);
        return (
          s.name.toLowerCase().includes(q) ||
          s.number.toLowerCase().includes(q) ||
          (s.barcode && s.barcode.toLowerCase().includes(q)) ||
          (tp && tp.name.toLowerCase().includes(q)) ||
          s.erp.extId.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'number') return a.number.localeCompare(b.number);
        if (sortBy === 'type') {
          const tpA = productTypes.find((x) => x.id === a.typeId)?.name || 'zzz';
          const tpB = productTypes.find((x) => x.id === b.typeId)?.name || 'zzz';
          return tpA.localeCompare(tpB);
        }
        if (sortBy === 'status') return (a.active === b.active ? 0 : a.active ? -1 : 1);
        return 0;
      });
  };

  const getFilteredTypes = () => {
    return productTypes
      .filter((x) => x.active)
      .filter((x) => {
        if (activeCat !== 'all' && x.catId !== activeCat) return false;
        return true;
      })
      .filter((x) => {
        if (!searchQuery) return true;
        return x.name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  };

  // Bulk Actions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = getFilteredSkus().map((s) => s.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkToggleActive = () => {
    selectedIds.forEach((id) => {
      const sku = skus.find((s) => s.id === id);
      if (sku) updateSku({ ...sku, active: !sku.active });
    });
    showToast(`Toggled status for ${selectedIds.size} item(s)`, 'success');
    setSelectedIds(new Set());
  };

  const handleBulkArchive = () => {
    if (window.confirm(lang === 'el' ? 'Αρχειοθέτηση επιλεγμένων SKU;' : 'Archive selected SKUs?')) {
      selectedIds.forEach((id) => {
        const sku = skus.find((s) => s.id === id);
        if (sku) updateSku({ ...sku, active: false });
      });
      showToast(`Archived ${selectedIds.size} item(s)`, 'info');
      setSelectedIds(new Set());
    }
  };

  const handleBulkMap = () => {
    if (!bulkMapTarget) return;
    const tp = productTypes.find((x) => x.id === bulkMapTarget);
    if (!tp) return;
    selectedIds.forEach((id) => {
      const sku = skus.find((s) => s.id === id);
      if (sku) updateSku({ ...sku, typeId: tp.id, catId: tp.catId });
    });
    showToast(`Mapped ${selectedIds.size} SKU(s) to ${tp.name}`, 'success');
    setIsBulkMapOpen(false);
    setSelectedIds(new Set());
  };

  const handleCreateType = () => {
    if (!newType.catId || !newType.name.trim()) {
      showToast('Category and Name are required', 'error');
      return;
    }
    addProductType({
      catId: newType.catId,
      name: newType.name.trim(),
      active: true,
      defaults: {
        temp: newType.temp,
        hazard: newType.hazard,
        stackable: newType.stackable,
        palletType: newType.palletType,
      },
    });
    setIsTypeOpen(false);
    setNewType({
      catId: '',
      name: '',
      temp: 'Ambient',
      hazard: false,
      stackable: true,
      palletType: 'EUR',
    });
  };

  const handleSaveSku = () => {
    if (!newSku.catId || !newSku.name.trim() || !newSku.number.trim()) {
      showToast('Category, Name, and Number are required', 'error');
      return;
    }
    const tagsArr = newSku.tags ? newSku.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

    if (editSkuMode && selectedItem && selectedKind === 'sku') {
      const current = selectedItem as SKU;
      const updated: SKU = {
        ...current,
        catId: newSku.catId,
        typeId: newSku.typeId,
        name: current.source === 'erp' ? current.name : newSku.name.trim(),
        number: current.source === 'erp' ? current.number : newSku.number.trim(),
        barcode: current.source === 'erp' ? current.barcode : newSku.barcode.trim(),
        uom: newSku.uom,
        weight: newSku.weight.trim(),
        active: newSku.active,
        tags: tagsArr,
      };
      updateSku(updated);
      setSelectedItem(updated);
      setIsSkuOpen(false);
      showToast(t('updated'), 'success');
    } else {
      if (skus.some((s) => s.number === newSku.number.trim())) {
        showToast(t('dupeNumber'), 'error');
        return;
      }
      addSku({
        name: newSku.name.trim(),
        number: newSku.number.trim(),
        barcode: newSku.barcode.trim(),
        catId: newSku.catId,
        typeId: newSku.typeId,
        source: 'manual',
        active: newSku.active,
        erp: { system: '', extId: '', lastSync: '—', status: '', error: '' },
        weight: newSku.weight.trim(),
        uom: newSku.uom,
        tags: tagsArr,
      });
      setIsSkuOpen(false);
    }
  };

  const handleCreateCategory = () => {
    if (!newCat.name.trim()) return;
    addCategory(newCat.name.trim(), newCat.name.trim(), newCat.icon);
    setIsCatOpen(false);
    setNewCat({ name: '', icon: '📦' });
  };

  const handleRenameType = () => {
    if (!renameName.trim()) return;
    const tp = productTypes.find((x) => x.id === renameId);
    if (tp) {
      const updated = { ...tp, name: renameName.trim() };
      updateProductType(updated);
      setSelectedItem(updated);
      setIsRenameOpen(false);
      showToast(`Renamed to "${updated.name}"`, 'success');
    }
  };

  const handleMergeTypes = () => {
    if (!mergeSrc || !mergeTarget) return;
    const targetType = productTypes.find((x) => x.id === mergeTarget);
    if (!targetType) return;

    // Reassign SKUs
    skus.forEach((s) => {
      if (s.typeId === mergeSrc.id) {
        updateSku({ ...s, typeId: targetType.id, catId: targetType.catId });
      }
    });

    // Deactivate source type
    updateProductType({ ...mergeSrc, active: false });

    setIsMergeOpen(false);
    setSelectedItem(null);
    setSelectedKind('');
    showToast(`Merged "${mergeSrc.name}" into "${targetType.name}"`, 'success');
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return;

      const sep = text.includes('\t') ? '\t' : ',';
      const headers = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

      const indexMap = { name: -1, number: -1, barcode: -1, category: -1, type: -1, uom: -1, weight: -1, tags: -1 };
      headers.forEach((h, i) => {
        if (h.includes('name')) indexMap.name = i;
        if (h.includes('number')) indexMap.number = i;
        if (h.includes('barcode')) indexMap.barcode = i;
        if (h.includes('cat')) indexMap.category = i;
        if (h.includes('type')) indexMap.type = i;
        if (h.includes('uom') || h.includes('unit')) indexMap.uom = i;
        if (h.includes('weight')) indexMap.weight = i;
        if (h.includes('tag')) indexMap.tags = i;
      });

      if (indexMap.name < 0 || indexMap.number < 0) {
        showToast('Missing required CSV columns (Name, Number)', 'error');
        return;
      }

      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(sep).map((v) => v.replace(/^"|"$/g, '').trim());
        const nm = values[indexMap.name] || '';
        const nu = values[indexMap.number] || '';
        if (!nm || !nu) continue;

        const cn = indexMap.category >= 0 ? values[indexMap.category] : '';
        const tn = indexMap.type >= 0 ? values[indexMap.type] : '';
        const cat = categories.find((c) => (typeof c.name === 'string' ? c.name : c.name.en).toLowerCase() === cn.toLowerCase());
        const tp = cat ? productTypes.find((x) => x.catId === cat.id && x.name.toLowerCase() === tn.toLowerCase()) : null;

        parsed.push({
          name: nm,
          number: nu,
          barcode: indexMap.barcode >= 0 ? values[indexMap.barcode] : '',
          catId: cat ? cat.id : '',
          catName: cn,
          typeId: tp ? tp.id : '',
          typeName: tn,
          uom: indexMap.uom >= 0 ? values[indexMap.uom] : 'Case',
          weight: indexMap.weight >= 0 ? values[indexMap.weight] : '',
          active: true,
          tags: indexMap.tags >= 0 ? values[indexMap.tags] : '',
          dupe: skus.some((s) => s.number === nu),
          line: i + 1,
        });
      }

      setImportData(parsed);
      setIsImportOpen(true);
    };
    reader.readAsText(file);
  };

  const triggerCSVImport = () => {
    const okRows = importData.filter((r) => !r.dupe && r.catId);
    okRows.forEach((r) => {
      addSku({
        name: r.name,
        number: r.number,
        barcode: r.barcode,
        catId: r.catId,
        typeId: r.typeId,
        source: 'manual',
        active: true,
        erp: { system: '', extId: '', lastSync: '—', status: '', error: '' },
        weight: r.weight,
        uom: r.uom,
        tags: r.tags ? r.tags.split(/[;,]/).map((x: string) => x.trim()).filter(Boolean) : [],
      });
    });
    setIsImportOpen(false);
    showToast(`Imported ${okRows.length} SKU(s) successfully`, 'success');
  };

  const getCategoryName = (c: Category) => {
    return typeof c.name === 'string' ? c.name : c.name[lang] || c.name.en;
  };

  // ERP Sync static logs mockup
  const syncLogs = [
    { t: 'Today 14:32', s: 'SAP', a: 'Full sync', st: 'ok', d: '14 SKUs synced' },
    { t: 'Today 14:32', s: 'SAP', a: 'Conflict', st: 'conflict', d: 'SKU-015 name mismatch' },
    { t: 'Today 14:30', s: 'SAP', a: '2 new SKUs', st: 'pending', d: 'Awaiting mapping' },
    { t: 'Today 08:15', s: 'Soft1', a: 'Sync OK', st: 'ok', d: '2 SKUs synced' },
    { t: 'Today 08:15', s: 'Soft1', a: 'Error', st: 'error', d: 'SKU-012 missing weight' },
  ];

  const filteredSkus = getFilteredSkus();
  const filteredTypes = getFilteredTypes();

  return (
    <div className="pm-container animate-fade-in" style={{ padding: '0px' }}>
      {/* Page Header */}
      <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 className="text-h2" style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            {t('prodMaster')}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
            {t('subtitle')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => showToast(t('syncSettings'))}>
            🔄 ERP Sync
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsSyncLogOpen(true)}>
            📋 Sync Log
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => showToast('CSV exported')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', marginRight: '4px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t('export')}</span>
          </button>

          {/* Add Dropdown wrapper */}
          <div className="add-wrap" style={{ position: 'relative' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setIsSkuOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', marginRight: '4px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{t('add')}</span>
            </button>
            <div className="add-dd" style={{ display: 'none' }}>
              <div className="add-dd-i" onClick={() => setIsTypeOpen(true)}>{t('addTypeMenu')}</div>
              <div className="add-dd-i" onClick={() => { setEditSkuMode(false); setIsSkuOpen(true); }}>{t('addSkuMenu')}</div>
              <div className="add-dd-i" onClick={() => setIsCatOpen(true)}>{t('addCatMenu')}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsTypeOpen(true)}>
            + Type
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setIsCatOpen(true)}>
            + Category
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            📥 Import CSV
            <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { k: 'total', v: totalSkusCount, l: t('totalSkus'), c: '' },
          { k: 'erp', v: erpSyncedCount, l: t('erpSynced'), c: 'var(--accent)' },
          { k: 'manual', v: manualCount, l: t('manual'), c: 'var(--text-tertiary)' },
          { k: 'errors', v: syncIssuesCount, l: t('syncIssues'), c: 'var(--danger)' },
          { k: 'unmapped', v: unmappedCount, l: t('unmapped'), c: 'var(--warning)' },
          { k: 'inactive', v: inactiveCount, l: t('inactive'), c: 'var(--text-tertiary)' },
        ].map((x) => (
          <div
            key={x.k}
            className={`kpi ${kpiFilter === x.k ? 'act' : ''}`}
            onClick={() => handleKpiClick(x.k)}
            style={{ cursor: 'pointer', padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
          >
            <div className="kpi-v" style={{ fontSize: '20px', fontWeight: 700, color: x.c || 'var(--text-primary)' }}>
              {x.v}
            </div>
            <div className="kpi-l" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {x.l}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="fbar" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
        <div className="f-search" style={{ position: 'relative', flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedItem(null);
              setSelectedKind('');
            }}
            style={{ paddingLeft: '32px', width: '100%' }}
          />
        </div>
        <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">🗂 Source</option>
          <option value="erp">ERP</option>
          <option value="manual">Manual</option>
        </select>
        <select value={filterSync} onChange={(e) => setFilterSync(e.target.value)}>
          <option value="">🔄 Sync Status</option>
          <option value="ok">OK</option>
          <option value="error">Error</option>
          <option value="conflict">Conflict</option>
          <option value="pending">Pending</option>
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
          <option value="">✓ Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          className={`f-tog ${filterUnmapped ? 'on' : ''}`}
          onClick={() => setFilterUnmapped(!filterUnmapped)}
        >
          ⚠️ Unmapped
        </button>
        <span className="f-clear" onClick={clearFilters} style={{ cursor: 'pointer' }}>
          {t('clearAll')}
        </span>
      </div>

      {/* 3-Pane Layout */}
      <div className="panes" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', gap: '16px', alignItems: 'start' }}>
        {/* LEFT Pane: Facets */}
        <div className="facet-pane">
          <div className="facet-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600 }}>{t('catalog')}</span>
            <div className="view-tog" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <button
                className={viewMode === 'skus' ? 'act' : ''}
                onClick={() => {
                  setViewMode('skus');
                  setSelectedItem(null);
                  setSelectedKind('');
                }}
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                SKUs
              </button>
              <button
                className={viewMode === 'types' ? 'act' : ''}
                onClick={() => {
                  setViewMode('types');
                  setSelectedItem(null);
                  setSelectedKind('');
                }}
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                {lang === 'el' ? 'Τύποι' : 'Types'}
              </button>
            </div>
          </div>

          <div
            className={`cat-node ${activeCat === 'all' ? 'act' : ''}`}
            onClick={() => {
              setActiveCat('all');
              setActiveType('all');
              setSelectedItem(null);
              setSelectedKind('');
            }}
          >
            <span className="ico">📁</span> All {viewMode === 'types' ? 'Types' : 'Items'}
            <span className="cnt" style={{ marginLeft: 'auto' }}>
              {viewMode === 'types' ? productTypes.filter((x) => x.active).length : skus.length}
            </span>
          </div>

          {viewMode === 'skus' && unmappedCount > 0 && (
            <div
              className={`cat-node ${activeCat === 'unmapped' ? 'act' : ''}`}
              onClick={() => {
                setActiveCat('unmapped');
                setActiveType('all');
                setSelectedItem(null);
                setSelectedKind('');
              }}
              style={{ color: 'var(--warning)' }}
            >
              <span className="ico">⚠️</span> {t('unmappedSkus')}
              <span className="cnt" style={{ marginLeft: 'auto', background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                {unmappedCount}
              </span>
            </div>
          )}

          <div className="facet-sep"></div>

          {categories.map((c) => {
            const hasSkus = skus.filter((s) => s.catId === c.id);
            const hasTypes = productTypes.filter((x) => x.catId === c.id && x.active);
            const nodeCount = viewMode === 'types' ? hasTypes.length : hasSkus.length;

            if (nodeCount === 0 && activeCat !== c.id) return null;
            const isCatActive = activeCat === c.id;

            return (
              <div key={c.id}>
                <div
                  className={`cat-node ${isCatActive ? 'act' : ''}`}
                  onClick={() => {
                    setActiveCat(c.id);
                    setActiveType('all');
                    setSelectedItem(null);
                    setSelectedKind('');
                  }}
                >
                  <span className="ico">{c.icon === 'fnb' ? '🍷🥨' : c.icon}</span>
                  <span>{getCategoryName(c)}</span>
                  <span className="cnt" style={{ marginLeft: 'auto' }}>{nodeCount}</span>
                </div>

                {isCatActive && viewMode === 'skus' && (
                  <div style={{ paddingLeft: '16px' }}>
                    {hasTypes.map((type) => {
                      const typeSkus = hasSkus.filter((s) => s.typeId === type.id).length;
                      return (
                        <div
                          key={type.id}
                          className={`type-node ${activeType === type.id ? 'act' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveType(type.id);
                            setSelectedItem(null);
                            setSelectedKind('');
                          }}
                          style={{ display: 'flex', alignItems: 'center', fontSize: '12px', padding: '4px' }}
                        >
                          <button
                            className="type-info-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(type);
                              setSelectedKind('type');
                            }}
                            style={{ marginRight: '6px', cursor: 'pointer' }}
                          >
                            ℹ
                          </button>
                          <span>{type.name}</span>
                          <span className="cnt" style={{ marginLeft: 'auto' }}>{typeSkus}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CENTER Pane: Data List */}
        <div className="list-pane">
          <div className="list-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {viewMode === 'types' ? 'Product Types' : 'SKU registry'}
            </span>
            {viewMode === 'skus' && (
              <select className="sort-sel" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Name A–Z</option>
                <option value="number">SKU Number</option>
                <option value="type">Product Type</option>
                <option value="status">Status</option>
              </select>
            )}
            <span className="list-info" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {viewMode === 'types' ? `${filteredTypes.length} types` : `${filteredSkus.length} SKUs`}
            </span>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="bulk-bar" style={{ display: 'flex', gap: '8px', padding: '8px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '10px' }}>
              <span className="bulk-ct" style={{ fontWeight: 700 }}>{selectedIds.size}</span>
              <span>selected</span>
              <button className="btn btn-secondary btn-sm" onClick={() => { setBulkMapTarget(''); setIsBulkMapOpen(true); }}>
                Map Type
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleBulkToggleActive}>
                Toggle Active
              </button>
              <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }} onClick={handleBulkArchive}>
                Archive
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto' }}>
                ✕ Clear
              </button>
            </div>
          )}

          <div className="tbl-scroll">
            {viewMode === 'types' ? (
              <div className="types-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {filteredTypes.map((x) => {
                  const cat = categories.find((c) => c.id === x.catId);
                  const typeSkus = skus.filter((s) => s.typeId === x.id && s.active).length;
                  const erpCount = skus.filter((s) => s.typeId === x.id && s.source === 'erp' && s.active).length;
                  const isSel = selectedItem?.id === x.id && selectedKind === 'type';

                  return (
                    <div
                      key={x.id}
                      className="type-card"
                      onClick={() => {
                        setSelectedItem(x);
                        setSelectedKind('type');
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '12px',
                        background: isSel ? 'var(--accent-light)' : 'var(--surface)',
                        border: isSel ? '2px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    >
                      <div className="tc-cat" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {cat ? `${cat.icon} ${getCategoryName(cat)}` : ''}
                      </div>
                      <div className="tc-name" style={{ fontWeight: 600, fontSize: '14px', margin: '4px 0' }}>
                        {x.name}
                      </div>
                      <div className="tc-stats" style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <div><strong>{typeSkus}</strong> SKUs</div>
                        <div><strong>{erpCount}</strong> ERP</div>
                        <div><strong>{x.s30}</strong> Ship (30d)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>
                      <input
                        type="checkbox"
                        checked={filteredSkus.length > 0 && selectedIds.size === filteredSkus.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th>{t('sku')}</th>
                    <th>{t('productType')}</th>
                    <th>{t('category')}</th>
                    <th>{t('source')}</th>
                    <th>{t('syncStatus')}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSkus.map((s) => {
                    const tp = productTypes.find((x) => x.id === s.typeId);
                    const cat = categories.find((x) => x.id === s.catId);
                    const isSel = selectedItem?.id === s.id && selectedKind === 'sku';
                    const isChecked = selectedIds.has(s.id);

                    return (
                      <tr
                        key={s.id}
                        className={isSel ? 'selected' : ''}
                        onClick={() => {
                          setSelectedItem(s);
                          setSelectedKind('sku');
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleToggleRowSelection(s.id, e.target.checked)}
                          />
                        </td>
                        <td>
                          <div className="sku-name" style={{ fontWeight: 600 }}>{s.name}</div>
                          <div className="sku-num" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {s.number}
                          </div>
                        </td>
                        <td>
                          {tp ? (
                            <span className="badge badge-accent">{tp.name}</span>
                          ) : (
                            <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '11px' }}>
                              ⚠ {t('unmapped')}
                            </span>
                          )}
                        </td>
                        <td>{cat ? getCategoryName(cat) : '—'}</td>
                        <td>
                          <span className={`badge ${s.source === 'erp' ? 'badge-info' : 'badge-gray'}`}>
                            {s.source === 'erp' ? 'ERP' : 'Manual'}
                          </span>
                        </td>
                        <td>
                          {s.source === 'erp' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className={`sync-dot sync-${s.erp.status}`}></span>
                              <span>{s.erp.status}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <span className={s.active ? 'status-active' : 'status-inactive'}>
                            {s.active ? t('active') : t('inactive')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT Pane: Detail Panel */}
        <div className={`detail-pane ${selectedItem ? 'open' : ''}`}>
          {selectedItem && selectedKind === 'sku' && (
            <div className="dp-inner">
              {(() => {
                const s = selectedItem as SKU;
                const tp = productTypes.find((x) => x.id === s.typeId);
                const cat = categories.find((x) => x.id === s.catId);

                return (
                  <div>
                    <div className="dp-hero">
                      <div className="dp-close" onClick={() => { setSelectedItem(null); setSelectedKind(''); }}>
                        ✕
                      </div>
                      <div className="dp-badges" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <span className={`badge ${s.source === 'erp' ? 'badge-info' : 'badge-gray'}`}>
                          {s.source === 'erp' ? 'ERP' : 'Manual'}
                        </span>
                        {s.erp.status === 'conflict' && (
                          <span className="badge badge-warning">Conflict</span>
                        )}
                        {!s.typeId && (
                          <span className="badge badge-warning">Unmapped</span>
                        )}
                        {!s.active && (
                          <span className="badge badge-gray">Inactive</span>
                        )}
                      </div>
                      <div className="dp-name" style={{ fontSize: '18px', fontWeight: 700, margin: '8px 0' }}>
                        {s.name}
                      </div>
                      <div className="dp-sub" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {tp ? tp.name : 'No type assigned'} · {cat ? getCategoryName(cat) : '—'}
                      </div>
                      <div className="dp-meta" style={{ marginTop: '12px', fontSize: '12px' }}>
                        <div><strong>SKU Number:</strong> {s.number}</div>
                        {s.barcode && <div><strong>Barcode:</strong> {s.barcode}</div>}
                        {s.weight && <div><strong>Weight:</strong> {s.weight}</div>}
                        {s.uom && <div><strong>Unit:</strong> {s.uom}</div>}
                      </div>

                      <div className="dp-actions" style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setNewSku({
                              catId: s.catId,
                              typeId: s.typeId || '',
                              name: s.name,
                              number: s.number,
                              barcode: s.barcode || '',
                              uom: s.uom || 'Case',
                              weight: s.weight || '',
                              active: s.active,
                              tags: s.tags.join(', '),
                            });
                            setEditSkuMode(true);
                            setIsSkuOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            updateSku({ ...s, active: !s.active });
                            setSelectedItem({ ...s, active: !s.active });
                          }}
                        >
                          {s.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    {s.source === 'erp' && (
                      <div className="dp-sec">
                        <div className="dp-sec-header" onClick={() => toggleSec('erp')}>
                          🔌 ERP Integration
                          <span className={`dp-chev ${!secCollapsed.erp ? 'open' : ''}`}>▼</span>
                        </div>
                        {!secCollapsed.erp && (
                          <div className="dp-sec-body">
                            <div className="dp-row">
                              <span className="label">ERP System</span>
                              <span className="val">{s.erp.system}</span>
                            </div>
                            <div className="dp-row">
                              <span className="label">External ID</span>
                              <span className="val">{s.erp.extId}</span>
                            </div>
                            <div className="dp-row">
                              <span className="label">Sync Status</span>
                              <span className="val">{s.erp.status}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="dp-sec">
                      <div className="dp-sec-header" onClick={() => toggleSec('shipping')}>
                        📦 Shipping Defaults
                        <span className={`dp-chev ${!secCollapsed.shipping ? 'open' : ''}`}>▼</span>
                      </div>
                      {!secCollapsed.shipping && (
                        <div className="dp-sec-body">
                          {tp ? (
                            <div>
                              <div className="dp-row">
                                <span className="label">Temperature</span>
                                <span className="val">{tp.defaults.temp}</span>
                              </div>
                              <div className="dp-row">
                                <span className="label">Hazardous</span>
                                <span className="val">{tp.defaults.hazard ? 'Yes' : 'No'}</span>
                              </div>
                              <div className="dp-row">
                                <span className="label">Stackable</span>
                                <span className="val">{tp.defaults.stackable ? 'Yes' : 'No'}</span>
                              </div>
                              <div className="dp-row">
                                <span className="label">Pallet Type</span>
                                <span className="val">{tp.defaults.palletType}</span>
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: 'var(--text-tertiary)' }}>No type profile assigned</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {selectedItem && selectedKind === 'type' && (
            <div className="dp-inner">
              {(() => {
                const tp = selectedItem as ProductType;
                const cat = categories.find((c) => c.id === tp.catId);
                const mappedSkus = skus.filter((s) => s.typeId === tp.id && s.active);

                return (
                  <div>
                    <div className="dp-hero">
                      <div className="dp-close" onClick={() => { setSelectedItem(null); setSelectedKind(''); }}>
                        ✕
                      </div>
                      <div className="dp-badges">
                        <span className="badge badge-accent">Product Type</span>
                      </div>
                      <div className="dp-name" style={{ fontSize: '18px', fontWeight: 700, margin: '8px 0' }}>
                        {tp.name}
                      </div>
                      <div className="dp-sub" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {cat ? `${cat.icon} ${getCategoryName(cat)}` : '—'}
                      </div>

                      <div className="dp-actions" style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setRenameId(tp.id);
                            setRenameName(tp.name);
                            setIsRenameOpen(true);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setMergeSrc(tp);
                            setMergeTarget('');
                            setIsMergeOpen(true);
                          }}
                        >
                          Merge
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => {
                            if (window.confirm(t('archiveConfirm'))) {
                              updateProductType({ ...tp, active: false });
                              setSelectedItem(null);
                              setSelectedKind('');
                              showToast(`Archived type "${tp.name}"`, 'info');
                            }
                          }}
                        >
                          Archive
                        </button>
                      </div>
                    </div>

                    <div className="dp-sec">
                      <div className="dp-sec-header" onClick={() => toggleSec('defaults')}>
                        📦 Shipping Defaults
                        <span className={`dp-chev ${!secCollapsed.defaults ? 'open' : ''}`}>▼</span>
                      </div>
                      {!secCollapsed.defaults && (
                        <div className="dp-sec-body">
                          <div className="dp-row">
                            <span className="label">Temperature</span>
                            <span className="val">{tp.defaults.temp}</span>
                          </div>
                          <div className="dp-row">
                            <span className="label">Hazardous</span>
                            <span className="val">{tp.defaults.hazard ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="dp-row">
                            <span className="label">Stackable</span>
                            <span className="val">{tp.defaults.stackable ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="dp-row">
                            <span className="label">Pallet Type</span>
                            <span className="val">{tp.defaults.palletType}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="dp-sec">
                      <div className="dp-sec-header" onClick={() => toggleSec('mapped')}>
                        🏷️ Mapped SKUs ({mappedSkus.length})
                        <span className={`dp-chev ${!secCollapsed.mapped ? 'open' : ''}`}>▼</span>
                      </div>
                      {!secCollapsed.mapped && (
                        <div className="dp-sec-body" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          <table className="mini-table" style={{ width: '100%', fontSize: '12px' }}>
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Number</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mappedSkus.map((s) => (
                                <tr
                                  key={s.id}
                                  onClick={() => {
                                    setSelectedItem(s);
                                    setSelectedKind('sku');
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <td>{s.name}</td>
                                  <td>{s.number}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD PRODUCT TYPE */}
      {isTypeOpen && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Add Product Type</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsTypeOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="mf">
                <label>Category <span className="req">*</span></label>
                <select
                  value={newType.catId}
                  onChange={(e) => setNewType({ ...newType, catId: e.target.value })}
                >
                  <option value="">— Select Category —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {getCategoryName(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mf">
                <label>Type Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Bottled Water"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                />
              </div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '16px 0 10px' }}>Defaults</h4>
              <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className="mf">
                  <label>Temperature</label>
                  <select
                    value={newType.temp}
                    onChange={(e) => setNewType({ ...newType, temp: e.target.value })}
                  >
                    <option>Ambient</option>
                    <option>2–8°C</option>
                    <option>15–25°C</option>
                    <option>-18°C</option>
                  </select>
                </div>
                <div className="mf">
                  <label>Pallet Type</label>
                  <select
                    value={newType.palletType}
                    onChange={(e) => setNewType({ ...newType, palletType: e.target.value })}
                  >
                    <option>EUR</option>
                    <option>Industrial</option>
                    <option>Chemical</option>
                    <option>Pharma</option>
                  </select>
                </div>
              </div>
              <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <div className="mf">
                  <label>Hazardous</label>
                  <div
                    className="tog"
                    onClick={() => setNewType({ ...newType, hazard: !newType.hazard })}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <div className={`tog-sw ${newType.hazard ? 'on' : ''}`}></div>
                    <span>{newType.hazard ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="mf">
                  <label>Stackable</label>
                  <div
                    className="tog"
                    onClick={() => setNewType({ ...newType, stackable: !newType.stackable })}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <div className={`tog-sw ${newType.stackable ? 'on' : ''}`}></div>
                    <span>{newType.stackable ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsTypeOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateType}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT SKU */}
      {isSkuOpen && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h2>{editSkuMode ? 'Edit SKU' : 'Add SKU'}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsSkuOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>Category <span className="req">*</span></label>
                  <select
                    value={newSku.catId}
                    onChange={(e) => setNewSku({ ...newSku, catId: e.target.value, typeId: '' })}
                  >
                    <option value="">— Select Category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {getCategoryName(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mf">
                  <label>Product Type</label>
                  <select
                    value={newSku.typeId}
                    onChange={(e) => setNewSku({ ...newSku, typeId: e.target.value })}
                  >
                    <option value="">— Select Type —</option>
                    {productTypes
                      .filter((tp) => tp.catId === newSku.catId)
                      .map((tp) => (
                        <option key={tp.id} value={tp.id}>
                          {tp.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="mf">
                <label>SKU Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Coca-Cola 330ml Can"
                  value={newSku.name}
                  onChange={(e) => setNewSku({ ...newSku, name: e.target.value })}
                />
              </div>

              <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>SKU Number <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. 5201054001011"
                    value={newSku.number}
                    onChange={(e) => setNewSku({ ...newSku, number: e.target.value })}
                  />
                </div>
                <div className="mf">
                  <label>Barcode</label>
                  <input
                    type="text"
                    placeholder="Barcode"
                    value={newSku.barcode}
                    onChange={(e) => setNewSku({ ...newSku, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>Unit of Measure</label>
                  <select
                    value={newSku.uom}
                    onChange={(e) => setNewSku({ ...newSku, uom: e.target.value })}
                  >
                    {['Case', 'Piece', 'Bag', 'Box', 'Can', 'Pallet'].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="mf">
                  <label>Weight</label>
                  <input
                    type="text"
                    placeholder="e.g. 12.5 kg"
                    value={newSku.weight}
                    onChange={(e) => setNewSku({ ...newSku, weight: e.target.value })}
                  />
                </div>
              </div>

              <div className="mf">
                <label>Tags</label>
                <input
                  type="text"
                  placeholder="Comma-separated tags"
                  value={newSku.tags}
                  onChange={(e) => setNewSku({ ...newSku, tags: e.target.value })}
                />
              </div>

              <div className="mf">
                <label>Active</label>
                <div
                  className="tog"
                  onClick={() => setNewSku((prev) => ({ ...prev, active: !prev.active }))}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div className={`tog-sw ${newSku.active ? 'on' : ''}`}></div>
                  <span>{newSku.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsSkuOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveSku}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {isCatOpen && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Add Category</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsCatOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="mf">
                <label>Category Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Dairy Products"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                />
              </div>
              <div className="mf">
                <label>Icon</label>
                <div className="ico-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '8px' }}>
                  {ICONS.map((i) => (
                    <div
                      key={i}
                      className={`ico-opt ${newCat.icon === i ? 'sel' : ''}`}
                      onClick={() => setNewCat({ ...newCat, icon: i })}
                      style={{ cursor: 'pointer', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center', background: newCat.icon === i ? 'var(--accent-light)' : 'none' }}
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsCatOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateCategory}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RENAME TYPE */}
      {isRenameOpen && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Rename Product Type</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsRenameOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="mf">
                <label>New Name <span className="req">*</span></label>
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsRenameOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRenameType}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MERGE TYPES */}
      {isMergeOpen && mergeSrc && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Merge "{mergeSrc.name}" → …</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsMergeOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                All SKUs mapped to "{mergeSrc.name}" will be reassigned. Select target:
              </div>
              <div className="bm-type-list">
                {productTypes
                  .filter((x) => x.active && x.id !== mergeSrc.id && x.catId === mergeSrc.catId)
                  .map((x) => (
                    <div
                      key={x.id}
                      className={`bm-type-item ${mergeTarget === x.id ? 'sel' : ''}`}
                      onClick={() => setMergeTarget(x.id)}
                      style={{
                        padding: '10px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        background: mergeTarget === x.id ? 'var(--accent-light)' : 'none',
                      }}
                    >
                      <strong>{x.name}</strong>
                    </div>
                  ))}
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsMergeOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleMergeTypes} disabled={!mergeTarget}>
                Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK MAP TYPE */}
      {isBulkMapOpen && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Map {selectedIds.size} SKU(s) to Product Type</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsBulkMapOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px', maxHeight: '300px', overflowY: 'auto' }}>
              {productTypes
                .filter((x) => x.active)
                .map((x) => (
                  <div
                    key={x.id}
                    className={`bm-type-item ${bulkMapTarget === x.id ? 'sel' : ''}`}
                    onClick={() => setBulkMapTarget(x.id)}
                    style={{
                      padding: '10px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      background: bulkMapTarget === x.id ? 'var(--accent-light)' : 'none',
                    }}
                  >
                    <strong>{x.name}</strong>
                  </div>
                ))}
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsBulkMapOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleBulkMap} disabled={!bulkMapTarget}>
                Map Type
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV PREVIEW */}
      {isImportOpen && (
        <div className="modal-backdrop open">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>CSV Import Preview</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsImportOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Review detected CSV rows before importing.
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <table className="data-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>SKU Name</th>
                      <th>SKU Number</th>
                      <th>Category</th>
                      <th>Product Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.map((r) => (
                      <tr key={r.line} style={{ background: r.dupe || !r.catId ? 'rgba(239, 68, 68, 0.05)' : 'none' }}>
                        <td>{r.line}</td>
                        <td>{r.name}</td>
                        <td>{r.number}</td>
                        <td>{r.catName || '—'}</td>
                        <td>{r.typeName || '—'}</td>
                        <td>
                          {r.dupe ? (
                            <span style={{ color: 'var(--danger)' }}>Duplicate</span>
                          ) : !r.catId ? (
                            <span style={{ color: 'var(--danger)' }}>Missing Category</span>
                          ) : (
                            <span style={{ color: 'var(--success)' }}>Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsImportOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={triggerCSVImport}
                disabled={importData.filter((r) => !r.dupe && r.catId).length === 0}
              >
                Import Valid Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SYNC PANEL POPUP */}
      {isSyncLogOpen && (
        <div className="modal-backdrop open" onClick={() => setIsSyncLogOpen(false)}>
          <div className="modal" style={{ maxWidth: '500px', marginLeft: 'auto', marginRight: '20px', marginTop: '80px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 ERP Sync Log</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsSyncLogOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="sync-list">
                {syncLogs.map((e, idx) => (
                  <div key={idx} className="sync-entry" style={{ padding: '8px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>
                        <span className={`sync-dot sync-${e.st}`} style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', marginRight: '6px' }}></span>
                        {e.s} → {e.a}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{e.t}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {e.d}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
