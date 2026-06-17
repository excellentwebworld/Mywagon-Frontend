import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import type { Category, ProductType, SKU } from '../../../context/AppContext';
import { SYNC_LOGS } from '../constants';
import {
  EMPTY_NEW_CAT,
  EMPTY_NEW_SKU,
  EMPTY_NEW_TYPE,
  type ImportRow,
  type NewCatForm,
  type NewSkuForm,
  type NewTypeForm,
  type SelectedKind,
  type SortOption,
  type ViewMode,
} from '../types';
import { filterSkus, filterTypes, getCategoryName } from '../utils/productUtils';

export function useProductMaster() {
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

  const [viewMode, setViewMode] = useState<ViewMode>('skus');
  const [activeCat, setActiveCat] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<SKU | ProductType | null>(null);
  const [selectedKind, setSelectedKind] = useState<SelectedKind>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [filterSource, setFilterSource] = useState('');
  const [filterSync, setFilterSync] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterUnmapped, setFilterUnmapped] = useState(false);
  const [kpiFilter, setKpiFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const [addDropdownOpen, setAddDropdownOpen] = useState(false);

  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [newType, setNewType] = useState<NewTypeForm>(EMPTY_NEW_TYPE);

  const [isSkuOpen, setIsSkuOpen] = useState(false);
  const [editSkuMode, setEditSkuMode] = useState(false);
  const [newSku, setNewSku] = useState<NewSkuForm>(EMPTY_NEW_SKU);

  const [isCatOpen, setIsCatOpen] = useState(false);
  const [newCat, setNewCat] = useState<NewCatForm>(EMPTY_NEW_CAT);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState('');
  const [renameName, setRenameName] = useState('');

  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeSrc, setMergeSrc] = useState<ProductType | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');

  const [isBulkMapOpen, setIsBulkMapOpen] = useState(false);
  const [bulkMapTarget, setBulkMapTarget] = useState('');

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);

  const [isSyncLogOpen, setIsSyncLogOpen] = useState(false);
  const [secCollapsed, setSecCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.add-wrap')) {
        setAddDropdownOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const toggleSec = useCallback((key: string) => {
    setSecCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
    setSelectedKind('');
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterSource('');
    setFilterSync('');
    setFilterActive('');
    setFilterCat('');
    setFilterUnmapped(false);
    setKpiFilter('');
    setActiveCat('all');
    setActiveType('all');
    setViewMode('skus');
    clearSelection();
    setSelectedIds(new Set());
    showToast(t('filtersCleared'));
  }, [clearSelection, showToast, t]);

  const totalSkusCount = useMemo(() => skus.filter((s) => s.active).length, [skus]);
  const erpSyncedCount = useMemo(() => skus.filter((s) => s.source === 'erp' && s.active).length, [skus]);
  const manualCount = useMemo(() => skus.filter((s) => s.source === 'manual' && s.active).length, [skus]);
  const syncIssuesCount = useMemo(
    () => skus.filter((s) => s.erp.status === 'error' || s.erp.status === 'conflict').length,
    [skus]
  );
  const unmappedCount = useMemo(() => skus.filter((s) => !s.typeId && s.active).length, [skus]);
  const inactiveCount = useMemo(() => skus.filter((s) => !s.active).length, [skus]);

  const handleKpiClick = useCallback(
    (k: string) => {
      setKpiFilter((prev) => (prev === k ? '' : k));
      clearSelection();
    },
    [clearSelection]
  );

  const filteredSkus = useMemo(
    () =>
      filterSkus(skus, productTypes, {
        kpiFilter,
        filterSource,
        filterSync,
        filterActive,
        filterUnmapped,
        filterCat,
        activeCat,
        activeType,
        searchQuery,
        sortBy,
      }),
    [
      skus,
      productTypes,
      kpiFilter,
      filterSource,
      filterSync,
      filterActive,
      filterUnmapped,
      filterCat,
      activeCat,
      activeType,
      searchQuery,
      sortBy,
    ]
  );

  const filteredTypes = useMemo(
    () => filterTypes(productTypes, { activeCat, searchQuery }),
    [productTypes, activeCat, searchQuery]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      clearSelection();
    },
    [clearSelection]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(filteredSkus.map((s) => s.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [filteredSkus]
  );

  const handleToggleRowSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleBulkToggleActive = useCallback(() => {
    selectedIds.forEach((id) => {
      const sku = skus.find((s) => s.id === id);
      if (sku) updateSku({ ...sku, active: !sku.active });
    });
    showToast(`Toggled status for ${selectedIds.size} item(s)`, 'success');
    setSelectedIds(new Set());
  }, [selectedIds, skus, updateSku, showToast]);

  const handleBulkArchive = useCallback(() => {
    if (window.confirm(lang === 'el' ? 'Αρχειοθέτηση επιλεγμένων SKU;' : 'Archive selected SKUs?')) {
      selectedIds.forEach((id) => {
        const sku = skus.find((s) => s.id === id);
        if (sku) updateSku({ ...sku, active: false });
      });
      showToast(`Archived ${selectedIds.size} item(s)`, 'info');
      setSelectedIds(new Set());
    }
  }, [lang, selectedIds, skus, updateSku, showToast]);

  const handleBulkMap = useCallback(() => {
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
  }, [bulkMapTarget, productTypes, selectedIds, skus, updateSku, showToast]);

  const handleCreateType = useCallback(() => {
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
    setNewType(EMPTY_NEW_TYPE);
    showToast(t('created'), 'success');
  }, [addProductType, newType, showToast, t]);

  const handleSaveSku = useCallback(() => {
    if (!newSku.catId || !newSku.name.trim() || !newSku.number.trim()) {
      showToast('Category, Name, and Number are required', 'error');
      return;
    }
    const tagsArr = newSku.tags ? newSku.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [];

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
      setNewSku(EMPTY_NEW_SKU);
      showToast(t('created'), 'success');
    }
  }, [addSku, editSkuMode, newSku, selectedItem, selectedKind, skus, showToast, t, updateSku]);

  const handleCreateCategory = useCallback(() => {
    if (!newCat.name.trim()) return;
    addCategory(newCat.name.trim(), newCat.name.trim(), newCat.icon);
    setIsCatOpen(false);
    setNewCat(EMPTY_NEW_CAT);
    showToast(t('created'), 'success');
  }, [addCategory, newCat, showToast, t]);

  const handleRenameType = useCallback(() => {
    if (!renameName.trim()) return;
    const tp = productTypes.find((x) => x.id === renameId);
    if (tp) {
      const updated = { ...tp, name: renameName.trim() };
      updateProductType(updated);
      setSelectedItem(updated);
      setIsRenameOpen(false);
      showToast(`Renamed to "${updated.name}"`, 'success');
    }
  }, [productTypes, renameId, renameName, updateProductType, showToast]);

  const handleMergeTypes = useCallback(() => {
    if (!mergeSrc || !mergeTarget) return;
    const targetType = productTypes.find((x) => x.id === mergeTarget);
    if (!targetType) return;

    skus.forEach((s) => {
      if (s.typeId === mergeSrc.id) {
        updateSku({ ...s, typeId: targetType.id, catId: targetType.catId });
      }
    });
    updateProductType({ ...mergeSrc, active: false });
    setIsMergeOpen(false);
    clearSelection();
    showToast(`Merged "${mergeSrc.name}" into "${targetType.name}"`, 'success');
  }, [mergeSrc, mergeTarget, productTypes, skus, updateProductType, updateSku, clearSelection, showToast]);

  const handleCSVUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

        const parsed: ImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(sep).map((v) => v.replace(/^"|"$/g, '').trim());
          const nm = values[indexMap.name] || '';
          const nu = values[indexMap.number] || '';
          if (!nm || !nu) continue;

          const cn = indexMap.category >= 0 ? values[indexMap.category] : '';
          const tn = indexMap.type >= 0 ? values[indexMap.type] : '';
          const cat = categories.find(
            (c) => getCategoryName(c, lang).toLowerCase() === cn.toLowerCase()
          );
          const tp = cat
            ? productTypes.find((x) => x.catId === cat.id && x.name.toLowerCase() === tn.toLowerCase())
            : null;

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
      e.target.value = '';
    },
    [categories, lang, productTypes, skus, showToast]
  );

  const triggerCSVImport = useCallback(() => {
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
        tags: r.tags ? r.tags.split(/[;,]/).map((x) => x.trim()).filter(Boolean) : [],
      });
    });
    setIsImportOpen(false);
    setImportData([]);
    showToast(`Imported ${okRows.length} SKU(s) successfully`, 'success');
  }, [addSku, importData, showToast]);

  const openAddSku = useCallback(() => {
    setEditSkuMode(false);
    setNewSku(EMPTY_NEW_SKU);
    setIsSkuOpen(true);
    setAddDropdownOpen(false);
  }, []);

  const openAddType = useCallback(() => {
    setIsTypeOpen(true);
    setAddDropdownOpen(false);
  }, []);

  const openAddCategory = useCallback(() => {
    setIsCatOpen(true);
    setAddDropdownOpen(false);
  }, []);

  const openEditSku = useCallback((s: SKU) => {
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
  }, []);

  const catName = useCallback((c: Category) => getCategoryName(c, lang), [lang]);

  return {
    lang,
    t,
    showToast,
    categories,
    productTypes,
    skus,
    viewMode,
    setViewMode,
    activeCat,
    setActiveCat,
    activeType,
    setActiveType,
    searchQuery,
    handleSearchChange,
    selectedItem,
    setSelectedItem,
    selectedKind,
    setSelectedKind,
    selectedIds,
    setSelectedIds,
    filterSource,
    setFilterSource,
    filterSync,
    setFilterSync,
    filterActive,
    setFilterActive,
    filterCat,
    setFilterCat,
    filterUnmapped,
    setFilterUnmapped,
    kpiFilter,
    sortBy,
    setSortBy,
    addDropdownOpen,
    setAddDropdownOpen,
    isTypeOpen,
    setIsTypeOpen,
    newType,
    setNewType,
    isSkuOpen,
    setIsSkuOpen,
    editSkuMode,
    newSku,
    setNewSku,
    isCatOpen,
    setIsCatOpen,
    newCat,
    setNewCat,
    isRenameOpen,
    setIsRenameOpen,
    renameId,
    setRenameId,
    renameName,
    setRenameName,
    isMergeOpen,
    setIsMergeOpen,
    mergeSrc,
    setMergeSrc,
    mergeTarget,
    setMergeTarget,
    isBulkMapOpen,
    setIsBulkMapOpen,
    bulkMapTarget,
    setBulkMapTarget,
    isImportOpen,
    setIsImportOpen,
    importData,
    isSyncLogOpen,
    setIsSyncLogOpen,
    secCollapsed,
    toggleSec,
    clearSelection,
    clearFilters,
    totalSkusCount,
    erpSyncedCount,
    manualCount,
    syncIssuesCount,
    unmappedCount,
    inactiveCount,
    handleKpiClick,
    filteredSkus,
    filteredTypes,
    handleSelectAll,
    handleToggleRowSelection,
    handleBulkToggleActive,
    handleBulkArchive,
    handleBulkMap,
    handleCreateType,
    handleSaveSku,
    handleCreateCategory,
    handleRenameType,
    handleMergeTypes,
    handleCSVUpload,
    triggerCSVImport,
    openAddSku,
    openAddType,
    openAddCategory,
    openEditSku,
    catName,
    updateSku,
    updateProductType,
    syncLogs: SYNC_LOGS,
  };
}

export type ProductMasterState = ReturnType<typeof useProductMaster>;
