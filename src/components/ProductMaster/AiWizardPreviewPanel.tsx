import React, { useMemo, useState } from 'react';
import type { AiMappedProduct, ApiReferenceCategory } from '../../api/types/productMaster';
import {
  PALLET_OPTIONS,
  TEMP_OPTIONS,
  UOM_OPTIONS,
} from '../../pages/ProductMaster/constants';
import {
  computeColumnMapping,
  getRowInvalidFields,
  type ColumnMappingSummary,
  type ValidatableProductField,
} from '../../pages/ProductMaster/utils/aiWizardUtils';

export type PreviewRowStatus = 'accepted' | 'rejected';

export interface PreviewRow {
  id: string;
  product: AiMappedProduct;
  original: AiMappedProduct;
  status: PreviewRowStatus;
  isEditing: boolean;
}

export type PreviewFilter = 'all' | 'accepted' | 'rejected' | 'edited' | 'inferred' | 'invalid';

const EDITABLE_FIELDS: ValidatableProductField[] = [
  'sku_name',
  'sku_number',
  'barcode',
  'category',
  'product_type',
  'unit',
  'weight',
  'hazardous',
  'pallet_type',
  'stackable',
  'temperature',
  'status',
];

export function initPreviewRows(products: AiMappedProduct[]): PreviewRow[] {
  return products.map((p, i) => ({
    id: `ai-row-${i}-${p.sku_number || i}`,
    product: { ...p },
    original: { ...p },
    status: 'accepted',
    isEditing: false,
  }));
}

export function isRowEdited(row: PreviewRow): boolean {
  return EDITABLE_FIELDS.some((f) => (row.original[f] ?? '') !== (row.product[f] ?? ''));
}

export function rowHasInferred(row: PreviewRow, inferredFields: Record<string, boolean>): boolean {
  return Object.entries(inferredFields).some(([field, missing]) => missing && row.product[field as keyof AiMappedProduct]);
}

export function acceptedProducts(rows: PreviewRow[]): AiMappedProduct[] {
  return rows.filter((r) => r.status === 'accepted').map((r) => r.product);
}

interface Props {
  rows: PreviewRow[];
  fileHeaders: string[];
  inferredFields: Record<string, boolean>;
  referenceCategories: ApiReferenceCategory[];
  t: (key: string, options?: Record<string, unknown>) => string;
  onRowsChange: (rows: PreviewRow[]) => void;
}

function fieldEdited(row: PreviewRow, field: ValidatableProductField): boolean {
  return (row.original[field] ?? '') !== (row.product[field] ?? '');
}

function cellClasses(
  row: PreviewRow,
  field: ValidatableProductField,
  inferred: boolean,
  invalidFields: ValidatableProductField[],
  extra = ''
): string {
  const parts = [extra];
  if (row.status === 'rejected') parts.push('ai-preview-cell-rejected');
  if (invalidFields.includes(field)) parts.push('ai-preview-cell-invalid');
  else if (fieldEdited(row, field)) parts.push('ai-preview-cell-edited');
  else if (inferred) parts.push('ai-highlight-cell');
  return parts.filter(Boolean).join(' ');
}

