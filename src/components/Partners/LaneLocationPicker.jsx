/**
 * LaneLocationPicker — Cascading location picker for Favorite Lanes.
 *
 * Used by: AddEditLaneModal (origin + destination pickers)
 *
 * Two-step cascade:
 *  Step 1 — Choose location type: Country | Region | Prefecture | City | Zip
 *  Step 2 — Based on type, show the right input:
 *    • Country  → Searchable country dropdown (35 countries from COUNTRIES)
 *    • Region   → Country dropdown → Region dropdown (8 Greek regions; free-text for others)
 *    • Prefecture → Country dropdown → Prefecture dropdown (51 Greek prefectures; free-text for others)
 *    • City     → Country dropdown → Free-text city input
 *    • Zip      → Country dropdown → Free-text zip input
 *
 * Returns: { type, value, label, countryCode } via onChange callback
 *
 * Props:
 *  - value: { type, value, label, countryCode } | null
 *  - onChange: (location) => void
 *  - label: string (field label, e.g. "Origin")
 *  - required: boolean
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { COUNTRIES, REGIONS, getCountryName, resolveCountryIsoCode } from '../../mocks/partnersMasterData';
import GREEK_PREFECTURES from '../../mocks/greekPrefectures';
import { ChevronDown, Search, X } from 'lucide-react';

const LOCATION_TYPES = ['country', 'region', 'prefecture', 'city', 'zip'];

const resolveLocationState = (val) => {
  if (!val) return { type: '', countryCode: '', locationValue: '' };

  const rawVal = val.value || val.city || val.label || '';
  const isoCode = resolveCountryIsoCode(val.countryCode) || resolveCountryIsoCode(rawVal) || resolveCountryIsoCode(val.label);

  const isCountry = val.type === 'country' || (Boolean(isoCode) && (!val.type || val.type === 'city'));
  const locationType = isCountry ? 'country' : (val.type || 'city');

  if (locationType === 'country') {
    const finalIso = isoCode || 'GR';
    return {
      type: 'country',
      countryCode: finalIso,
      locationValue: finalIso,
    };
  }

  const finalCountry = isoCode || val.countryCode || 'GR';
  return {
    type: locationType,
    countryCode: finalCountry,
    locationValue: val.value || val.city || '',
  };
};

export default function LaneLocationPicker({ value, onChange, label, required }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = i18n.language || 'en';

  const initialState = useMemo(() => resolveLocationState(value), [value]);

  const [locationType, setLocationType] = useState(initialState.type);
  const [countryCode, setCountryCode] = useState(initialState.countryCode);
  const [locationValue, setLocationValue] = useState(initialState.locationValue);

  const countryDropdownItems = useMemo(() => {
    return COUNTRIES.map((c) => {
      const fullName = getCountryName(c, lang);
      return {
        value: c,
        label: `${fullName} (${c})`,
      };
    });
  }, [lang]);

  // Reset downstream when value prop changes
  useEffect(() => {
    const st = resolveLocationState(value);
    setLocationType(st.type);
    setCountryCode(st.countryCode);
    setLocationValue(st.locationValue);
  }, [value]);

  const handleTypeChange = (newType) => {
    setLocationType(newType);
    setCountryCode('');
    setLocationValue('');
    onChange(null);
  };

  // Country type: selecting country IS the final value
  useEffect(() => {
    if (locationType === 'country' && countryCode) {
      const countryLabel = getCountryName(countryCode, lang);
      onChange({
        type: 'country',
        value: countryCode,
        label: `${countryLabel} (${countryCode})`,
        countryCode,
      });
    }
  }, [locationType, countryCode, lang]);

  // Region / Prefecture / City / Zip: need both country + locationValue
  useEffect(() => {
    if (!locationType || locationType === 'country') return;
    if (!countryCode || !locationValue) {
      onChange(null);
      return;
    }
    const countryLabel = getCountryName(countryCode, lang);
    let lbl = locationValue;
    if (locationType === 'region' && countryCode === 'GR') {
      lbl = t(`partnersMaster.region_${locationValue}`, locationValue);
    }
    if (locationType === 'prefecture' && countryCode === 'GR') {
      const pref = GREEK_PREFECTURES.find((p) => p.value === locationValue);
      lbl = pref ? pref.label : locationValue;
    }
    onChange({
      type: locationType,
      value: locationValue,
      label: `${lbl}, ${countryLabel}`,
      countryCode,
    });
  }, [locationType, countryCode, locationValue, lang, t]);

  const typeLabel = (type) => {
    const map = {
      country: t('partnersMaster.typeCountry', 'Country'),
      region: t('partnersMaster.typeRegion', 'Region'),
      prefecture: t('partnersMaster.typePrefecture', 'Prefecture'),
      city: t('partnersMaster.typeCity', 'City'),
      zip: t('partnersMaster.typeZip', 'Zip'),
    };
    return map[type] || type;
  };

  return (
    <div>
      {label && (
        <div className="mb-1" style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </div>
      )}

      {/* Step 1 — Location type */}
      <div className="mb-2">
        <div style={{ fontSize: 10, color: T.t3, marginBottom: 3 }}>
          {t('partnersMaster.locationType', 'Location type')}
        </div>
        <select
          value={locationType}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md outline-none cursor-pointer"
          style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
        >
          <option value="">{t('partnersMaster.selectLocationType', 'Select location type')}</option>
          {LOCATION_TYPES.map((lt) => (
            <option key={lt} value={lt}>{typeLabel(lt)}</option>
          ))}
        </select>
      </div>

      {/* Step 2 — Based on type */}
      {locationType === 'country' && (
        <SearchableDropdown
          T={T} t={t}
          items={countryDropdownItems}
          value={countryCode}
          onChange={setCountryCode}
          placeholder={t('partnersMaster.selectCountry', 'Select country')}
        />
      )}

      {locationType && locationType !== 'country' && (
        <>
          {/* Country picker first */}
          <div className="mb-2">
            <div style={{ fontSize: 10, color: T.t3, marginBottom: 3 }}>
              {t('partnersMaster.selectCountry', 'Select country')}
            </div>
            <SearchableDropdown
              T={T} t={t}
              items={countryDropdownItems}
              value={countryCode}
              onChange={(v) => { setCountryCode(v); setLocationValue(''); }}
              placeholder={t('partnersMaster.selectCountry', 'Select country')}
            />
          </div>

          {/* Region picker (Greek = dropdown, other = free-text) */}
          {locationType === 'region' && countryCode && (
            countryCode === 'GR' ? (
              <SearchableDropdown
                T={T} t={t}
                items={REGIONS.map((r) => ({ value: r, label: t(`partnersMaster.region_${r}`, r) }))}
                value={locationValue}
                onChange={setLocationValue}
                placeholder={t('partnersMaster.selectRegion', 'Select region')}
              />
            ) : (
              <FreeTextInput T={T} value={locationValue} onChange={setLocationValue}
                placeholder={t('partnersMaster.enterRegion', 'Enter region')} />
            )
          )}

          {/* Prefecture picker (Greek = dropdown, other = free-text) */}
          {locationType === 'prefecture' && countryCode && (
            countryCode === 'GR' ? (
              <SearchableDropdown
                T={T} t={t}
                items={GREEK_PREFECTURES.map((p) => ({ value: p.value, label: p.label }))}
                value={locationValue}
                onChange={setLocationValue}
                placeholder={t('partnersMaster.selectPrefecture', 'Select prefecture')}
              />
            ) : (
              <FreeTextInput T={T} value={locationValue} onChange={setLocationValue}
                placeholder={t('partnersMaster.enterPrefecture', 'Enter prefecture')} />
            )
          )}

          {/* City — always free-text */}
          {locationType === 'city' && countryCode && (
            <FreeTextInput T={T} value={locationValue} onChange={setLocationValue}
              placeholder={t('partnersMaster.enterCity', 'Enter city')} />
          )}

          {/* Zip — always free-text */}
          {locationType === 'zip' && countryCode && (
            <FreeTextInput T={T} value={locationValue} onChange={setLocationValue}
              placeholder={t('partnersMaster.enterZip', 'Enter zip')} />
          )}
        </>
      )}
    </div>
  );
}


