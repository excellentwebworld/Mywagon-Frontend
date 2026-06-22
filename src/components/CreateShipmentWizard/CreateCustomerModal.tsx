import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

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
  const { t } = useTranslation();
  const { addCompany } = useApp();
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
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <span>🏪 {t('createNewCustomer')}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l" htmlFor="newCustName">
              {t('customerNameRequired')}
            </label>
            <input
              id="newCustName"
              className="inp"
              placeholder={t('customerNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newCustCompany">
              {t('companyName')}
            </label>
            <input
              id="newCustCompany"
              className="inp"
              placeholder={t('companyNamePlaceholder')}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newCustVat">
              {t('vatNumber')}
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
              {t('city')}
            </label>
            <input
              id="newCustCity"
              className="inp"
              placeholder={t('cityPlaceholder')}
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
              {t('phone')}
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
            {t('cancel')}
          </button>
          <button
            className="btn btn-p btn-sm"
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            {t('createCustomer')}
          </button>
        </div>
      </div>
    </div>
  );
};
