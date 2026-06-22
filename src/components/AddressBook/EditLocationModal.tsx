import React, { useEffect, useRef } from 'react';
import { Form, Formik, type FormikErrors, type FormikHelpers, type FormikTouched } from 'formik';
import type { LocationItem } from '../../context/AppContext';
import { ApiError } from '../../api';
import { DOCK_TYPES, FACILITY_TYPE_LABELS, FACILITY_TYPES } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { scrollToFirstFormError, touchAllLocationFields } from '../../pages/AddressBook/validation/formScrollUtils';
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
import { FormFieldError } from './FormFieldError';
import { GoogleMapAddressField } from './GoogleMapAddressField';
import { LocationMapPreview } from './LocationMapPreview';
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

function FormScrollToError({
  submitCount,
  errors,
  values,
  setTouched,
}: {
  submitCount: number;
  errors: FormikErrors<LocationFormValues>;
  values: LocationFormValues;
  setTouched: (touched: FormikTouched<LocationFormValues>, shouldValidate?: boolean) => void;
}) {
  const lastSubmitCount = useRef(0);

  useEffect(() => {
    if (submitCount <= lastSubmitCount.current) return;
    lastSubmitCount.current = submitCount;

    if (Object.keys(errors).length === 0) return;

    setTouched(touchAllLocationFields(values), false);
    scrollToFirstFormError(errors);
  }, [submitCount, errors, setTouched, values]);

  return null;
}

