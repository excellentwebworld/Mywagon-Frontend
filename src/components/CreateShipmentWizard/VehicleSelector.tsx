import React, { useMemo, useState } from 'react';
import { useFormikContext } from 'formik';
import { Check, Truck } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import type { WizardFormValues } from '../../api/mappers/createShipmentMapper';
import {
  allItemsForType,
  formatVehicleSelectionSummary,
  WIZARD_VEHICLE_TYPES,
  type WizardVehicleType,
} from './vehicleTypes';

function VehicleIcon({ formKey }: { formKey: string }) {
  if (formKey === 'semi-trailer') {
    return (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="20" width="42" height="22" rx="3" />
        <path d="M44 28h10l6 8v6H44V28z" />
        <circle cx="14" cy="46" r="5" />
        <circle cx="52" cy="46" r="5" />
        <path d="M6 20V16a2 2 0 0 1 2-2h32a2 2 0 0 1 2 2v4" opacity="0.5" />
      </svg>
    );
  }
  if (formKey === 'road-train') {
    return (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="20" width="42" height="22" rx="3" />
        <path d="M44 28h10l6 8v6H44V28z" />
        <circle cx="14" cy="46" r="5" />
        <circle cx="52" cy="46" r="5" />
        <path d="M10 26v10M20 26v10M30 26v10" strokeDasharray="2 2" opacity="0.4" />
      </svg>
    );
  }
  if (formKey === 'triaxle') {
    return (
      <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="22" width="38" height="18" rx="3" />
        <path d="M40 28h10l6 6v6H40V28z" />
        <circle cx="12" cy="44" r="5" />
        <circle cx="24" cy="44" r="5" />
        <circle cx="50" cy="44" r="5" />
      </svg>
    );
  }
  return (
    <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="22" width="48" height="20" rx="4" />
      <path d="M42 22V18a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v4" />
      <circle cx="16" cy="46" r="5" />
      <circle cx="46" cy="46" r="5" />
      <rect x="42" y="24" width="12" height="10" rx="2" opacity="0.3" />
    </svg>
  );
}

function categoryCheckState(
  vt: WizardVehicleType,
  categoryId: string,
  selected: string[]
): 'none' | 'partial' | 'all' {
  const cat = vt.categories.find((c) => c.id === categoryId);
  if (!cat) return 'none';
  const ids = cat.items.map((i) => i.id);
  const count = ids.filter((id) => selected.includes(id)).length;
  if (count === 0) return 'none';
  if (count === ids.length) return 'all';
  return 'partial';
}

