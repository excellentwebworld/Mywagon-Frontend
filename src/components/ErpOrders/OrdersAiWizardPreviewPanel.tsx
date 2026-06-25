import React, { useMemo, useState } from 'react';
import type { ApiErpOrderCustomer } from '../../api/types/erpOrders';
import type { AiMappedOrder } from '../../api/types/erpOrders';
import type { LocationItem, SKU } from '../../context/AppContext';
import { SearchableSelect } from '../ui/SearchableSelect';
import { AiWizardCustomerSelect } from './AiWizardCustomerSelect';
import { DatePicker } from '../ui/DatePicker';
import { OrderProductLinesEditor } from './OrderProductLinesEditor';
import {
  acceptedOrders,
  areOrderLinesEdited,
  formatOrderLinesSummary,
  fromErpLines,
  initOrderPreviewRows,
  isOrderRowEdited,
  orderRowHasInferred,
  toConfirmImportOrders,
  toErpLines,
  type OrderPreviewFilter,
  type OrderPreviewRow,
} from './ordersAiWizardUtils';

export {
  acceptedOrders,
  initOrderPreviewRows,
  isOrderRowEdited,
  toConfirmImportOrders,
  type OrderPreviewRow,
};

type HeaderField =
  | 'order_reference'
  | 'erp_reference'
  | 'customer_name'
  | 'ship_date'
  | 'delivery_date'
  | 'ship_from'
  | 'ship_to'
  | 'notes'
  | 'high_priority'
  | 'products';

interface Props {
  rows: OrderPreviewRow[];
  fileHeaders: string[];
  companies: ApiErpOrderCustomer[];
  locations: LocationItem[];
  skus: SKU[];
  t: (key: string, options?: Record<string, unknown>) => string;
  onRowsChange: (rows: OrderPreviewRow[]) => void;
}

function fieldEdited(row: OrderPreviewRow, field: keyof AiMappedOrder): boolean {
  return String(row.original[field] ?? '') !== String(row.order[field] ?? '');
}

function linesEdited(row: OrderPreviewRow): boolean {
  return areOrderLinesEdited(row);
}

function cellClasses(row: OrderPreviewRow, field: keyof AiMappedOrder | 'products', inferred: boolean, extra = ''): string {
  const parts = [extra];
  if (row.status === 'rejected') parts.push('ai-preview-cell-rejected');
  if (field === 'products' ? linesEdited(row) : fieldEdited(row, field)) {
    parts.push('ai-preview-cell-edited');
  } else if (inferred) {
    parts.push('ai-highlight-cell');
  }
  return parts.filter(Boolean).join(' ');
}

