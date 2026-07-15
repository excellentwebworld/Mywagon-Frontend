import React, { useState } from 'react';
import { Check, ChevronDown, Truck } from 'lucide-react';
import { useVehicleTypes } from '../../hooks/useVehicleTypes';
import { useTranslation } from '../../hooks/useTranslation';
import type { WizardVehicleType } from '../CreateShipmentWizard/vehicleTypes';

interface SearchVehicleCargoPickerProps {
  vehicleSpecs: Record<string, string[]>;
  truckTypeIds: number[];
  onChange: (next: {
    vehicleSpecs: Record<string, string[]>;
    truckTypeIds: number[];
    vehicleType: string;
  }) => void;
  t: (key: string) => string;
}

export const SearchVehicleCargoPicker: React.FC<SearchVehicleCargoPickerProps> = ({
  vehicleSpecs,
  truckTypeIds,
  onChange,
  t,
}) => {
  const { vehicleTypes, loading } = useVehicleTypes();
  const { lang } = useTranslation();
  const [openType, setOpenType] = useState<string | null>(null);

  if (loading) {
    return <div className="sat-muted">{t('satLoadingVehicleTypes')}</div>;
  }

  if (vehicleTypes.length === 0) {
    return (
      <div className="sat-muted">
        {t('step2NoVehicleTypes') || 'No vehicle types are configured.'}
      </div>
    );
  }

  const emit = (nextSpecs: Record<string, string[]>, nextTypeIds: number[]) => {
    const first = vehicleTypes.find((x) => nextTypeIds.includes(Number(x.formKey)));
    onChange({
      vehicleSpecs: nextSpecs,
      truckTypeIds: nextTypeIds,
      vehicleType: first ? (lang === 'el' ? first.nameEl : first.name) : '',
    });
  };

  const toggleType = (vt: WizardVehicleType) => {
    const id = Number(vt.formKey);
    const has = truckTypeIds.includes(id) || (vehicleSpecs[vt.formKey]?.length ?? 0) > 0;
    const nextTypeIds = has
      ? truckTypeIds.filter((x) => x !== id)
      : [...truckTypeIds, id];
    const nextSpecs = { ...vehicleSpecs };
    if (has) {
      delete nextSpecs[vt.formKey];
      if (openType === vt.formKey) setOpenType(null);
    } else {
      nextSpecs[vt.formKey] = nextSpecs[vt.formKey] ?? [];
      setOpenType(vt.formKey);
    }
    emit(nextSpecs, nextTypeIds);
  };

  const toggleItem = (vt: WizardVehicleType, itemId: string) => {
    const current = vehicleSpecs[vt.formKey] ?? [];
    const has = current.includes(itemId);
    const nextItems = has ? current.filter((x) => x !== itemId) : [...current, itemId];
    const nextSpecs = { ...vehicleSpecs, [vt.formKey]: nextItems };
    const typeId = Number(vt.formKey);
    const nextTypeIds =
      nextItems.length > 0 || truckTypeIds.includes(typeId)
        ? Array.from(new Set([...truckTypeIds, typeId]))
        : truckTypeIds;
    emit(nextSpecs, nextTypeIds);
  };

  const selectedCount = vehicleTypes.filter(
    (vt) =>
      truckTypeIds.includes(Number(vt.formKey)) ||
      (vehicleSpecs[vt.formKey]?.length ?? 0) > 0
  ).length;

  return (
    <div className="sat-veh-picker">
      <div className="sat-veh-picker-hint">
        {t('selectOneOrMoreTypes') || 'Select one or more types'}
        {selectedCount > 0 ? (
          <span className="sat-veh-picker-count">
            {selectedCount} {t('selected') || 'selected'}
          </span>
        ) : null}
      </div>

      <div className="sat-veh-grid">
        {vehicleTypes.map((vt) => {
          const id = Number(vt.formKey);
          const checked =
            truckTypeIds.includes(id) || (vehicleSpecs[vt.formKey]?.length ?? 0) > 0;
          const label = lang === 'el' ? vt.nameEl : vt.name;
          const expanded = openType === vt.formKey && checked;
          const specCount = vehicleSpecs[vt.formKey]?.length ?? 0;

          return (
            <div key={vt.formKey} className={`sat-veh-card-wrap${expanded ? ' is-open' : ''}`}>
              <button
                type="button"
                className={`sat-veh-card${checked ? ' is-selected' : ''}`}
                onClick={() => toggleType(vt)}
                aria-pressed={checked}
              >
                {checked && (
                  <span className="sat-veh-check" aria-hidden>
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
                <span className="sat-veh-icon" aria-hidden>
                  <Truck size={22} strokeWidth={2} />
                </span>
                <span className="sat-veh-name">{label}</span>
                {vt.subtitle ? <span className="sat-veh-sub">{vt.subtitle}</span> : null}
              </button>

              {checked && vt.categories.length > 0 && (
                <button
                  type="button"
                  className={`sat-veh-spec-toggle${expanded ? ' is-open' : ''}`}
                  onClick={() => setOpenType(expanded ? null : vt.formKey)}
                >
                  <span>
                    {t('satCargoSpecs') || 'Cargo specs'}
                    {specCount > 0 ? ` · ${specCount}` : ''}
                  </span>
                  <ChevronDown size={14} strokeWidth={2.5} />
                </button>
              )}

              {expanded && (
                <div className="sat-veh-specs">
                  {vt.categories.map((cat) => (
                    <div key={cat.id} className="sat-veh-cat">
                      <div className="sat-veh-cat-label">
                        {lang === 'el' ? cat.labelEl : cat.label}
                      </div>
                      <div className="sat-veh-chips">
                        {cat.items.map((item) => {
                          const itemChecked = (vehicleSpecs[vt.formKey] ?? []).includes(
                            item.id
                          );
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`sat-veh-chip${itemChecked ? ' is-on' : ''}`}
                              onClick={() => toggleItem(vt, item.id)}
                              aria-pressed={itemChecked}
                            >
                              {lang === 'el' ? item.labelEl : item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
