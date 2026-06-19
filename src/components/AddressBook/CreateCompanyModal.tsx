import React, { useEffect } from 'react';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';

type Props = Pick<
  AddressBookState,
  'isCompanyOpen' | 'closeCompanyModal' | 'companyData' | 'setCompanyData' | 'handleApplyCompany'
>;

const INDUSTRIES = ['', 'Retail', 'Wholesale', 'Manufacturing', 'Logistics', 'Food & Beverage', 'Other'];

export const CreateCompanyModal: React.FC<Props> = ({
  isCompanyOpen,
  closeCompanyModal,
  companyData,
  setCompanyData,
  handleApplyCompany,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCompanyOpen) closeCompanyModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isCompanyOpen, closeCompanyModal]);

  if (!isCompanyOpen) return null;

  const update = (patch: Partial<typeof companyData>) => setCompanyData({ ...companyData, ...patch });

  return (
    <div className="modal-backdrop open ab-company-backdrop" onClick={(e) => e.target === e.currentTarget && closeCompanyModal()}>
      <div className="modal ab-company-modal">
        <div className="modal-header">
          <h2>Company Details</h2>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeCompanyModal}>
            ✕
          </button>
        </div>
        <div className="modal-body ab-company-body">
          <div className="mf">
            <label>
              Company Name <span className="req">*</span>
            </label>
            <input type="text" placeholder="e.g. Acme Corp" value={companyData.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>
                VAT Number <span className="req">*</span>
              </label>
              <input type="text" placeholder="e.g. EL094123456" value={companyData.vat} onChange={(e) => update({ vat: e.target.value })} />
            </div>
            <div className="mf">
              <label>Country</label>
              <input type="text" value={companyData.country} onChange={(e) => update({ country: e.target.value })} />
            </div>
          </div>
          <div className="mf">
            <label>
              Address <span className="req">*</span>
            </label>
            <input type="text" placeholder="Full company address" value={companyData.address} onChange={(e) => update({ address: e.target.value })} />
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>Phone</label>
              <input type="text" placeholder="+30 210 ..." value={companyData.phone} onChange={(e) => update({ phone: e.target.value })} />
            </div>
            <div className="mf">
              <label>Email</label>
              <input type="text" placeholder="info@company.com" value={companyData.email} onChange={(e) => update({ email: e.target.value })} />
            </div>
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>Website</label>
              <input type="text" placeholder="www.company.com" value={companyData.website} onChange={(e) => update({ website: e.target.value })} />
            </div>
            <div className="mf">
              <label>Industry</label>
              <select value={companyData.industry} onChange={(e) => update({ industry: e.target.value })}>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind || '— Select —'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mf">
            <label>Primary Contact Person</label>
            <input type="text" placeholder="Full name" value={companyData.contactPerson} onChange={(e) => update({ contactPerson: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeCompanyModal}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleApplyCompany}>
            Use in location form
          </button>
        </div>
      </div>
    </div>
  );
};
