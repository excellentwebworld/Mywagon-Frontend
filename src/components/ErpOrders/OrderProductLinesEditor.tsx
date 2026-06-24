import React from 'react';
import { QTY_UNIT_OPTIONS, WEIGHT_UNIT_OPTIONS } from '../../constants/cargoUnits';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { SKU } from '../../context/AppContext';
import type { ErpOrderLine, ErpOrderFormState } from '../../pages/ErpOrders/types';
import { EMPTY_ORDER_LINE } from '../../pages/ErpOrders/types';

type Props = {
  t: (key: string) => string;
  lines: ErpOrderLine[];
  skus: SKU[];
  onChange: (lines: ErpOrderLine[]) => void;
  onAddProduct?: (lineIndex: number) => void;
};

export const OrderProductLinesEditor: React.FC<Props> = ({ t, lines, skus, onChange, onAddProduct }) => {
  const skuOptions = skus.map((s) => ({
    value: String(s.id),
    label: s.name,
    sublabel: s.number,
  }));

  const updateLine = (index: number, patch: Partial<ErpOrderLine>) => {
    const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange(next);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  const addLine = () => {
    onChange([...lines, { ...EMPTY_ORDER_LINE }]);
  };

  return (
    <div className="erp-product-lines">
      <div className="field-l">{t('erpOrdersProducts')}</div>
      {lines.map((line, index) => (
        <div key={index} className="erp-product-line">
          <SearchableSelect
            options={skuOptions}
            value={line.productSkuId ? String(line.productSkuId) : ''}
            onChange={(val, opt) => {
              updateLine(index, {
                productSkuId: val ? Number(val) : null,
                productName: opt?.label ?? line.productName,
              });
            }}
            placeholder={t('erpOrdersSelectProduct')}
            footerAction={onAddProduct ? { label: `+ ${t('erpOrdersAddProduct')}`, onClick: () => onAddProduct(index) } : undefined}
          />
          <input
            type="number"
            className="inp"
            placeholder={t('qty')}
            value={line.quantity ?? ''}
            onChange={(e) => updateLine(index, { quantity: e.target.value ? Number(e.target.value) : null })}
          />
          <select className="inp" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })}>
            {QTY_UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="inp"
            placeholder={t('weight')}
            value={line.weight ?? ''}
            onChange={(e) => updateLine(index, { weight: e.target.value ? Number(e.target.value) : null })}
          />
          <select className="inp" value={line.weightUnit} onChange={(e) => updateLine(index, { weightUnit: e.target.value })}>
            {WEIGHT_UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" onClick={() => removeLine(index)}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-sm" onClick={addLine}>
        + {t('erpOrdersAddProductLine')}
      </button>
    </div>
  );
};

export type { ErpOrderFormState };
