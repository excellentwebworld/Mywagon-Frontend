import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { addressBookService } from '../../api/services/addressBookService';
import { ApiError } from '../../api';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { ApiCompanyEntity } from '../../api/types/addressBook';
import { EMPTY_CREATE_DATA } from '../../pages/AddressBook/types';
import type { CreateLocationData } from '../../pages/AddressBook/types';

type Props = {
  t: (key: string) => string;
  isOpen: boolean;
  onClose: () => void;
  companies: ApiCompanyEntity[];
  defaultCompanyEntityId: number | null;
  onCreated: (locationId: number) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
};

export const ErpOrderQuickLocationModal: React.FC<Props> = ({
  t,
  isOpen,
  onClose,
  companies,
  defaultCompanyEntityId,
  onCreated,
  showToast,
}) => {
  const [form, setForm] = useState<CreateLocationData>(EMPTY_CREATE_DATA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const company = companies.find((c) => c.id === defaultCompanyEntityId);
    setForm({
      ...EMPTY_CREATE_DATA,
      companyEntityId: defaultCompanyEntityId,
      company: company?.name ?? '',
      companyVat: company?.vat_number ?? '',
      context: defaultCompanyEntityId ? 'customer' : 'my',
    });
  }, [isOpen, defaultCompanyEntityId, companies]);

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: String(c.id), label: c.name, sublabel: c.vat_number })),
    [companies]
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast(t('erpOrdersLocationNameRequired'), 'error');
      return;
    }
    if (!form.address.trim()) {
      showToast(t('erpOrdersLocationAddressRequired'), 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await addressBookService.createLocation(form);
      showToast(t('erpOrdersLocationCreated'), 'success');
      onCreated(Number(created.id));
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('erpOrdersLocationCreateError');
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-bg show" onClick={onClose}>
      <div className="modal modal-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-hd">
          <span>{t('erpOrdersAddAddress')}</span>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l">{t('erpOrdersColCustomer')}</label>
            <SearchableSelect
              options={companyOptions}
              value={form.companyEntityId ? String(form.companyEntityId) : ''}
              onChange={(val, opt) =>
                setForm((f) => ({
                  ...f,
                  companyEntityId: val ? Number(val) : null,
                  company: opt?.label ?? '',
                  companyVat: opt?.sublabel ?? '',
                  context: val ? 'customer' : 'my',
                }))
              }
              placeholder={t('erpOrdersSelectCustomer')}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('locationName')} *</label>
            <input
              className="inp"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('addressCol')} *</label>
            <input
              className="inp"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-l">{t('city')}</label>
              <input
                className="inp"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="field-l">{t('erpOrdersPostal')}</label>
              <input
                className="inp"
                value={form.postal}
                onChange={(e) => setForm((f) => ({ ...f, postal: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-sm" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-p btn-sm" onClick={handleSubmit} disabled={saving}>
            {saving ? t('saving') : t('create')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
