import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Form, Formik, type FormikHelpers } from 'formik';
import type { LocationItem } from '../../context/AppContext';
import { ApiError } from '../../api';
import { DOCK_TYPES, FACILITY_TYPE_LABELS, FACILITY_TYPES } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { applyTemplate, inferQuickTemplateFromType } from '../../pages/AddressBook/utils/locationUtils';
import { EMPTY_CREATE_DATA } from '../../pages/AddressBook/types';
import {
  validateEditStep,
  type EditStepErrors,
} from '../../pages/AddressBook/validation/locationEditStepValidation';
import { checkLocationDuplicate } from '../../pages/AddressBook/validation/locationDuplicateValidation';
import {
  DUPLICATE_LOCATION_MESSAGE,
  locationEditValidationSchema,
  type LocationFormValues,
} from '../../pages/AddressBook/validation/locationFormSchema';
import {
  API_FIELD_TO_FORM,
  formValuesToLocationItem,
  locationToFormValues,
} from '../../pages/AddressBook/validation/locationFormUtils';
import { SearchableSelect } from '../ui/SearchableSelect';
import { FormFieldError } from './FormFieldError';
import { ScrollToFormError } from '../ui/ScrollToFormError';
import { scrollToFirstModalError } from '../ui/scrollToModalError';
import { GoogleMapAddressField } from './GoogleMapAddressField';
import { LocationMapPreview } from './LocationMapPreview';
import { EDIT_MODAL_STEPS, ModalStepper } from './ModalStepper';
import { TimeRangeFormList } from './TimeRangeFormList';
import { ToggleField } from './ToggleField';

type Props = Pick<
  AddressBookState,
  'editData' | 'isEditOpen' | 'closeEditModal' | 'saveEditedLocation' | 'saving' | 't'
>;

function fieldClass(hasError: boolean): string {
  return hasError ? 'mf has-error' : 'mf';
}

function mapServerErrors(fieldErrors: Record<string, string[]>): Partial<Record<keyof LocationFormValues, string>> {
  const mapped: Partial<Record<keyof LocationFormValues, string>> = {};
  for (const [apiKey, messages] of Object.entries(fieldErrors)) {
    const formKey = API_FIELD_TO_FORM[apiKey];
    if (formKey && messages[0]) {
      mapped[formKey as keyof LocationFormValues] = messages[0];
    }
  }
  return mapped;
}

const ROLE_OPTIONS = [
  { value: 'both', label: 'Both (Pickup & Drop-off)' },
  { value: 'pickup', label: 'Pickup only' },
  { value: 'delivery', label: 'Drop-off only' },
];

