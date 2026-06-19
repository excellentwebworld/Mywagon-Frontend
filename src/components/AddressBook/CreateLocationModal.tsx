import React, { useEffect } from 'react';
import type { LocationItem } from '../../context/AppContext';
import type { ApiAmenity, ApiCompanyEntity } from '../../api';
import { DOCK_TYPES, FACILITY_TYPE_LABELS, FACILITY_TYPES, TEMPLATE_OPTIONS } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { ContactFormList } from './ContactFormList';
import { EquipmentSelector } from './EquipmentSelector';
import { GoogleMapAddressField } from './GoogleMapAddressField';
import { ModalStepper } from './ModalStepper';
import { TimeRangeFormList } from './TimeRangeFormList';
import { ToggleField } from './ToggleField';

type Props = Pick<
  AddressBookState,
  | 'isCreateOpen'
  | 'closeCreateModal'
  | 'createStep'
  | 'setCreateStep'
  | 'createData'
  | 'setCreateData'
  | 'handleApplyTemplate'
  | 'submitNewLocation'
  | 'potentialDuplicates'
  | 'selectExistingDuplicate'
  | 'saving'
  | 'amenities'
  | 'showToast'
  | 'filteredCompanies'
  | 'setCompanyQuery'
  | 'companyDropdownOpen'
  | 'setCompanyDropdownOpen'
  | 'setIsCompanyOpen'
>;

