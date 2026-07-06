import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Eye, MapPin, Plus } from 'lucide-react';
import type { LocationItem } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  filterLocations,
  groupCustomerLocations,
  groupMyLocationsByCompany,
  type LocationTab,
} from './locationSelectUtils';

interface LocationSelectProps {
  locations: LocationItem[];
  value: string;
  onChange: (locationId: string) => void;
  onCreateNew: () => void;
  onPreview?: (location: LocationItem) => void;
  disabled?: boolean;
  invalid?: boolean;
}

export const LocationSelect: React.FC<LocationSelectProps> = ({
  locations,
  value,
  onChange,
  onCreateNew,
  onPreview,
  disabled = false,
  invalid = false,
}) => {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LocationTab>('my');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const selected = locations.find((loc) => String(loc.id) === String(value));

  const filtered = useMemo(
    () => filterLocations(locations, debouncedQuery, tab),
    [locations, debouncedQuery, tab]
  );

  const myGroups = useMemo(
    () => (tab === 'my' ? groupMyLocationsByCompany(filtered) : []),
    [filtered, tab]
  );
  const customerGroups = useMemo(
    () => (tab === 'customer' ? groupCustomerLocations(filtered) : []),
    [filtered, tab]
  );

  const searchActive = debouncedQuery.trim().length > 0;

  const isCompanyExpanded = (company: string) => searchActive || expandedCompanies.has(company);

  const toggleCompany = (company: string) => {
    if (searchActive) return;
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  };

  const renderLocationRow = (loc: LocationItem) => (
    <div
      key={loc.id}
      className="flex items-stretch hover:bg-[var(--surface-hover)]"
    >
      <button
        type="button"
        className="flex-1 min-w-0 text-left px-3 py-2 flex items-start gap-2 border-none bg-transparent cursor-pointer"
        style={{ color: 'inherit', font: 'inherit' }}
        onClick={() => {
          onChange(String(loc.id));
          setOpen(false);
        }}
      >
        <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {loc.name}
          </div>
          <div className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
            {[loc.company, loc.city, loc.address].filter(Boolean).join(' · ')}
          </div>
        </div>
      </button>
      {onPreview && (
        <button
          type="button"
          className="px-2 shrink-0 flex items-center justify-center border-none bg-transparent cursor-pointer rounded hover:bg-[var(--surface-alt)]"
          title={t('createLoadViewLocation') || 'View location'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPreview(loc);
          }}
        >
          <Eye size={12} style={{ color: 'var(--text-tertiary)' }} />
        </button>
      )}
    </div>
  );

  const groups = tab === 'my' ? myGroups : customerGroups;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left${invalid ? ' wizard-field-invalid' : ''}`}
        style={{
          border: invalid ? '1px solid #DC2626' : '1px solid var(--border)',
          background: 'var(--surface)',
          color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)',
          fontSize: 12,
          boxShadow: invalid ? '0 0 0 1px #DC2626' : undefined,
        }}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">
          {selected
            ? `${selected.name}${selected.city ? ` · ${selected.city}` : ''}`
            : t('selectLocation') || 'Select location...'}
        </span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('createLoadLocationSearchPlaceholder') || 'Search name, company, address, city...'}
              className="w-full px-2 py-1.5 rounded text-xs"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface-alt)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex gap-1 mt-2">
              {(['my', 'customer'] as LocationTab[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="px-2 py-1 rounded text-[10px] font-semibold"
                  style={{
                    background: tab === key ? 'var(--accent-light)' : 'transparent',
                    color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
                    border: `1px solid ${tab === key ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                  onClick={() => setTab(key)}
                >
                  {key === 'my'
                    ? t('abMyLocations') || 'My Locations'
                    : t('abCustomerLocations') || 'Customer Locations'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold"
              style={{ color: 'var(--accent)' }}
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
            >
              <Plus size={12} />
              {t('createNewLocation') || 'Create New Location'}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {groups.length === 0 && (
              <div className="px-3 py-4 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                {t('createLoadNoLocationsFound') || 'No locations found'}
              </div>
            )}

            {tab === 'my' &&
              groups.map((group) => (
                <div key={group.company}>
                  {group.locations.length > 1 && (
                    <button
                      type="button"
                      className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold"
                      style={{ color: 'var(--text-secondary)', background: 'var(--surface-alt)' }}
                      onClick={() => toggleCompany(group.company)}
                    >
                      {isCompanyExpanded(group.company) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {group.company}
                    </button>
                  )}
                  {(group.locations.length === 1 || isCompanyExpanded(group.company)) &&
                    group.locations.map(renderLocationRow)}
                </div>
              ))}

            {tab === 'customer' &&
              groups.map((group) => (
                <div key={group.company}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold"
                    style={{ color: 'var(--text-secondary)', background: 'var(--surface-alt)' }}
                    onClick={() => toggleCompany(group.company)}
                  >
                    {isCompanyExpanded(group.company) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {group.company}
                    <span className="ml-auto opacity-70">{group.locations.length}</span>
                  </button>
                  {isCompanyExpanded(group.company) && group.locations.map(renderLocationRow)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelect;
