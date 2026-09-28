import React from 'react';
import type { Contact } from '../../context/AppContext';
import { CONTACT_ROLES, getContactRoleLabel } from '../../pages/AddressBook/constants';
import { sanitizePhoneInput } from '../../pages/AddressBook/validation/phoneValidation';
import { useTranslation } from '../../hooks/useTranslation';

interface ContactFormListProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
}

export const ContactFormList: React.FC<ContactFormListProps> = ({ contacts, onChange }) => {
  const { t } = useTranslation();

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeContact = (index: number) => {
    const updated = [...contacts];
    updated.splice(index, 1);
    onChange(updated);
  };

  const addContact = () => {
    onChange([...contacts, { name: '', role: 'Receiving', phone: '', email: '' }]);
  };

  return (
    <>
      {contacts.map((contact, i) => (
        <div key={i} className="contact-form-row">
          <button type="button" className="del-contact-btn" onClick={() => removeContact(i)}>
            ✕
          </button>
          <div className="mf-grid contact-form-grid">
            <div className="mf">
              <label>{t('abContactName', 'Name')}</label>
              <input type="text" value={contact.name} onChange={(e) => updateContact(i, 'name', e.target.value)} />
            </div>
            <div className="mf">
              <label>{t('abRole', 'Role')}</label>
              <select value={contact.role} onChange={(e) => updateContact(i, 'role', e.target.value)}>
                {CONTACT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {getContactRoleLabel(role, t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mf">
              <label>{t('phone', 'Phone')}</label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={contact.phone}
                onChange={(e) => updateContact(i, 'phone', sanitizePhoneInput(e.target.value))}
              />
            </div>
            <div className="mf">
              <label>{t('email', 'Email')}</label>
              <input type="text" value={contact.email} onChange={(e) => updateContact(i, 'email', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="add-contact-btn" onClick={addContact}>
        {t('abAddContact', '+ Add Contact')}
      </button>
    </>
  );
};
