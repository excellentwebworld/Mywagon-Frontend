import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import type { CompanyFormData } from '../../pages/AddressBook/types';
import { SearchableSelect } from '../ui/SearchableSelect';
import { GoogleMapAddressField } from './GoogleMapAddressField';
import { FormFieldError } from './FormFieldError';
import { ApiError } from '../../api';

type Props = Pick<
  AddressBookState,
  'isCompanyOpen' | 'closeCompanyModal' | 'companyData' | 'setCompanyData' | 'handleApplyCompany'
>;

const INDUSTRIES = [
  '',
  'Retail',
  'Wholesale',
  'Manufacturing',
  'Logistics',
  'Food & Beverage',
  'Construction',
  'Pharmaceuticals',
  'Other',
];

const companyValidationSchema = Yup.object().shape({
  name: Yup.string().trim().required('Company name is required.'),
  email: Yup.string().trim().email('Enter a valid email address.').required('Email is required.'),
  vat: Yup.string().trim().required('VAT number is required.'),
  phone: Yup.string().trim().required('Phone is required.'),
  address: Yup.string().trim().required('Address is required.'),
  country: Yup.string().trim().required('Country is required. Please select an address suggestion.'),
  website: Yup.string().trim().required('Website is required.'),
  industry: Yup.string().trim().required('Industry is required.'),
  contactPerson: Yup.string().trim().required('Primary contact person is required.'),
});

const API_COMPANY_FIELD_TO_FORM: Record<string, keyof CompanyFormData> = {
  name: 'name',
  vat_number: 'vat',
  address: 'address',
  country: 'country',
  phone: 'phone',
  email: 'email',
  website: 'website',
  industry: 'industry',
  primary_contact: 'contactPerson',
};

function mapCompanyServerErrors(fieldErrors: Record<string, string[]>): Partial<Record<keyof CompanyFormData, string>> {
  const mapped: Partial<Record<keyof CompanyFormData, string>> = {};
  for (const [apiKey, messages] of Object.entries(fieldErrors)) {
    const formKey = API_COMPANY_FIELD_TO_FORM[apiKey];
    if (formKey && messages[0]) {
      mapped[formKey] = messages[0];
    }
  }
  return mapped;
}

function fieldClass(hasError: boolean): string {
  return hasError ? 'mf has-error' : 'mf';
}

