import React from 'react';
import { EQUIPMENT_OPTIONS, getEquipmentLabel } from '../../pages/AddressBook/constants';
import { useTranslation } from '../../hooks/useTranslation';

interface EquipmentSelectorProps {
  value: string[];
  onChange: (equipment: string[]) => void;
}

export const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  const toggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  return (
    <div className="mf amenity-grid">
      {EQUIPMENT_OPTIONS.map((item) => (
        <label key={item} className="amenity-check">
          <input type="checkbox" checked={value.includes(item)} onChange={() => toggle(item)} />
          {getEquipmentLabel(item, t)}
        </label>
      ))}
    </div>
  );
};
