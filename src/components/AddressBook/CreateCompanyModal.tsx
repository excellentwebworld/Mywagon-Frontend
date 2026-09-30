import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import type { CompanyFormData } from '../../pages/AddressBook/types';
import { requiredPhoneSchema, sanitizePhoneInput } from '../../pages/AddressBook/validation/phoneValidation';
import { useTranslation } from '../../hooks/useTranslation';
import { SearchableSelect } from '../ui/SearchableSelect';
import { GoogleMapAddressField } from './GoogleMapAddressField';
import { FormFieldError } from './FormFieldError';
import { ScrollToFormError } from '../ui/ScrollToFormError';
import { ApiError } from '../../api';

type Props = Pick<
  AddressBookState,
  'isCompanyOpen' | 'closeCompanyModal' | 'companyData' | 'setCompanyData' | 'handleApplyCompany'
>;

const INDUSTRY_VALUES = [
  'Retail',
  'Wholesale',
  'Manufacturing',
  'Logistics',
  'Food & Beverage',
  'Construction',
  'Pharmaceuticals',
  'Other',
] as const;

const INDUSTRY_KEYS: Record<(typeof INDUSTRY_VALUES)[number], string> = {
  Retail: 'abIndustryRetail',
  Wholesale: 'abIndustryWholesale',
  Manufacturing: 'abIndustryManufacturing',
  Logistics: 'abIndustryLogistics',
  'Food & Beverage': 'abIndustryFood',
  Construction: 'abIndustryConstruction',
  Pharmaceuticals: 'abIndustryPharma',
  Other: 'abIndustryOther',
};

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
  const { t } = useTranslation();

  const companyValidationSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().trim().required(t('abCompanyNameRequired', 'Company name is required.')),
        email: Yup.string()
          .trim()
          .email(t('abValidEmail', 'Enter a valid email address.'))
          .required(t('abEmailRequired', 'Email is required.')),
        vat: Yup.string().trim().required(t('abVatRequired', 'VAT number is required.')),
        phone: requiredPhoneSchema(
          t('abPhoneRequired', 'Phone is required.'),
          t('abValidPhone', 'Enter a valid phone number.')
        ),
        address: Yup.string().trim().required(t('abAddressRequiredMsg', 'Address is required.')),
        country: Yup.string()
          .trim()
          .required(t('abCountryRequiredMsg', 'Country is required. Please select an address suggestion.')),
        website: Yup.string().trim().required(t('abWebsiteRequired', 'Website is required.')),
        industry: Yup.string().trim().required(t('abIndustryRequired', 'Industry is required.')),
        contactPerson: Yup.string()
          .trim()
          .required(t('abContactPersonRequired', 'Primary contact person is required.')),
      }),
    [t]
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCompanyOpen) closeCompanyModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isCompanyOpen, closeCompanyModal]);

  if (!isCompanyOpen) return null;

  const industryOptions = INDUSTRY_VALUES.map((ind) => ({
    value: ind,
    label: t(INDUSTRY_KEYS[ind], ind),
  }));

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
        helpers.setStatus(
          t('abFailedCreateCompany', 'Failed to create company. Please check the form and try again.')
        );
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
        submitCount,
      }) => {
        const showError = (field: keyof CompanyFormData) =>
          Boolean((touched[field] || submitCount > 0) && errors[field]);

        return (
          <div className="modal-backdrop open ab-company-backdrop" onClick={(e) => e.target === e.currentTarget && closeCompanyModal()}>
            <Form className="modal modal-lg ab-company-modal" onClick={(e) => e.stopPropagation()} noValidate>
              <ScrollToFormError modalBodySelector=".ab-company-body" />
              <div className="modal-header">
                <h2>{t('abCreateCompanyTitle', 'Create New Company')}</h2>
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
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 14px' }}>
                  {t('abCompanyDetails', 'Company Details')}
                </h4>

                <div className={fieldClass(showError('name'))}>
                  <label htmlFor="company-name">
                    {t('companyName', 'Company Name')} <span className="req">*</span>
                  </label>
                  <input
                    id="company-name"
                    name="name"
                    type="text"
                    placeholder={t('abEgCompanyName', 'e.g. Acme Corp')}
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <FormFieldError message={showError('name') ? errors.name : undefined} />
                </div>

                <div className="mf-row">
                  <div className={fieldClass(showError('email'))}>
                    <label htmlFor="company-email">
                      {t('email', 'Email')} <span className="req">*</span>
                    </label>
                    <input
                      id="company-email"
                      name="email"
                      type="email"
                      placeholder={t('abEgEmail', 'info@company.com')}
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('email') ? errors.email : undefined} />
                  </div>
                  <div className={fieldClass(showError('vat'))}>
                    <label htmlFor="company-vat">
                      {t('vatNumber', 'VAT Number')} <span className="req">*</span>
                    </label>
                    <input
                      id="company-vat"
                      name="vat"
                      type="text"
                      placeholder={t('abEgVat', 'e.g. EL094123456')}
                      value={values.vat}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('vat') ? errors.vat : undefined} />
                  </div>
                </div>

                <div className={fieldClass(showError('phone'))}>
                  <label htmlFor="company-phone">
                    {t('phone', 'Phone')} <span className="req">*</span>
                  </label>
                  <input
                    id="company-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={t('abPhonePlaceholder', '+30 210 ...')}
                    value={values.phone}
                    onChange={(e) => setFieldValue('phone', sanitizePhoneInput(e.target.value))}
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
                      {t('abCountry', 'Country')} <span className="req">*</span>
                    </label>
                    <input
                      id="company-country"
                      name="country"
                      type="text"
                      placeholder={t('abCountryPlaceholder', 'Greece')}
                      value={values.country}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <FormFieldError message={showError('country') ? errors.country : undefined} />
                  </div>
                  <div className={fieldClass(showError('website'))}>
                    <label htmlFor="company-website">
                      {t('abWebsite', 'Website')} <span className="req">*</span>
                    </label>
                    <input
                      id="company-website"
                      name="website"
                      type="text"
                      placeholder={t('abWebsitePlaceholder', 'https://www.company.com')}
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
                      {t('abIndustry', 'Industry')} <span className="req">*</span>
                    </label>
                    <SearchableSelect
                      value={values.industry}
                      options={industryOptions}
                      placeholder={t('abSelectPlaceholder', '— Select —')}
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
                      {t('abPrimaryContact', 'Primary Contact Person')} <span className="req">*</span>
                    </label>
                    <input
                      id="company-contact-person"
                      name="contactPerson"
                      type="text"
                      placeholder={t('abFullNamePlaceholder', 'Full name')}
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
                  {t('abCancel', 'Cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {t('abCreateCompanyBtn', 'Create Company')}
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
