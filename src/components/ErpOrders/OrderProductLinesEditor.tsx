import React, { useMemo } from 'react';
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

function usedSkuIds(lines: ErpOrderLine[], excludeIndex?: number): Set<number> {
  const used = new Set<number>();
  lines.forEach((line, i) => {
    if (excludeIndex !== undefined && i === excludeIndex) return;
    if (line.productSkuId != null) used.add(line.productSkuId);
  });
  return used;
}

export const OrderProductLinesEditor: React.FC<Props> = ({ t, lines, skus, onChange, onAddProduct }) => {
  const selectedSkuCount = useMemo(
    () => lines.filter((line) => line.productSkuId != null).length,
    [lines]
  );
  const canAddLine = lines.length === 0 || selectedSkuCount < skus.length;

  const getSkuOptionsForLine = (lineIndex: number) => {
    const line = lines[lineIndex];
    const taken = usedSkuIds(lines, lineIndex);
    const options = skus
      .filter((s) => !taken.has(Number(s.id)))
      .map((s) => ({
        value: String(s.id),
        label: s.name,
        sublabel: s.number,
      }));

    if (line?.productSkuId != null) {
      const value = String(line.productSkuId);
      if (!options.some((o) => o.value === value)) {
        options.unshift({
          value,
          label: line.productName || value,
          sublabel: line.sku ?? '',
        });
      }
    }

    return options;
  };

  const updateLine = (index: number, patch: Partial<ErpOrderLine>) => {
    const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange(next);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  const addLine = () => {
    if (!canAddLine) return;
    onChange([...lines, { ...EMPTY_ORDER_LINE }]);
  };

  return (
    <div className="erp-product-lines">
      <div className="field-l">{t('erpOrdersProducts')}</div>
      {lines.map((line, index) => (
        <div key={index} className="erp-product-line">
          <SearchableSelect
            options={getSkuOptionsForLine(index)}
            value={line.productSkuId ? String(line.productSkuId) : ''}
            onChange={(val, opt) => {
              const skuId = val ? Number(val) : null;
              if (skuId != null && usedSkuIds(lines, index).has(skuId)) {
                return;
              }
              const sku = skuId != null ? skus.find((s) => Number(s.id) === skuId) : undefined;
              updateLine(index, {
                productSkuId: skuId,
                productName: opt?.label ?? sku?.name ?? line.productName,
                sku: sku?.number,
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
      <button type="button" className="btn btn-sm" onClick={addLine} disabled={!canAddLine}>
        + {t('erpOrdersAddProductLine')}
      </button>
    </div>
  );
};

export type { ErpOrderFormState };
