import React, { useState } from 'react';
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
    const has = truckTypeIds.includes(id);
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

  return (
    <div className="sat-cargo-picker">
      {vehicleTypes.map((vt) => {
        const id = Number(vt.formKey);
        const checked = truckTypeIds.includes(id) || (vehicleSpecs[vt.formKey]?.length ?? 0) > 0;
        const label = lang === 'el' ? vt.nameEl : vt.name;
        const expanded = openType === vt.formKey && checked;
        return (
          <div key={vt.formKey} className="sat-cargo-type">
            <label className="sat-type-check">
              <input type="checkbox" checked={checked} onChange={() => toggleType(vt)} />
              <span>{label}</span>
              {checked && vt.categories.length > 0 && (
                <button
                  type="button"
                  className="sat-cargo-expand"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenType(expanded ? null : vt.formKey);
                  }}
                >
                  {expanded ? '▾' : '▸'} {t('satCargoSpecs')}
                </button>
              )}
            </label>
            {expanded && (
              <div className="sat-cargo-cats">
                {vt.categories.map((cat) => (
                  <div key={cat.id} className="sat-cargo-cat">
                    <div className="sat-cargo-cat-label">
                      {lang === 'el' ? cat.labelEl : cat.label}
                    </div>
                    <div className="sat-type-checks">
                      {cat.items.map((item) => {
                        const itemChecked = (vehicleSpecs[vt.formKey] ?? []).includes(item.id);
                        return (
                          <label key={item.id} className="sat-type-check">
                            <input
                              type="checkbox"
                              checked={itemChecked}
                              onChange={() => toggleItem(vt, item.id)}
                            />
                            <span>{lang === 'el' ? item.labelEl : item.label}</span>
                          </label>
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
  );
};
