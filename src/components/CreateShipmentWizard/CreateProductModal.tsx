import React, { useEffect, useState } from 'react';
import { productMasterService } from '../../api';
import { mapReferenceToCategories, mapReferenceToProductTypes } from '../../api/mappers/productMasterMapper';
import type { Category, ProductType } from '../../context/AppContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { EMPTY_NEW_SKU } from '../../pages/ProductMaster/types';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (skuName: string) => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { t, lang } = useTranslation();
  const { showToast, refreshSkusFromApi } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [catId, setCatId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    productMasterService
      .getReferenceCategories()
      .then((data) => {
        setCategories(mapReferenceToCategories(data, lang));
        setProductTypes(mapReferenceToProductTypes(data));
      })
      .catch(() => showToast(t('abLoadError'), 'error'));
  }, [isOpen, lang, showToast, t]);

  if (!isOpen) return null;

  const catName = (c: Category) => c.name[lang] ?? c.name.en;

  const reset = () => {
    setCatId('');
    setTypeId('');
    setName('');
    setNumber('');
    setWeight('');
  };

  const handleCreate = async () => {
    if (!name.trim() || !number.trim() || !catId || !typeId) {
      showToast(t('fillRequired'), 'warning');
      return;
    }

    setSaving(true);
    try {
      await productMasterService.createSku({
        ...EMPTY_NEW_SKU,
        catId,
        typeId,
        name: name.trim(),
        number: number.trim(),
        barcode: number.trim(),
        weight: weight ? `${weight} kg` : '',
      });
      await refreshSkusFromApi();
      onCreated(name.trim());
      reset();
      onClose();
      showToast(t('created'), 'success');
    } catch {
      showToast(t('abSaveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`modal-bg ${isOpen ? 'show' : ''}`} role="dialog" aria-modal="true">
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <span>{t('createNewProduct')}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l">
              {t('category')} <span className="req">*</span>
            </label>
            <select className="inp" value={catId} onChange={(e) => { setCatId(e.target.value); setTypeId(''); }}>
              <option value="">— Select —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {catName(c)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-l">
              {t('productType')} <span className="req">*</span>
            </label>
            <select className="inp" value={typeId} onChange={(e) => setTypeId(e.target.value)} disabled={!catId}>
              <option value="">— Select —</option>
              {productTypes
                .filter((tp) => tp.catId === catId)
                .map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newProdName">
              {t('productNameRequired')}
            </label>
            <input
              id="newProdName"
              className="inp"
              placeholder="e.g. Olive Oil 5L"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newProdSku">
              SKU *
            </label>
            <input
              id="newProdSku"
              className="inp"
              placeholder="e.g. FOD-050"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newProdWpu">
              {t('weightPerUnit')}
            </label>
            <input
              id="newProdWpu"
              className="inp"
              type="number"
              step="0.1"
              placeholder="e.g. 30"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-sm" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </button>
          <button
            className="btn btn-p btn-sm"
            onClick={handleCreate}
            disabled={saving || !name.trim() || !number.trim() || !catId || !typeId}
          >
            {t('createProduct')}
          </button>
        </div>
      </div>
    </div>
  );
};
