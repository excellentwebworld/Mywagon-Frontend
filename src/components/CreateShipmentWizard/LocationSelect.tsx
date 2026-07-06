import React, { useMemo, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LocationTab>('my');
  const [query, setQuery] = useState('');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const selected = locations.find((loc) => loc.id === value);

  const filtered = useMemo(
    () => filterLocations(locations, query, tab),
    [locations, query, tab]
  );

  const myGroups = useMemo(
    () => (tab === 'my' ? groupMyLocationsByCompany(filtered) : []),
    [filtered, tab]
  );
  const customerGroups = useMemo(
    () => (tab === 'customer' ? groupCustomerLocations(filtered) : []),
    [filtered, tab]
  );

  const toggleCompany = (company: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  };

  const renderLocationRow = (loc: LocationItem) => (
    <button
      key={loc.id}
      type="button"
      className="w-full text-left px-3 py-2 hover:bg-[var(--surface-hover)] flex items-start gap-2"
      onClick={() => {
        onChange(loc.id);
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
      {onPreview && (
        <span
          role="button"
          tabIndex={0}
          className="p-1 rounded hover:bg-[var(--surface-alt)]"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(loc);
          }}
        >
          <Eye size={12} />
        </span>
      )}
    </button>
  );

  const groups = tab === 'my' ? myGroups : customerGroups;

  return (
    <div className="relative">
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
                      {expandedCompanies.has(group.company) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      {group.company}
                    </button>
                  )}
                  {(group.locations.length === 1 || expandedCompanies.has(group.company)) &&
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
                    {expandedCompanies.has(group.company) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {group.company}
                    <span className="ml-auto opacity-70">{group.locations.length}</span>
                  </button>
                  {expandedCompanies.has(group.company) && group.locations.map(renderLocationRow)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelect;