export const EditLocationModal: React.FC<Props> = ({
  editData,
  isEditOpen,
  closeEditModal,
  saveEditedLocation,
  saving,
  t,
}) => {
  const [editStep, setEditStep] = useState(1);
  const [stepErrors, setStepErrors] = useState<EditStepErrors>({});
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const modalRef = useRef<HTMLFormElement>(null);

  const scrollToStepError = () => {
    window.setTimeout(() => {
      if (modalRef.current) scrollToFirstModalError(modalRef.current, '.ab-modal-body');
    }, 50);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditOpen) closeEditModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isEditOpen, closeEditModal]);

  useEffect(() => {
    if (isEditOpen && editData) {
      setEditStep(1);
      setStepErrors({});
      setSelectedTemplate(inferQuickTemplateFromType(editData.type));
    }
  }, [isEditOpen, editData?.id, editData?.type]);

  if (!isEditOpen || !editData) return null;

  const facilityOptions = FACILITY_TYPES.map((type) => ({
    value: type,
    label: FACILITY_TYPE_LABELS[type] ?? type,
  }));

  const dockOptions = DOCK_TYPES.map((dock) => ({ value: dock, label: dock }));

  const handleSubmit = async (
    values: LocationFormValues,
    helpers: FormikHelpers<LocationFormValues>
  ) => {
    helpers.setStatus(undefined);
    try {
      const payload = formValuesToLocationItem(values, editData);
      await saveEditedLocation(payload);
    } catch (err) {
      if (err instanceof ApiError) {
        helpers.setStatus(err.message);
        if (err.fieldErrors) {
          helpers.setErrors(mapServerErrors(err.fieldErrors));
        } else if (/already exist/i.test(err.message)) {
          helpers.setFieldError('name', DUPLICATE_LOCATION_MESSAGE);
        }
      } else {
        helpers.setStatus('Failed to save location. Please check the form and try again.');
      }
    } finally {
      helpers.setSubmitting(false);
    }
  };

  return (
    <Formik
      initialValues={locationToFormValues(editData)}
      validationSchema={locationEditValidationSchema}
      enableReinitialize
      validateOnBlur
      validateOnChange={false}
      onSubmit={handleSubmit}
    >
      {({
        values,
        errors,
        handleChange,
        handleBlur,
        setFieldValue,
        setFieldTouched,
        isSubmitting,
        status,
        submitForm,
        setErrors,
        setTouched,
      }) => {
        const showError = (field: keyof LocationFormValues) =>
          Boolean(stepErrors[field] || errors[field]);

        const errorMessage = (field: keyof LocationFormValues) =>
          stepErrors[field] ?? (typeof errors[field] === 'string' ? errors[field] : undefined);

        const clearStepErrors = () => setStepErrors({});

        const goNext = async (to: number) => {
          const validationErrors = await validateEditStep(editStep, values);
          if (Object.keys(validationErrors).length > 0) {
            setStepErrors(validationErrors);
            scrollToStepError();
            return;
          }

          if (editStep === 2) {
            const nameChanged = values.name.trim() !== editData.name.trim();
            if (nameChanged && values.company.trim()) {
              try {
                const isDuplicate = await checkLocationDuplicate(
                  values.name,
                  values.company,
                  editData.id
                );
                if (isDuplicate) {
                  setStepErrors({ name: DUPLICATE_LOCATION_MESSAGE });
                  scrollToStepError();
                  return;
                }
              } catch {
                setStepErrors({ name: 'Could not verify location name. Please try again.' });
                scrollToStepError();
                return;
              }
            }
          }

          setStepErrors({});
          setEditStep(to);
        };

        const applyEditTemplate = (tpl: string) => {
          setSelectedTemplate(tpl);
          const patched = applyTemplate(tpl, {
            ...EMPTY_CREATE_DATA,
            type: values.type,
            dock: values.dock,
            hours: values.hours,
            maxTruck: values.maxTruck,
            maxWeight: values.maxWeight,
            appt: values.appt,
          });
          setFieldValue('dock', patched.dock);
          setFieldValue('hours', patched.hours);
          if (patched.maxTruck) setFieldValue('maxTruck', patched.maxTruck);
          if (patched.maxWeight) setFieldValue('maxWeight', patched.maxWeight);
          clearStepErrors();
        };

        const reviewValue = (value: any) => {
          const str = String(value ?? '').trim();
          return str ? str : '—';
        };

        const roleLabel =
          ROLE_OPTIONS.find((r) => r.value === values.role)?.label ?? values.role ?? '—';

        const locationAddress =
          [values.address, values.city, values.postalCode, values.region].filter(Boolean).join(', ') ||
          '—';

        const preferredTimes =
          values.appt && (values.timeRanges?.length ?? 0) > 0
            ? values.timeRanges.map((tr) => `${tr.start_time} – ${tr.end_time}`).join(', ')
            : '—';

        const loadTimeStr = String(values.loadTime ?? '').trim();
        const loadTimeLabel = loadTimeStr ? `${loadTimeStr} min` : '—';

        const renderStep1 = () => (
          <>
            <div className={fieldClass(showError('type'))}>
              <label>
                {t('abLocationType')} <span className="req">*</span>
              </label>
              <SearchableSelect
                value={values.type}
                options={facilityOptions}
                placeholder="— Select —"
                hasError={showError('type')}
                onChange={(val) => {
                  setFieldValue('type', val);
                  setSelectedTemplate(inferQuickTemplateFromType(val));
                  clearStepErrors();
                }}
                direction="down"
                className="location-type-select"
              />
              <FormFieldError message={errorMessage('type')} />
            </div>

            <h4 className="ab-form-heading ab-form-heading-spaced">{t('Quick template')}</h4>
            <div className="tpl-cards">
              {(
                [
                  { id: 'retail', icon: '🏪', label: t('Retail DC') || 'Retail DC' },
                  { id: 'factory', icon: '🏭', label: t('Factory') || 'Factory' },
                  { id: 'warehouse', icon: '📦', label: t('Warehouse') || 'Warehouse' },
                  { id: 'store', icon: '🏬', label: t('Store') || 'Store' },
                ] as const
              ).map((tpl) => (
                <div
                  key={tpl.id}
                  className={`tpl-card ${selectedTemplate === tpl.id ? 'selected' : ''}`}
                  onClick={() => applyEditTemplate(tpl.id)}
                  onKeyDown={(e) => e.key === 'Enter' && applyEditTemplate(tpl.id)}
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
            <div className={fieldClass(showError('name'))}>
              <label htmlFor="edit-name">
                Location Name <span className="req">*</span>
              </label>
              <input
                id="edit-name"
                name="name"
                type="text"
                value={values.name}
                onChange={(e) => {
                  handleChange(e);
                  clearStepErrors();
                }}
                onBlur={handleBlur}
              />
              <FormFieldError message={errorMessage('name')} />
            </div>

            <div className={fieldClass(showError('address') || showError('lat') || showError('lng'))}>
              <GoogleMapAddressField
                address={values.address}
                lat={values.lat}
                lng={values.lng}
                onAddressChange={(address) => {
                  setFieldValue('address', address);
                  clearStepErrors();
                }}
                onLatLngChange={(lat, lng) => {
                  setFieldValue('lat', lat);
                  setFieldValue('lng', lng);
                  clearStepErrors();
                }}
                onPlaceSelected={(details) => {
                  setFieldValue('address', details.address);
                  setFieldValue('lat', details.lat);
                  setFieldValue('lng', details.lng);
                  if (details.city) setFieldValue('city', details.city);
                  if (details.postalCode) setFieldValue('postalCode', details.postalCode);
                  if (details.region) setFieldValue('region', details.region);
                  clearStepErrors();
                }}
              />
              <FormFieldError
                message={
                  errorMessage('address') ??
                  errorMessage('lat') ??
                  errorMessage('lng')
                }
              />
            </div>

            <div className="mf-grid">
              <div className={fieldClass(showError('city'))}>
                <label htmlFor="edit-city">
                  City <span className="req">*</span>
                </label>
                <input
                  id="edit-city"
                  name="city"
                  type="text"
                  value={values.city}
                  onChange={(e) => {
                    handleChange(e);
                    clearStepErrors();
                  }}
                  onBlur={handleBlur}
                />
                <FormFieldError message={errorMessage('city')} />
              </div>
              <div className={fieldClass(showError('postalCode'))}>
                <label htmlFor="edit-postal">Postal Code</label>
                <input
                  id="edit-postal"
                  name="postalCode"
                  type="text"
                  value={values.postalCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <FormFieldError message={errorMessage('postalCode')} />
              </div>
            </div>

            <div className="mf-grid">
              <div className={fieldClass(showError('role'))}>
                <label htmlFor="edit-role">
                  Location Role <span className="req">*</span>
                </label>
                <select
                  id="edit-role"
                  name="role"
                  value={values.role}
                  onChange={(e) => {
                    handleChange(e);
                    clearStepErrors();
                  }}
                  onBlur={handleBlur}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <FormFieldError message={errorMessage('role')} />
              </div>
              <div className={fieldClass(showError('code'))}>
                <label htmlFor="edit-code">Internal Location Code</label>
                <input
                  id="edit-code"
                  name="code"
                  type="text"
                  value={values.code}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <FormFieldError message={errorMessage('code')} />
              </div>
            </div>

            <LocationMapPreview
              lat={values.lat}
              lng={values.lng}
              address={values.address}
              onLatLngChange={(lat, lng) => {
                setFieldValue('lat', lat);
                setFieldValue('lng', lng);
                clearStepErrors();
              }}
              onPlaceSelected={(details) => {
                setFieldValue('address', details.address);
                setFieldValue('lat', details.lat);
                setFieldValue('lng', details.lng);
                if (details.city) setFieldValue('city', details.city);
                if (details.postalCode) setFieldValue('postalCode', details.postalCode);
                if (details.region) setFieldValue('region', details.region);
                clearStepErrors();
              }}
            />
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
                  value={values.appt ?? false}
                  onChange={(appt) => {
                    setFieldValue('appt', appt);
                    if (appt && (!values.timeRanges || values.timeRanges.length === 0)) {
                      setFieldValue('timeRanges', [{ start_time: '08:00', end_time: '17:00' }]);
                    }
                    setFieldTouched('timeRanges', true, false);
                    clearStepErrors();
                  }}
                />
              </div>
              <div className={fieldClass(showError('dock'))}>
                <label>
                  Dock Type <span className="req">*</span>
                </label>
                <SearchableSelect
                  value={values.dock}
                  options={[{ value: '', label: '— Select —' }, ...dockOptions]}
                  placeholder="— Select —"
                  hasError={showError('dock')}
                  onChange={(val) => {
                    setFieldValue('dock', val);
                    clearStepErrors();
                  }}
                  direction="down"
                />
                <FormFieldError message={errorMessage('dock')} />
              </div>
            </div>

            {values.appt && (
              <div className={`mf ab-preferred-times${showError('timeRanges') ? ' has-error' : ''}`}>
                <label className="ab-section-label">
                  Pickup/Dropoff Preferred Times <span className="req">*</span>
                </label>
                <TimeRangeFormList
                  timeRanges={values.timeRanges ?? []}
                  onChange={(timeRanges) => {
                    setFieldValue('timeRanges', timeRanges);
                    setFieldTouched('timeRanges', true, false);
                    clearStepErrors();
                  }}
                />
                <FormFieldError
                  message={
                    errorMessage('timeRanges') ??
                    (typeof errors.timeRanges === 'string' ? errors.timeRanges : undefined)
                  }
                />
              </div>
            )}

            <div className="mf-grid">
              <div className={fieldClass(showError('maxTruck'))}>
                <label htmlFor="edit-max-truck">
                  Max Truck Length (m)
                </label>
                <input
                  id="edit-max-truck"
                  name="maxTruck"
                  type="text"
                  placeholder="e.g. 18.75m"
                  value={values.maxTruck}
                  onChange={(e) => {
                    handleChange(e);
                    clearStepErrors();
                  }}
                  onBlur={handleBlur}
                />
                <FormFieldError message={errorMessage('maxTruck')} />
              </div>
              <div className={fieldClass(showError('maxWeight'))}>
                <label htmlFor="edit-max-weight">
                  Max Weight (T)
                </label>
                <input
                  id="edit-max-weight"
                  name="maxWeight"
                  type="text"
                  placeholder="e.g. 40T"
                  value={values.maxWeight}
                  onChange={(e) => {
                    handleChange(e);
                    clearStepErrors();
                  }}
                  onBlur={handleBlur}
                />
                <FormFieldError message={errorMessage('maxWeight')} />
              </div>
            </div>

            <div className="mf-grid">
              <ToggleField
                label="Pallet Exchange"
                value={values.palletExchange ?? false}
                onChange={(palletExchange) => setFieldValue('palletExchange', palletExchange)}
              />
              <ToggleField
                label="ADR Allowed"
                value={values.adr ?? false}
                onChange={(adr) => setFieldValue('adr', adr)}
              />
            </div>

            <div className={fieldClass(showError('loadTime'))}>
              <label htmlFor="edit-load-time">
                Est. Loading/Unloading Time (min) <span className="req">*</span>
              </label>
              <input
                id="edit-load-time"
                name="loadTime"
                type="number"
                min={1}
                placeholder="e.g. 45"
                value={values.loadTime}
                onChange={(e) => {
                  handleChange(e);
                  clearStepErrors();
                }}
                onBlur={handleBlur}
              />
              <FormFieldError message={errorMessage('loadTime')} />
            </div>

            <h4 className="ab-form-section-title">Notes</h4>
            <div className="mf">
              <label htmlFor="edit-note-internal">Internal Note</label>
              <textarea
                id="edit-note-internal"
                name="noteInternal"
                placeholder="Visible only to your team…"
                value={values.noteInternal}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
            <div className="mf">
              <label htmlFor="edit-note-carrier">Carrier-Visible Note</label>
              <textarea
                id="edit-note-carrier"
                name="noteCarrier"
                placeholder="Drivers/carriers will see this…"
                value={values.noteCarrier}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
          </>
        );

        const renderStep4 = () => (
          <>
            <h4 className="ab-form-heading">Review & Confirm</h4>
            <div className="review-box">
              <div className="review-row-grid">
                <div className="review-row">
                  <div className="review-label">Location Type</div>
                  <div className="review-val">
                    {FACILITY_TYPE_LABELS[values.type] ?? values.type ?? '—'}
                  </div>
                </div>
                <div className="review-row">
                  <div className="review-label">Role</div>
                  <div className="review-val">{roleLabel}</div>
                </div>
              </div>

              <div className="review-row">
                <div className="review-label">Location</div>
                <div className="review-val review-val-lg">{reviewValue(values.name)}</div>
                <div className="review-sub">{locationAddress}</div>
              </div>

              <div className="review-row-grid">
                <div className="review-row">
                  <div className="review-label">Internal Code</div>
                  <div className="review-val">{reviewValue(values.code)}</div>
                </div>
                <div className="review-row">
                  <div className="review-label">Dock Type</div>
                  <div className="review-val">{reviewValue(values.dock)}</div>
                </div>
              </div>

              <div className="review-row-grid">
                <div className="review-row">
                  <div className="review-label">Appointment Required</div>
                  <div className="review-val">{values.appt ? 'Yes' : 'No'}</div>
                </div>
                <div className="review-row">
                  <div className="review-label">Preferred Time Ranges</div>
                  <div className="review-val">{preferredTimes}</div>
                </div>
              </div>

              <div className="review-row-grid">
                <div className="review-row">
                  <div className="review-label">Max Truck Length (m)</div>
                  <div className="review-val">{reviewValue(values.maxTruck)}</div>
                </div>
                <div className="review-row">
                  <div className="review-label">Max Weight (T)</div>
                  <div className="review-val">{reviewValue(values.maxWeight)}</div>
                </div>
              </div>

              <div className="review-row-grid">
                <div className="review-row">
                  <div className="review-label">ADR Allowed</div>
                  <div className="review-val">{values.adr ? 'Yes' : 'No'}</div>
                </div>
                <div className="review-row">
                  <div className="review-label">Pallet Exchange</div>
                  <div className="review-val">{values.palletExchange ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="review-row">
                <div className="review-label">Est. Loading/Unloading Time</div>
                <div className="review-val">{loadTimeLabel}</div>
              </div>

              <div className="review-row">
                <div className="review-label">Internal Note</div>
                <div className="review-val review-val-left">{reviewValue(values.noteInternal)}</div>
              </div>

              <div className="review-row">
                <div className="review-label">Carrier-Visible Note</div>
                <div className="review-val review-val-left">{reviewValue(values.noteCarrier)}</div>
              </div>
            </div>
          </>
        );

        const handleSave = async () => {
          const validationErrors = await validateEditStep(3, values);
          if (Object.keys(validationErrors).length > 0) {
            setStepErrors(validationErrors);
            setEditStep(3);
            return;
          }
          setStepErrors({});
          setErrors({});
          setTouched({});
          await submitForm();
        };

        const footerButtons = () => {
          if (editStep === 1) {
            return (
              <>
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={() => goNext(2)}>
                  Next →
                </button>
              </>
            );
          }
          if (editStep === 2) {
            return (
              <>
                <button type="button" className="btn btn-secondary ab-review-back" onClick={() => setEditStep(1)}>
                  ← Back
                </button>
                <div className="ab-review-footer-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => goNext(3)}>
                    Next →
                  </button>
                </div>
              </>
            );
          }
          if (editStep === 3) {
            return (
              <>
                <button type="button" className="btn btn-secondary ab-review-back" onClick={() => setEditStep(2)}>
                  ← Back
                </button>
                <div className="ab-review-footer-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => goNext(4)}>
                    Next →
                  </button>
                </div>
              </>
            );
          }
          return (
            <>
              <button type="button" className="btn btn-secondary ab-review-back" onClick={() => setEditStep(3)}>
                ← Back
              </button>
              <div className="ab-review-footer-actions">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || isSubmitting}
                  onClick={handleSave}
                >
                  {saving || isSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </>
          );
        };

        return createPortal(
          <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && closeEditModal()}>
            <Form ref={modalRef} className="modal modal-form" noValidate onClick={(e) => e.stopPropagation()}>
              <ScrollToFormError modalBodySelector=".ab-modal-body" />
              <div className="modal-header ab-modal-header-sticky">
                <h2>Edit Location — {editData.name}</h2>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeEditModal}>
                  ✕
                </button>
              </div>

              <ModalStepper currentStep={editStep} steps={EDIT_MODAL_STEPS} />

              <div className="modal-body ab-modal-body">
                {status && (
                  <div className="form-status-error" role="alert">
                    {status}
                  </div>
                )}
                {editStep === 1 && renderStep1()}
                {editStep === 2 && renderStep2()}
                {editStep === 3 && renderStep3()}
                {editStep === 4 && renderStep4()}
              </div>

              <div className={`modal-footer${editStep > 1 ? ' ab-review-footer' : ''}`}>{footerButtons()}</div>
            </Form>
          </div>,
          document.body
        );
      }}
    </Formik>
  );
};
