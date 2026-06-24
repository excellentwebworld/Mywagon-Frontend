import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { productMasterService } from '../../api/services/productMasterService';
import { ApiError } from '../../api';
import { SearchableSelect } from '../ui/SearchableSelect';
import type { ApiReferenceCategory } from '../../api/types/productMaster';
import { EMPTY_NEW_SKU, type NewSkuForm } from '../../pages/ProductMaster/types';

type Props = {
  t: (key: string) => string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (sku: { id: number; name: string; number: string }) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
};

export const ErpOrderQuickSkuModal: React.FC<Props> = ({
  t,
  isOpen,
  onClose,
  onCreated,
  showToast,
}) => {
  const [form, setForm] = useState<NewSkuForm>(EMPTY_NEW_SKU);
  const [categories, setCategories] = useState<ApiReferenceCategory[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_NEW_SKU);
    productMasterService.getAllReferenceCategories().then(setCategories).catch(() => setCategories([]));
  }, [isOpen]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: String(c.id), label: c.name })),
    [categories]
  );

  const selectedCat = categories.find((c) => String(c.id) === form.catId);
  const typeOptions = useMemo(
    () => (selectedCat?.types ?? []).map((tp) => ({ value: String(tp.id), label: tp.name })),
    [selectedCat]
  );

  const handleSubmit = async () => {
    if (!form.catId) {
      showToast(t('erpOrdersSkuCategoryRequired'), 'error');
      return;
    }
    if (!form.typeId) {
      showToast(t('erpOrdersSkuTypeRequired'), 'error');
      return;
    }
    if (!form.name.trim()) {
      showToast(t('erpOrdersSkuNameRequired'), 'error');
      return;
    }
    if (!form.number.trim()) {
      showToast(t('erpOrdersSkuNumberRequired'), 'error');
      return;
    }
    setSaving(true);
    try {
      const created = await productMasterService.createSku(form);
      showToast(t('erpOrdersProductCreated'), 'success');
      onCreated({ id: Number(created.id), name: created.name, number: created.number });
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('erpOrdersProductCreateError');
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
          <span>{t('erpOrdersAddProduct')}</span>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l">{t('category')} *</label>
            <SearchableSelect
              options={categoryOptions}
              value={form.catId}
              onChange={(catId) => setForm((f) => ({ ...f, catId, typeId: '' }))}
              placeholder={t('selectCategory')}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('productType')} *</label>
            <SearchableSelect
              options={typeOptions}
              value={form.typeId}
              onChange={(typeId) => setForm((f) => ({ ...f, typeId }))}
              placeholder={t('selectType')}
              disabled={!form.catId}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('skuName')} *</label>
            <input
              className="inp"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-l">{t('skuNumber')} *</label>
            <input
              className="inp"
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
            />
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
