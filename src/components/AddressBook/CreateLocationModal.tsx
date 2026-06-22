import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LocationItem } from '../../context/AppContext';
import { DOCK_TYPES, FACILITY_TYPE_LABELS, FACILITY_TYPES } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { applyTemplate } from '../../pages/AddressBook/utils/locationUtils';
import {
  validateCreateStep1,
  validateCreateStep2,
  validateCreateStep3,
  type CreateFieldErrors,
} from '../../pages/AddressBook/validation/locationCreateValidation';
import { SearchableSelect } from '../ui/SearchableSelect';
import { FormFieldError } from './FormFieldError';
import { GoogleMapAddressField } from './GoogleMapAddressField';
import { LocationMapPreview } from './LocationMapPreview';
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
  | 'submitNewLocation'
  | 'potentialDuplicates'
  | 'selectExistingDuplicate'
  | 'saving'
  | 'filteredCompanies'
  | 'setCompanyQuery'
  | 'setIsCompanyOpen'
  | 'handleApplyTemplate'
  | 't'
>;

export const CreateLocationModal: React.FC<Props> = ({
  isCreateOpen,
  closeCreateModal,
  createStep,
  setCreateStep,
  createData,
  setCreateData,
  submitNewLocation,
  potentialDuplicates,
  selectExistingDuplicate,
  saving,
  filteredCompanies,
  setCompanyQuery,
  setIsCompanyOpen,
  handleApplyTemplate,
  t,
}) => {
  const [fieldErrors, setFieldErrors] = useState<CreateFieldErrors>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateOpen) closeCreateModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isCreateOpen, closeCreateModal]);

  useEffect(() => {
    if (!isCreateOpen) setFieldErrors({});
  }, [isCreateOpen]);

  const companyOptions = useMemo(
    () =>
      filteredCompanies.map((c) => ({
        value: c.company_vat,
        label: c.company_name,
        sublabel: c.company_vat ? `VAT: ${c.company_vat}` : undefined,
      })),
    [filteredCompanies]
  );

  if (!isCreateOpen) return null;

  const update = (patch: Partial<typeof createData>) => {
    setCreateData({ ...createData, ...patch });
    setFieldErrors({});
  };

  const facilityOptions = FACILITY_TYPES.map((type) => ({
    value: type,
    label: FACILITY_TYPE_LABELS[type] ?? type,
  }));

  const dockOptions = DOCK_TYPES.map((dock) => ({ value: dock, label: dock }));

  const roleOptions = [
    { value: 'both', label: 'Both (Pickup & Drop-off)' },
    { value: 'pickup', label: 'Pickup only' },
    { value: 'delivery', label: 'Drop-off only' },
  ];

  const goNext = (from: number, to: number, validate: () => CreateFieldErrors) => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setCreateStep(to);
  };

  const selectContext = (context: 'my' | 'customer') => {
    if (context === 'my') {
      update({
        context,
        company: '',
        companyVat: '',
        companyEntityId: null,
        template: '',
      });
    } else {
      const nextData = applyTemplate('retail', {
        ...createData,
        context,
      });
      setCreateData(nextData);
    }
  };

  const renderStep1 = () => (
    <>
      <h4 className="ab-form-heading">Who does this location belong to?</h4>
      <div className="ctx-cards">
        <div
          className={`ctx-card ${createData.context === 'my' ? 'selected' : ''}`}
          onClick={() => selectContext('my')}
          onKeyDown={(e) => e.key === 'Enter' && selectContext('my')}
          role="button"
          tabIndex={0}
        >
          <div className="ico">🏢</div>
          <div className="lbl">My Company</div>
          <div className="sub">Own warehouse, plant, office</div>
        </div>
        <div
          className={`ctx-card ${createData.context === 'customer' ? 'selected' : ''}`}
          onClick={() => selectContext('customer')}
          onKeyDown={(e) => e.key === 'Enter' && selectContext('customer')}
          role="button"
          tabIndex={0}
        >
          <div className="ico">🤝</div>
          <div className="lbl">Customer Location</div>
          <div className="sub">Delivery site, store, DC</div>
        </div>
      </div>

      {createData.context === 'customer' && (
        <div className={`mf ab-company-field${fieldErrors.companyEntity ? ' has-error' : ''}`}>
          <label>
            Company / Entity <span className="req">*</span>
          </label>
          <SearchableSelect
            value={createData.companyVat}
            options={companyOptions}
            placeholder="Search existing companies…"
            searchPlaceholder="Type to search…"
            hasError={Boolean(fieldErrors.companyEntity)}
            onSearchChange={setCompanyQuery}
            onChange={(val, opt) => {
              const entity = filteredCompanies.find((c) => c.company_vat === val);
              update({
                companyEntityId: null,
                company: entity?.company_name ?? opt?.label ?? '',
                companyVat: entity?.company_vat ?? val ?? '',
              });
            }}
            headerAction={{
              label: '+ Create new company',
              onClick: () => setIsCompanyOpen(true),
            }}
          />
          <FormFieldError message={fieldErrors.companyEntity} />
        </div>
      )}

      <div className={`mf${fieldErrors.type ? ' has-error' : ''} mt-3`}>
        <label>
          {t('abLocationType')} <span className="req">*</span>
        </label>
        <SearchableSelect
          value={createData.type}
          options={facilityOptions}
          placeholder="— Select —"
          hasError={Boolean(fieldErrors.type)}
          onChange={(val) => update({ type: val })}
        />
        <FormFieldError message={fieldErrors.type} />
      </div>

      <h4 className="ab-form-heading ab-form-heading-spaced">{t('Quick template')}</h4>
      <div className="tpl-cards">
        <div
          className={`tpl-card ${createData.template === 'retail' ? 'selected' : ''}`}
          onClick={() => handleApplyTemplate('retail')}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate('retail')}
          role="button"
          tabIndex={0}
        >
          <span className="ico">🏪</span>
          {t('Retail DC') || 'Retail DC'}
        </div>
        <div
          className={`tpl-card ${createData.template === 'factory' ? 'selected' : ''}`}
          onClick={() => handleApplyTemplate('factory')}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate('factory')}
          role="button"
          tabIndex={0}
        >
          <span className="ico">🏭</span>
          {t('Factory') || 'Factory'}
        </div>
        <div
          className={`tpl-card ${createData.template === 'warehouse' ? 'selected' : ''}`}
          onClick={() => handleApplyTemplate('warehouse')}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate('warehouse')}
          role="button"
          tabIndex={0}
        >
          <span className="ico">📦</span>
          {t('Warehouse') || 'Warehouse'}
        </div>
        <div
          className={`tpl-card ${createData.template === 'store' ? 'selected' : ''}`}
          onClick={() => handleApplyTemplate('store')}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate('store')}
          role="button"
          tabIndex={0}
        >
          <span className="ico">🏬</span>
          {t('Store') || 'Store'}
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className={`mf${fieldErrors.name ? ' has-error' : ''}`}>
        <label>
          Location Name <span className="req">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Κεντρική Αποθήκη, DC Θήβα…"
          value={createData.name}
          onChange={(e) => update({ name: e.target.value })}
        />
        <FormFieldError message={fieldErrors.name} />
      </div>

      <GoogleMapAddressField
        address={createData.address}
        lat={createData.lat}
        lng={createData.lng}
        error={fieldErrors.address}
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
        <div className={`mf${fieldErrors.city ? ' has-error' : ''}`}>
          <label>
            City <span className="req">*</span>
          </label>
          <input type="text" placeholder="City" value={createData.city} onChange={(e) => update({ city: e.target.value })} />
          <FormFieldError message={fieldErrors.city} />
        </div>
        <div className={`mf${fieldErrors.postal ? ' has-error' : ''}`}>
          <label>
            Postal Code
          </label>
          <input type="text" placeholder="e.g. 45500" value={createData.postal} onChange={(e) => update({ postal: e.target.value })} />
          <FormFieldError message={fieldErrors.postal} />
        </div>
      </div>

      <div className="mf-row">
        <div className={`mf${fieldErrors.role ? ' has-error' : ''}`}>
          <label>
            Location Role <span className="req">*</span>
          </label>
          <SearchableSelect
            value={createData.role}
            options={roleOptions}
            onChange={(val) => update({ role: val as LocationItem['role'] })}
          />
          <FormFieldError message={fieldErrors.role} />
        </div>

        <div className="mf">
          <label>Internal Location Code</label>
          <input type="text" placeholder="e.g. WH-IOA-01" value={createData.code} onChange={(e) => update({ code: e.target.value })} />
        </div>
      </div>

      <LocationMapPreview lat={createData.lat} lng={createData.lng} address={createData.address} />
    </>
  );

  const renderStep3 = () => (
    <>
      <h4 className="ab-form-heading">Operational Profile</h4>
      <div className="mf-row">
        <div className="mf">
          <label>Appointment required</label>
          <ToggleField
            label=""
            value={createData.appt}
            onChange={(appt) =>
              update({
                appt,
                timeRanges:
                  appt && createData.timeRanges.length === 0
                    ? [{ start_time: '08:00', end_time: '17:00' }]
                    : createData.timeRanges,
              })
            }
          />
        </div>
        <div className={`mf${fieldErrors.dock ? ' has-error' : ''}`}>
          <label>
            Dock Type <span className="req">*</span>
          </label>
          <SearchableSelect
            value={createData.dock}
            options={[{ value: '', label: '— Select —' }, ...dockOptions]}
            placeholder="— Select —"
            hasError={Boolean(fieldErrors.dock)}
            onChange={(val) => update({ dock: val })}
          />
          <FormFieldError message={fieldErrors.dock} />
        </div>
      </div>

      {createData.appt && (
        <div className={`mf ab-preferred-times${fieldErrors.timeRanges ? ' has-error' : ''}`}>
          <label className="ab-section-label">Pickup/Dropoff Preferred Times</label>
          <TimeRangeFormList
            timeRanges={createData.timeRanges}
            onChange={(timeRanges) => update({ timeRanges })}
            variant="preferred"
          />
          <FormFieldError message={fieldErrors.timeRanges} />
        </div>
      )}

      <div className="mf-grid">
        <div className={`mf${fieldErrors.maxTruck ? ' has-error' : ''}`}>
          <label>
            Max Truck Length <span className="req">*</span>
          </label>
          <input type="text" placeholder="e.g. 18.75m" value={createData.maxTruck} onChange={(e) => update({ maxTruck: e.target.value })} />
          <FormFieldError message={fieldErrors.maxTruck} />
        </div>
        <div className={`mf${fieldErrors.maxWeight ? ' has-error' : ''}`}>
          <label>
            Max Weight <span className="req">*</span>
          </label>
          <input type="text" placeholder="e.g. 40T" value={createData.maxWeight} onChange={(e) => update({ maxWeight: e.target.value })} />
          <FormFieldError message={fieldErrors.maxWeight} />
        </div>
      </div>

      <div className="mf-grid">
        <ToggleField label="ADR Allowed" value={createData.adr} onChange={(adr) => update({ adr })} />
        <ToggleField label="Pallet Exchange" value={createData.palletExchange} onChange={(palletExchange) => update({ palletExchange })} />
      </div>

      <div className={`mf${fieldErrors.loadTime ? ' has-error' : ''}`}>
        <label>
          Est. Loading/Unloading Time (min) <span className="req">*</span>
        </label>
        <input type="number" placeholder="e.g. 45" value={createData.loadTime} onChange={(e) => update({ loadTime: e.target.value })} />
        <FormFieldError message={fieldErrors.loadTime} />
      </div>

      <h4 className="ab-form-section-title">Notes</h4>
      <div className="mf">
        <label>🔒 Internal Note</label>
        <textarea placeholder="Visible only to your team…" value={createData.noteInternal} onChange={(e) => update({ noteInternal: e.target.value })} />
      </div>
      <div className="mf">
        <label>🚛 Carrier-Visible Note</label>
        <textarea placeholder="Drivers/carriers will see this…" value={createData.noteCarrier} onChange={(e) => update({ noteCarrier: e.target.value })} />
      </div>
    </>
  );

  const renderStep4 = () => (
    <>
      {potentialDuplicates.length > 0 && (
        <div className="dupe-banner">
          <h4>Potential Duplicates Found</h4>
          {potentialDuplicates.map((d) => (
            <div key={d.id} className="dupe-item">
              <div>
                <strong>{d.name}</strong>
                <br />
                <span className="dupe-item-addr">{d.address}</span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => selectExistingDuplicate(d)}>
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
            <div className="review-val">{FACILITY_TYPE_LABELS[createData.type] || createData.type || 'Not set'}</div>
          </div>
        </div>
        <div className="review-row-grid">
          <div className="review-row">
            <div className="review-label">Appointment</div>
            <div className="review-val">{createData.appt ? 'Required' : 'No'}</div>
          </div>
          <div className="review-row">
            <div className="review-label">Dock</div>
            <div className="review-val">{createData.dock || '—'}</div>
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
          <button type="button" className="btn btn-primary" onClick={() => goNext(1, 2, () => validateCreateStep1(createData))}>
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
          <button type="button" className="btn btn-primary" onClick={() => goNext(2, 3, () => validateCreateStep2(createData))}>
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
          <button type="button" className="btn btn-primary" onClick={() => goNext(3, 4, () => validateCreateStep3(createData))}>
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
          {saving ? 'Creating…' : 'Create Location'}
        </button>
      </>
    );
  };

  return createPortal(
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && closeCreateModal()}>
      <div className="modal modal-form" onClick={(e) => e.stopPropagation()}>
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
    </div>,
    document.body
  );
};
