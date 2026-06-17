import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (ref: string, customerName?: string) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { lang, companies } = useApp();
  const [ref, setRef] = useState('');
  const [selectedCust, setSelectedCust] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!ref.trim()) return;
    onCreated(ref.trim(), selectedCust || undefined);

    // Reset
    setRef('');
    setSelectedCust('');
    setNotes('');
    onClose();
  };

  return (
    <div className={`modal-bg ${isOpen ? 'show' : ''}`} role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-h">
          <span>{lang === 'el' ? 'Δημιουργία Νέας Παραγγελίας' : 'Create New Order'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l" htmlFor="newOrderRef">
              {lang === 'el' ? 'ID Παραγγελίας / Αναφορά *' : 'Order ID / Reference *'}
            </label>
            <input
              id="newOrderRef"
              className="inp"
              placeholder="e.g. PO-2026-005"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newOrderCust">
              {lang === 'el' ? 'Πελάτης (προαιρετικό)' : 'Customer (optional)'}
            </label>
            <select
              id="newOrderCust"
              className="inp"
              value={selectedCust}
              onChange={(e) => setSelectedCust(e.target.value)}
            >
              <option value="">—</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newOrderNotes">
              {lang === 'el' ? 'Σημειώσεις' : 'Notes'}
            </label>
            <textarea
              id="newOrderNotes"
              className="inp"
              rows={2}
              style={{ resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            disabled={!ref.trim()}
          >
            {lang === 'el' ? 'Δημιουργία Παραγγελίας' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
};