export const OrdersAiWizardPreviewPanel: React.FC<Props> = ({
  rows,
  fileHeaders,
  companies,
  locations,
  skus,
  t,
  onRowsChange,
}) => {
  const [filter, setFilter] = useState<OrderPreviewFilter>('all');

  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: String(c.id),
        label: c.name,
        sublabel:
          c.is_partner && c.partner_company_name
            ? [c.vat_number, c.partner_company_name].filter(Boolean).join(' · ')
            : c.vat_number,
      })),
    [companies]
  );

  const locationOptions = useMemo(
    () =>
      locations.map((l) => ({
        value: String(l.id),
        label: l.name,
        sublabel: l.city || l.address,
      })),
    [locations]
  );

  const stats = useMemo(() => {
    const accepted = rows.filter((r) => r.status === 'accepted').length;
    const rejected = rows.filter((r) => r.status === 'rejected').length;
    const edited = rows.filter(isOrderRowEdited).length;
    const inferred = rows.filter(orderRowHasInferred).length;
    return { accepted, rejected, edited, inferred, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'accepted':
        return rows.filter((r) => r.status === 'accepted');
      case 'rejected':
        return rows.filter((r) => r.status === 'rejected');
      case 'edited':
        return rows.filter(isOrderRowEdited);
      case 'inferred':
        return rows.filter(orderRowHasInferred);
      default:
        return rows;
    }
  }, [rows, filter]);

  const updateRow = (id: string, patch: Partial<OrderPreviewRow>) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const updateOrder = (id: string, patch: Partial<AiMappedOrder>) => {
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, order: { ...r.order, ...patch } } : r)));
  };

  const setAllStatus = (status: OrderPreviewRow['status']) => {
    onRowsChange(rows.map((r) => ({ ...r, status, isEditing: false })));
  };

  const resetRow = (id: string) => {
    onRowsChange(
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              order: {
                ...r.original,
                lines: (r.original.lines ?? []).map((line) => ({ ...line })),
                inferred: r.original.inferred ? { ...r.original.inferred } : undefined,
              },
              status: 'accepted',
              isEditing: false,
            }
          : r
      )
    );
  };

  const renderEditCell = (row: OrderPreviewRow, field: HeaderField) => {
    const common = {
      className: 'ai-preview-input',
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    };

    if (field === 'order_reference') {
      return (
        <input
          {...common}
          type="text"
          value={row.order.order_reference}
          onChange={(e) => updateOrder(row.id, { order_reference: e.target.value })}
        />
      );
    }

    if (field === 'erp_reference') {
      return (
        <input
          {...common}
          type="text"
          value={row.order.erp_reference ?? ''}
          onChange={(e) => updateOrder(row.id, { erp_reference: e.target.value })}
        />
      );
    }

    if (field === 'customer_name') {
      return (
        <AiWizardCustomerSelect
          options={companyOptions}
          value={row.order.company_entity_id != null ? String(row.order.company_entity_id) : ''}
          onChange={(val, opt) => {
            updateOrder(row.id, {
              company_entity_id: val ? Number(val) : null,
              customer_name: val ? (opt?.label ?? '') : null,
              inferred: {
                ...row.order.inferred,
                customer: !val,
              },
            });
          }}
          placeholder={t('ordersAiWizardSelectCustomer')}
          searchPlaceholder={t('ordersAiWizardSearchCustomer')}
          hint={t('ordersAiWizardCustomerHint')}
        />
      );
    }

    if (field === 'ship_date' || field === 'delivery_date') {
      return (
        <DatePicker
          value={row.order[field] ?? ''}
          onChange={(val) => updateOrder(row.id, { [field]: val })}
        />
      );
    }

    if (field === 'ship_from') {
      return (
        <SearchableSelect
          options={locationOptions}
          value={row.order.origin_location_id ? String(row.order.origin_location_id) : ''}
          onChange={(val, opt) => {
            updateOrder(row.id, {
              origin_location_id: val ? Number(val) : null,
              ship_from: opt?.label ?? row.order.ship_from ?? '',
            });
          }}
          placeholder={t('erpOrdersSelectLocation')}
        />
      );
    }

    if (field === 'ship_to') {
      return (
        <SearchableSelect
          options={locationOptions}
          value={row.order.dest_location_id ? String(row.order.dest_location_id) : ''}
          onChange={(val, opt) => {
            updateOrder(row.id, {
              dest_location_id: val ? Number(val) : null,
              ship_to: opt?.label ?? row.order.ship_to ?? '',
            });
          }}
          placeholder={t('erpOrdersSelectLocation')}
        />
      );
    }

    if (field === 'notes') {
      return (
        <input
          {...common}
          type="text"
          value={row.order.notes ?? ''}
          onChange={(e) => updateOrder(row.id, { notes: e.target.value })}
        />
      );
    }

    if (field === 'high_priority') {
      return (
        <input
          type="checkbox"
          checked={Boolean(row.order.high_priority)}
          onChange={(e) => updateOrder(row.id, { high_priority: e.target.checked })}
        />
      );
    }

    return null;
  };

  const renderDisplayCell = (row: OrderPreviewRow, field: HeaderField) => {
    if (field === 'products') {
      return formatOrderLinesSummary(row.order.lines);
    }
    if (field === 'high_priority') {
      return row.order.high_priority ? t('yes') : t('no');
    }
    if (field === 'ship_from') {
      return row.order.ship_from || '—';
    }
    if (field === 'ship_to') {
      return row.order.ship_to || '—';
    }
    if (field === 'customer_name') {
      return row.order.customer_name?.trim() || '—';
    }
    const val = row.order[field as keyof AiMappedOrder];
    return val != null && String(val).trim() !== '' ? String(val) : '—';
  };

  const shouldRenderCustomerPicker = (row: OrderPreviewRow) => row.status === 'accepted';

  const colCount = 11;

  return (
    <>
      <div className="ai-preview-bar">
        <div>
          <div className="ai-preview-bar-title">{t('ordersAiWizardPreviewTitle')}</div>
          <div className="ai-preview-bar-sub">{t('ordersAiWizardPreviewSub')}</div>
        </div>
        <div className="ai-preview-stats">
          <span className="ai-preview-stat ai-preview-stat-ok">
            {stats.accepted} {t('aiWizardAccepted')}
          </span>
          <span className="ai-preview-stat ai-preview-stat-no">
            {stats.rejected} {t('aiWizardRejected')}
          </span>
          {stats.edited > 0 && (
            <span className="ai-preview-stat ai-preview-stat-edit">
              {stats.edited} {t('aiWizardEdited')}
            </span>
          )}
          {stats.inferred > 0 && (
            <span className="ai-preview-stat ai-preview-stat-ai">
              {stats.inferred} {t('aiWizardAiInferred')}
            </span>
          )}
        </div>
      </div>

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
          {(['all', 'accepted', 'rejected', 'edited', 'inferred'] as OrderPreviewFilter[]).map((f) => (
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
          <span className="ai-legend-dot ai-legend-rejected" /> {t('aiWizardLegendRejected')}
        </span>
      </div>

      {fileHeaders.length > 0 && (
        <div className="ai-preview-source-hdr">
          <span className="ai-preview-source-label">{t('aiWizardSourceColumns')}:</span>
          {fileHeaders.slice(0, 8).map((h) => (
            <span key={h} className="ai-detected-col-chip">
              {h}
            </span>
          ))}
          {fileHeaders.length > 8 && (
            <span className="ai-detected-col-chip ai-detected-col-more">+{fileHeaders.length - 8}</span>
          )}
        </div>
      )}

      <div className="ai-table-container ai-preview-table-wrap">
        <table className="ai-preview-table">
          <thead>
            <tr>
              <th className="ai-preview-col-actions">{t('aiWizardActions')}</th>
              <th>#</th>
              <th>{t('erpOrdersColOrderId')}</th>
              <th className="ai-th-customer">
                {t('erpOrdersColCustomer')}
                <span className="ai-th-required" title={t('ordersAiWizardCustomerHint')}>
                  *
                </span>
              </th>
              <th>{t('erpOrdersShipDate')}</th>
              <th>{t('erpOrdersColDeliveryDate')}</th>
              <th>{t('erpOrdersColShipFrom')}</th>
              <th>{t('erpOrdersColShipTo')}</th>
              <th>{t('erpOrdersColProducts')}</th>
              <th>{t('erpOrdersHighPriority')}</th>
              <th>{t('notes')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="ai-table-empty">
                  {t('ordersAiWizardNoOrders')}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const rowClass = [
                  row.status === 'rejected' ? 'ai-preview-row-rejected' : '',
                  row.isEditing ? 'ai-preview-row-editing' : '',
                  isOrderRowEdited(row) ? 'ai-preview-row-modified' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                const headerFields: { field: HeaderField; inferred: boolean; extra?: string }[] = [
                  { field: 'order_reference', inferred: false, extra: 'ai-td-bold' },
                  { field: 'customer_name', inferred: Boolean(row.order.inferred?.customer) },
                  { field: 'ship_date', inferred: false, extra: 'ai-td-mono' },
                  { field: 'delivery_date', inferred: false, extra: 'ai-td-mono' },
                  { field: 'ship_from', inferred: Boolean(row.order.inferred?.ship_from) },
                  { field: 'ship_to', inferred: Boolean(row.order.inferred?.ship_to) },
                  {
                    field: 'products',
                    inferred: Boolean((row.order.lines ?? []).some((l) => l.inferred?.product)),
                  },
                  { field: 'high_priority', inferred: false },
                  { field: 'notes', inferred: false },
                ];

                return (
                  <React.Fragment key={row.id}>
                    <tr className={rowClass}>
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
                            disabled={row.status !== 'accepted'}
                            onClick={() => updateRow(row.id, { isEditing: !row.isEditing })}
                          >
                            {row.isEditing ? '✔' : '✎'}
                          </button>
                          {(isOrderRowEdited(row) || row.status === 'rejected') && (
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
                      {headerFields.map(({ field, inferred, extra }) => (
                        <td
                          key={field}
                          className={[
                            cellClasses(row, field === 'products' ? 'products' : field, inferred, extra),
                            field === 'customer_name' ? 'ai-td-customer' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {field === 'customer_name' && shouldRenderCustomerPicker(row)
                            ? renderEditCell(row, field)
                            : row.isEditing && row.status === 'accepted'
                              ? field === 'products'
                                ? renderDisplayCell(row, field)
                                : renderEditCell(row, field)
                              : renderDisplayCell(row, field)}
                        </td>
                      ))}
                    </tr>
                    {row.isEditing && row.status === 'accepted' && (
                      <tr className="ai-preview-row-lines">
                        <td colSpan={colCount} className="ai-preview-lines-cell">
                          <OrderProductLinesEditor
                            t={t}
                            lines={toErpLines(row.order.lines)}
                            skus={skus}
                            onChange={(next) => updateOrder(row.id, { lines: fromErpLines(next) })}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
