import React from 'react';
import type { Contact } from '../../context/AppContext';
import { CONTACT_ROLES } from '../../pages/AddressBook/constants';
import { sanitizePhoneInput } from '../../pages/AddressBook/validation/phoneValidation';

interface ContactFormListProps {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
}

export const ContactFormList: React.FC<ContactFormListProps> = ({ contacts, onChange }) => {
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
              <label>Name</label>
              <input type="text" value={contact.name} onChange={(e) => updateContact(i, 'name', e.target.value)} />
            </div>
            <div className="mf">
              <label>Role</label>
              <select value={contact.role} onChange={(e) => updateContact(i, 'role', e.target.value)}>
                {CONTACT_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="mf">
              <label>Phone</label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={contact.phone}
                onChange={(e) => updateContact(i, 'phone', sanitizePhoneInput(e.target.value))}
              />
            </div>
            <div className="mf">
              <label>Email</label>
              <input type="text" value={contact.email} onChange={(e) => updateContact(i, 'email', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="add-contact-btn" onClick={addContact}>
        + Add Contact
      </button>
    </>
  );
};