export const CreateCompanyModal: React.FC<Props> = ({
  isCompanyOpen,
  closeCompanyModal,
  companyData,
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

  const handleSubmit = async (
    values: CompanyFormData,
    helpers: FormikHelpers<CompanyFormData>
  ) => {
    helpers.setStatus(undefined);
    try {
      await handleApplyCompany(values);
    } catch (err) {
      if (err instanceof ApiError) {
        helpers.setStatus(err.message);
        if (err.fieldErrors) {
          helpers.setErrors(mapCompanyServerErrors(err.fieldErrors));
        }
      } else {
        helpers.setStatus('Failed to create company. Please check the form and try again.');
      }
    } finally {
      helpers.setSubmitting(false);
    }
  };

  return createPortal(
    <Formik
      initialValues={companyData}
      validationSchema={companyValidationSchema}
      enableReinitialize
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
        isSubmitting,
        status,
      }) => {
        const showError = (field: keyof CompanyFormData) =>
          Boolean(touched[field] && errors[field]);

        return (
          <div className="modal-backdrop open ab-company-backdrop" onClick={(e) => e.target === e.currentTarget && closeCompanyModal()}>
            <Form className="modal modal-md ab-company-modal" onClick={(e) => e.stopPropagation()} noValidate>
              <div className="modal-header">
                <h2>Create New Company</h2>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeCompanyModal}>
                  ✕
                </button>
              </div>
              <div className="modal-body ab-company-body">
                {status && (
                  <div className="form-status-error" role="alert">
                    {status}
                  </div>
                )}
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px' }}>Company Details</h4>
                
                <div className={fieldClass(showError('name'))}>
                  <label htmlFor="company-name">
                    Company Name <span className="req">*</span>
                  </label>
                  <input
                    id="company-name"
                    name="name"
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormFieldError message={showError('name') ? errors.name : undefined} />
                </div>

                <div className="mf-row">
                  <div className={fieldClass(showError('email'))}>
                    <label htmlFor="company-email">
                      Email <span className="req">*</span>
                    </label>
                    <input
                      id="company-email"
                      name="email"
                      type="email"
                      placeholder="info@company.com"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('email') ? errors.email : undefined} />
                  </div>
                  <div className={fieldClass(showError('vat'))}>
                    <label htmlFor="company-vat">
                      VAT Number <span className="req">*</span>
                    </label>
                    <input
                      id="company-vat"
                      name="vat"
                      type="text"
                      placeholder="e.g. EL094123456"
                      value={values.vat}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('vat') ? errors.vat : undefined} />
                  </div>
                </div>

                <div className={fieldClass(showError('phone'))}>
                  <label htmlFor="company-phone">
                    Phone <span className="req">*</span>
                  </label>
                  <input
                    id="company-phone"
                    name="phone"
                    type="text"
                    placeholder="+30 210 ..."
                    value={values.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormFieldError message={showError('phone') ? errors.phone : undefined} />
                </div>

                <div className={fieldClass(showError('address'))}>
                  <GoogleMapAddressField
                    address={values.address}
                    lat=""
                    lng=""
                    onAddressChange={(address) => {
                      setFieldValue('address', address);
                      setFieldTouched('address', true, false);
                    }}
                    onLatLngChange={() => {}}
                    onPlaceSelected={(details) => {
                      setFieldValue('address', details.address);
                      setFieldTouched('address', true, false);
                      if (details.country) {
                        setFieldValue('country', details.country);
                        setFieldTouched('country', true, false);
                      }
                    }}
                  />
                  <FormFieldError message={showError('address') ? errors.address : undefined} />
                </div>

                <div className="mf-row">
                  <div className={fieldClass(showError('country'))}>
                    <label htmlFor="company-country">
                      Country <span className="req">*</span>
                    </label>
                    <input
                      id="company-country"
                      name="country"
                      type="text"
                      placeholder="Greece"
                      value={values.country}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('country') ? errors.country : undefined} />
                  </div>
                  <div className={fieldClass(showError('website'))}>
                    <label htmlFor="company-website">
                      Website <span className="req">*</span>
                    </label>
                    <input
                      id="company-website"
                      name="website"
                      type="text"
                      placeholder="https://www.company.com"
                      value={values.website}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('website') ? errors.website : undefined} />
                  </div>
                </div>

                <div className="mf-row">
                  <div className={fieldClass(showError('industry'))}>
                    <label>
                      Industry <span className="req">*</span>
                    </label>
                    <SearchableSelect
                      value={values.industry}
                      options={INDUSTRIES.filter(Boolean).map((ind) => ({ value: ind, label: ind }))}
                      placeholder="— Select —"
                      hasError={showError('industry')}
                      onChange={(val) => {
                        setFieldValue('industry', val);
                        setFieldTouched('industry', true, false);
                      }}
                    />
                    <FormFieldError message={showError('industry') ? errors.industry : undefined} />
                  </div>
                  <div className={fieldClass(showError('contactPerson'))}>
                    <label htmlFor="company-contact-person">
                      Primary Contact Person <span className="req">*</span>
                    </label>
                    <input
                      id="company-contact-person"
                      name="contactPerson"
                      type="text"
                      placeholder="Full name"
                      value={values.contactPerson}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('contactPerson') ? errors.contactPerson : undefined} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeCompanyModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  Create Company
                </button>
              </div>
            </Form>
          </div>
        );
      }}
    </Formik>,
    document.body
  );
};
