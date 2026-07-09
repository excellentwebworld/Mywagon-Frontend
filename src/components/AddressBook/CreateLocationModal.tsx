import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LocationItem } from '../../context/AppContext';
import { DOCK_TYPES, FACILITY_TYPE_LABELS, FACILITY_TYPES } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
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
    update({
      context,
      ...(context === 'my'
        ? { company: '', companyVat: '', companyEntityId: null }
        : {}),
    });
  };

  const renderStep1 = () => (
    <>
      <h4 className="ab-form-heading">{t('abBelongsTo')}</h4>
      <div className="ctx-cards">
        <div
          className={`ctx-card ${createData.context === 'my' ? 'selected' : ''}`}
          onClick={() => selectContext('my')}
          onKeyDown={(e) => e.key === 'Enter' && selectContext('my')}
          role="button"
          tabIndex={0}
        >
          <div className="ico">🏢</div>
          <div className="lbl">{t('abMyCompany')}</div>
          <div className="sub">{t('abMyCompanySub')}</div>
        </div>
        <div
          className={`ctx-card ${createData.context === 'customer' ? 'selected' : ''}`}
          onClick={() => selectContext('customer')}
          onKeyDown={(e) => e.key === 'Enter' && selectContext('customer')}
          role="button"
          tabIndex={0}
        >
          <div className="ico">🤝</div>
          <div className="lbl">{t('abCustomerLocation')}</div>
          <div className="sub">{t('abCustomerLocationSub')}</div>
        </div>
      </div>

      {createData.context === 'customer' && (
        <div className={`mf ab-company-field${fieldErrors.companyEntity ? ' has-error' : ''}`}>
          <label>
            {t('abCompanyEntity')} <span className="req">*</span>
          </label>
          <SearchableSelect
            value={createData.companyVat}
            options={companyOptions}
            placeholder={t('abSearchExistingCompanies')}
            searchPlaceholder={t('abTypeToSearch')}
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
              label: t('abCreateNewCompany'),
              onClick: () => setIsCompanyOpen(true),
            }}
            direction="down"
            className="company-entity-select"
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
          direction="down"
          className="location-type-select"
        />
        <FormFieldError message={fieldErrors.type} />
      </div>

      <h4 className="ab-form-heading ab-form-heading-spaced">{t('abQuickTemplate')}</h4>
      <div className="tpl-cards">
        <div
          className={`tpl-card ${createData.template === 'retail' ? 'selected' : ''}`}
          onClick={() => handleApplyTemplate('retail')}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate('retail')}
          role="button"
          tabIndex={0}
        >
          <span className="ico">🏪</span>
          {t('abRetailDc')}
        </div>
        <div
          className={`tpl-card ${createData.template === 'factory' ? 'selected' : ''}`}
          onClick={() => handleApplyTemplate('factory')}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate('factory')}
          role="button"
          tabIndex={0}
        >
          <span className="ico">🏭</span>
          {t('abFactory')}
        </div>
        <div
          className={`tpl-card ${createData.template === 'warehouse' ? 'selected' : ''}`}
          onClick={() => handleApplyTemplate('warehouse')}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate('warehouse')}
          role="button"
          tabIndex={0}
        >
          <span className="ico">📦</span>
          {t('abWarehouse')}
        </div>
        <div
          className={`tpl-card ${createData.template === 'store' ? 'selected' : ''}`}
          onClick={() => handleApplyTemplate('store')}
          onKeyDown={(e) => e.key === 'Enter' && handleApplyTemplate('store')}
          role="button"
          tabIndex={0}
        >
          <span className="ico">🏬</span>
          {t('abStore')}
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className={`mf${fieldErrors.name ? ' has-error' : ''}`}>
        <label>
          {t('abLocationName')} <span className="req">*</span>
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
            {t('abCity')} <span className="req">*</span>
          </label>
          <input type="text" placeholder={t('abCity')} value={createData.city} onChange={(e) => update({ city: e.target.value })} />
          <FormFieldError message={fieldErrors.city} />
        </div>
        <div className={`mf${fieldErrors.postal ? ' has-error' : ''}`}>
          <label>
            {t('abPostalCode')}
          </label>
          <input type="text" placeholder="e.g. 45500" value={createData.postal} onChange={(e) => update({ postal: e.target.value })} />
          <FormFieldError message={fieldErrors.postal} />
        </div>
      </div>

      <div className="mf-row">
        <div className={`mf${fieldErrors.role ? ' has-error' : ''}`}>
          <label>
            {t('abLocationRole')} <span className="req">*</span>
          </label>
          <SearchableSelect
            value={createData.role}
            options={roleOptions}
            onChange={(val) => update({ role: val as LocationItem['role'] })}
          />
          <FormFieldError message={fieldErrors.role} />
        </div>

        <div className="mf">
          <label>{t('abInternalCode')}</label>
          <input type="text" placeholder="e.g. WH-IOA-01" value={createData.code} onChange={(e) => update({ code: e.target.value })} />
        </div>
      </div>

      <LocationMapPreview
        lat={createData.lat}
        lng={createData.lng}
        address={createData.address}
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
    </>
  );

  const renderStep3 = () => (
    <>
      <h4 className="ab-form-heading">{t('abOperationalProfile')}</h4>
      <div className="mf-row">
        <div className="mf">
          <label>{t('abAppointmentRequired')}</label>
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
            {t('abDockType')} <span className="req">*</span>
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
          <label className="ab-section-label">
            {t('abPreferredTimes')} <span className="req">*</span>
          </label>
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
            {t('abMaxTruckLength')}
          </label>
          <input type="text" placeholder="e.g. 18.75m" value={createData.maxTruck} onChange={(e) => update({ maxTruck: e.target.value })} />
          <FormFieldError message={fieldErrors.maxTruck} />
        </div>
        <div className={`mf${fieldErrors.maxWeight ? ' has-error' : ''}`}>
          <label>
            {t('abMaxWeight')}
          </label>
          <input type="text" placeholder="e.g. 40T" value={createData.maxWeight} onChange={(e) => update({ maxWeight: e.target.value })} />
          <FormFieldError message={fieldErrors.maxWeight} />
        </div>
      </div>

      <div className="mf-grid">
        <ToggleField label={t('abAdrAllowed')} value={createData.adr} onChange={(adr) => update({ adr })} />
        <ToggleField label={t('abPalletExchange')} value={createData.palletExchange} onChange={(palletExchange) => update({ palletExchange })} />
      </div>

      <div className={`mf${fieldErrors.loadTime ? ' has-error' : ''}`}>
        <label>
          {t('abEstLoadTime')} <span className="req">*</span>
        </label>
        <input type="number" placeholder="e.g. 45" value={createData.loadTime} onChange={(e) => update({ loadTime: e.target.value })} />
        <FormFieldError message={fieldErrors.loadTime} />
      </div>

      <h4 className="ab-form-section-title">{t('abNotes')}</h4>
      <div className="mf">
        <label>🔒 {t('abInternalNote')}</label>
        <textarea placeholder={t('abInternalNotePlaceholder')} value={createData.noteInternal} onChange={(e) => update({ noteInternal: e.target.value })} />
      </div>
      <div className="mf">
        <label>🚛 {t('abCarrierNote')}</label>
        <textarea placeholder={t('abCarrierNotePlaceholder')} value={createData.noteCarrier} onChange={(e) => update({ noteCarrier: e.target.value })} />
      </div>
    </>
  );

  const roleLabel =
    roleOptions.find((r) => r.value === createData.role)?.label ?? createData.role ?? '—';

  const reviewValue = (value: any) => {
    const str = String(value ?? '').trim();
    return str ? str : '—';
  };

  const renderStep4 = () => {
    const contextLabel =
      createData.context === 'my'
        ? t('abMyCompany')
        : reviewValue(createData.company) === '—'
          ? t('abCustomerLocation')
          : String(createData.company ?? '').trim();

    const locationAddress =
      [createData.address, createData.city, createData.postal, createData.region].filter(Boolean).join(', ') ||
      '—';

    const preferredTimes =
      createData.appt && createData.timeRanges.length > 0
        ? createData.timeRanges.map((tr) => `${tr.start_time} – ${tr.end_time}`).join(', ')
        : '—';

    const loadTimeStr = String(createData.loadTime ?? '').trim();
    const loadTimeLabel = loadTimeStr ? `${loadTimeStr} min` : '—';

    return (
      <>
        {potentialDuplicates.length > 0 && (
          <div className="dupe-banner">
            <h4>{t('abPotentialDuplicates')}</h4>
            {potentialDuplicates.map((d) => (
              <div key={d.id} className="dupe-item">
                <div>
                  <strong>{d.name}</strong>
                  <br />
                  <span className="dupe-item-addr">{d.address}</span>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => selectExistingDuplicate(d)}>
                  {t('abUseExisting')}
                </button>
              </div>
            ))}
            <div className="dupe-banner-note">{t('abDupeBannerNote')}</div>
          </div>
        )}

        <h4 className="ab-form-heading">{t('abReviewConfirm')}</h4>
        <div className="review-box">
          <div className="review-row-grid">
            <div className="review-row">
              <div className="review-label">{t('abContext')}</div>
              <div className="review-val">{contextLabel}</div>
            </div>
            <div className="review-row">
              <div className="review-label">{t('abLocationType')}</div>
              <div className="review-val">
                {FACILITY_TYPE_LABELS[createData.type] ?? createData.type ?? '—'}
              </div>
            </div>
          </div>

          <div className="review-row">
            <div className="review-label">{t('abLocation')}</div>
            <div className="review-val review-val-lg">{reviewValue(createData.name)}</div>
            <div className="review-sub">{locationAddress}</div>
          </div>

          <div className="review-row-grid">
            <div className="review-row">
              <div className="review-label">{t('abRole')}</div>
              <div className="review-val">{roleLabel}</div>
            </div>
            <div className="review-row">
              <div className="review-label">{t('abInternalCodeShort')}</div>
              <div className="review-val">{reviewValue(createData.code)}</div>
            </div>
          </div>

          <div className="review-row-grid">
            <div className="review-row">
              <div className="review-label">{t('abDockType')}</div>
              <div className="review-val">{reviewValue(createData.dock)}</div>
            </div>
            <div className="review-row">
              <div className="review-label">{t('abAppointmentRequiredCol')}</div>
              <div className="review-val">{createData.appt ? t('abYes') : t('abNo')}</div>
            </div>
          </div>

          <div className="review-row">
            <div className="review-label">{t('abPreferredTimeRanges')}</div>
            <div className="review-val">{preferredTimes}</div>
          </div>

          <div className="review-row-grid">
            <div className="review-row">
              <div className="review-label">{t('abMaxTruckLength')}</div>
              <div className="review-val">{reviewValue(createData.maxTruck)}</div>
            </div>
            <div className="review-row">
              <div className="review-label">{t('abMaxWeight')}</div>
              <div className="review-val">{reviewValue(createData.maxWeight)}</div>
            </div>
          </div>

          <div className="review-row-grid">
            <div className="review-row">
              <div className="review-label">{t('abAdrAllowed')}</div>
              <div className="review-val">{createData.adr ? t('abYes') : t('abNo')}</div>
            </div>
            <div className="review-row">
              <div className="review-label">{t('abPalletExchange')}</div>
              <div className="review-val">{createData.palletExchange ? t('abYes') : t('abNo')}</div>
            </div>
          </div>

          <div className="review-row">
            <div className="review-label">{t('abEstLoadTimeShort')}</div>
            <div className="review-val">{loadTimeLabel}</div>
          </div>

          <div className="review-row">
            <div className="review-label">{t('abInternalNote')}</div>
            <div className="review-val review-val-left">{reviewValue(createData.noteInternal)}</div>
          </div>

          <div className="review-row">
            <div className="review-label">{t('abCarrierNote')}</div>
            <div className="review-val review-val-left">{reviewValue(createData.noteCarrier)}</div>
          </div>
        </div>
      </>
    );
  };

  const footerButtons = () => {
    if (createStep === 1) {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>
            {t('abCancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => goNext(1, 2, () => validateCreateStep1(createData))}>
            {t('abNext')}
          </button>
        </>
      );
    }
    if (createStep === 2) {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setCreateStep(1)}>
            {t('abBack')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => goNext(2, 3, () => validateCreateStep2(createData))}>
            {t('abNext')}
          </button>
        </>
      );
    }
    if (createStep === 3) {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={() => setCreateStep(2)}>
            {t('abBack')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => goNext(3, 4, () => validateCreateStep3(createData))}>
            {t('abReview')}
          </button>
        </>
      );
    }
    return (
      <>
        <button type="button" className="btn btn-secondary ab-review-back" onClick={() => setCreateStep(3)}>
          {t('abBack')}
        </button>
        <div className="ab-review-footer-actions">
          <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>
            {t('abCancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={submitNewLocation} disabled={saving}>
            {saving ? t('abCreating') : t('abCreateLocationBtn')}
          </button>
        </div>
      </>
    );
  };

  return createPortal(
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && closeCreateModal()}>
      <div className="modal modal-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('abNewLocation')}</h2>
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
        <div className={`modal-footer${createStep === 4 ? ' ab-review-footer' : ''}`}>{footerButtons()}</div>
      </div>
    </div>,
    document.body
  );
};