/* ── SearchableDropdown ── */

function SearchableDropdown({ T, t, items, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(s) || i.value.toLowerCase().includes(s));
  }, [items, search]);

  const selected = items.find((i) => i.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md cursor-pointer"
        style={{ border: `1px solid ${open ? T.ac : T.bd}`, background: T.sf, color: selected ? T.t1 : T.t3, fontSize: 13 }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} style={{ color: T.t3, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden"
          style={{ background: T.sf, border: `1px solid ${T.bd}`, zIndex: 50, maxHeight: 260 }}>
          {/* Search bar */}
          <div className="p-2" style={{ borderBottom: `1px solid ${T.bd}` }}>
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-md"
              style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
              <Search size={13} style={{ color: T.t3, flexShrink: 0 }} />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('common.search')}
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: T.t1, fontSize: 12 }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="p-0 border-none bg-transparent cursor-pointer" style={{ color: T.t3 }}>
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
            {filtered.length === 0 ? (
              <div className="p-3 text-center" style={{ fontSize: 12, color: T.t3 }}>
                {t('common.noResults')}
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.value}
                  onClick={() => { onChange(item.value); setOpen(false); setSearch(''); }}
                  className="w-full text-left px-3 py-2 border-none cursor-pointer"
                  style={{
                    background: item.value === value ? T.al : 'transparent',
                    color: item.value === value ? T.ac : T.t1,
                    fontSize: 12, fontWeight: item.value === value ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { if (item.value !== value) e.currentTarget.style.background = T.sh; }}
                  onMouseLeave={(e) => { if (item.value !== value) e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/* ── FreeTextInput ── */

function FreeTextInput({ T, value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-md outline-none"
      style={{ border: `1px solid ${T.bd}`, background: T.sf, color: T.t1, fontSize: 13 }}
      onFocus={(e) => { e.target.style.borderColor = T.ac; e.target.style.boxShadow = `0 0 0 3px ${T.al}`; }}
      onBlur={(e) => { e.target.style.borderColor = T.bd; e.target.style.boxShadow = 'none'; }}
    />
  );
}