export const CreateLocationModal: React.FC<Props> = ({
  isCreateOpen,
  closeCreateModal,
  createStep,
  setCreateStep,
  createData,
  setCreateData,
  handleApplyTemplate,
  submitNewLocation,
  potentialDuplicates,
  selectExistingDuplicate,
  saving,
  amenities,
  showToast,
  filteredCompanies,
  setCompanyQuery,
  companyDropdownOpen,
  setCompanyDropdownOpen,
  setIsCompanyOpen,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateOpen) closeCreateModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isCreateOpen, closeCreateModal]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.ent-search')) {
        setCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [setCompanyDropdownOpen]);

  if (!isCreateOpen) return null;

  const update = (patch: Partial<typeof createData>) => setCreateData({ ...createData, ...patch });

  const renderStep1 = () => (
    <>
      <h4 className="ab-form-heading">Who does this location belong to?</h4>
      <div className="ctx-cards">
        <div
          className={`ctx-card ${createData.context === 'my' ? 'selected' : ''}`}
          onClick={() => update({ context: 'my' })}
          onKeyDown={(e) => e.key === 'Enter' && update({ context: 'my' })}
          role="button"
          tabIndex={0}
        >
          <div className="ico">🏢</div>
          <div className="lbl">My Company</div>
          <div className="sub">Own warehouse, plant, office</div>
        </div>
        <div
          className={`ctx-card ${createData.context === 'customer' ? 'selected' : ''}`}
          onClick={() => update({ context: 'customer' })}
          onKeyDown={(e) => e.key === 'Enter' && update({ context: 'customer' })}
          role="button"
          tabIndex={0}
        >
          <div className="ico">🤝</div>
          <div className="lbl">Customer Location</div>
          <div className="sub">Delivery site, store, DC</div>
        </div>
      </div>

      {createData.context === 'customer' && (
        <div className="mf ab-company-field">
          <label>
            Company / Entity <span className="req">*</span>
          </label>
          <div className="ent-search">
            <input
              type="text"
              className="ent-inp"
              placeholder="Search existing companies…"
              value={createData.company}
              onChange={(e) => {
                update({ company: e.target.value });
                setCompanyQuery(e.target.value);
                setCompanyDropdownOpen(true);
              }}
              onFocus={() => setCompanyDropdownOpen(true)}
            />
            {companyDropdownOpen && (
              <div className="ent-results open">
                <div
                  className="ent-create"
                  onClick={() => {
                    setIsCompanyOpen(true);
                    setCompanyDropdownOpen(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && setIsCompanyOpen(true)}
                  role="button"
                  tabIndex={0}
                >
                  + Enter new company details
                </div>
                {filteredCompanies.map((c: ApiCompanyEntity) => (
                  <div
                    key={c.id}
                    className="ent-item"
                    onClick={() => {
                      update({
                        company: c.name,
                        companyVat: c.vat_number,
                        companyEntityId: c.id,
                        phone: c.phone || createData.phone,
                        email: c.email || createData.email,
                      });
                      setCompanyDropdownOpen(false);
                    }}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      update({
                        company: c.name,
                        companyVat: c.vat_number,
                        companyEntityId: c.id,
                      })
                    }
                    role="button"
                    tabIndex={0}
                  >
                    {c.name}
                    <div className="sub">VAT: {c.vat_number}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <span className="helper">Search existing or enter new company details</span>
        </div>
      )}

      {createData.context === 'my' && (
        <div className="mf-row">
          <div className="mf">
            <label>
              Company Name <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="Your company legal name"
              value={createData.company}
              onChange={(e) => update({ company: e.target.value })}
            />
          </div>
          <div className="mf">
            <label>
              Company VAT <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. EL094123456"
              value={createData.companyVat}
              onChange={(e) => update({ companyVat: e.target.value })}
            />
          </div>
        </div>
      )}

      {createData.context === 'customer' && (
        <div className="mf">
          <label>
            Company VAT <span className="req">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. EL094123456"
            value={createData.companyVat}
            onChange={(e) => update({ companyVat: e.target.value })}
          />
        </div>
      )}

      <div className="mf">
        <label>
          Facility Type <span className="req">*</span>
        </label>
        <select value={createData.type} onChange={(e) => update({ type: e.target.value })}>
          {FACILITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {FACILITY_TYPE_LABELS[type] ?? type}
            </option>
          ))}
        </select>
      </div>

      <h4 className="ab-form-heading ab-form-heading-spaced">
        Quick template <span className="ab-form-optional">(optional)</span>
      </h4>
      <div className="tpl-cards">
        {TEMPLATE_OPTIONS.map((tpl) => (
          <div
            key={tpl.id}
            className={`tpl-card ${createData.template === tpl.id ? 'selected' : ''}`}
            onClick={() => handleApplyTemplate(tpl.id)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate(tpl.id)}
            role="button"
            tabIndex={0}
          >
            <span className="ico">{tpl.icon}</span>
            {tpl.label}
          </div>
        ))}
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="mf">
        <label>
          Location Name <span className="req">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Κεντρική Αποθήκη, DC Θήβα…"
          value={createData.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>
      <GoogleMapAddressField
        address={createData.address}
        lat={createData.lat}
        lng={createData.lng}
        onAddressChange={(address) => update({ address })}
        onLatLngChange={(lat, lng) => update({ lat, lng })}
        onPlaceSelected={(details) =>
          update({
            address: details.address,
            lat: details.lat,
            lng: details.lng,
            city: details.city || createData.city,
            postal: details.postalCode || createData.postal,
            region: details.region || createData.region,
          })
        }
      />
      <div className="mf-row">
        <div className="mf">
          <label>
            City <span className="req">*</span>
          </label>
          <input type="text" placeholder="City" value={createData.city} onChange={(e) => update({ city: e.target.value })} />
        </div>
        <div className="mf">
          <label>
            Postal Code <span className="req">*</span>
          </label>
          <input type="text" placeholder="e.g. 45500" value={createData.postal} onChange={(e) => update({ postal: e.target.value })} />
        </div>
      </div>
      <div className="mf-row">
        <div className="mf">
          <label>Phone</label>
          <input type="text" placeholder="+30 …" value={createData.phone} onChange={(e) => update({ phone: e.target.value })} />
        </div>
        <div className="mf">
          <label>Email</label>
          <input type="email" placeholder="contact@…" value={createData.email} onChange={(e) => update({ email: e.target.value })} />
        </div>
      </div>
      <div className="mf-row">
        <div className="mf">
          <label>
            Location Role <span className="req">*</span>
          </label>
          <select value={createData.role} onChange={(e) => update({ role: e.target.value as LocationItem['role'] })}>
            <option value="both">Both (Pickup & Delivery)</option>
            <option value="pickup">Pickup only</option>
            <option value="delivery">Delivery only</option>
          </select>
        </div>
        <div className="mf">
          <label>Region</label>
          <input type="text" placeholder="e.g. Central Greece" value={createData.region} onChange={(e) => update({ region: e.target.value })} />
        </div>
      </div>
      <div className="mf">
        <label>Internal Location Code</label>
        <input type="text" placeholder="e.g. WH-IOA-01" value={createData.code} onChange={(e) => update({ code: e.target.value })} />
      </div>
      <div className="mf">
        <label>Tags</label>
        <input
          type="text"
          placeholder="Comma-separated, e.g. Priority, North"
          value={createData.tags}
          onChange={(e) => update({ tags: e.target.value })}
        />
        <span className="helper">Tags help with filtering and organization</span>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <h4 className="ab-form-heading">Operational Profile</h4>
      <div className="mf-grid">
        <ToggleField label="Appointment required" value={createData.appt} onChange={(appt) => update({ appt })} />
        <div className="mf">
          <label>
            Dock Type <span className="req">*</span>
          </label>
          <select value={createData.dock} onChange={(e) => update({ dock: e.target.value })}>
            <option value="">— Select —</option>
            {DOCK_TYPES.map((dock) => (
              <option key={dock} value={dock}>
                {dock}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mf">
        <label>Receiving Hours</label>
        <input
          type="text"
          placeholder="e.g. Mon-Fri 06:00–22:00 · Sat 07:00–14:00"
          value={createData.hours}
          onChange={(e) => update({ hours: e.target.value })}
        />
      </div>
      <div className="mf-grid">
        <div className="mf">
          <label>
            Max Truck Length <span className="req">*</span>
          </label>
          <input type="text" placeholder="e.g. 18.75m" value={createData.maxTruck} onChange={(e) => update({ maxTruck: e.target.value })} />
        </div>
        <div className="mf">
          <label>
            Max Weight <span className="req">*</span>
          </label>
          <input type="text" placeholder="e.g. 40T" value={createData.maxWeight} onChange={(e) => update({ maxWeight: e.target.value })} />
        </div>
      </div>
      <div className="mf-grid">
        <ToggleField label="ADR Allowed" value={createData.adr} onChange={(adr) => update({ adr })} />
        <ToggleField label="Pallet Exchange" value={createData.palletExchange} onChange={(palletExchange) => update({ palletExchange })} />
      </div>
      <div className="mf">
        <label>
          Est. Loading/Unloading Time (min) <span className="req">*</span>
        </label>
        <input type="number" placeholder="e.g. 45" value={createData.loadTime} onChange={(e) => update({ loadTime: e.target.value })} />
      </div>

      {amenities.length > 0 && (
        <>
          <h4 className="ab-form-section-title">Amenities</h4>
          <div className="mf amenity-grid">
            {amenities.map((a: ApiAmenity) => (
              <label key={a.id} className="amenity-check">
                <input
                  type="checkbox"
                  checked={createData.amenityIds.includes(a.id)}
                  onChange={(e) => {
                    const ids = e.target.checked
                      ? [...createData.amenityIds, a.id]
                      : createData.amenityIds.filter((id) => id !== a.id);
                    update({ amenityIds: ids });
                  }}
                />
                {a.name}
              </label>
            ))}
          </div>
        </>
      )}

      <h4 className="ab-form-section-title">Equipment</h4>
      <EquipmentSelector value={createData.equipment} onChange={(equipment) => update({ equipment })} />

      <h4 className="ab-form-section-title">Structured Time Ranges</h4>
      <TimeRangeFormList timeRanges={createData.timeRanges} onChange={(timeRanges) => update({ timeRanges })} />

      <h4 className="ab-form-section-title">Notes</h4>
      <div className="mf">
        <label>🔒 Internal Note</label>
        <textarea placeholder="Visible only to your team…" value={createData.noteInternal} onChange={(e) => update({ noteInternal: e.target.value })} />
      </div>
      <div className="mf">
        <label>🚛 Carrier-Visible Note</label>
        <textarea placeholder="Drivers/carriers will see this…" value={createData.noteCarrier} onChange={(e) => update({ noteCarrier: e.target.value })} />
      </div>

      <h4 className="ab-form-section-title">Contacts</h4>
      <ContactFormList contacts={createData.contacts} onChange={(contacts) => update({ contacts })} />
    </>
  );

  const renderStep4 = () => (
    <>
      {potentialDuplicates.length > 0 && (
        <div className="dupe-banner">
          <h4>⚠️ Potential Duplicates Found</h4>
          {potentialDuplicates.map((d) => (
            <div key={d.id} className="dupe-item">
              <div>
                <strong>{d.name}</strong>
                <br />
                <span className="dupe-item-addr">{d.address}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => selectExistingDuplicate(d)}
              >
                Use existing
              </button>
            </div>
          ))}
          <div className="dupe-banner-note">You can still create if this is a different location.</div>
        </div>
      )}

      <h4 className="ab-form-heading">Review & Confirm</h4>
      <div className="review-box">
        <div className="review-row review-row-highlight">
          <div className="review-label">Context</div>
          <div className="review-val">
            {createData.context === 'my' ? 'My Company' : `Customer: ${createData.company || '—'}`}
          </div>
        </div>
        <div className="review-row">
          <div className="review-label">Location</div>
          <div className="review-val review-val-lg">{createData.name || '—'}</div>
          <div className="review-sub">
            {createData.address || '—'}
            {createData.city ? `, ${createData.city}` : ''}
            {createData.postal ? ` ${createData.postal}` : ''}
          </div>
        </div>
        <div className="review-row-grid">
          <div className="review-row">
            <div className="review-label">Role</div>
            <div className="review-val">{createData.role}</div>
          </div>
          <div className="review-row">
            <div className="review-label">Type</div>
            <div className="review-val">{createData.type || 'Not set'}</div>
          </div>
        </div>
        <div className="review-row-grid">
          <div className="review-row">
            <div className="review-label">Appointment</div>
            <div className="review-val">{createData.appt ? '✅ Required' : 'No'}</div>
          </div>
          <div className="review-row">
            <div className="review-label">Dock</div>
            <div className="review-val">{createData.dock || '—'}</div>
          </div>
        </div>
        {createData.hours && (
          <div className="review-row">
            <div className="review-label">Hours</div>
            <div className="review-val review-val-sm">{createData.hours}</div>
          </div>
        )}
        <div className="review-row">
          <div className="review-label">Contacts</div>
          <div className="review-val review-val-left">
            {createData.contacts.length > 0 ? (
              createData.contacts.map((c) => `${c.name} (${c.role})`).join(', ')
            ) : (
              <span className="review-warning">None — you&apos;ll be prompted after save</span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const footerButtons = () => {
    if (createStep === 1) {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCreateStep(2)}>
            Next →
          </button>
        </>
      );
    }
    if (createStep === 2) {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setCreateStep(1)}>
            ← Back
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCreateStep(3)}>
            Next →
          </button>
        </>
      );
    }
    if (createStep === 3) {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setCreateStep(2)}>
            ← Back
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCreateStep(4)}>
            Review →
          </button>
        </>
      );
    }
    return (
      <>
        <button type="button" className="btn btn-secondary" onClick={() => setCreateStep(3)}>
          ← Back
        </button>
        <button type="button" className="btn btn-primary" onClick={submitNewLocation} disabled={saving}>
          {saving ? 'Creating…' : '✅ Create Location'}
        </button>
      </>
    );
  };

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && closeCreateModal()}>
      <div className="modal ab-modal ab-modal-scroll ab-modal-create">
        <div className="modal-header">
          <h2>New Location</h2>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeCreateModal}>
            ✕
          </button>
        </div>
        <ModalStepper currentStep={createStep} />
        <div className="modal-body ab-modal-body">
          {createStep === 1 && renderStep1()}
          {createStep === 2 && renderStep2()}
          {createStep === 3 && renderStep3()}
          {createStep === 4 && renderStep4()}
        </div>
        <div className="modal-footer">{footerButtons()}</div>
      </div>
    </div>
  );
};
