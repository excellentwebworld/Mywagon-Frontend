import React, { useMemo } from 'react';
import { SearchableSelect } from '../ui/SearchableSelect';
import { OrderProductLinesEditor } from './OrderProductLinesEditor';
import type { ApiCompanyEntity } from '../../api/types/addressBook';
import type { LocationItem, SKU } from '../../context/AppContext';
import type { ErpOrderFormState } from '../../pages/ErpOrders/types';

type Props = {
  t: (key: string) => string;
  isOpen: boolean;
  isEdit: boolean;
  form: ErpOrderFormState;
  setForm: React.Dispatch<React.SetStateAction<ErpOrderFormState>>;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  companies: ApiCompanyEntity[];
  locations: LocationItem[];
  skus: SKU[];
  onAddLocation?: () => void;
  onAddProduct?: () => void;
};

export const CreateEditOrderModal: React.FC<Props> = ({
  t,
  isOpen,
  isEdit,
  form,
  setForm,
  onClose,
  onSubmit,
  saving,
  companies,
  locations,
  skus,
  onAddLocation,
  onAddProduct,
}) => {
  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: String(c.id), label: c.name, sublabel: c.vat_number })),
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

  if (!isOpen) return null;

  return (
    <div className="modal-bg show">
      <div className="modal modal-form">
        <div className="modal-hd">
          <span>{isEdit ? t('erpOrdersEditOrder') : t('erpOrdersCreateOrder')}</span>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l">{t('erpOrdersColOrderId')} *</label>
            <input
              className="inp"
              value={form.orderReference}
              onChange={(e) => setForm((f) => ({ ...f, orderReference: e.target.value }))}
              disabled={isEdit}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('erpOrdersErpId')}</label>
            <input
              className="inp"
              value={form.erpReference}
              onChange={(e) => setForm((f) => ({ ...f, erpReference: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('erpOrdersColCustomer')} *</label>
            <SearchableSelect
              options={companyOptions}
              value={form.companyEntityId ? String(form.companyEntityId) : ''}
              onChange={(val, opt) =>
                setForm((f) => ({
                  ...f,
                  companyEntityId: val ? Number(val) : null,
                  customerName: opt?.label ?? f.customerName,
                }))
              }
              placeholder={t('erpOrdersSelectCustomer')}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-l">{t('erpOrdersShipDate')}</label>
              <input
                type="date"
                className="inp"
                value={form.shipDate}
                onChange={(e) => setForm((f) => ({ ...f, shipDate: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="field-l">{t('erpOrdersColDeliveryDate')} *</label>
              <input
                type="date"
                className="inp"
                value={form.deliveryDate}
                onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label className="field-l">{t('erpOrdersColShipFrom')}</label>
            <SearchableSelect
              options={locationOptions}
              value={form.originLocationId ? String(form.originLocationId) : ''}
              onChange={(val) => setForm((f) => ({ ...f, originLocationId: val ? Number(val) : null }))}
              placeholder={t('erpOrdersSelectLocation')}
              footerAction={onAddLocation ? { label: `+ ${t('erpOrdersAddAddress')}`, onClick: onAddLocation } : undefined}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('erpOrdersColShipTo')}</label>
            <SearchableSelect
              options={locationOptions}
              value={form.destLocationId ? String(form.destLocationId) : ''}
              onChange={(val) => setForm((f) => ({ ...f, destLocationId: val ? Number(val) : null }))}
              placeholder={t('erpOrdersSelectLocation')}
              footerAction={onAddLocation ? { label: `+ ${t('erpOrdersAddAddress')}`, onClick: onAddLocation } : undefined}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('erpOrdersHighPriority')}</label>
            <div className="tog" onClick={() => setForm((f) => ({ ...f, highPriority: !f.highPriority }))} role="button" tabIndex={0}>
              <div className={`tog-sw${form.highPriority ? ' on' : ''}`} />
              <span className="tog-txt">{form.highPriority ? t('yes') : t('no')}</span>
            </div>
          </div>
          <div className="field">
            <label className="field-l">{t('notes')}</label>
            <textarea
              className="inp"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <OrderProductLinesEditor
            t={t}
            lines={form.lines}
            skus={skus}
            onChange={(lines) => setForm((f) => ({ ...f, lines }))}
            onAddProduct={onAddProduct}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-p btn-sm" onClick={onSubmit} disabled={saving}>
            {saving ? t('saving') : isEdit ? t('save') : t('create')}
          </button>
        </div>
      </div>
    </div>
  );
};
