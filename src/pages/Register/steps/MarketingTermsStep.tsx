import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { HEAR_ABOUT_OPTIONS } from '../signupDraft';

type MarketingTermsStepProps = {
  hearAbout: string;
  hearAboutOther: string;
  referralCode: string;
  terms: boolean;
  lang: 'en' | 'el';
  onChange: (patch: {
    hear_about_us_shipper?: string;
    hear_about_us_other_shipper?: string;
    referral_code?: string;
    terms?: boolean;
  }) => void;
  errors: {
    hear_about_us_shipper?: string;
    hear_about_us_other_shipper?: string;
    referral_code?: string;
    terms?: string;
  };
  disabled?: boolean;
  /** When false, only hear-about + referral fields are rendered (terms shown elsewhere). */
  includeTerms?: boolean;
};

function policyUrl(kind: 'terms' | 'privacy', lang: string): string {
  const base = (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (!base) return '#';
  if (kind === 'terms') {
    return `${base}/terms-condition/terms_and_conditions/shipper/${lang}`;
  }
  return `${base}/privacy-policy/privacy_policy/shipper/${lang}`;
}

export const MarketingTermsStep: React.FC<MarketingTermsStepProps> = ({
  hearAbout,
  hearAboutOther,
  referralCode,
  terms,
  lang,
  onChange,
  errors,
  disabled,
  includeTerms = true,
}) => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step">
      <div className="shipper-login-field">
        <label htmlFor="register-hear-about">{t('registerHearAbout', 'How did you hear about us?')}</label>
        <select
          id="register-hear-about"
          className="shipper-login-control"
          value={hearAbout}
          disabled={disabled}
          onChange={(e) => onChange({ hear_about_us_shipper: e.target.value })}
        >
          <option value="">{t('registerHearAboutPlaceholder', 'How did you hear about us?')}</option>
          {HEAR_ABOUT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`registerHearAbout_${opt.replace(/[^a-zA-Z]/g, '_')}`, opt)}
            </option>
          ))}
        </select>
        {errors.hear_about_us_shipper && (
          <p className="shipper-login-field-error" role="alert">
            {errors.hear_about_us_shipper}
          </p>
        )}
      </div>

      {hearAbout === 'Other' && (
        <div className="shipper-login-field">
          <label htmlFor="register-hear-other">{t('registerHearAboutOther', 'Please specify')}</label>
          <input
            id="register-hear-other"
            className="shipper-login-control"
            value={hearAboutOther}
            disabled={disabled}
            maxLength={35}
            onChange={(e) => onChange({ hear_about_us_other_shipper: e.target.value })}
            placeholder={t('registerHearAboutOtherPlaceholder', 'Please specify')}
          />
          {errors.hear_about_us_other_shipper && (
            <p className="shipper-login-field-error" role="alert">
              {errors.hear_about_us_other_shipper}
            </p>
          )}
        </div>
      )}

      <div className="shipper-login-field">
        <label htmlFor="register-referral">{t('registerReferral', 'Referral Code')}</label>
        <input
          id="register-referral"
          className="shipper-login-control"
          value={referralCode}
          disabled={disabled}
          maxLength={35}
          onChange={(e) => onChange({ referral_code: e.target.value })}
          placeholder={t('registerReferralPlaceholder', 'Referral Code (optional)')}
        />
        {errors.referral_code && (
          <p className="shipper-login-field-error" role="alert">
            {errors.referral_code}
          </p>
        )}
      </div>

      {includeTerms && (
        <div className="shipper-register-terms">
          <label className="shipper-register-terms-label">
            <input
              type="checkbox"
              checked={terms}
              disabled={disabled}
              onChange={(e) => onChange({ terms: e.target.checked })}
            />
            <span>
              {t('registerTermsPrefix', 'I agree to the')}{' '}
              <a href={policyUrl('terms', lang)} target="_blank" rel="noopener noreferrer">
                {t('registerTermsLink', 'Terms & conditions')}
              </a>{' '}
              {t('registerTermsAnd', 'and')}{' '}
              <a href={policyUrl('privacy', lang)} target="_blank" rel="noopener noreferrer">
                {t('registerPrivacyLink', 'Privacy policy')}
              </a>
            </span>
          </label>
          {errors.terms && (
            <p className="shipper-login-field-error" role="alert">
              {errors.terms}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export function RegisterTermsCheckbox({
  terms,
  lang,
  onChange,
  error,
  disabled,
}: {
  terms: boolean;
  lang: 'en' | 'el';
  onChange: (terms: boolean) => void;
  error?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="shipper-register-terms">
      <label className="shipper-register-terms-label">
        <input
          type="checkbox"
          checked={terms}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          {t(
            'registerTermsDeclare',
            'I declare that I am authorized to legally bind the company I represent and accept the MYVAGON'
          )}{' '}
          <a href={policyUrl('terms', lang)} target="_blank" rel="noopener noreferrer">
            {t('registerTermsLink', 'Terms & conditions')}
          </a>{' '}
          {t('registerTermsAnd', 'and')}{' '}
          <a href={policyUrl('privacy', lang)} target="_blank" rel="noopener noreferrer">
            {t('registerPrivacyLink', 'Privacy policy')}
          </a>{' '}
          {t('registerTermsOnBehalf', 'on its behalf.')}
        </span>
      </label>
      {error && (
        <p className="shipper-login-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
