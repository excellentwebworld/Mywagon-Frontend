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
  /** When true, unit/weight selects include an empty "—" option (AI import wizard). */
  allowEmptySelects?: boolean;
};

function usedSkuIds(lines: ErpOrderLine[], excludeIndex?: number): Set<number> {
  const used = new Set<number>();
  lines.forEach((line, i) => {
    if (excludeIndex !== undefined && i === excludeIndex) return;
    if (line.productSkuId != null) used.add(line.productSkuId);
  });
  return used;
}

export const OrderProductLinesEditor: React.FC<Props> = ({
  t,
  lines,
  skus,
  onChange,
  onAddProduct,
  allowEmptySelects = false,
}) => {
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
    const next = lines.map((line, i) => {
      if (i !== index) return line;
      const merged = { ...line, ...patch };
      const filledKeys = Object.keys(patch).filter((key) => {
        const val = merged[key as keyof ErpOrderLine];
        return val != null && String(val).trim() !== '';
      });
      const fieldMap: Record<string, string> = { unit: 'unit', weightUnit: 'weight_unit', weight: 'weight' };
      const cleared = (merged.sourceEmptyFields ?? []).filter((f) => {
        const patchKey = Object.entries(fieldMap).find(([, v]) => v === f)?.[0];
        return !(patchKey && filledKeys.includes(patchKey));
      });
      return { ...merged, sourceEmptyFields: cleared };
    });
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
            {allowEmptySelects && <option value="">—</option>}
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
            {allowEmptySelects && <option value="">—</option>}
            {WEIGHT_UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn !p-0"
            onClick={() => removeLine(index)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              flexShrink: 0,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--danger, #ef4444)' }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
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
