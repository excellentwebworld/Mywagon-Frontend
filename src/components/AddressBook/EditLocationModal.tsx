import React, { useEffect } from 'react';
import type { LocationItem } from '../../context/AppContext';
import type { ApiAmenity } from '../../api';
import { DOCK_TYPES, FACILITY_TYPE_LABELS, FACILITY_TYPES } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { ContactFormList } from './ContactFormList';
import { EquipmentSelector } from './EquipmentSelector';
import { GoogleMapAddressField } from './GoogleMapAddressField';
import { TimeRangeFormList } from './TimeRangeFormList';
import { ToggleField } from './ToggleField';

type Props = Pick<
  AddressBookState,
  'editData' | 'setEditData' | 'isEditOpen' | 'closeEditModal' | 'saveEditedLocation' | 'saving' | 'amenities'
>;

export const EditLocationModal: React.FC<Props> = ({
  editData,
  setEditData,
  isEditOpen,
  closeEditModal,
  saveEditedLocation,
  saving,
  amenities,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditOpen) closeEditModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isEditOpen, closeEditModal]);

  if (!isEditOpen || !editData) return null;

  const update = (patch: Partial<LocationItem>) => setEditData({ ...editData, ...patch });

  return (
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && closeEditModal()}>
      <div className="modal ab-modal ab-modal-scroll">
        <div className="modal-header ab-modal-header-sticky">
          <h2>Edit — {editData.name}</h2>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeEditModal}>
            ✕
          </button>
        </div>
        <div className="modal-body ab-modal-body">
          <div className="mf">
            <label>
              Location Name <span className="req">*</span>
            </label>
            <input type="text" value={editData.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>
                Company <span className="req">*</span>
              </label>
              <input
                type="text"
                value={editData.company}
                readOnly={editData.group === 'customer'}
                onChange={(e) => update({ company: e.target.value })}
              />
            </div>
            <div className="mf">
              <label>
                Company VAT <span className="req">*</span>
              </label>
              <input
                type="text"
                value={editData.companyVat}
                readOnly={editData.group === 'customer'}
                onChange={(e) => update({ companyVat: e.target.value })}
              />
            </div>
          </div>
          <GoogleMapAddressField
            address={editData.address}
            lat={String(editData.lat)}
            lng={String(editData.lng)}
            onAddressChange={(address) => update({ address })}
            onLatLngChange={(lat, lng) => update({ lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 })}
            onCityPostalChange={(city, postal) => update({ city, postalCode: postal })}
          />
          <div className="mf-row">
            <div className="mf">
              <label>
                City <span className="req">*</span>
              </label>
              <input type="text" value={editData.city} onChange={(e) => update({ city: e.target.value })} />
            </div>
            <div className="mf">
              <label>Postal Code</label>
              <input
                type="text"
                value={editData.postalCode ?? ''}
                onChange={(e) => update({ postalCode: e.target.value })}
              />
            </div>
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>Region</label>
              <input type="text" value={editData.region} onChange={(e) => update({ region: e.target.value })} />
            </div>
            <div className="mf">
              <label>Customer Code</label>
              <input type="text" value={editData.custCode || ''} onChange={(e) => update({ custCode: e.target.value })} />
            </div>
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>Phone</label>
              <input type="text" value={editData.phone ?? ''} onChange={(e) => update({ phone: e.target.value })} />
            </div>
            <div className="mf">
              <label>Email</label>
              <input type="email" value={editData.email ?? ''} onChange={(e) => update({ email: e.target.value })} />
            </div>
          </div>
          <div className="mf-row">
            <div className="mf">
              <label>
                Role <span className="req">*</span>
              </label>
              <select value={editData.role} onChange={(e) => update({ role: e.target.value as LocationItem['role'] })}>
                <option value="both">Both (Pickup & Delivery)</option>
                <option value="pickup">Pickup only</option>
                <option value="delivery">Delivery only</option>
              </select>
            </div>
            <div className="mf">
              <label>Facility Type</label>
              <select value={editData.type} onChange={(e) => update({ type: e.target.value })}>
                {FACILITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {FACILITY_TYPE_LABELS[type] ?? type}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mf">
            <label>Internal Code</label>
            <input type="text" value={editData.code || ''} onChange={(e) => update({ code: e.target.value })} />
          </div>
          <div className="mf">
            <label>Tags</label>
            <input
              type="text"
              value={editData.tags.join(', ')}
              onChange={(e) =>
                update({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <h4 className="ab-form-section-title">Operational Profile</h4>
          <div className="mf-grid">
            <ToggleField label="Appointment required" value={editData.appt} onChange={(appt) => update({ appt })} />
            <div className="mf">
              <label>Dock Type</label>
              <select value={editData.dock} onChange={(e) => update({ dock: e.target.value })}>
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
              placeholder="e.g. Mon-Fri 06:00–22:00"
              value={editData.hours || ''}
              onChange={(e) => update({ hours: e.target.value })}
            />
          </div>
          <div className="mf-grid">
            <div className="mf">
              <label>Max Truck</label>
              <input type="text" value={editData.maxTruck || ''} onChange={(e) => update({ maxTruck: e.target.value })} />
            </div>
            <div className="mf">
              <label>Max Weight</label>
              <input type="text" value={editData.maxWeight || ''} onChange={(e) => update({ maxWeight: e.target.value })} />
            </div>
          </div>
          <div className="mf-grid">
            <ToggleField label="ADR" value={editData.adr} onChange={(adr) => update({ adr })} />
            <ToggleField
              label="Pallet Exchange"
              value={editData.palletExchange}
              onChange={(palletExchange) => update({ palletExchange })}
            />
          </div>
          <div className="mf">
            <label>Est. Loading/Unloading (min)</label>
            <input
              type="number"
              value={editData.loadTime || ''}
              onChange={(e) => update({ loadTime: parseInt(e.target.value, 10) || 0 })}
            />
          </div>

          {amenities.length > 0 && (
            <>
              <h4 className="ab-form-section-title">Amenities</h4>
              <div className="mf amenity-grid">
                {amenities.map((a: ApiAmenity) => (
                  <label key={a.id} className="amenity-check">
                    <input
                      type="checkbox"
                      checked={(editData.amenityIds ?? []).includes(a.id)}
                      onChange={(e) => {
                        const current = editData.amenityIds ?? [];
                        const ids = e.target.checked ? [...current, a.id] : current.filter((id) => id !== a.id);
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
          <EquipmentSelector
            value={editData.equipment ?? []}
            onChange={(equipment) => update({ equipment })}
          />

          <h4 className="ab-form-section-title">Structured Time Ranges</h4>
          <TimeRangeFormList
            timeRanges={editData.timeRanges ?? []}
            onChange={(timeRanges) => update({ timeRanges })}
          />

          <h4 className="ab-form-section-title">Notes</h4>
          <div className="mf">
            <label>🔒 Internal Note</label>
            <textarea value={editData.noteInternal || ''} onChange={(e) => update({ noteInternal: e.target.value })} />
          </div>
          <div className="mf">
            <label>🚛 Carrier-Visible Note</label>
            <textarea value={editData.noteCarrier || ''} onChange={(e) => update({ noteCarrier: e.target.value })} />
          </div>

          <h4 className="ab-form-section-title">Contacts</h4>
          <ContactFormList contacts={editData.contacts} onChange={(contacts) => update({ contacts })} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={saveEditedLocation} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
