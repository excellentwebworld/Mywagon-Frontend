import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { lang, addCompany } = useApp();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vat, setVat] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim()) return;

    addCompany({
      name: name.trim(),
      vat: vat.trim(),
      address: city ? `${city}, Greece` : '',
      country: 'Greece',
      phone: phone.trim(),
      email: email.trim(),
      website: '',
      contactPerson: companyName.trim(),
      industry: 'Retail',
    });

    onCreated(name.trim());
    
    // Reset state
    setName('');
    setCompanyName('');
    setVat('');
    setCity('');
    setEmail('');
    setPhone('');
    onClose();
  };

  return (
    <div className={`modal-bg ${isOpen ? 'show' : ''}`} role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-h">
          <span>🏪 {lang === 'el' ? 'Δημιουργία Νέου Πελάτη' : 'Create New Customer'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l" htmlFor="newCustName">
              {lang === 'el' ? 'Όνομα Πελάτη *' : 'Customer Name *'}
            </label>
            <input
              id="newCustName"
              className="inp"
              placeholder={lang === 'el' ? 'π.χ. FreshCo A.E.' : 'e.g. FreshCo S.A.'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newCustCompany">
              {lang === 'el' ? 'Όνομα Εταιρείας' : 'Company Name'}
            </label>
            <input
              id="newCustCompany"
              className="inp"
              placeholder={lang === 'el' ? 'π.χ. FreshCo Group' : 'e.g. FreshCo Group'}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newCustVat">
              {lang === 'el' ? 'ΑΦΜ' : 'VAT Number'}
            </label>
            <input
              id="newCustVat"
              className="inp"
              placeholder="e.g. EL123456789"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newCustCity">
              {lang === 'el' ? 'Πόλη' : 'City'}
            </label>
            <input
              id="newCustCity"
              className="inp"
              placeholder={lang === 'el' ? 'π.χ. Αθήνα' : 'e.g. Athens'}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newCustEmail">
              Email
            </label>
            <input
              id="newCustEmail"
              className="inp"
              type="email"
              placeholder="info@freshco.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newCustPhone">
              {lang === 'el' ? 'Τηλέφωνο' : 'Phone'}
            </label>
            <input
              id="newCustPhone"
              className="inp"
              type="tel"
              placeholder="+30 210 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
            disabled={!name.trim()}
          >
            {lang === 'el' ? 'Δημιουργία Πελάτη' : 'Create Customer'}
          </button>
        </div>
      </div>
    </div>
  );
};
