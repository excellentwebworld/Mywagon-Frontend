import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { LocationItem, Company, Contact } from '../context/AppContext';

const DIR_ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  archive: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 5v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
};

const ICON_NAMES = ['folder', 'tag', 'star', 'truck', 'briefcase', 'users', 'home', 'archive'];

const TYPE_COLORS: Record<string, string> = {
  Warehouse: '#0EA5E9',
  Plant: '#10B981',
  Store: '#F59E0B',
  Office: '#8E8E9A',
  'Cross-dock': '#7C3AED',
  Port: '#0891B2',
};

interface DirectoryItem {
  id: string;
  name: string;
  icon: string;
  system: boolean;
  filter: ((l: LocationItem) => boolean) | null;
}

export const AddressBook: React.FC = () => {
  const {
    locations,
    addLocation,
    updateLocation,
    archiveLocation,
    restoreLocation,
    companies,
    addCompany,
    lang,
    t,
    showToast,
  } = useApp();

  // Custom directories state
  const [directories, setDirectories] = useState<DirectoryItem[]>([
    { id: 'all', name: lang === 'el' ? 'Όλες οι Τοποθεσίες' : 'All Locations', icon: 'home', system: true, filter: null },
    { id: 'my', name: lang === 'el' ? 'Οι Τοποθεσίες μου' : 'My Locations', icon: 'briefcase', system: false, filter: (l) => l.group === 'my' },
    { id: 'customer', name: lang === 'el' ? 'Τοποθεσίες Πελατών' : 'Customer Locations', icon: 'users', system: false, filter: (l) => l.group === 'customer' },
    { id: 'archived', name: lang === 'el' ? 'Αρχειοθετημένα' : 'Archived', icon: 'archive', system: true, filter: (l) => l.status === 'archived' },
  ]);

  // Sync default directory names when language changes
  useEffect(() => {
    setDirectories((prev) =>
      prev.map((d) => {
        if (d.id === 'all') return { ...d, name: lang === 'el' ? 'Όλες οι Τοποθεσίες' : 'All Locations' };
        if (d.id === 'my') return { ...d, name: lang === 'el' ? 'Οι Τοποθεσίες μου' : 'My Locations' };
        if (d.id === 'customer') return { ...d, name: lang === 'el' ? 'Τοποθεσίες Πελατών' : 'Customer Locations' };
        if (d.id === 'archived') return { ...d, name: lang === 'el' ? 'Αρχειοθετημένα' : 'Archived' };
        return d;
      })
    );
  }, [lang]);

  // Address book states
  const [activeNode, setActiveNode] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLoc, setSelectedLoc] = useState<LocationItem | null>(null);

  // Active filter pills
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    role: false,
    type: false,
    city: false,
    appt: false,
    hours: false,
    active: false,
  });

  // Adding directory inline
  const [addingDir, setAddingDir] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [newDirIcon, setNewDirIcon] = useState('folder');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState<string>('Name A–Z');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createData, setCreateData] = useState({
    context: 'my',
    company: '',
    template: '',
    name: '',
    address: '',
    city: '',
    postal: '',
    role: 'both' as 'both' | 'pickup' | 'delivery',
    type: 'Warehouse',
    appt: false,
    hours: '',
    dock: '',
    equipment: [] as string[],
    maxTruck: '',
    maxWeight: '',
    adr: false,
    palletExchange: false,
    loadTime: '',
    noteInternal: '',
    noteCarrier: '',
    contacts: [] as Contact[],
    code: '',
    tags: '',
  });

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<LocationItem | null>(null);

  // Company modal state
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [companyData, setCompanyData] = useState({
    name: '',
    vat: '',
    address: '',
    country: 'Greece',
    phone: '',
    email: '',
    website: '',
    contactPerson: '',
    industry: '',
  });

  // Search filter results for companies (Step 1 of creation)
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  // Toggle detail pane section collapse
  const [secCollapsed, setSecCollapsed] = useState<Record<string, boolean>>({});

  const toggleSec = (secKey: string) => {
    setSecCollapsed((prev) => ({ ...prev, [secKey]: !prev[secKey] }));
  };

  const getFilteredLocations = () => {
    const dir = directories.find((d) => d.id === activeNode);
    return locations
      .filter((l) => {
        if (activeNode === 'all') return l.status === 'active';
        if (activeNode === 'archived') return l.status === 'archived';
        if (dir?.filter) return l.status === 'active' && dir.filter(l);
        return l.status === 'active' && l.group === activeNode;
      })
      .filter((l) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const contactStrings = l.contacts.map((c) => `${c.name} ${c.phone} ${c.email}`).join(' ');
        return (
          l.name.toLowerCase().includes(q) ||
          l.company.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.region.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          (l.code && l.code.toLowerCase().includes(q)) ||
          (l.custCode && l.custCode.toLowerCase().includes(q)) ||
          l.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          contactStrings.toLowerCase().includes(q)
        );
      })
      .filter((l) => {
        // Apply pill filter overrides as mock filters
        if (activeFilters.appt && !l.appt) return false;
        if (activeFilters.active && l.status !== 'active') return false;
        if (activeFilters.role && l.role === 'both') return true; // match anything for mockup
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'Name A–Z') return a.name.localeCompare(b.name);
        if (sortBy === 'City') return a.city.localeCompare(b.city);
        return 0; // fallback
      });
  };

  const getNodeCount = (dir: DirectoryItem) => {
    if (dir.id === 'all') return locations.filter((l) => l.status === 'active').length;
    if (dir.id === 'archived') return locations.filter((l) => l.status === 'archived').length;
    if (dir.filter) return locations.filter((l) => l.status === 'active' && dir.filter!(l)).length;
    return locations.filter((l) => l.status === 'active' && l.group === dir.id).length;
  };

  const getDirectoryWarnings = (dir: DirectoryItem) => {
    if (dir.system || dir.id === 'archived') return 0;
    return locations.filter((l) => {
      const inDir = dir.filter ? dir.filter(l) : l.group === dir.id;
      return inDir && l.status === 'active' && (!l.geoVerified || l.contacts.length === 0);
    }).length;
  };

  const saveNewDir = () => {
    if (!newDirName.trim()) {
      showToast('Enter a directory name', 'warning');
      return;
    }
    const id = `custom-${Date.now()}`;
    const newDir: DirectoryItem = {
      id,
      name: newDirName.trim(),
      icon: newDirIcon,
      system: false,
      filter: (l) => l.tags.includes(newDirName.trim()) || l.group === id,
    };
    const archIdx = directories.findIndex((d) => d.id === 'archived');
    const updated = [...directories];
    updated.splice(archIdx, 0, newDir);
    setDirectories(updated);
    setNewDirName('');
    setAddingDir(false);
    showToast(`Directory "${newDir.name}" created`, 'success');
  };

  const deleteDirectory = (id: string, name: string) => {
    if (window.confirm(`Delete directory "${name}"? Locations will remain in All Locations.`)) {
      setDirectories((prev) => prev.filter((d) => d.id !== id));
      if (activeNode === id) {
        setActiveNode('all');
        setSelectedLoc(null);
      }
      showToast(`Directory "${name}" deleted`, 'info');
    }
  };

  const handleCopy = (txt: string, msg: string) => {
    navigator.clipboard.writeText(txt);
    showToast(msg, 'success');
  };

  const handleDuplicate = (l: LocationItem) => {
    const newLoc: LocationItem = {
      ...l,
      id: `LOC-${String(locations.length + 1).padStart(3, '0')}`,
      name: `${l.name} (Copy)`,
      created: new Date().toLocaleDateString('en-GB'),
      lastUsed: 'Never',
      shipments30: 0,
      shipments90: 0,
      otd: 100,
    };
    addLocation(newLoc);
    setSelectedLoc(newLoc);
  };

  const applyTemplate = (tpl: string) => {
    setCreateData((prev) => {
      const base = { ...prev, template: tpl };
      if (tpl === 'retail') {
        base.type = 'Cross-dock';
        base.appt = true;
        base.dock = 'Dock-level';
        base.hours = 'Mon-Fri 06:00–16:00';
      } else if (tpl === 'factory') {
        base.type = 'Plant';
        base.appt = true;
        base.dock = 'Dock-level';
        base.hours = 'Mon-Fri 05:00–21:00';
      } else if (tpl === 'warehouse') {
        base.type = 'Warehouse';
        base.appt = true;
        base.dock = 'Dock-level';
        base.hours = 'Mon-Fri 07:00–19:00';
      } else if (tpl === 'store') {
        base.type = 'Store';
        base.appt = false;
        base.dock = 'Ramp';
        base.hours = 'Mon-Sat 06:00–14:00';
        base.maxTruck = '12m';
        base.maxWeight = '19T';
      }
      return base;
    });
  };

  const submitNewLocation = () => {
    if (!createData.name.trim()) {
      showToast('Location name is required', 'error');
      setCreateStep(2);
      return;
    }
    const payload: Omit<LocationItem, 'id' | 'created' | 'status'> = {
      name: createData.name.trim(),
      company: createData.context === 'my' ? 'ΒΙΚΟΣ Α.Ε.' : createData.company || '—',
      group: createData.context as 'my' | 'customer',
      city: createData.city.trim() || '—',
      region: '',
      address: createData.address.trim() || '—',
      lat: 39.643 + (Math.random() - 0.5) * 0.2,
      lng: 20.878 + (Math.random() - 0.5) * 0.2,
      geoVerified: false,
      role: createData.role,
      type: createData.type,
      appt: createData.appt,
      hours: createData.hours,
      dock: createData.dock,
      equipment: createData.equipment,
      maxTruck: createData.maxTruck,
      maxWeight: createData.maxWeight,
      adr: createData.adr,
      palletExchange: createData.palletExchange,
      loadTime: parseInt(createData.loadTime) || 0,
      contacts: createData.contacts.filter((c) => c.name),
      tags: createData.tags ? createData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      code: createData.code,
      custCode: '',
      lastUsed: 'Never',
      shipments30: 0,
      shipments90: 0,
      otd: 100,
      noteInternal: createData.noteInternal,
      noteCarrier: createData.noteCarrier,
    };

    addLocation(payload);
    setIsCreateOpen(false);
    // Find newly added location by name
    setTimeout(() => {
      const newlyAdded = locations.find((l) => l.name === payload.name);
      if (newlyAdded) setSelectedLoc(newlyAdded);
    }, 100);
  };

  const saveEditedLocation = () => {
    if (editData) {
      if (!editData.name.trim()) {
        showToast('Location name is required', 'error');
        return;
      }
      updateLocation(editData);
      setSelectedLoc(editData);
      setIsEditOpen(false);
    }
  };

  const handleCreateCompany = () => {
    if (!companyData.name.trim() || !companyData.vat.trim() || !companyData.address.trim()) {
      showToast('Name, VAT, and Address are required', 'error');
      return;
    }
    const payload: Omit<Company, 'id'> = {
      name: companyData.name.trim(),
      vat: companyData.vat.trim(),
      address: companyData.address.trim(),
      country: companyData.country,
      phone: companyData.phone,
      email: companyData.email,
      website: companyData.website,
      contactPerson: companyData.contactPerson,
      industry: companyData.industry,
    };
    addCompany(payload);
    setCreateData((prev) => ({ ...prev, company: payload.name }));
    setIsCompanyOpen(false);
    setCompanyData({
      name: '',
      vat: '',
      address: '',
      country: 'Greece',
      phone: '',
      email: '',
      website: '',
      contactPerson: '',
      industry: '',
    });
  };

  const filteredLocations = getFilteredLocations();

  return (
    <div className="ab-wrap animate-fade-in" style={{ padding: '0px' }}>
      {/* Page Header */}
      <div className="ab-head" style={{ marginBottom: '16px' }}>
        <div className="ab-head-l">
          <h1 className="text-h2" style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
            {lang === 'el' ? 'Βιβλίο Διευθύνσεων' : 'Address Book'}
          </h1>
          <p className="ab-sub" style={{ margin: '4px 0 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            {lang === 'el'
              ? 'Διαχειριστείτε τοποθεσίες, επαφές και επιχειρησιακά προφίλ'
              : 'Manage locations, contacts and operational profiles'}
          </p>
        </div>
        <div className="ab-head-r" style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => showToast(lang === 'el' ? 'Εξαγωγή CSV…' : 'Exporting CSV…')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t('export')}</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setCreateStep(1); setIsCreateOpen(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{lang === 'el' ? 'Νέα Τοποθεσία' : 'New Location'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ab-fbar" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
        <div className="ab-search" style={{ position: 'relative', flex: 1 }}>
          <svg
            className="si"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-tertiary)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="w-full"
            placeholder={lang === 'el' ? 'Αναζήτηση ονόματος, διεύθυνσης, πόλης, επαφής…' : 'Search name, address, city, contact…'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedLoc(null);
            }}
            style={{ paddingLeft: '32px' }}
          />
        </div>
        {Object.keys(activeFilters).map((filterKey) => (
          <button
            key={filterKey}
            className={`ab-fpill ${activeFilters[filterKey] ? 'active' : ''}`}
            onClick={() => {
              setActiveFilters((prev) => ({ ...prev, [filterKey]: !prev[filterKey] }));
              showToast(lang === 'el' ? 'Φίλτρο άλλαξε' : 'Filter toggled');
            }}
          >
            {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
          </button>
        ))}
        <button
          className="ab-fclear"
          onClick={() => {
            setSearchQuery('');
            setActiveFilters({
              role: false,
              type: false,
              city: false,
              appt: false,
              hours: false,
              active: false,
            });
            setSelectedLoc(null);
            showToast(t('filtersCleared'));
          }}
        >
          {t('clearAll')}
        </button>
      </div>

      {/* 3-Pane Layout */}
      <div className="ab-panes">
        {/* LEFT Pane: Directory Tree */}
        <div className="dir-pane">
          <div className="dir-pane-head" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            {lang === 'el' ? 'Κατάλογος' : 'Directory'}
          </div>
          {directories.map((d) => {
            const count = getNodeCount(d);
            const isAct = activeNode === d.id;
            const isArch = d.id === 'archived';
            const warnings = getDirectoryWarnings(d);

            return (
              <React.Fragment key={d.id}>
                {isArch && <div className="dir-sep"></div>}
                <div
                  className={`dir-node ${isAct ? 'active' : ''} ${isArch ? 'opacity-60' : ''}`}
                  onClick={() => {
                    setActiveNode(d.id);
                    setSelectedLoc(null);
                  }}
                >
                  {DIR_ICONS[d.icon] || DIR_ICONS.folder}
                  <span className="dir-node-label">{d.name}</span>
                  {warnings > 0 && (
                    <span className="dir-warn" title={`${warnings} locations need data`}></span>
                  )}
                  <span className="dir-count">{count}</span>
                  {!d.system && (
                    <button
                      className="dir-del"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDirectory(d.id, d.name);
                      }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {d.id === 'all' && <div className="dir-sep"></div>}
              </React.Fragment>
            );
          })}

          {addingDir ? (
            <div className="dir-edit-row">
              <div className="icon-picker-wrap">
                <button
                  type="button"
                  className="icon-picker-btn"
                  onClick={() => setIconPickerOpen(!iconPickerOpen)}
                >
                  {DIR_ICONS[newDirIcon]}
                </button>
                {iconPickerOpen && (
                  <div className="icon-picker-dd open">
                    {ICON_NAMES.map((ic) => (
                      <div
                        key={ic}
                        className={`ip-opt ${newDirIcon === ic ? 'selected' : ''}`}
                        onClick={() => {
                          setNewDirIcon(ic);
                          setIconPickerOpen(false);
                        }}
                      >
                        {DIR_ICONS[ic]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                placeholder="Name…"
                value={newDirName}
                onChange={(e) => setNewDirName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveNewDir();
                  if (e.key === 'Escape') setAddingDir(false);
                }}
                autoFocus
              />
              <button className="save-btn" onClick={saveNewDir}>
                Save
              </button>
              <button className="cancel-btn" onClick={() => setAddingDir(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="dir-add-btn" onClick={() => setAddingDir(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{lang === 'el' ? 'Προσθήκη καταλόγου' : 'Add directory'}</span>
            </button>
          )}
        </div>

        {/* CENTER Pane: Location List */}
        <div className="list-pane">
          <div className="list-toolbar">
            <span className="list-toolbar-title" style={{ fontSize: '15px', fontWeight: 600 }}>
              {directories.find((d) => d.id === activeNode)?.name || 'Locations'}
            </span>
            <select className="sort-sel" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option>Name A–Z</option>
              <option>City</option>
            </select>
            <span className="list-info">{filteredLocations.length} locations</span>
          </div>

          <div className="tbl-scroll">
            <table className="ab-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>City / Region</th>
                  <th>Role</th>
                  <th>Operational</th>
                  <th>Contact</th>
                  <th>Last used</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 14px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      {t('noItems')}
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((l) => {
                    const roleCls = l.role === 'pickup' ? 'role-pickup' : l.role === 'delivery' ? 'role-delivery' : 'role-both';
                    const roleLabel = l.role === 'pickup' ? t('pickup') : l.role === 'delivery' ? t('delivery') : 'Both';
                    const isSel = selectedLoc?.id === l.id;

                    return (
                      <tr key={l.id} className={isSel ? 'selected' : ''} onClick={() => setSelectedLoc(l)}>
                        <td>
                          <div className="loc-name" style={{ fontWeight: 600 }}>{l.name}</div>
                          <div className="loc-meta">{l.company}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px' }}>{l.city}</div>
                          <div className="loc-meta">{l.region || '—'}</div>
                        </td>
                        <td>
                          <span className={`role-badge ${roleCls}`}>{roleLabel}</span>
                        </td>
                        <td>
                          <div className="ops-chips">
                            {l.appt && <span className="op-chip">📅 Appt</span>}
                            {l.hours && <span className="op-chip">🕐 Hours</span>}
                            {l.dock && <span className="op-chip">{l.dock}</span>}
                            {l.maxTruck && parseFloat(l.maxTruck) < 13 && (
                              <span className="op-chip warn">⚠ {l.maxTruck}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {l.contacts[0] ? (
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 500 }}>{l.contacts[0].name}</div>
                              <div className="contact-ph">{l.contacts[0].phone}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className="ts-cell">{l.lastUsed}</span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className="act-btn" onClick={() => showToast('Actions Menu')}>
                            ⋯
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT Pane: Detail Panel */}
        <div className={`detail-pane ${selectedLoc ? 'open' : ''}`}>
          {selectedLoc && (
            <div className="dp-inner">
              <div className="dp-hero">
                <button className="dp-close-btn" onClick={() => setSelectedLoc(null)}>
                  ✕
                </button>
                <div className="dp-badges">
                  <span className={`role-badge ${selectedLoc.role === 'pickup' ? 'role-pickup' : selectedLoc.role === 'delivery' ? 'role-delivery' : 'role-both'}`}>
                    {selectedLoc.role === 'pickup' ? t('pickup') : selectedLoc.role === 'delivery' ? t('delivery') : 'Both'}
                  </span>
                  <span className="dp-type-badge" style={{ background: TYPE_COLORS[selectedLoc.type] || 'var(--text-tertiary)' }}>
                    {selectedLoc.type}
                  </span>
                  {selectedLoc.status === 'archived' && (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '4px', background: 'var(--surface-alt)', color: 'var(--text-tertiary)' }}>
                      Archived
                    </span>
                  )}
                  {selectedLoc.tags.map((tag) => (
                    <span key={tag} className="dp-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="dp-name" style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>
                  {selectedLoc.name}
                </div>
                <div className="dp-company">
                  {selectedLoc.company}
                  {selectedLoc.code && ` · `}
                  {selectedLoc.code && <span className="dp-code">{selectedLoc.code}</span>}
                </div>
                <div className="dp-addr">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{selectedLoc.address}</span>
                  <button className="dp-copy-btn" onClick={() => handleCopy(selectedLoc.address, 'Address copied')}>
                    Copy
                  </button>
                </div>
                <div className="dp-geo">
                  <span className="geo-dot" style={{ background: selectedLoc.geoVerified ? 'var(--success)' : 'var(--warning)' }}></span>
                  {selectedLoc.lat.toFixed(3)}, {selectedLoc.lng.toFixed(3)}
                  <span className="geo-status" style={{ color: selectedLoc.geoVerified ? 'var(--success)' : 'var(--warning)' }}>
                    · {selectedLoc.geoVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div className="dp-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditData(JSON.parse(JSON.stringify(selectedLoc)));
                      setIsEditOpen(true);
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDuplicate(selectedLoc)}>
                    Duplicate
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => showToast('Starting shipment setup')}>
                    + Shipment
                  </button>
                  {selectedLoc.status === 'active' ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => {
                        if (window.confirm(`Archive "${selectedLoc.name}"? It will be moved to the Archived directory.`)) {
                          archiveLocation(selectedLoc.id);
                          setSelectedLoc(null);
                        }
                      }}
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--success)' }}
                      onClick={() => {
                        restoreLocation(selectedLoc.id);
                      }}
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>

              {/* Map embed */}
              <div className="dp-sec">
                <div className="dp-sec-header" onClick={() => toggleSec('map')}>
                  🗺️ Location Map
                  <span className={`dp-chev ${!secCollapsed.map ? 'open' : ''}`}>▼</span>
                </div>
                {!secCollapsed.map && (
                  <div className="dp-sec-body" style={{ padding: 0 }}>
                    <div className="dp-map-box">
                      <iframe
                        title="Location Map"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLoc.lng - 0.008}%2C${selectedLoc.lat - 0.005}%2C${selectedLoc.lng + 0.008}%2C${selectedLoc.lat + 0.005}&layer=mapnik&marker=${selectedLoc.lat}%2C${selectedLoc.lng}`}
                        loading="lazy"
                        style={{ border: 0, width: '100%', height: '200px' }}
                      ></iframe>
                      <a
                        className="dp-map-link"
                        href={`https://www.openstreetmap.org/?mlat=${selectedLoc.lat}&mlon=${selectedLoc.lng}#map=16/${selectedLoc.lat}/${selectedLoc.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open full map →
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="dp-sec">
                <div className="dp-sec-header" onClick={() => toggleSec('stats')}>
                  📊 Quick Stats
                  <span className={`dp-chev ${!secCollapsed.stats ? 'open' : ''}`}>▼</span>
                </div>
                {!secCollapsed.stats && (
                  <div className="dp-sec-body">
                    <div className="stat-grid">
                      <div className="stat-card">
                        <div className="stat-val">{selectedLoc.shipments30}</div>
                        <div className="stat-label">Shipments (30d)</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-val">{selectedLoc.shipments90}</div>
                        <div className="stat-label">Shipments (90d)</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-val">{selectedLoc.otd ? `${selectedLoc.otd}%` : '—'}</div>
                        <div className="stat-label">On-time rate</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-val">{selectedLoc.loadTime ? `${selectedLoc.loadTime}m` : '—'}</div>
                        <div className="stat-label">Avg dwell</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hours */}
              <div className="dp-sec">
                <div className="dp-sec-header" onClick={() => toggleSec('hours')}>
                  🕐 Hours & Scheduling
                  <span className={`dp-chev ${!secCollapsed.hours ? 'open' : ''}`}>▼</span>
                </div>
                {!secCollapsed.hours && (
                  <div className="dp-sec-body">
                    <div className="dp-row">
                      <span className="label">Appointment</span>
                      <span className="val">{selectedLoc.appt ? '✅ Yes' : 'No'}</span>
                    </div>
                    <div className="dp-row">
                      <span className="label">Hours</span>
                      <span className="val" style={{ fontSize: '11px' }}>
                        {selectedLoc.hours || 'Not set'}
                      </span>
                    </div>
                    <div className="dp-row">
                      <span className="label">Dock</span>
                      <span className="val">{selectedLoc.dock || '—'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contacts */}
              <div className="dp-sec">
                <div className="dp-sec-header" onClick={() => toggleSec('contacts')}>
                  🤝 Contacts ({selectedLoc.contacts.length})
                  <span className={`dp-chev ${!secCollapsed.contacts ? 'open' : ''}`}>▼</span>
                </div>
                {!secCollapsed.contacts && (
                  <div className="dp-sec-body">
                    {selectedLoc.contacts.length > 0 ? (
                      selectedLoc.contacts.map((c, idx) => (
                        <div key={idx} className="dp-contact-card" style={{ marginBottom: '8px' }}>
                          <div className="dp-contact-role">{c.role}</div>
                          <div className="dp-contact-name">{c.name}</div>
                          <div className="dp-contact-info">
                            {c.phone && (
                              <span>
                                📞 <span className="mono">{c.phone}</span>
                                <br />
                              </span>
                            )}
                            {c.email && <span>✉️ {c.email}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '8px 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        No contacts.{' '}
                        <span
                          style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                          onClick={() => {
                            setEditData(JSON.parse(JSON.stringify(selectedLoc)));
                            setIsEditOpen(true);
                          }}
                        >
                          Add one →
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Access restrictions */}
              <div className="dp-sec">
                <div className="dp-sec-header" onClick={() => toggleSec('access')}>
                  ⚠️ Access & Restrictions
                  <span className={`dp-chev ${!secCollapsed.access ? 'open' : ''}`}>▼</span>
                </div>
                {!secCollapsed.access && (
                  <div className="dp-sec-body">
                    <div className="dp-row">
                      <span className="label">Max truck</span>
                      <span className="val">{selectedLoc.maxTruck || '—'}</span>
                    </div>
                    <div className="dp-row">
                      <span className="label">Max weight</span>
                      <span className="val">{selectedLoc.maxWeight || '—'}</span>
                    </div>
                    <div className="dp-row">
                      <span className="label">ADR</span>
                      <span className="val">{selectedLoc.adr ? '✅' : '❌'}</span>
                    </div>
                    <div className="dp-row">
                      <span className="label">Pallet exchange</span>
                      <span className="val">{selectedLoc.palletExchange ? '✅' : '❌'}</span>
                    </div>
                    <div className="dp-row">
                      <span className="label">Equipment</span>
                      <span className="val">
                        {selectedLoc.equipment.length ? selectedLoc.equipment.join(', ') : '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="dp-sec">
                <div className="dp-sec-header" onClick={() => toggleSec('notes')}>
                  📝 Notes
                  <span className={`dp-chev ${!secCollapsed.notes ? 'open' : ''}`}>▼</span>
                </div>
                {!secCollapsed.notes && (
                  <div className="dp-sec-body">
                    {selectedLoc.noteInternal && (
                      <div className="dp-note internal" style={{ marginBottom: '8px' }}>
                        <div className="dp-note-label">🔒 Internal</div>
                        {selectedLoc.noteInternal}
                      </div>
                    )}
                    {selectedLoc.noteCarrier && (
                      <div className="dp-note carrier">
                        <div className="dp-note-label">🚛 Carrier-visible</div>
                        {selectedLoc.noteCarrier}
                      </div>
                    )}
                    {!selectedLoc.noteInternal && !selectedLoc.noteCarrier && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>No notes.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL (4-step stepper) */}
      {isCreateOpen && (
        <div className="modal-backdrop open">
          <div className="modal ab-modal" style={{ maxWidth: '660px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2>New Location</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsCreateOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-stepper">
              {['Context', 'Address', 'Operations', 'Review'].map((stepName, i) => {
                const stepNum = i + 1;
                return (
                  <React.Fragment key={stepName}>
                    <div className={`ms-step ${stepNum === createStep ? 'active' : ''} ${stepNum < createStep ? 'done' : ''}`}>
                      <div className="ms-num">{stepNum < createStep ? '✓' : stepNum}</div>
                      <span>{stepName}</span>
                    </div>
                    {i < 3 && <div className={`ms-line ${stepNum < createStep ? 'done' : ''}`}></div>}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {createStep === 1 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>
                    Who does this location belong to?
                  </h4>
                  <div className="ctx-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div
                      className={`ctx-card ${createData.context === 'my' ? 'selected' : ''}`}
                      onClick={() => setCreateData((prev) => ({ ...prev, context: 'my' }))}
                    >
                      <div className="ico" style={{ fontSize: '24px' }}>🏢</div>
                      <div className="lbl" style={{ fontWeight: 600 }}>My Company</div>
                      <div className="sub" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Own warehouse, plant, office
                      </div>
                    </div>
                    <div
                      className={`ctx-card ${createData.context === 'customer' ? 'selected' : ''}`}
                      onClick={() => setCreateData((prev) => ({ ...prev, context: 'customer' }))}
                    >
                      <div className="ico" style={{ fontSize: '24px' }}>🤝</div>
                      <div className="lbl" style={{ fontWeight: 600 }}>Customer Location</div>
                      <div className="sub" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Delivery site, store, DC
                      </div>
                    </div>
                  </div>

                  {createData.context === 'customer' && (
                    <div className="mf" style={{ marginTop: '16px', position: 'relative' }}>
                      <label>Company / Entity <span className="req">*</span></label>
                      <div className="ent-search">
                        <input
                          type="text"
                          className="ent-inp w-full"
                          placeholder="Search existing companies…"
                          value={createData.company}
                          onChange={(e) => {
                            setCreateData((prev) => ({ ...prev, company: e.target.value }));
                            setCompanyQuery(e.target.value);
                            setCompanyDropdownOpen(true);
                          }}
                          onFocus={() => setCompanyDropdownOpen(true)}
                        />
                        {companyDropdownOpen && (
                          <div className="ent-results open" style={{ position: 'absolute', width: '100%', zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                            <div
                              className="ent-create"
                              style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}
                              onClick={() => {
                                setIsCompanyOpen(true);
                                setCompanyDropdownOpen(false);
                              }}
                            >
                              + Create new company
                            </div>
                            {companies
                              .filter((c) => c.name.toLowerCase().includes(companyQuery.toLowerCase()))
                              .map((c) => (
                                <div
                                  key={c.id}
                                  className="ent-item"
                                  style={{ padding: '8px 12px', cursor: 'pointer', borderTop: '1px solid var(--border)' }}
                                  onClick={() => {
                                    setCreateData((prev) => ({ ...prev, company: c.name }));
                                    setCompanyDropdownOpen(false);
                                  }}
                                >
                                  {c.name}
                                  <div className="sub" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                    {c.industry} · VAT: {c.vat}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <span className="helper">Search existing or create a new company</span>
                    </div>
                  )}

                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '20px 0 10px' }}>
                    Quick template <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span>
                  </h4>
                  <div className="tpl-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {['retail', 'factory', 'warehouse', 'store'].map((tpl) => (
                      <div
                        key={tpl}
                        className={`tpl-card ${createData.template === tpl ? 'selected' : ''}`}
                        onClick={() => applyTemplate(tpl)}
                        style={{ cursor: 'pointer', padding: '10px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '6px' }}
                      >
                        <span className="ico" style={{ marginRight: '4px' }}>
                          {tpl === 'retail' && '🏪'}
                          {tpl === 'factory' && '🏭'}
                          {tpl === 'warehouse' && '📦'}
                          {tpl === 'store' && '🏬'}
                        </span>
                        {tpl.charAt(0).toUpperCase() + tpl.slice(1)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div>
                  <div className="mf">
                    <label>Location Name <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Athens Warehouse"
                      value={createData.name}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="mf">
                    <label>Address <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="Street name and number"
                      value={createData.address}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, address: e.target.value }))}
                    />
                    <span className="helper">📍 Autocomplete will fill city and postal code</span>
                  </div>
                  <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="mf">
                      <label>City <span className="req">*</span></label>
                      <input
                        type="text"
                        placeholder="City"
                        value={createData.city}
                        onChange={(e) => setCreateData((prev) => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="mf">
                      <label>Postal Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 10431"
                        value={createData.postal}
                        onChange={(e) => setCreateData((prev) => ({ ...prev, postal: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="map-placeholder" style={{ margin: '12px 0', padding: '20px', background: 'var(--surface-alt)', border: '1px dashed var(--border)', borderRadius: '6px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>📍</div>
                    Map preview & pin adjustment
                    <br />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      Geocode will auto-fill lat/lng after address entry
                    </span>
                  </div>

                  <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="mf">
                      <label>Location Role <span className="req">*</span></label>
                      <select
                        value={createData.role}
                        onChange={(e) => setCreateData((prev) => ({ ...prev, role: e.target.value as any }))}
                      >
                        <option value="both">Both (Pickup & Delivery)</option>
                        <option value="pickup">Pickup only</option>
                        <option value="delivery">Delivery only</option>
                      </select>
                    </div>
                    <div className="mf">
                      <label>Location Type</label>
                      <select
                        value={createData.type}
                        onChange={(e) => setCreateData((prev) => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="">— None —</option>
                        <option value="Warehouse">Warehouse</option>
                        <option value="Plant">Plant</option>
                        <option value="Store">Store</option>
                        <option value="Office">Office</option>
                        <option value="Cross-dock">Cross-dock</option>
                        <option value="Port">Port</option>
                      </select>
                    </div>
                  </div>
                  <div className="mf">
                    <label>Internal Location Code</label>
                    <input
                      type="text"
                      placeholder="e.g. WH-ATH-01"
                      value={createData.code}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, code: e.target.value }))}
                    />
                  </div>
                  <div className="mf">
                    <label>Tags</label>
                    <input
                      type="text"
                      placeholder="Comma-separated, e.g. Priority, Attica"
                      value={createData.tags}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, tags: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {createStep === 3 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>Operational Profile</h4>
                  <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="mf">
                      <label>Appointment required</label>
                      <div
                        className="tog"
                        onClick={() => setCreateData((prev) => ({ ...prev, appt: !prev.appt }))}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <div className={`tog-sw ${createData.appt ? 'on' : ''}`}></div>
                        <span>{createData.appt ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                    <div className="mf">
                      <label>Dock Type</label>
                      <select
                        value={createData.dock}
                        onChange={(e) => setCreateData((prev) => ({ ...prev, dock: e.target.value }))}
                      >
                        <option value="">— Select —</option>
                        <option value="Dock-level">Dock-level</option>
                        <option value="Ramp">Ramp</option>
                        <option value="Ground">Ground</option>
                      </select>
                    </div>
                  </div>

                  <div className="mf">
                    <label>Receiving Hours</label>
                    <input
                      type="text"
                      placeholder="e.g. Mon-Fri 06:00–22:00 · Sat 07:00–14:00"
                      value={createData.hours}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, hours: e.target.value }))}
                    />
                  </div>

                  <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="mf">
                      <label>Max Truck Length</label>
                      <input
                        type="text"
                        placeholder="e.g. 18.75m"
                        value={createData.maxTruck}
                        onChange={(e) => setCreateData((prev) => ({ ...prev, maxTruck: e.target.value }))}
                      />
                    </div>
                    <div className="mf">
                      <label>Max Weight</label>
                      <input
                        type="text"
                        placeholder="e.g. 40T"
                        value={createData.maxWeight}
                        onChange={(e) => setCreateData((prev) => ({ ...prev, maxWeight: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '12px 0' }}>
                    <div className="mf">
                      <label>ADR Allowed</label>
                      <div
                        className="tog"
                        onClick={() => setCreateData((prev) => ({ ...prev, adr: !prev.adr }))}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <div className={`tog-sw ${createData.adr ? 'on' : ''}`}></div>
                        <span>{createData.adr ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                    <div className="mf">
                      <label>Pallet Exchange</label>
                      <div
                        className="tog"
                        onClick={() => setCreateData((prev) => ({ ...prev, palletExchange: !prev.palletExchange }))}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <div className={`tog-sw ${createData.palletExchange ? 'on' : ''}`}></div>
                        <span>{createData.palletExchange ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mf">
                    <label>Est. Loading/Unloading Time (min)</label>
                    <input
                      type="number"
                      placeholder="e.g. 45"
                      value={createData.loadTime}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, loadTime: e.target.value }))}
                    />
                  </div>

                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '20px 0 12px' }}>Notes</h4>
                  <div className="mf">
                    <label>🔒 Internal Note</label>
                    <textarea
                      placeholder="Visible only to your team…"
                      value={createData.noteInternal}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, noteInternal: e.target.value }))}
                    />
                  </div>
                  <div className="mf">
                    <label>🚛 Carrier-Visible Note</label>
                    <textarea
                      placeholder="Drivers/carriers will see this…"
                      value={createData.noteCarrier}
                      onChange={(e) => setCreateData((prev) => ({ ...prev, noteCarrier: e.target.value }))}
                    />
                  </div>

                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '20px 0 12px' }}>Contacts</h4>
                  {createData.contacts.map((contact, i) => (
                    <div key={i} className="contact-form-row" style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', marginBottom: '8px', position: 'relative' }}>
                      <button
                        className="del-contact-btn"
                        style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                          const updated = [...createData.contacts];
                          updated.splice(i, 1);
                          setCreateData((prev) => ({ ...prev, contacts: updated }));
                        }}
                      >
                        ✕
                      </button>
                      <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="mf">
                          <label>Name</label>
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(e) => {
                              const updated = [...createData.contacts];
                              updated[i].name = e.target.value;
                              setCreateData((prev) => ({ ...prev, contacts: updated }));
                            }}
                          />
                        </div>
                        <div className="mf">
                          <label>Role</label>
                          <select
                            value={contact.role}
                            onChange={(e) => {
                              const updated = [...createData.contacts];
                              updated[i].role = e.target.value;
                              setCreateData((prev) => ({ ...prev, contacts: updated }));
                            }}
                          >
                            <option value="Receiving">Receiving</option>
                            <option value="Gate/Security">Gate/Security</option>
                            <option value="After-hours">After-hours</option>
                            <option value="Billing">Billing</option>
                          </select>
                        </div>
                        <div className="mf">
                          <label>Phone</label>
                          <input
                            type="text"
                            value={contact.phone}
                            onChange={(e) => {
                              const updated = [...createData.contacts];
                              updated[i].phone = e.target.value;
                              setCreateData((prev) => ({ ...prev, contacts: updated }));
                            }}
                          />
                        </div>
                        <div className="mf">
                          <label>Email</label>
                          <input
                            type="text"
                            value={contact.email}
                            onChange={(e) => {
                              const updated = [...createData.contacts];
                              updated[i].email = e.target.value;
                              setCreateData((prev) => ({ ...prev, contacts: updated }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    className="add-contact-btn"
                    onClick={() => {
                      setCreateData((prev) => ({
                        ...prev,
                        contacts: [...prev.contacts, { name: '', role: 'Receiving', phone: '', email: '' }],
                      }));
                    }}
                    style={{ marginTop: '8px' }}
                  >
                    + Add Contact
                  </button>
                </div>
              )}

              {createStep === 4 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>Review & Confirm</h4>
                  <div className="review-box" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px' }}>
                    <div className="review-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="review-label" style={{ color: 'var(--text-tertiary)' }}>Context</div>
                      <div className="review-val" style={{ fontWeight: 600 }}>
                        {createData.context === 'my' ? 'My Company' : `Customer: ${createData.company || '—'}`}
                      </div>
                    </div>
                    <div className="review-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="review-label" style={{ color: 'var(--text-tertiary)' }}>Location</div>
                      <div className="review-val" style={{ fontSize: '15px', fontWeight: 600 }}>{createData.name || '—'}</div>
                      <div className="review-sub" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {createData.address || '—'}{createData.city ? ', ' + createData.city : ''}{createData.postal ? ' ' + createData.postal : ''}
                      </div>
                    </div>
                    <div className="review-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="review-label" style={{ color: 'var(--text-tertiary)' }}>Role</div>
                      <div className="review-val">{createData.role}</div>
                    </div>
                    <div className="review-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="review-label" style={{ color: 'var(--text-tertiary)' }}>Type</div>
                      <div className="review-val">{createData.type || 'Not set'}</div>
                    </div>
                    <div className="review-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="review-label" style={{ color: 'var(--text-tertiary)' }}>Appointment Required</div>
                      <div className="review-val">{createData.appt ? '✅ Required' : 'No'}</div>
                    </div>
                    <div className="review-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="review-label" style={{ color: 'var(--text-tertiary)' }}>Dock Type</div>
                      <div className="review-val">{createData.dock || 'Not set'}</div>
                    </div>
                    <div className="review-row" style={{ padding: '8px 0' }}>
                      <div className="review-label" style={{ color: 'var(--text-tertiary)' }}>Contacts</div>
                      <div className="review-val" style={{ fontSize: '12px' }}>
                        {createData.contacts.length > 0
                          ? createData.contacts.map((c) => `${c.name} (${c.role})`).join(', ')
                          : 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (createStep === 1) setIsCreateOpen(false);
                  else setCreateStep((s) => s - 1);
                }}
              >
                {createStep === 1 ? 'Cancel' : '← Back'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (createStep === 4) submitNewLocation();
                  else setCreateStep((s) => s + 1);
                }}
              >
                {createStep === 4 ? 'Create Location' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && editData && (
        <div className="modal-backdrop open">
          <div className="modal ab-modal" style={{ maxWidth: '660px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2>Edit — {editData.name}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsEditOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div className="mf">
                <label>Location Name <span className="req">*</span></label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="mf">
                <label>Address <span className="req">*</span></label>
                <input
                  type="text"
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>City <span className="req">*</span></label>
                  <input
                    type="text"
                    value={editData.city}
                    onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  />
                </div>
                <div className="mf">
                  <label>Region</label>
                  <input
                    type="text"
                    value={editData.region}
                    onChange={(e) => setEditData({ ...editData, region: e.target.value })}
                  />
                </div>
              </div>

              <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>Role <span className="req">*</span></label>
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value as any })}
                  >
                    <option value="both">Both (Pickup & Delivery)</option>
                    <option value="pickup">Pickup only</option>
                    <option value="delivery">Delivery only</option>
                  </select>
                </div>
                <div className="mf">
                  <label>Type</label>
                  <select
                    value={editData.type}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                  >
                    <option value="">— None —</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Plant">Plant</option>
                    <option value="Store">Store</option>
                    <option value="Office">Office</option>
                    <option value="Cross-dock">Cross-dock</option>
                    <option value="Port">Port</option>
                  </select>
                </div>
              </div>

              <div className="mf">
                <label>Internal Code</label>
                <input
                  type="text"
                  value={editData.code || ''}
                  onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                />
              </div>

              <div className="mf">
                <label>Tags</label>
                <input
                  type="text"
                  value={editData.tags.join(', ')}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    })
                  }
                />
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '18px 0 12px' }}>Operational Profile</h4>
              <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>Appointment required</label>
                  <div
                    className="tog"
                    onClick={() => setEditData({ ...editData, appt: !editData.appt })}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <div className={`tog-sw ${editData.appt ? 'on' : ''}`}></div>
                    <span>{editData.appt ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="mf">
                  <label>Dock Type</label>
                  <select
                    value={editData.dock}
                    onChange={(e) => setEditData({ ...editData, dock: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    <option value="Dock-level">Dock-level</option>
                    <option value="Ramp">Ramp</option>
                    <option value="Ground">Ground</option>
                  </select>
                </div>
              </div>

              <div className="mf">
                <label>Receiving Hours</label>
                <input
                  type="text"
                  value={editData.hours || ''}
                  onChange={(e) => setEditData({ ...editData, hours: e.target.value })}
                />
              </div>

              <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>Max Truck</label>
                  <input
                    type="text"
                    value={editData.maxTruck || ''}
                    onChange={(e) => setEditData({ ...editData, maxTruck: e.target.value })}
                  />
                </div>
                <div className="mf">
                  <label>Max Weight</label>
                  <input
                    type="text"
                    value={editData.maxWeight || ''}
                    onChange={(e) => setEditData({ ...editData, maxWeight: e.target.value })}
                  />
                </div>
              </div>

              <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '12px 0' }}>
                <div className="mf">
                  <label>ADR</label>
                  <div
                    className="tog"
                    onClick={() => setEditData({ ...editData, adr: !editData.adr })}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <div className={`tog-sw ${editData.adr ? 'on' : ''}`}></div>
                    <span>{editData.adr ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div className="mf">
                  <label>Pallet Exchange</label>
                  <div
                    className="tog"
                    onClick={() => setEditData({ ...editData, palletExchange: !editData.palletExchange })}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <div className={`tog-sw ${editData.palletExchange ? 'on' : ''}`}></div>
                    <span>{editData.palletExchange ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>

              <div className="mf">
                <label>Est. Loading/Unloading (min)</label>
                <input
                  type="number"
                  value={editData.loadTime || ''}
                  onChange={(e) => setEditData({ ...editData, loadTime: parseInt(e.target.value) || 0 })}
                />
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '18px 0 12px' }}>Notes</h4>
              <div className="mf">
                <label>🔒 Internal Note</label>
                <textarea
                  value={editData.noteInternal || ''}
                  onChange={(e) => setEditData({ ...editData, noteInternal: e.target.value })}
                />
              </div>
              <div className="mf">
                <label>🚛 Carrier-Visible Note</label>
                <textarea
                  value={editData.noteCarrier || ''}
                  onChange={(e) => setEditData({ ...editData, noteCarrier: e.target.value })}
                />
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '18px 0 12px' }}>Contacts</h4>
              {editData.contacts.map((contact, i) => (
                <div key={i} className="contact-form-row" style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '6px', marginBottom: '8px', position: 'relative' }}>
                  <button
                    className="del-contact-btn"
                    style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      const updated = [...editData.contacts];
                      updated.splice(i, 1);
                      setEditData({ ...editData, contacts: updated });
                    }}
                  >
                    ✕
                  </button>
                  <div className="mf-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="mf">
                      <label>Name</label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => {
                          const updated = [...editData.contacts];
                          updated[i].name = e.target.value;
                          setEditData({ ...editData, contacts: updated });
                        }}
                      />
                    </div>
                    <div className="mf">
                      <label>Role</label>
                      <select
                        value={contact.role}
                        onChange={(e) => {
                          const updated = [...editData.contacts];
                          updated[i].role = e.target.value;
                          setEditData({ ...editData, contacts: updated });
                        }}
                      >
                        <option value="Receiving">Receiving</option>
                        <option value="Gate/Security">Gate/Security</option>
                        <option value="After-hours">After-hours</option>
                        <option value="Billing">Billing</option>
                        <option value="Reception">Reception</option>
                      </select>
                    </div>
                    <div className="mf">
                      <label>Phone</label>
                      <input
                        type="text"
                        value={contact.phone}
                        onChange={(e) => {
                          const updated = [...editData.contacts];
                          updated[i].phone = e.target.value;
                          setEditData({ ...editData, contacts: updated });
                        }}
                      />
                    </div>
                    <div className="mf">
                      <label>Email</label>
                      <input
                        type="text"
                        value={contact.email}
                        onChange={(e) => {
                          const updated = [...editData.contacts];
                          updated[i].email = e.target.value;
                          setEditData({ ...editData, contacts: updated });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                className="add-contact-btn"
                onClick={() => {
                  setEditData({
                    ...editData,
                    contacts: [...editData.contacts, { name: '', role: 'Receiving', phone: '', email: '' }],
                  });
                }}
              >
                + Add Contact
              </button>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveEditedLocation}>
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE COMPANY MODAL */}
      {isCompanyOpen && (
        <div className="modal-backdrop open" style={{ zIndex: 400 }}>
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2>Create New Company</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsCompanyOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="mf">
                <label>Company Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                />
              </div>
              <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>VAT Number <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. EL094123456"
                    value={companyData.vat}
                    onChange={(e) => setCompanyData({ ...companyData, vat: e.target.value })}
                  />
                </div>
                <div className="mf">
                  <label>Country</label>
                  <input
                    type="text"
                    value={companyData.country}
                    onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })}
                  />
                </div>
              </div>
              <div className="mf">
                <label>Address <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="Full company address"
                  value={companyData.address}
                  onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                />
              </div>
              <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>Phone</label>
                  <input
                    type="text"
                    placeholder="+30 210 ..."
                    value={companyData.phone}
                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                  />
                </div>
                <div className="mf">
                  <label>Email</label>
                  <input
                    type="text"
                    placeholder="info@company.com"
                    value={companyData.email}
                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="mf-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="mf">
                  <label>Website</label>
                  <input
                    type="text"
                    placeholder="www.company.com"
                    value={companyData.website}
                    onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                  />
                </div>
                <div className="mf">
                  <label>Industry</label>
                  <select
                    value={companyData.industry}
                    onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="mf">
                <label>Primary Contact Person</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={companyData.contactPerson}
                  onChange={(e) => setCompanyData({ ...companyData, contactPerson: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setIsCompanyOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreateCompany}>
                Create Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