export const VehicleSelector: React.FC = () => {
  const { t, lang } = useTranslation();
  const { values, setFieldValue } = useFormikContext<WizardFormValues>();
  const vehicleSpecs = values.vehicleSpecs || {};

  const [cardExpanded, setCardExpanded] = useState(true);
  const [openNests, setOpenNests] = useState<Record<string, boolean>>({
    'semi-trailer': false,
    'road-train': false,
  });
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'semi-trailer-dry': true,
    'road-train-dry': true,
  });

  const locale = lang === 'el' ? 'el' : 'en';
  const summary = useMemo(
    () => formatVehicleSelectionSummary(vehicleSpecs, locale),
    [vehicleSpecs, locale]
  );

  const briefText = useMemo(() => {
    if (summary.types.length === 0) return '';
    const specPreview = summary.specs.slice(0, 4).join(', ');
    const more = summary.specs.length > 4 ? ` +${summary.specs.length - 4}` : '';
    return `${summary.types.join(', ')}${specPreview ? ` — ${specPreview}${more}` : ''}`;
  }, [summary]);

  const updateSpecs = (next: Record<string, string[]>) => {
    setFieldValue('vehicleSpecs', next);
    setFieldValue('vehicleSelectionConfirmed', false);
  };

  const isTypeSelected = (formKey: string) => (vehicleSpecs[formKey]?.length ?? 0) > 0;

  const toggleVehicleCard = (vt: WizardVehicleType) => {
    const nestOpen = openNests[vt.formKey];
    if (nestOpen) {
      setOpenNests((prev) => ({ ...prev, [vt.formKey]: false }));
      return;
    }

    const selected = vehicleSpecs[vt.formKey] || [];
    if (selected.length === 0) {
      updateSpecs({ ...vehicleSpecs, [vt.formKey]: allItemsForType(vt) });
    }
    setOpenNests((prev) => ({ ...prev, [vt.formKey]: true }));
  };

  const deselectVehicle = (vt: WizardVehicleType, e: React.MouseEvent) => {
    e.stopPropagation();
    updateSpecs({ ...vehicleSpecs, [vt.formKey]: [] });
    setOpenNests((prev) => ({ ...prev, [vt.formKey]: false }));
  };

  const toggleCategory = (vt: WizardVehicleType, categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const catKey = `${vt.formKey}-${categoryId}`;
    const cat = vt.categories.find((c) => c.id === categoryId);
    if (!cat) return;

    const selected = vehicleSpecs[vt.formKey] || [];
    const state = categoryCheckState(vt, categoryId, selected);
    const shouldSelect = state !== 'all';
    const catIds = cat.items.map((i) => i.id);
    const withoutCat = selected.filter((id) => !catIds.includes(id));
    const nextSelected = shouldSelect ? [...withoutCat, ...catIds] : withoutCat;

    updateSpecs({ ...vehicleSpecs, [vt.formKey]: nextSelected });
    setOpenCategories((prev) => ({ ...prev, [catKey]: true }));
  };

  const toggleItem = (
    vt: WizardVehicleType,
    categoryId: string,
    itemId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const selected = vehicleSpecs[vt.formKey] || [];
    const nextSelected = selected.includes(itemId)
      ? selected.filter((id) => id !== itemId)
      : [...selected, itemId];
    updateSpecs({ ...vehicleSpecs, [vt.formKey]: nextSelected });
    setOpenCategories((prev) => ({ ...prev, [`${vt.formKey}-${categoryId}`]: true }));
  };

  const confirmSelection = () => {
    setFieldValue('vehicleSelectionConfirmed', true);
    setCardExpanded(false);
  };

  const toggleCardHeader = () => {
    setCardExpanded((prev) => !prev);
  };

  return (
    <div
      className="rounded-xl overflow-hidden mt-4"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      <div
        className={`ch ${cardExpanded ? '' : 'ch-collapsed'}`}
        onClick={toggleCardHeader}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCardHeader();
          }
        }}
      >
        <Truck size={18} />
        <span>{t('vehicleType')}</span>
        {!cardExpanded && briefText && <span className="ch-brief">{briefText}</span>}
        {cardExpanded && (
          <span className="ch-r">{t('selectOneOrMoreTypes')}</span>
        )}
        <div className={`ch-chev ${cardExpanded ? 'open' : ''}`}>▼</div>
      </div>

      {cardExpanded && (
        <div className="cb">
          <div className="vg">
            {WIZARD_VEHICLE_TYPES.map((vt) => {
              const selected = vehicleSpecs[vt.formKey] || [];
              const selectedFlag = isTypeSelected(vt.formKey);
              const nestOpen = openNests[vt.formKey] ?? false;
              const displayName = locale === 'el' ? vt.nameEl : vt.name;

              return (
                <div key={vt.formKey} className="vc-wrap">
                  <div
                    className={`vc ${selectedFlag ? 'sel' : ''}`}
                    onClick={() => toggleVehicleCard(vt)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleVehicleCard(vt);
                      }
                    }}
                  >
                    {selectedFlag && (
                      <div
                        className="ck"
                        title="Deselect"
                        onClick={(e) => deselectVehicle(vt, e)}
                      >
                        ✓
                      </div>
                    )}
                    <div className="vi">
                      <VehicleIcon formKey={vt.formKey} />
                    </div>
                    <div className="vn">{displayName}</div>
                    <div className="vs">{vt.subtitle}</div>
                  </div>

                  <div className={`vnest ${nestOpen ? 'open' : ''}`}>
                    {vt.categories.map((cat) => {
                      const catKey = `${vt.formKey}-${cat.id}`;
                      const catOpen = openCategories[catKey] ?? cat.id === 'dry';
                      const catState = categoryCheckState(vt, cat.id, selected);
                      const catLabel = locale === 'el' ? cat.labelEl : cat.label;

                      return (
                        <React.Fragment key={cat.id}>
                          <div
                            className="nc"
                            onClick={(e) => toggleCategory(vt, cat.id, e)}
                          >
                            <span
                              className={`chev ${catOpen ? 'open' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenCategories((prev) => ({
                                  ...prev,
                                  [catKey]: !catOpen,
                                }));
                              }}
                            >
                              ▶
                            </span>
                            <div
                              className={`cbx ${catState === 'all' ? 'on' : catState === 'partial' ? 'ind' : ''}`}
                            >
                              {catState === 'all' ? '✓' : catState === 'partial' ? '–' : ''}
                            </div>
                            <span>{catLabel}</span>
                          </div>
                          <div className={`ns ${catOpen ? 'open' : ''}`}>
                            {cat.items.map((item) => {
                              const itemOn = selected.includes(item.id);
                              const itemLabel = locale === 'el' ? item.labelEl : item.label;
                              return (
                                <div
                                  key={item.id}
                                  className="ni"
                                  onClick={(e) => toggleItem(vt, cat.id, item.id, e)}
                                >
                                  <div className={`cbx ${itemOn ? 'on' : ''}`}>
                                    {itemOn ? '✓' : ''}
                                  </div>
                                  {itemLabel}
                                </div>
                              );
                            })}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="vreqs">
            <div className="vr">
              <span>🚛 {t('vehicleType')}</span>
              <span className="vr-v">{summary.types.join(' | ') || '—'}</span>
            </div>
            <div className="vr">
              <span>📦 {t('cargoSpecs')}</span>
              <span className="vr-v">
                {summary.specs.length > 0
                  ? summary.specs.map((spec) => (
                      <span key={spec} className="vt">
                        {spec}
                      </span>
                    ))
                  : '—'}
              </span>
            </div>
          </div>

          <div className="veh-confirm">
            <button
              type="button"
              className="btn btn-p btn-sm inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                confirmSelection();
              }}
              disabled={summary.types.length === 0}
            >
              <Check size={14} />
              {t('confirmSelection')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;
