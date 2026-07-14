import React, { useEffect, useMemo, useState } from 'react';
import { useFormikContext } from 'formik';
import { Check, Truck } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useVehicleTypes } from '../../hooks/useVehicleTypes';
import {
  normalizeVehicleSpecs,
  vehicleSpecsNeedRematch,
  type WizardFormValues,
} from '../../api/mappers/createShipmentMapper';
import {
  formatVehicleSelectionSummary,
  type WizardVehicleType,
} from './vehicleTypes';
import { assessVehicleTypeFit } from './vehicleCapacity';
import { scrollToStep2Validation } from './validation';

function VehicleIcon() {
  return <Truck size={22} strokeWidth={2} aria-hidden />;
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

export interface VehicleSelectorProps {
  totalPallets: number;
  totalWeightKg: number;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  totalPallets,
  totalWeightKg,
}) => {
  const { t, lang } = useTranslation();
  const { values, setFieldValue } = useFormikContext<WizardFormValues>();
  const vehicleSpecs = values.vehicleSpecs || {};
  const { vehicleTypes, loading, error, refetch } = useVehicleTypes();

  const [cardExpanded, setCardExpanded] = useState(true);
  const [openNests, setOpenNests] = useState<Record<string, boolean>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const locale = lang === 'el' ? 'el' : 'en';
  const summary = useMemo(
    () => formatVehicleSelectionSummary(vehicleSpecs, locale, vehicleTypes),
    [vehicleSpecs, locale, vehicleTypes]
  );

  // PHP may return vehicleSpecs as a list; rematch category ids → truck type keys.
  useEffect(() => {
    if (!vehicleTypes.length || !vehicleSpecsNeedRematch(vehicleSpecs)) return;
    const rematched = normalizeVehicleSpecs(
      Object.keys(vehicleSpecs).map((k) => vehicleSpecs[k]),
      vehicleTypes
    );
    if (Object.keys(rematched).length === 0) return;
    if (vehicleSpecsNeedRematch(rematched)) return;
    setFieldValue('vehicleSpecs', rematched);
  }, [vehicleTypes, vehicleSpecs, setFieldValue]);

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
    setOpenNests((prev) => {
      const willOpen = !prev[vt.formKey];
      // Accordion: only one vehicle nest open at a time
      if (!willOpen) return { ...prev, [vt.formKey]: false };
      return { [vt.formKey]: true };
    });
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

  const canConfirm = summary.types.length > 0;

  const confirmSelection = () => {
    if (!canConfirm) {
      scrollToStep2Validation('step2-vehicle-required');
      return;
    }

    setFieldValue('vehicleSelectionConfirmed', true);
    setCardExpanded(false);
  };

  const toggleCardHeader = () => {
    setCardExpanded((prev) => !prev);
  };

  return (
    <div
      className="rounded-xl mt-4"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)', overflow: 'visible' }}
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
          {loading && (
            <div className="px-4 py-8 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              {t('loading') || 'Loading vehicle types…'}
            </div>
          )}

          {!loading && error && (
            <div className="px-4 py-6 text-center">
              <div className="text-sm mb-3" style={{ color: '#DC2626' }}>
                {error}
              </div>
              <button
                type="button"
                className="btn btn-sm px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-alt)', fontFamily: 'inherit' }}
                onClick={() => refetch()}
              >
                {t('retry') || 'Retry'}
              </button>
            </div>
          )}

          {!loading && !error && vehicleTypes.length === 0 && (
            <div className="px-4 py-8 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              {t('step2NoVehicleTypes') || 'No vehicle types are configured.'}
            </div>
          )}

          {!loading && !error && vehicleTypes.length > 0 && (
            <>
              <div
                className="vg"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(Math.max(vehicleTypes.length, 1), 4)}, minmax(0, 1fr))`,
                }}
              >
                {vehicleTypes.map((vt) => {
                  const selected = vehicleSpecs[vt.formKey] || [];
                  const selectedFlag = isTypeSelected(vt.formKey);
                  const nestOpen = openNests[vt.formKey] ?? false;
                  const displayName = locale === 'el' ? vt.nameEl : vt.name;
                  const fit = assessVehicleTypeFit(vt, totalPallets, totalWeightKg);
                  const fitColor = fit.status === 'fits' ? '#059669' : '#DC2626';
                  const maxTons = Math.round(fit.maxWeightKg / 1000);

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
                          <VehicleIcon />
                        </div>
                        <div className="vn">{displayName}</div>
                        <div className="vs">{vt.subtitle}</div>
                        {fit.show && (
                          <div className="vc-fit">
                            <div className="vc-fit-cap">
                              {t('vehicleFitCapacity', {
                                plt: fit.maxPallets,
                                tons: maxTons,
                              })}
                            </div>
                            <div className="vc-fit-label" style={{ color: fitColor }}>
                              {fit.status === 'fits'
                                ? t('vehicleFitFits')
                                : t('vehicleFitTooSmall')}
                            </div>
                            <div className="vc-fit-bar">
                              <div
                                className="vc-fit-bar__fill"
                                style={{
                                  width: `${fit.barPct}%`,
                                  background: fitColor,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`vnest ${nestOpen ? 'open' : ''}`}>
                        {vt.categories.map((cat) => {
                          const catKey = `${vt.formKey}-${cat.id}`;
                          const catOpen = openCategories[catKey] ?? false;
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer text-white border-none"
                  style={{
                    background: canConfirm ? 'var(--accent)' : 'var(--border-focus)',
                    fontFamily: 'inherit',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmSelection();
                  }}
                >
                  <Check size={14} />
                  {t('confirmSelection')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VehicleSelector;
