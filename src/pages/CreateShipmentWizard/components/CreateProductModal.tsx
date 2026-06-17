import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';

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
  const { lang, addSku } = useApp();
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
          <span>{lang === 'el' ? 'Δημιουργία Νέου Προϊόντος' : 'Create New Product'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l" htmlFor="newProdName">
              {lang === 'el' ? 'Όνομα Προϊόντος *' : 'Product Name *'}
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
              {lang === 'el' ? 'Κατηγορία' : 'Category'}
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
              {lang === 'el' ? 'Βάρος ανά μονάδα (kg)' : 'Weight per unit (kg)'}
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
            {lang === 'el' ? 'Ακύρωση' : 'Cancel'}
          </button>
          <button
            className="btn btn-p btn-sm"
            onClick={handleCreate}
            disabled={!name.trim() || !sku.trim()}
          >
            {lang === 'el' ? 'Δημιουργία Προϊόντος' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
};