function ColumnMappingSummaryBar({
  summary,
  t,
}: {
  summary: ColumnMappingSummary;
  t: Props['t'];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (summary.mapped.length === 0 && summary.unmapped.length === 0) return null;

  if (!isExpanded) {
    return (
      <div
        className="ai-preview-column-summary-collapsed"
        onClick={() => setIsExpanded(true)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="summary-toggle-icon">▶</span>
          <span className="summary-text" style={{ fontSize: '11px', color: 'var(--t2)' }}>
            <strong>{t('aiWizardMappedColumnsTitle', { count: summary.mapped.length })}</strong>
            {summary.unmapped.length > 0 && (
              <>
                <span style={{ margin: '0 8px', color: 'var(--bd)' }}>|</span>
                <span style={{ color: 'var(--t3)' }}>
                  {t('aiWizardUnmappedColumnsTitle', { count: summary.unmapped.length })}
                </span>
              </>
            )}
          </span>
        </div>
        <span className="summary-action-hint" style={{ fontSize: '10px', color: 'var(--t3)', fontStyle: 'italic' }}>
          {t('clickToExpand', { defaultValue: 'Click to expand' })}
        </span>
      </div>
    );
  }

  return (
    <div className="ai-preview-column-summary">
      <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', borderBottom: '1px solid var(--bd)', paddingBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsExpanded(false)}>
          <span className="summary-toggle-icon" style={{ transform: 'rotate(90deg)', display: 'inline-block' }}>▶</span>
          Column Mapping Details
        </span>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--t3)',
            cursor: 'pointer',
            fontSize: '10px',
            textDecoration: 'underline',
            padding: 0
          }}
        >
          {t('collapse', { defaultValue: 'Collapse' })}
        </button>
      </div>

      <div className="ai-preview-col-summary-block">
        <div className="ai-preview-col-summary-title ai-preview-col-summary-ok">
          {t('aiWizardMappedColumnsTitle', { count: summary.mapped.length })}
        </div>
        <div className="ai-preview-col-summary-chips">
          {summary.mapped.length === 0 ? (
            <span className="ai-preview-col-summary-empty">{t('aiWizardNoMappedColumns')}</span>
          ) : (
            summary.mapped.map((col) => (
              <span key={`${col.header}-${col.field}`} className="ai-detected-col-chip ai-detected-col-mapped" title={col.label}>
                {col.header} → {col.label}
              </span>
            ))
          )}
        </div>
      </div>
      <div className="ai-preview-col-summary-block">
        <div className="ai-preview-col-summary-title ai-preview-col-summary-skip">
          {t('aiWizardUnmappedColumnsTitle', { count: summary.unmapped.length })}
        </div>
        <div className="ai-preview-col-summary-chips">
          {summary.unmapped.length === 0 ? (
            <span className="ai-preview-col-summary-empty">{t('aiWizardAllColumnsMapped')}</span>
          ) : (
            summary.unmapped.map((header) => (
              <span key={header} className="ai-detected-col-chip ai-detected-col-unmapped" title={t('aiWizardUnmappedColumnHint')}>
                {header}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export const AiWizardPreviewPanel: React.FC<Props> = ({
  rows,
  fileHeaders,
  inferredFields,
  referenceCategories,
  t,
  onRowsChange,
}) => {
  const [filter, setFilter] = useState<PreviewFilter>('all');

  const columnSummary = useMemo(() => computeColumnMapping(fileHeaders), [fileHeaders]);

  const invalidByRowId = useMemo(() => {
    const map = new Map<string, ValidatableProductField[]>();
    for (const row of rows) {
      if (row.status === 'rejected') {
        map.set(row.id, []);
        continue;
      }
      map.set(row.id, getRowInvalidFields(row.product, referenceCategories));
    }
    return map;
  }, [rows, referenceCategories]);

  const stats = useMemo(() => {
    const accepted = rows.filter((r) => r.status === 'accepted').length;
    const rejected = rows.filter((r) => r.status === 'rejected').length;
    const edited = rows.filter(isRowEdited).length;
    const inferred = rows.filter((r) => rowHasInferred(r, inferredFields)).length;
    const invalid = rows.filter(
      (r) => r.status === 'accepted' && (invalidByRowId.get(r.id)?.length ?? 0) > 0
    ).length;
    return { accepted, rejected, edited, inferred, invalid, total: rows.length };
  }, [rows, inferredFields, invalidByRowId]);

  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'accepted':
        return rows.filter((r) => r.status === 'accepted');
      case 'rejected':
        return rows.filter((r) => r.status === 'rejected');
      case 'edited':
        return rows.filter(isRowEdited);
      case 'inferred':
        return rows.filter((r) => rowHasInferred(r, inferredFields));
      case 'invalid':
        return rows.filter(
          (r) => r.status === 'accepted' && (invalidByRowId.get(r.id)?.length ?? 0) > 0
        );
      default:
        return rows;
    }
  }, [rows, filter, inferredFields, invalidByRowId]);

  const updateRow = (id: string, patch: Partial<PreviewRow>) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const updateProduct = (id: string, patch: Partial<AiMappedProduct>) => {
    onRowsChange(
      rows.map((r) => (r.id === id ? { ...r, product: { ...r.product, ...patch } } : r))
    );
  };

  const setAllStatus = (status: PreviewRowStatus) => {
    onRowsChange(rows.map((r) => ({ ...r, status, isEditing: false })));
  };

  const resetRow = (id: string) => {
    onRowsChange(
      rows.map((r) =>
        r.id === id
          ? { ...r, product: { ...r.original }, status: 'accepted' as PreviewRowStatus, isEditing: false }
          : r
      )
    );
  };

  const typesForCategory = (categoryName: string) => {
    const cat = referenceCategories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    return cat?.types ?? [];
  };

  const renderEditCell = (row: PreviewRow, field: ValidatableProductField, invalidFields: ValidatableProductField[]) => {
    const val = row.product[field] ?? '';
    const isInvalid = invalidFields.includes(field);
    const common = {
      className: `ai-preview-input${isInvalid ? ' ai-preview-input-invalid' : ''}`,
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    };

    if (field === 'category') {
      return (
        <select
          {...common}
          value={row.product.category}
          onChange={(e) => {
            const name = e.target.value;
            const types = typesForCategory(name);
            updateProduct(row.id, {
              category: name,
              product_type: types.some((tp) => tp.name === row.product.product_type) ? row.product.product_type : '',
            });
          }}
        >
          <option value="">{t('selectCat')}</option>
          {referenceCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      );
    }

    if (field === 'product_type') {
      const types = typesForCategory(row.product.category);
      return (
        <select
          {...common}
          value={row.product.product_type}
          onChange={(e) => updateProduct(row.id, { product_type: e.target.value })}
        >
          <option value="">{t('selectCatFirst')}</option>
          {types.map((tp) => (
            <option key={tp.id} value={tp.name}>
              {tp.name}
            </option>
          ))}
        </select>
      );
    }

    if (field === 'unit') {
      return (
        <select {...common} value={String(val || 'Case')} onChange={(e) => updateProduct(row.id, { unit: e.target.value })}>
          {UOM_OPTIONS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      );
    }

    if (field === 'temperature') {
      return (
        <select {...common} value={String(val || 'Ambient')} onChange={(e) => updateProduct(row.id, { temperature: e.target.value })}>
          {TEMP_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (field === 'pallet_type') {
      return (
        <select {...common} value={String(val || 'EUR')} onChange={(e) => updateProduct(row.id, { pallet_type: e.target.value })}>
          {PALLET_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (field === 'hazardous' || field === 'stackable') {
      return (
        <select {...common} value={String(val || 'No')} onChange={(e) => updateProduct(row.id, { [field]: e.target.value })}>
          <option value="Yes">{t('yes')}</option>
          <option value="No">{t('no')}</option>
        </select>
      );
    }

    if (field === 'status') {
      return (
        <select {...common} value={String(val || 'Active')} onChange={(e) => updateProduct(row.id, { status: e.target.value })}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      );
    }

    return (
      <input
        {...common}
        type="text"
        value={String(val)}
        onChange={(e) => updateProduct(row.id, { [field]: e.target.value })}
      />
    );
  };

  const renderDisplayCell = (row: PreviewRow, field: ValidatableProductField, inferred: boolean, invalidFields: ValidatableProductField[]) => {
    const val = row.product[field] ?? '';
    const isInvalid = invalidFields.includes(field);
    const wrap = (content: React.ReactNode) => (
      <span className={isInvalid ? 'ai-preview-invalid-value' : undefined} title={isInvalid ? t('aiWizardInvalidValueHint') : undefined}>
        {content}
      </span>
    );

    if (field === 'category') {
      return wrap(<span className="cat-pill">{String(val) || '—'}</span>);
    }
    if (field === 'product_type') {
      return wrap(<span className="type-pill">{String(val) || '—'}</span>);
    }
    if (field === 'hazardous' || field === 'stackable' || field === 'status' || field === 'temperature') {
      const lower = String(val).toLowerCase();
      let badge = 'ai-badge ai-badge-neutral';
      if (field === 'hazardous' && lower === 'yes') badge = 'ai-badge ai-badge-danger';
      if (field === 'stackable' && lower !== 'no') badge = 'ai-badge ai-badge-success';
      if (field === 'status' && lower !== 'inactive') badge = 'ai-badge ai-badge-success';
      return wrap(
        <span className={badge}>{String(val || (field === 'status' ? 'Active' : field === 'stackable' ? t('yes') : t('no')))}</span>
      );
    }
    if (field === 'weight' && val) return wrap(`${val} kg`);
    if (field === 'barcode' && !val) return '-';
    if (field === 'unit' && !val) return wrap('Case');
    if (field === 'pallet_type' && !val) return wrap('EUR');
    return wrap(String(val || '—'));
  };

  return (
    <>
      <div className="ai-preview-bar">
        <div>
          <div className="ai-preview-bar-title">{t('aiWizardPreviewTitle')}</div>
          <div className="ai-preview-bar-sub">{t('aiWizardPreviewReviewSub')}</div>
        </div>
        <div className="ai-preview-stats">
          <span className="ai-preview-stat ai-preview-stat-ok">{stats.accepted} {t('aiWizardAccepted')}</span>
          <span className="ai-preview-stat ai-preview-stat-no">{stats.rejected} {t('aiWizardRejected')}</span>
          {stats.invalid > 0 && (
            <span className="ai-preview-stat ai-preview-stat-invalid">{stats.invalid} {t('aiWizardInvalid')}</span>
          )}
          {stats.edited > 0 && (
            <span className="ai-preview-stat ai-preview-stat-edit">{stats.edited} {t('aiWizardEdited')}</span>
          )}
          {stats.inferred > 0 && (
            <span className="ai-preview-stat ai-preview-stat-ai">{stats.inferred} {t('aiWizardAiInferred')}</span>
          )}
        </div>
      </div>

      <ColumnMappingSummaryBar summary={columnSummary} t={t} />

      {stats.invalid > 0 && (
        <div className="ai-preview-invalid-banner">
          {t('aiWizardInvalidBanner')}
        </div>
      )}

      <div className="ai-preview-toolbar">
        <div className="ai-preview-bulk">
          <button type="button" className="btn ai-preview-btn-accept" onClick={() => setAllStatus('accepted')}>
            ✓ {t('aiWizardAcceptAll')}
          </button>
          <button type="button" className="btn ai-preview-btn-reject" onClick={() => setAllStatus('rejected')}>
            ✕ {t('aiWizardRejectAll')}
          </button>
        </div>
        <div className="ai-preview-filters">
          {(['all', 'accepted', 'rejected', 'invalid', 'edited', 'inferred'] as PreviewFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`ai-preview-filter${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {t(`aiWizardFilter_${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="ai-preview-legend">
        <span className="ai-legend-item">
          <span className="ai-legend-dot ai-legend-inferred" /> {t('aiWizardLegendInferred')}
        </span>
        <span className="ai-legend-item">
          <span className="ai-legend-dot ai-legend-edited" /> {t('aiWizardLegendEdited')}
        </span>
        <span className="ai-legend-item">
          <span className="ai-legend-dot ai-legend-invalid" /> {t('aiWizardLegendInvalid')}
        </span>
        <span className="ai-legend-item">
          <span className="ai-legend-dot ai-legend-rejected" /> {t('aiWizardLegendRejected')}
        </span>
      </div>

      <div className="ai-table-container ai-preview-table-wrap">
        <table className="ai-preview-table">
          <thead>
            <tr>
              <th className="ai-preview-col-actions">{t('aiWizardActions')}</th>
              <th>#</th>
              <th>{t('skuName')}</th>
              <th>{t('skuNumber')}</th>
              <th>{t('barcode')}</th>
              <th>{t('category')}</th>
              <th>{t('productType')}</th>
              <th>{t('uom')}</th>
              <th>{t('weight')}</th>
              <th>{t('hazardous')}</th>
              <th>{t('palletType')}</th>
              <th>{t('stackable')}</th>
              <th>{t('temp')}</th>
              <th>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={14} className="ai-table-empty">
                  {t('aiWizardNoProducts')}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const invalidFields = invalidByRowId.get(row.id) ?? [];
                const rowClass = [
                  row.status === 'rejected' ? 'ai-preview-row-rejected' : '',
                  row.isEditing ? 'ai-preview-row-editing' : '',
                  isRowEdited(row) ? 'ai-preview-row-modified' : '',
                  row.status === 'accepted' && invalidFields.length > 0 ? 'ai-preview-row-invalid' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr key={row.id} className={rowClass}>
                    <td className="ai-preview-col-actions">
                      <div className="ai-preview-row-actions">
                        <button
                          type="button"
                          title={t('accept')}
                          className={`ai-row-action ai-row-accept${row.status === 'accepted' ? ' active' : ''}`}
                          onClick={() => updateRow(row.id, { status: 'accepted' })}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          title={t('reject')}
                          className={`ai-row-action ai-row-reject${row.status === 'rejected' ? ' active' : ''}`}
                          onClick={() => updateRow(row.id, { status: 'rejected', isEditing: false })}
                        >
                          ✕
                        </button>
                        <button
                          type="button"
                          title={row.isEditing ? t('save') : t('edit')}
                          className={`ai-row-action ai-row-edit${row.isEditing ? ' active' : ''}`}
                          onClick={() => updateRow(row.id, { isEditing: !row.isEditing })}
                        >
                          {row.isEditing ? '✔' : '✎'}
                        </button>
                        {(isRowEdited(row) || row.status === 'rejected') && (
                          <button
                            type="button"
                            title={t('aiWizardResetRow')}
                            className="ai-row-action ai-row-reset"
                            onClick={() => resetRow(row.id)}
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="ai-td-num">{idx + 1}</td>
                    {EDITABLE_FIELDS.map((field) => {
                      const inferred = inferredFields[field] ?? false;
                      const extra =
                        field === 'sku_name'
                          ? 'ai-td-bold'
                          : field === 'sku_number'
                            ? 'ai-td-mono'
                            : field === 'unit'
                              ? 'ai-td-medium'
                              : '';
                      return (
                        <td key={field} className={cellClasses(row, field, inferred, invalidFields, extra)}>
                          {row.isEditing && row.status === 'accepted'
                            ? renderEditCell(row, field, invalidFields)
                            : renderDisplayCell(row, field, inferred, invalidFields)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export { countAcceptedRowsWithIssues, getRowInvalidFields, rowHasBlockingIssues } from '../../pages/ProductMaster/utils/aiWizardUtils';
