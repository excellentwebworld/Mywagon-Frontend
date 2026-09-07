import React, { useEffect, useMemo, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../hooks/useToast';
import { GoogleMapAddressField } from '../../components/AddressBook/GoogleMapAddressField';
import { registerService, type IdNameOption } from '../../api/auth/registerService';
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
import './RegisterPage.css';

type TabKey = 'carrier' | 'driver';

type CarrierValues = {
  first_name: string;
  last_name: string;
  company_name: string;
  carrier_country_code: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
  street_address: string;
  address_line_2: string;
  postal_code: string;
  city: string;
  address_country: string;
  hear_about_us_carrier: string;
  hear_about_us_other_carrier: string;
  referral_code: string;
  number_of_trucks: string;
  kyc_vat_number_carrier: string;
  terms_carrier: boolean;
};

type DriverValues = {
  first_name: string;
  last_name: string;
  driver_country_code: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
  driver_street_address: string;
  driver_address_line_2: string;
  driver_postal_code: string;
  driver_city: string;
  driver_address_country: string;
  driver_latitude: string;
  driver_longitude: string;
  hear_about_us_driver: string;
  hear_about_us_other_driver: string;
  referral_code: string;
  vehicle_type: string;
  cargo_type: string;
  specify_cargo: string;
  kyc_vat_number_driver: string;
  terms_freelancer: boolean;
};

const carrierInitial: CarrierValues = {
  first_name: '',
  last_name: '',
  company_name: '',
  carrier_country_code: '+30',
  phone: '',
  email: '',
  password: '',
  password_confirmation: '',
  street_address: '',
  address_line_2: '',
  postal_code: '',
  city: '',
  address_country: '',
  hear_about_us_carrier: '',
  hear_about_us_other_carrier: '',
  referral_code: '',
  number_of_trucks: '',
  kyc_vat_number_carrier: '',
  terms_carrier: false,
};

const driverInitial: DriverValues = {
  first_name: '',
  last_name: '',
  driver_country_code: '+30',
  phone: '',
  email: '',
  password: '',
  password_confirmation: '',
  driver_street_address: '',
  driver_address_line_2: '',
  driver_postal_code: '',
  driver_city: '',
  driver_address_country: '',
  driver_latitude: '',
  driver_longitude: '',
  hear_about_us_driver: '',
  hear_about_us_other_driver: '',
  referral_code: '',
  vehicle_type: '',
  cargo_type: '',
  specify_cargo: '',
  kyc_vat_number_driver: '',
  terms_freelancer: false,
};

function resolveTab(raw: string | null): TabKey {
  if (!raw) return 'carrier';
  const v = raw.toLowerCase();
  if (v === 'driver' || v === 'freelancer') return 'driver';
  return 'carrier';
}

export const CarrierDriverRegisterPage: React.FC = () => {
  const { lang, setLang } = useApp();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = resolveTab(params.get('type'));
  const { data: reference } = useRegisterReference(lang);

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailOtpOpen, setEmailOtpOpen] = useState(false);
  const [phoneOtpOpen, setPhoneOtpOpen] = useState(false);
  const [pendingEmailOtp, setPendingEmailOtp] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [cargoTypes, setCargoTypes] = useState<IdNameOption[]>([]);
  const [cargoSpecs, setCargoSpecs] = useState<IdNameOption[]>([]);
  const [successHtml, setSuccessHtml] = useState<string | null>(null);

  useEffect(() => {
    setEmailVerified(false);
    setPhoneVerified(false);
    setCertificate(null);
    setCargoTypes([]);
    setCargoSpecs([]);
  }, [tab]);

  const handleLang = (next: 'en' | 'el') => {
    setLang(next);
    void i18n.changeLanguage(next);
  };

  const setTab = (next: TabKey) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set('type', next);
    setParams(nextParams, { replace: true });
  };

  const carrierSchema = useMemo(
    () =>
      Yup.object({
        first_name: Yup.string().required(t('register.required')),
        last_name: Yup.string().required(t('register.required')),
        company_name: Yup.string().required(t('register.required')),
        carrier_country_code: Yup.string().required(t('register.required')),
        phone: Yup.string().matches(/^\d{8,10}$/, t('register.phoneInvalid')).required(t('register.required')),
        email: Yup.string().email(t('register.emailInvalid')).required(t('register.required')),
        password: Yup.string().min(6, t('register.passwordMin')).required(t('register.required')),
        password_confirmation: Yup.string()
          .oneOf([Yup.ref('password')], t('register.passwordMismatch'))
          .required(t('register.required')),
        street_address: Yup.string().required(t('register.required')),
        postal_code: Yup.string().required(t('register.required')),
        city: Yup.string().required(t('register.required')),
        address_country: Yup.string().required(t('register.required')),
        number_of_trucks: Yup.number().min(1).max(1000).required(t('register.required')),
        kyc_vat_number_carrier: Yup.string().required(t('register.required')),
        hear_about_us_carrier: Yup.string().required(t('register.required')),
        terms_carrier: Yup.boolean().oneOf([true], t('register.termsRequired')),
      }),
    [t],
  );

  const driverSchema = useMemo(
    () =>
      Yup.object({
        first_name: Yup.string().required(t('register.required')),
        last_name: Yup.string().required(t('register.required')),
        driver_country_code: Yup.string().required(t('register.required')),
        phone: Yup.string().matches(/^\d{8,10}$/, t('register.phoneInvalid')).required(t('register.required')),
        email: Yup.string().email(t('register.emailInvalid')).nullable(),
        password: Yup.string().min(6, t('register.passwordMin')).required(t('register.required')),
        password_confirmation: Yup.string()
          .oneOf([Yup.ref('password')], t('register.passwordMismatch'))
          .required(t('register.required')),
        driver_street_address: Yup.string().required(t('register.required')),
        driver_latitude: Yup.string().required(t('register.required')),
        driver_longitude: Yup.string().required(t('register.required')),
        driver_postal_code: Yup.string().required(t('register.required')),
        driver_city: Yup.string().required(t('register.required')),
        driver_address_country: Yup.string().required(t('register.required')),
        vehicle_type: Yup.string().required(t('register.required')),
        cargo_type: Yup.string().required(t('register.required')),
        specify_cargo: Yup.string().required(t('register.required')),
        kyc_vat_number_driver: Yup.string().required(t('register.required')),
        hear_about_us_driver: Yup.string().required(t('register.required')),
        terms_freelancer: Yup.boolean().oneOf([true], t('register.termsRequired')),
      }),
    [t],
  );

  const countryOptions = reference?.country_codes || [{ code: '+30', label: 'Greece (+30)' }];
  const domicileOptions = reference?.countries_domicile || [];

  return (
    <RegisterLayout lang={lang} onLangChange={handleLang} subtitle={t('register.subtitle')}>
      <div className="reg-tabs">
        <button type="button" className={`reg-tab ${tab === 'carrier' ? 'active' : ''}`} onClick={() => setTab('carrier')}>
          {t('register.tabCarrier')}
        </button>
        <button type="button" className={`reg-tab ${tab === 'driver' ? 'active' : ''}`} onClick={() => setTab('driver')}>
          {t('register.tabDriver')}
        </button>
      </div>

      {tab === 'carrier' ? (
        <Formik
          initialValues={carrierInitial}
          validationSchema={carrierSchema}
          onSubmit={async (values, helpers) => {
            if (!emailVerified || !phoneVerified) {
              toast.error(t('register.verifyBothFirst'));
              helpers.setSubmitting(false);
              return;
            }
            if (!certificate) {
              toast.error(t('register.certificateRequired'));
              helpers.setSubmitting(false);
              return;
            }
            try {
              const fd = new FormData();
              (Object.keys(values) as (keyof CarrierValues)[]).forEach((key) => {
                if (key === 'terms_carrier') {
                  if (values.terms_carrier) fd.append('terms_carrier', '1');
                  return;
                }
                appendIfPresent(fd, key, values[key]);
              });
              fd.append('carrier_vat_certificate', certificate);
              const res = await registerService.signupCarrier(fd, lang);
              if (!res.status) throw new Error(res.message || t('register.failed'));
              setSuccessHtml(res.message);
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : t('register.failed'));
            } finally {
              helpers.setSubmitting(false);
            }
          }}
        >
          {({ values, errors, touched, setFieldValue, isSubmitting }) => (
            <Form noValidate>
              <div className="reg-grid-2">
                <div className="reg-field">
                  <Field name="first_name" className="reg-input" placeholder={`${t('register.firstName')}*`} />
                  {touched.first_name && errors.first_name ? <p className="reg-error">{errors.first_name}</p> : null}
                </div>
                <div className="reg-field">
                  <Field name="last_name" className="reg-input" placeholder={`${t('register.lastName')}*`} />
                  {touched.last_name && errors.last_name ? <p className="reg-error">{errors.last_name}</p> : null}
                </div>
              </div>
              <div className="reg-field">
                <Field name="company_name" className="reg-input" placeholder={`${t('register.companyName')}*`} />
              </div>
              <div className="reg-field">
                <div className="reg-verify-row">
                  <div className="reg-phone-row">
                    <Field as="select" name="carrier_country_code" className="reg-select" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFieldValue('carrier_country_code', e.target.value); setPhoneVerified(false); }}>
                      {countryOptions.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </Field>
                    <Field name="phone" className="reg-input" placeholder={`${t('register.mobilePhone')}*`} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFieldValue('phone', e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneVerified(false); }} />
                  </div>
                  <button type="button" className={`reg-btn-verify ${phoneVerified ? 'reg-btn-verified' : ''}`} disabled={phoneVerified} onClick={async () => {
                    try {
                      await registerService.sendPhoneOtp(values.carrier_country_code, values.phone, lang);
                      setPhoneOtpOpen(true);
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : t('register.otpFailed'));
                    }
                  }}>{phoneVerified ? t('register.verified') : t('register.verify')}</button>
                </div>
              </div>
              <div className="reg-field">
                <div className="reg-verify-row">
                  <Field name="email" type="email" className="reg-input" placeholder={`${t('register.workEmail')}*`} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFieldValue('email', e.target.value); setEmailVerified(false); }} />
                  <button type="button" className={`reg-btn-verify ${emailVerified ? 'reg-btn-verified' : ''}`} disabled={emailVerified} onClick={async () => {
                    try {
                      const res = await registerService.sendEmailOtp(values.email, 'carrier', lang);
                      setPendingEmailOtp(res.otp != null ? String(res.otp) : null);
                      setEmailOtpOpen(true);
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : t('register.otpFailed'));
                    }
                  }}>{emailVerified ? t('register.verified') : t('register.verify')}</button>
                </div>
              </div>
              <div className="reg-grid-2">
                <div className="reg-field"><Field name="password" type="password" className="reg-input" placeholder={`${t('register.password')}*`} /></div>
                <div className="reg-field"><Field name="password_confirmation" type="password" className="reg-input" placeholder={`${t('register.confirmPassword')}*`} /></div>
              </div>

              <h3 className="reg-section-title">{t('register.addressSection')}</h3>
              <div className="reg-field">
                <GoogleMapAddressField
                  address={values.street_address}
                  lat=""
                  lng=""
                  hideLabel
                  hideHint
                  onAddressChange={(a) => setFieldValue('street_address', a)}
                  onLatLngChange={() => undefined}
                  onPlaceSelected={(d) => {
                    setFieldValue('street_address', d.address || values.street_address);
                    setFieldValue('city', d.city || '');
                    setFieldValue('postal_code', d.postalCode || '');
                    const match = domicileOptions.find((c) => c.value.toLowerCase() === d.country.toLowerCase());
                    if (match) setFieldValue('address_country', match.value);
                  }}
                />
              </div>
              <div className="reg-field"><Field name="address_line_2" className="reg-input" placeholder={t('register.addressLine2')} /></div>
              <div className="reg-grid-2">
                <div className="reg-field"><Field name="postal_code" className="reg-input" placeholder={`${t('register.postalCode')}*`} /></div>
                <div className="reg-field"><Field name="city" className="reg-input" placeholder={`${t('register.city')}*`} /></div>
              </div>
              <div className="reg-field">
                <Field as="select" name="address_country" className="reg-select">
                  <option value="">{t('register.selectCountry')}*</option>
                  {domicileOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Field>
              </div>

              <div className="reg-field">
                <Field as="select" name="hear_about_us_carrier" className="reg-select">
                  <option value="">{t('register.hearAboutUs')}*</option>
                  {HEAR_ABOUT_OPTIONS.map((opt) => <option key={opt} value={opt}>{t(`register.hear.${opt}`, opt)}</option>)}
                </Field>
              </div>
              {values.hear_about_us_carrier === 'Other' ? (
                <div className="reg-field"><Field name="hear_about_us_other_carrier" className="reg-input" placeholder={`${t('register.pleaseSpecify')}*`} /></div>
              ) : null}
              <div className="reg-field"><Field name="referral_code" className="reg-input" placeholder={t('register.referralCode')} /></div>

              <h3 className="reg-section-title">{t('register.kycTitle')}</h3>
              <p className="reg-kyc-hint">{t('register.kycHint')}</p>
              <div className="reg-field"><Field name="number_of_trucks" type="number" className="reg-input" placeholder={`${t('register.numberOfTrucks')}*`} /></div>
              <div className="reg-field"><Field name="kyc_vat_number_carrier" className="reg-input" placeholder={`${t('register.vatNumber')}*`} /></div>
              <div className="reg-field">
                <input type="file" className="reg-file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > 2 * 1024 * 1024) { toast.error(t('register.fileTooLarge')); e.target.value = ''; setCertificate(null); return; }
                  setCertificate(file);
                }} />
                <a className="reg-link" href={sampleDocUrl()} target="_blank" rel="noreferrer">{t('register.certificateInstructions')}</a>
              </div>
              <div className="reg-terms">
                <Field type="checkbox" name="terms_carrier" />
                <label>
                  {t('register.termsPrefix')}{' '}
                  <a href={termsUrl('carrier', lang)} target="_blank" rel="noreferrer">{t('register.terms')}</a>{' '}
                  {t('register.and')}{' '}
                  <a href={privacyUrl('carrier', lang)} target="_blank" rel="noreferrer">{t('register.privacy')}</a>{' '}
                  {t('register.termsSuffix')}
                </label>
              </div>
              <button type="submit" className="reg-btn-primary" disabled={isSubmitting}>{isSubmitting ? t('register.submitting') : t('register.joinForFree')}</button>

              <OtpModal open={emailOtpOpen} title={t('register.emailOtpTitle')} subtitle={values.email} otpLabel={t('register.otpLabel')} verifyLabel={t('register.verify')} cancelLabel={t('register.cancel')} onClose={() => setEmailOtpOpen(false)} onVerify={async (otp) => {
                if (pendingEmailOtp && otp !== pendingEmailOtp) throw new Error(t('register.otpInvalid'));
                setEmailVerified(true); setEmailOtpOpen(false);
              }} />
              <OtpModal open={phoneOtpOpen} title={t('register.phoneOtpTitle')} subtitle={`${values.carrier_country_code} ${values.phone}`} otpLabel={t('register.otpLabel')} verifyLabel={t('register.verify')} cancelLabel={t('register.cancel')} onClose={() => setPhoneOtpOpen(false)} onVerify={async (otp) => {
                await registerService.verifyPhoneOtp(values.carrier_country_code, values.phone, otp, lang);
                setPhoneVerified(true); setPhoneOtpOpen(false);
              }} />
            </Form>
          )}
        </Formik>
      ) : (
        <Formik
          initialValues={driverInitial}
          validationSchema={driverSchema}
          onSubmit={async (values, helpers) => {
            if (!phoneVerified) {
              toast.error(t('register.verifyPhoneFirst'));
              helpers.setSubmitting(false);
              return;
            }
            if (values.email && !emailVerified) {
              toast.error(t('register.verifyEmailFirst'));
              helpers.setSubmitting(false);
              return;
            }
            if (!certificate) {
              toast.error(t('register.certificateRequired'));
              helpers.setSubmitting(false);
              return;
            }
            try {
              const fd = new FormData();
              (Object.keys(values) as (keyof DriverValues)[]).forEach((key) => {
                if (key === 'terms_freelancer') {
                  if (values.terms_freelancer) fd.append('terms_freelancer', '1');
                  return;
                }
                appendIfPresent(fd, key, values[key]);
              });
              fd.append('driver_vat_certificate', certificate);
              const res = await registerService.signupDriver(fd, lang);
              if (!res.status) throw new Error(res.message || t('register.failed'));
              setSuccessHtml(res.message);
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : t('register.failed'));
            } finally {
              helpers.setSubmitting(false);
            }
          }}
        >
          {({ values, errors, touched, setFieldValue, isSubmitting }) => (
            <Form noValidate>
              <div className="reg-grid-2">
                <div className="reg-field"><Field name="first_name" className="reg-input" placeholder={`${t('register.firstName')}*`} /></div>
                <div className="reg-field"><Field name="last_name" className="reg-input" placeholder={`${t('register.lastName')}*`} /></div>
              </div>
              <div className="reg-field">
                <div className="reg-verify-row">
                  <div className="reg-phone-row">
                    <Field as="select" name="driver_country_code" className="reg-select" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setFieldValue('driver_country_code', e.target.value); setPhoneVerified(false); }}>
                      {countryOptions.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </Field>
                    <Field name="phone" className="reg-input" placeholder={`${t('register.mobilePhone')}*`} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFieldValue('phone', e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneVerified(false); }} />
                  </div>
                  <button type="button" className={`reg-btn-verify ${phoneVerified ? 'reg-btn-verified' : ''}`} disabled={phoneVerified} onClick={async () => {
                    try {
                      await registerService.sendPhoneOtp(values.driver_country_code, values.phone, lang);
                      setPhoneOtpOpen(true);
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : t('register.otpFailed'));
                    }
                  }}>{phoneVerified ? t('register.verified') : t('register.verify')}</button>
                </div>
              </div>
              <div className="reg-field">
                <div className="reg-verify-row">
                  <Field name="email" type="email" className="reg-input" placeholder={t('register.emailOptional')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setFieldValue('email', e.target.value); setEmailVerified(false); }} />
                  <button type="button" className={`reg-btn-verify ${emailVerified ? 'reg-btn-verified' : ''}`} disabled={emailVerified || !values.email} onClick={async () => {
                    try {
                      const res = await registerService.sendEmailOtp(values.email, 'driver', lang);
                      setPendingEmailOtp(res.otp != null ? String(res.otp) : null);
                      setEmailOtpOpen(true);
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : t('register.otpFailed'));
                    }
                  }}>{emailVerified ? t('register.verified') : t('register.verify')}</button>
                </div>
              </div>
              <div className="reg-grid-2">
                <div className="reg-field"><Field name="password" type="password" className="reg-input" placeholder={`${t('register.password')}*`} /></div>
                <div className="reg-field"><Field name="password_confirmation" type="password" className="reg-input" placeholder={`${t('register.confirmPassword')}*`} /></div>
              </div>

              <h3 className="reg-section-title">{t('register.addressSection')}</h3>
              <div className="reg-field">
                <GoogleMapAddressField
                  address={values.driver_street_address}
                  lat={values.driver_latitude}
                  lng={values.driver_longitude}
                  hideLabel
                  hideHint
                  onAddressChange={(a) => setFieldValue('driver_street_address', a)}
                  onLatLngChange={(lat, lng) => { setFieldValue('driver_latitude', lat); setFieldValue('driver_longitude', lng); }}
                  onPlaceSelected={(d) => {
                    setFieldValue('driver_street_address', d.address || values.driver_street_address);
                    setFieldValue('driver_city', d.city || '');
                    setFieldValue('driver_postal_code', d.postalCode || '');
                    setFieldValue('driver_latitude', d.lat);
                    setFieldValue('driver_longitude', d.lng);
                    const match = domicileOptions.find((c) => c.value.toLowerCase() === d.country.toLowerCase());
                    if (match) setFieldValue('driver_address_country', match.value);
                  }}
                />
              </div>
              <div className="reg-field"><Field name="driver_address_line_2" className="reg-input" placeholder={t('register.addressLine2')} /></div>
              <div className="reg-grid-2">
                <div className="reg-field"><Field name="driver_postal_code" className="reg-input" placeholder={`${t('register.postalCode')}*`} /></div>
                <div className="reg-field"><Field name="driver_city" className="reg-input" placeholder={`${t('register.city')}*`} /></div>
              </div>
              <div className="reg-field">
                <Field as="select" name="driver_address_country" className="reg-select">
                  <option value="">{t('register.selectCountry')}*</option>
                  {domicileOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Field>
              </div>

              <div className="reg-field">
                <Field as="select" name="vehicle_type" className="reg-select" onChange={async (e: React.ChangeEvent<HTMLSelectElement>) => {
                  const v = e.target.value;
                  setFieldValue('vehicle_type', v);
                  setFieldValue('cargo_type', '');
                  setFieldValue('specify_cargo', '');
                  setCargoSpecs([]);
                  if (!v) { setCargoTypes([]); return; }
                  try {
                    const res = await registerService.fetchCargoTypes(v, lang);
                    setCargoTypes(res.data || []);
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : t('register.failed'));
                  }
                }}>
                  <option value="">{t('register.vehicleType')}*</option>
                  {(reference?.vehicle_types || []).map((v) => <option key={v.id} value={String(v.id)}>{v.name}</option>)}
                </Field>
              </div>
              <div className="reg-field">
                <Field as="select" name="cargo_type" className="reg-select" onChange={async (e: React.ChangeEvent<HTMLSelectElement>) => {
                  const v = e.target.value;
                  setFieldValue('cargo_type', v);
                  setFieldValue('specify_cargo', '');
                  if (!v || !values.vehicle_type) { setCargoSpecs([]); return; }
                  try {
                    const res = await registerService.fetchCargoSpecifications(values.vehicle_type, v, lang);
                    setCargoSpecs(res.data || []);
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : t('register.failed'));
                  }
                }}>
                  <option value="">{t('register.cargoType')}*</option>
                  {cargoTypes.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </Field>
              </div>
              <div className="reg-field">
                <Field as="select" name="specify_cargo" className="reg-select">
                  <option value="">{t('register.specifyCargo')}*</option>
                  {cargoSpecs.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </Field>
              </div>

              <div className="reg-field">
                <Field as="select" name="hear_about_us_driver" className="reg-select">
                  <option value="">{t('register.hearAboutUs')}*</option>
                  {HEAR_ABOUT_OPTIONS.map((opt) => <option key={opt} value={opt}>{t(`register.hear.${opt}`, opt)}</option>)}
                </Field>
              </div>
              {values.hear_about_us_driver === 'Other' ? (
                <div className="reg-field"><Field name="hear_about_us_other_driver" className="reg-input" placeholder={`${t('register.pleaseSpecify')}*`} /></div>
              ) : null}
              <div className="reg-field"><Field name="referral_code" className="reg-input" placeholder={t('register.referralCode')} /></div>

              <h3 className="reg-section-title">{t('register.kycTitle')}</h3>
              <p className="reg-kyc-hint">{t('register.kycHint')}</p>
              <div className="reg-field"><Field name="kyc_vat_number_driver" className="reg-input" placeholder={`${t('register.vatNumber')}*`} /></div>
              <div className="reg-field">
                <input type="file" className="reg-file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > 2 * 1024 * 1024) { toast.error(t('register.fileTooLarge')); e.target.value = ''; setCertificate(null); return; }
                  setCertificate(file);
                }} />
                <a className="reg-link" href={sampleDocUrl()} target="_blank" rel="noreferrer">{t('register.certificateInstructions')}</a>
              </div>
              <div className="reg-terms">
                <Field type="checkbox" name="terms_freelancer" />
                <label>
                  {t('register.termsPrefixDriver')}{' '}
                  <a href={termsUrl('driver', lang)} target="_blank" rel="noreferrer">{t('register.terms')}</a>{' '}
                  {t('register.and')}{' '}
                  <a href={privacyUrl('driver', lang)} target="_blank" rel="noreferrer">{t('register.privacy')}</a>.
                </label>
              </div>
              {touched.terms_freelancer && errors.terms_freelancer ? <p className="reg-error">{errors.terms_freelancer}</p> : null}
              <button type="submit" className="reg-btn-primary" disabled={isSubmitting}>{isSubmitting ? t('register.submitting') : t('register.joinForFree')}</button>

              <OtpModal open={emailOtpOpen} title={t('register.emailOtpTitle')} subtitle={values.email} otpLabel={t('register.otpLabel')} verifyLabel={t('register.verify')} cancelLabel={t('register.cancel')} onClose={() => setEmailOtpOpen(false)} onVerify={async (otp) => {
                if (pendingEmailOtp && otp !== pendingEmailOtp) throw new Error(t('register.otpInvalid'));
                setEmailVerified(true); setEmailOtpOpen(false);
              }} />
              <OtpModal open={phoneOtpOpen} title={t('register.phoneOtpTitle')} subtitle={`${values.driver_country_code} ${values.phone}`} otpLabel={t('register.otpLabel')} verifyLabel={t('register.verify')} cancelLabel={t('register.cancel')} onClose={() => setPhoneOtpOpen(false)} onVerify={async (otp) => {
                await registerService.verifyPhoneOtp(values.driver_country_code, values.phone, otp, lang);
                setPhoneVerified(true); setPhoneOtpOpen(false);
              }} />
            </Form>
          )}
        </Formik>
      )}

      <div className="reg-footer">
        <h4>{t('register.haveAccount')}</h4>
        <Link to="/login">{t('register.logIn')}</Link>
      </div>

      {successHtml ? (
        <div className="reg-success-backdrop">
          <div className="reg-success-modal">
            <div dangerouslySetInnerHTML={{ __html: successHtml }} />
            <button type="button" className="reg-btn-primary" onClick={() => navigate('/login')}>
              {t('register.continueToLogin')}
            </button>
          </div>
        </div>
      ) : null}
    </RegisterLayout>
  );
};
