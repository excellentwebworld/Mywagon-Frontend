import React, { useMemo, useRef, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';
import { GoogleMapAddressField } from '../../components/AddressBook/GoogleMapAddressField';
import { registerService } from '../../api/auth/registerService';
import { RegisterLayout } from './RegisterLayout';
import { OtpModal } from './OtpModal';
import {
  HEAR_ABOUT_OPTIONS,
  appendIfPresent,
  privacyUrl,
  sampleDocUrl,
  termsUrl,
} from './registerConstants';
import { useRegisterReference } from './useRegisterReference';
import { extractApiErrorMessage, getOtpLabels } from './otpHelpers';
import './RegisterPage.css';

type ShipperFormValues = {
  first_name: string;
  last_name: string;
  company_name: string;
  country_code: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
  street_address: string;
  address_line_2: string;
  postal_code: string;
  city: string;
  address_country: string;
  lat: string;
  lng: string;
  hear_about_us_shipper: string;
  hear_about_us_other_shipper: string;
  referral_code: string;
  kyc_vat_number_shipper: string;
  terms: boolean;
};

const initialValues: ShipperFormValues = {
  first_name: '',
  last_name: '',
  company_name: '',
  country_code: '+30',
  phone: '',
  email: '',
  password: '',
  password_confirmation: '',
  street_address: '',
  address_line_2: '',
  postal_code: '',
  city: '',
  address_country: '',
  lat: '',
  lng: '',
  hear_about_us_shipper: '',
  hear_about_us_other_shipper: '',
  referral_code: '',
  kyc_vat_number_shipper: '',
  terms: false,
};

export const ShipperRegisterPage: React.FC = () => {
  const { lang, setLang } = useApp();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: reference } = useRegisterReference(lang);
  const fileRef = useRef<HTMLInputElement>(null);

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [phoneOtpOpen, setPhoneOtpOpen] = useState(false);
  const [pendingEmailOtp, setPendingEmailOtp] = useState<string | null>(null);
  const [pendingPhoneOtp, setPendingPhoneOtp] = useState<string | null>(null);
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const [phoneFieldError, setPhoneFieldError] = useState<string | null>(null);
  const [otpKind, setOtpKind] = useState<'email' | 'phone' | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successHtml, setSuccessHtml] = useState<string | null>(null);
  const [successRedirect, setSuccessRedirect] = useState('/login');

  const schema = useMemo(
    () =>
      Yup.object({
        first_name: Yup.string().required(t('register.required')),
        last_name: Yup.string().required(t('register.required')),
        company_name: Yup.string().required(t('register.required')),
        country_code: Yup.string().required(t('register.required')),
        phone: Yup.string()
          .matches(/^\d{8,10}$/, t('register.phoneInvalid'))
          .required(t('register.required')),
        email: Yup.string().email(t('register.emailInvalid')).required(t('register.required')),
        password: Yup.string().min(8, t('register.passwordMin')).required(t('register.required')),
        password_confirmation: Yup.string()
          .oneOf([Yup.ref('password')], t('register.passwordMismatch'))
          .required(t('register.required')),
        street_address: Yup.string().required(t('register.required')),
        postal_code: Yup.string().required(t('register.required')),
        city: Yup.string().required(t('register.required')),
        address_country: Yup.string().required(t('register.required')),
        hear_about_us_shipper: Yup.string().required(t('register.required')),
        hear_about_us_other_shipper: Yup.string().when('hear_about_us_shipper', {
          is: 'Other',
          then: (s) => s.min(2).required(t('register.required')),
          otherwise: (s) => s.nullable(),
        }),
        kyc_vat_number_shipper: Yup.string().min(2).required(t('register.required')),
        terms: Yup.boolean().oneOf([true], t('register.termsRequired')),
      }),
    [t],
  );

  const handleLang = (next: 'en' | 'el') => {
    setLang(next);
    void i18n.changeLanguage(next);
  };

  return (
    <RegisterLayout
      lang={lang}
      onLangChange={handleLang}
      subtitle={t('register.subtitle')}
      title={t('register.shipperTitle')}
      variant="shipper"
    >
      <Formik
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={async (values, helpers) => {
          if (!emailVerified) {
            toast.error(t('register.verifyEmailFirst'));
            helpers.setSubmitting(false);
            return;
          }
          if (!phoneVerified) {
            toast.error(t('register.verifyPhoneFirst'));
            helpers.setSubmitting(false);
            return;
          }
          if (!certificate) {
            toast.error(t('register.certificateRequired'));
            helpers.setSubmitting(false);
            return;
          }

          try {
            const companyCheck = await registerService.checkCompany(
              {
                table_name: 'shippers',
                field_name: 'company_name',
                new_value: values.company_name,
              },
              lang,
            );
            if (!companyCheck.success) {
              toast.error(t('register.companyExists'));
              helpers.setSubmitting(false);
              return;
            }

            const fd = new FormData();
            (Object.keys(values) as (keyof ShipperFormValues)[]).forEach((key) => {
              if (key === 'terms') {
                if (values.terms) fd.append('terms', '1');
                return;
              }
              appendIfPresent(fd, key, values[key]);
            });
            fd.append('shipper_certificate', certificate);

            const res = await registerService.signupShipper(fd, lang);
            if (!res.status) throw new Error(res.message || t('register.failed'));
            setSuccessHtml(res.message);
            setSuccessRedirect(res.redirect_url || '/login');
          } catch (e: unknown) {
            const msg = extractApiErrorMessage(e, t('register.failed'));
            const fieldErrors = (e as { fieldErrors?: Record<string, string[]> })?.fieldErrors;
            if (fieldErrors?.email?.[0]) setEmailFieldError(fieldErrors.email[0]);
            if (fieldErrors?.phone?.[0]) setPhoneFieldError(fieldErrors.phone[0]);
            if (!fieldErrors?.email?.[0] && !fieldErrors?.phone?.[0]) {
              toast.error(msg);
            }
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, setFieldValue, isSubmitting, setFieldTouched }) => (
          <Form className="reg-form" noValidate>
            <h5 className="reg-section-title">{t('register.accountSection')}</h5>

            <div className="reg-field">
              <Field name="first_name" className="reg-input" placeholder={`${t('register.firstName')}*`} />
              {touched.first_name && errors.first_name ? <p className="reg-error">{errors.first_name}</p> : null}
            </div>
            <div className="reg-field">
              <Field name="last_name" className="reg-input" placeholder={`${t('register.lastName')}*`} />
              {touched.last_name && errors.last_name ? <p className="reg-error">{errors.last_name}</p> : null}
            </div>
            <div className="reg-field">
              <Field name="company_name" className="reg-input" placeholder={`${t('register.companyName')}*`} />
              {touched.company_name && errors.company_name ? <p className="reg-error">{errors.company_name}</p> : null}
            </div>

            <div className="reg-field reg-contact">
              <div className="reg-phone-field">
                <div className="reg-code-select">
                  <Field
                    as="select"
                    name="country_code"
                    className="reg-select"
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setFieldValue('country_code', e.target.value);
                      setPhoneVerified(false);
                    }}
                  >
                    {(reference?.country_codes || [{ code: '+30', label: 'Greece (+30)' }]).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </Field>
                </div>
                <div className="reg-phone-input">
                  <Field
                    name="phone"
                    className="reg-input"
                    placeholder={`${t('register.mobilePhone')}*`}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setFieldValue('phone', e.target.value.replace(/\D/g, '').slice(0, 10));
                      setPhoneVerified(false);
                      setPhoneFieldError(null);
                    }}
                  />
                  <button
                    type="button"
                    className={`reg-btn-verify ${phoneVerified ? 'reg-btn-verified' : ''}`}
                    disabled={phoneVerified}
                    onClick={async () => {
                      setPhoneFieldError(null);
                      try {
                        await setFieldTouched('phone', true);
                        if (!values.phone || values.phone.length < 8) {
                          setPhoneFieldError(t('register.phoneInvalid'));
                          return;
                        }
                        const res = await registerService.sendPhoneOtp(
                          values.country_code,
                          values.phone,
                          lang,
                        );
                        if (!res.status) throw new Error(res.message);
                        setPendingPhoneOtp(res.data?.otp ? String(res.data.otp) : null);
                        setOtpKind('phone');
                        setPhoneOtpOpen(true);
                      } catch (e: unknown) {
                        setPhoneFieldError(extractApiErrorMessage(e, t('register.otpFailed')));
                      }
                    }}
                  >
                    {phoneVerified ? t('register.verified') : t('register.verify')}
                  </button>
                </div>
              </div>
              {phoneFieldError ? <p className="reg-field-error">{phoneFieldError}</p> : null}
              {!phoneFieldError && touched.phone && errors.phone ? (
                <p className="reg-error">{errors.phone}</p>
              ) : null}
            </div>

            <div className="reg-field reg-contact">
              <Field
                name="email"
                type="email"
                className="reg-input"
                placeholder={`${t('register.workEmail')}*`}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFieldValue('email', e.target.value);
                  setEmailVerified(false);
                  setEmailFieldError(null);
                }}
              />
              <button
                type="button"
                className={`reg-btn-verify ${emailVerified ? 'reg-btn-verified' : ''}`}
                disabled={emailVerified}
                onClick={async () => {
                  setEmailFieldError(null);
                  try {
                    if (!values.email || !values.email.includes('@')) {
                      setEmailFieldError(t('register.emailInvalid'));
                      return;
                    }
                    const res = await registerService.sendEmailOtp(values.email, 'shipper', lang);
                    if (!res.status) throw new Error(res.message);
                    setPendingEmailOtp(res.otp != null ? String(res.otp) : null);
                    setOtpKind('email');
                    setEmailOtpOpen(true);
                  } catch (e: unknown) {
                    setEmailFieldError(extractApiErrorMessage(e, t('register.otpFailed')));
                  }
                }}
              >
                {emailVerified ? t('register.verified') : t('register.verify')}
              </button>
              {emailFieldError ? <p className="reg-field-error">{emailFieldError}</p> : null}
              {!emailFieldError && touched.email && errors.email ? (
                <p className="reg-error">{errors.email}</p>
              ) : null}
            </div>

            <div className="reg-field reg-password-wrap">
              <Field
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="reg-input"
                placeholder={`${t('register.enterPassword')}*`}
              />
              <button type="button" className="reg-password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
                {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              {touched.password && errors.password ? <p className="reg-error">{errors.password}</p> : null}
            </div>

            <div className="reg-field reg-password-wrap">
              <Field
                name="password_confirmation"
                type={showConfirm ? 'text' : 'password'}
                className="reg-input"
                placeholder={`${t('register.confirmPassword')}*`}
              />
              <button type="button" className="reg-password-toggle" onClick={() => setShowConfirm((v) => !v)} aria-label="Toggle confirm password">
                {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              {touched.password_confirmation && errors.password_confirmation ? (
                <p className="reg-error">{errors.password_confirmation}</p>
              ) : null}
            </div>

            <h5 className="reg-section-title mt">{t('register.addressSection')}</h5>
            <div className="reg-field">
              <GoogleMapAddressField
                address={values.street_address}
                lat={values.lat}
                lng={values.lng}
                hideLabel
                hideHint
                onAddressChange={(address) => setFieldValue('street_address', address)}
                onLatLngChange={(lat, lng) => {
                  setFieldValue('lat', lat);
                  setFieldValue('lng', lng);
                }}
                onPlaceSelected={(details) => {
                  setFieldValue('street_address', details.address || values.street_address);
                  setFieldValue('city', details.city || '');
                  setFieldValue('postal_code', details.postalCode || '');
                  if (details.country) {
                    const match = reference?.countries_domicile.find(
                      (c) => c.value.toLowerCase() === details.country.toLowerCase(),
                    );
                    if (match) setFieldValue('address_country', match.value);
                  }
                }}
                error={touched.street_address && errors.street_address ? errors.street_address : undefined}
              />
              <small className="reg-hint">{t('register.addressHint')}</small>
            </div>
            <div className="reg-field">
              <Field name="address_line_2" className="reg-input" placeholder={t('register.addressLine2')} />
            </div>
            <div className="reg-field">
              <Field name="postal_code" className="reg-input" placeholder={`${t('register.postalCode')}*`} />
              {touched.postal_code && errors.postal_code ? <p className="reg-error">{errors.postal_code}</p> : null}
            </div>
            <div className="reg-field">
              <Field name="city" className="reg-input" placeholder={`${t('register.city')}*`} />
              {touched.city && errors.city ? <p className="reg-error">{errors.city}</p> : null}
            </div>
            <div className="reg-field">
              <Field as="select" name="address_country" className="reg-select">
                <option value="">{t('register.selectCountry')}*</option>
                {(reference?.countries_domicile || []).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Field>
              {touched.address_country && errors.address_country ? (
                <p className="reg-error">{errors.address_country}</p>
              ) : null}
            </div>

            <div className="reg-field">
              <Field as="select" name="hear_about_us_shipper" className="reg-select">
                <option value="">{t('register.hearAboutUs')}*</option>
                {HEAR_ABOUT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {t(`register.hear.${opt}`, opt)}
                  </option>
                ))}
              </Field>
              {touched.hear_about_us_shipper && errors.hear_about_us_shipper ? (
                <p className="reg-error">{errors.hear_about_us_shipper}</p>
              ) : null}
            </div>
            {values.hear_about_us_shipper === 'Other' ? (
              <div className="reg-field">
                <Field name="hear_about_us_other_shipper" className="reg-input" placeholder={`${t('register.pleaseSpecify')}*`} />
              </div>
            ) : null}
            <div className="reg-field">
              <Field name="referral_code" className="reg-input" placeholder={t('register.referralCode')} />
            </div>

            <h5 className="reg-section-title mt">{t('register.kycTitle')}</h5>
            <p className="reg-kyc-hint">{t('register.kycHint')}</p>
            <div className="reg-field">
              <Field name="kyc_vat_number_shipper" className="reg-input" placeholder={`${t('register.vatNumber')}*`} />
              {touched.kyc_vat_number_shipper && errors.kyc_vat_number_shipper ? (
                <p className="reg-error">{errors.kyc_vat_number_shipper}</p>
              ) : null}
            </div>
            <div className="reg-field">
              <label className="reg-label">{t('register.certificate')}*</label>
              <div className="reg-file-row">
                <input
                  ref={fileRef}
                  type="file"
                  className="reg-file"
                  accept=".pdf,.jpg,.jpeg,.png,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast.error(t('register.fileTooLarge'));
                      e.target.value = '';
                      setCertificate(null);
                      return;
                    }
                    setCertificate(file);
                  }}
                />
                <button type="button" className="reg-file-upload-btn" onClick={() => fileRef.current?.click()}>
                  {t('register.upload')}
                </button>
              </div>
              <a className="reg-link" href={sampleDocUrl()} target="_blank" rel="noreferrer">
                {t('register.certificateInstructions')}
              </a>
            </div>

            <div className="reg-terms">
              <Field type="checkbox" name="terms" id="terms" />
              <label htmlFor="terms">
                {t('register.termsPrefix')}{' '}
                <a href={termsUrl('shipper', lang)} target="_blank" rel="noreferrer">
                  {t('register.terms')}
                </a>{' '}
                {t('register.and')}{' '}
                <a href={privacyUrl('shipper', lang)} target="_blank" rel="noreferrer">
                  {t('register.privacy')}
                </a>{' '}
                {t('register.termsSuffix')}
              </label>
            </div>
            {touched.terms && errors.terms ? <p className="reg-error">{errors.terms}</p> : null}

            <button type="submit" className="reg-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? t('register.submitting') : t('register.joinForFree')}
            </button>

            <div className="reg-footer">
              <h4>{t('register.haveAccount')}</h4>
              <Link to="/login">{t('register.logIn')}</Link>
            </div>

            <OtpModal
              open={emailOtpOpen || phoneOtpOpen}
              destination={
                otpKind === 'phone'
                  ? `${values.country_code}  ${values.phone}`
                  : values.email
              }
              expectedOtp={otpKind === 'phone' ? pendingPhoneOtp : pendingEmailOtp}
              debugOtp={otpKind === 'phone' ? pendingPhoneOtp : pendingEmailOtp}
              labels={getOtpLabels(t)}
              onClose={() => {
                setEmailOtpOpen(false);
                setPhoneOtpOpen(false);
                setOtpKind(null);
              }}
              onVerified={() => {
                if (otpKind === 'phone') {
                  setPhoneVerified(true);
                  setPhoneFieldError(null);
                  setPhoneOtpOpen(false);
                } else {
                  setEmailVerified(true);
                  setEmailFieldError(null);
                  setEmailOtpOpen(false);
                }
                setOtpKind(null);
              }}
              onServerVerify={
                otpKind === 'phone'
                  ? async (otp) => {
                      await registerService.verifyPhoneOtp(
                        values.country_code,
                        values.phone,
                        otp,
                        lang,
                      );
                    }
                  : undefined
              }
              onResend={async () => {
                if (otpKind === 'phone') {
                  const res = await registerService.sendPhoneOtp(
                    values.country_code,
                    values.phone,
                    lang,
                  );
                  const otp = res.data?.otp ? String(res.data.otp) : null;
                  setPendingPhoneOtp(otp);
                  return otp;
                }
                const res = await registerService.sendEmailOtp(values.email, 'shipper', lang);
                const otp = res.otp != null ? String(res.otp) : null;
                setPendingEmailOtp(otp);
                return otp;
              }}
            />
          </Form>
        )}
      </Formik>

      {successHtml ? (
        <div className="reg-success-backdrop">
          <div className="reg-success-modal">
            <div dangerouslySetInnerHTML={{ __html: successHtml }} />
            <button
              type="button"
              className="reg-btn-primary"
              onClick={() => {
                if (successRedirect.startsWith('http')) window.location.assign(successRedirect);
                else navigate('/login');
              }}
            >
              {t('register.continueToLogin')}
            </button>
          </div>
        </div>
      ) : null}
    </RegisterLayout>
  );
};