export const EditLocationModal: React.FC<Props> = ({
  editData,
  isEditOpen,
  closeEditModal,
  saveEditedLocation,
  saving,
  t,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditOpen) closeEditModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isEditOpen, closeEditModal]);

  if (!isEditOpen || !editData) return null;

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
      validateOnChange
      context={{ excludeLocationId: editData.id }}
      onSubmit={handleSubmit}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        setFieldTouched,
        setTouched,
        isSubmitting,
        status,
        submitCount,
      }) => {
        const showError = (field: keyof LocationFormValues) => Boolean(errors[field]);

        return (
          <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && closeEditModal()}>
            <Form className="modal ab-modal ab-modal-scroll" noValidate>
              <FormScrollToError
                submitCount={submitCount}
                errors={errors}
                values={values}
                setTouched={setTouched}
              />
              <div className="modal-header ab-modal-header-sticky">
                <h2>Edit — {editData.name}</h2>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeEditModal}>
                  ✕
                </button>
              </div>

              <div className="modal-body ab-modal-body">
                {status && (
                  <div className="form-status-error" role="alert">
                    {status}
                  </div>
                )}

                <div className={fieldClass(showError('name'))}>
                  <label htmlFor="edit-name">
                    Location Name <span className="req">*</span>
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormFieldError message={showError('name') ? errors.name : undefined} />
                </div>

                <div className="mf-row">
                  <div className="mf">
                    <label htmlFor="edit-company">
                      Company <span className="req">*</span>
                    </label>
                    <input id="edit-company" type="text" value={values.company} readOnly={editData.group === 'customer'} />
                  </div>
                  <div className="mf">
                    <label htmlFor="edit-vat">
                      Company VAT <span className="req">*</span>
                    </label>
                    <input id="edit-vat" type="text" value={values.companyVat} readOnly={editData.group === 'customer'} />
                  </div>
                </div>

                <div className={fieldClass(showError('address') || showError('lat') || showError('lng'))}>
                  <GoogleMapAddressField
                    address={values.address}
                    lat={values.lat}
                    lng={values.lng}
                    onAddressChange={(address) => {
                      setFieldValue('address', address);
                      setFieldTouched('address', true, false);
                    }}
                    onLatLngChange={(lat, lng) => {
                      setFieldValue('lat', lat);
                      setFieldValue('lng', lng);
                      setFieldTouched('lat', true, false);
                      setFieldTouched('lng', true, false);
                    }}
                    onPlaceSelected={(details) => {
                      setFieldValue('address', details.address);
                      setFieldValue('lat', details.lat);
                      setFieldValue('lng', details.lng);
                      if (details.city) {
                        setFieldValue('city', details.city);
                        setFieldTouched('city', true, false);
                      }
                      if (details.postalCode) {
                        setFieldValue('postalCode', details.postalCode);
                        setFieldTouched('postalCode', true, false);
                      }
                      if (details.region) {
                        setFieldValue('region', details.region);
                        setFieldTouched('region', true, false);
                      }
                    }}
                  />
                  <FormFieldError
                    message={
                      showError('address')
                        ? errors.address
                        : showError('lat')
                          ? errors.lat
                          : showError('lng')
                            ? errors.lng
                            : undefined
                    }
                  />
                </div>

                <div className="mf-row">
                  <div className={fieldClass(showError('city'))}>
                    <label htmlFor="edit-city">
                      City <span className="req">*</span>
                    </label>
                    <input
                      id="edit-city"
                      name="city"
                      type="text"
                      value={values.city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('city') ? errors.city : undefined} />
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
                    <FormFieldError message={showError('postalCode') ? errors.postalCode : undefined} />
                  </div>
                </div>

                <div className="mf-row">
                  <div className={fieldClass(showError('custCode'))}>
                    <label htmlFor="edit-cust-code">Customer Code</label>
                    <input
                      id="edit-cust-code"
                      name="custCode"
                      type="text"
                      value={values.custCode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('custCode') ? errors.custCode : undefined} />
                  </div>
                  <div className={fieldClass(showError('role'))}>
                    <label htmlFor="edit-role">
                      Location Role <span className="req">*</span>
                    </label>
                    <select id="edit-role" name="role" value={values.role} onChange={handleChange} onBlur={handleBlur}>
                      <option value="both">Both (Pickup & Drop-off)</option>
                      <option value="pickup">Pickup only</option>
                      <option value="delivery">Drop-off only</option>
                    </select>
                    <FormFieldError message={showError('role') ? errors.role : undefined} />
                  </div>
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
                  <FormFieldError message={showError('code') ? errors.code : undefined} />
                </div>

                <LocationMapPreview lat={values.lat} lng={values.lng} address={values.address} />

                <div className={fieldClass(showError('type'))}>
                  <label htmlFor="edit-type">
                    {t('abLocationType')} <span className="req">*</span>
                  </label>
                  <select id="edit-type" name="type" value={values.type} onChange={handleChange} onBlur={handleBlur}>
                    {FACILITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {FACILITY_TYPE_LABELS[type] ?? type}
                      </option>
                    ))}
                  </select>
                  <FormFieldError message={showError('type') ? errors.type : undefined} />
                </div>

                <h4 className="ab-form-section-title">Operational Profile</h4>
                <div className="mf-grid">
                  <ToggleField
                    label="Appointment required"
                    value={values.appt ?? false}
                    onChange={(appt) => {
                      setFieldValue('appt', appt);
                      setFieldTouched('timeRanges', true, false);
                    }}
                  />
                  <div className={fieldClass(showError('dock'))}>
                    <label htmlFor="edit-dock">
                      Dock Type <span className="req">*</span>
                    </label>
                    <select id="edit-dock" name="dock" value={values.dock} onChange={handleChange} onBlur={handleBlur}>
                      <option value="">— Select —</option>
                      {DOCK_TYPES.map((dock) => (
                        <option key={dock} value={dock}>
                          {dock}
                        </option>
                      ))}
                    </select>
                    <FormFieldError message={showError('dock') ? errors.dock : undefined} />
                  </div>
                </div>

                {values.appt && (
                  <div className={`mf ab-preferred-times${showError('timeRanges') ? ' has-error' : ''}`}>
                    <label className="ab-section-label">Pickup/Dropoff Preferred Times</label>
                    <TimeRangeFormList
                      timeRanges={values.timeRanges ?? []}
                      variant="preferred"
                      onChange={(timeRanges) => {
                        setFieldValue('timeRanges', timeRanges);
                        setFieldTouched('timeRanges', true, false);
                      }}
                    />
                    <FormFieldError
                      message={
                        showError('timeRanges') && typeof errors.timeRanges === 'string'
                          ? errors.timeRanges
                          : undefined
                      }
                    />
                  </div>
                )}

                <div className="mf-grid">
                  <div className={fieldClass(showError('maxTruck'))}>
                    <label htmlFor="edit-max-truck">
                      Max Truck <span className="req">*</span>
                    </label>
                    <input
                      id="edit-max-truck"
                      name="maxTruck"
                      type="text"
                      value={values.maxTruck}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('maxTruck') ? errors.maxTruck : undefined} />
                  </div>
                  <div className={fieldClass(showError('maxWeight'))}>
                    <label htmlFor="edit-max-weight">
                      Max Weight <span className="req">*</span>
                    </label>
                    <input
                      id="edit-max-weight"
                      name="maxWeight"
                      type="text"
                      value={values.maxWeight}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('maxWeight') ? errors.maxWeight : undefined} />
                  </div>
                </div>

                <div className="mf-grid">
                  <ToggleField label="ADR" value={values.adr ?? false} onChange={(adr) => setFieldValue('adr', adr)} />
                  <ToggleField
                    label="Pallet Exchange"
                    value={values.palletExchange ?? false}
                    onChange={(palletExchange) => setFieldValue('palletExchange', palletExchange)}
                  />
                </div>

                <div className={fieldClass(showError('loadTime'))}>
                  <label htmlFor="edit-load-time">
                    Est. Loading/Unloading (min) <span className="req">*</span>
                  </label>
                  <input
                    id="edit-load-time"
                    name="loadTime"
                    type="number"
                    min={1}
                    value={values.loadTime}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormFieldError message={showError('loadTime') ? errors.loadTime : undefined} />
                </div>

                <h4 className="ab-form-section-title">Notes</h4>
                <div className="mf">
                  <label htmlFor="edit-note-internal">Internal Note</label>
                  <textarea
                    id="edit-note-internal"
                    name="noteInternal"
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
                    value={values.noteCarrier}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || isSubmitting}>
                  {saving || isSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </Form>
          </div>
        );
      }}
    </Formik>
  );
};
