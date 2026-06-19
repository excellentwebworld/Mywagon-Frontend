import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

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
  const { t } = useTranslation();
  const { addSku } = useApp();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [wpu, setWpu] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim() || !sku.trim()) return;

    addSku({
      name: name.trim(),
      number: sku.trim(),
      barcode: sku.trim(),
      catId: category || 'CAT-01',
      typeId: 'PT-01', // Default category types
      source: 'manual',
      active: true,
      erp: {
        system: '',
        extId: '',
        lastSync: '—',
        status: '',
        error: '',
      },
      weight: wpu ? `${wpu} kg` : '',
      uom: 'Case',
      tags: [],
    });

    onCreated(name.trim());

    // Reset
    setName('');
    setSku('');
    setCategory('');
    setWpu('');
    onClose();
  };

  return (
    <div className={`modal-bg ${isOpen ? 'show' : ''}`} role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-h">
          <span>{t('createNewProduct')}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
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
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newProdCat">
              {t('category')}
            </label>
            <input
              id="newProdCat"
              className="inp"
              placeholder="e.g. Oils"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              value={wpu}
              onChange={(e) => setWpu(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-sm" onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            className="btn btn-p btn-sm"
            onClick={handleCreate}
            disabled={!name.trim() || !sku.trim()}
          >
            {t('createProduct')}
          </button>
        </div>
      </div>
    </div>
  );
};
