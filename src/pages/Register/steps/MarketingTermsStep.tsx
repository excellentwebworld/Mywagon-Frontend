import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { HEAR_ABOUT_OPTIONS } from '../signupDraft';
import { privacyUrl, resolvePrivacyUrl, resolveTermsUrl, termsUrl } from '../registerConstants';

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
  links?: Record<string, string | undefined> | null;
  termsUrl?: string;
  privacyUrl?: string;
  onOpenLegal?: (doc: 'terms' | 'privacy') => void;
};

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
  links,
  termsUrl: termsUrlProp,
  privacyUrl: privacyUrlProp,
  onOpenLegal,
}) => {
  const { t } = useTranslation();
  const resolvedTerms = termsUrlProp || resolveTermsUrl(links, lang, 'shipper');
  const resolvedPrivacy = privacyUrlProp || resolvePrivacyUrl(links, lang, 'shipper');

  return (
    <>
      <div className="reg-field" data-reg-field="hear_about_us_shipper">
        <select
          id="register-hear-about"
          className="reg-select"
          value={hearAbout}
          disabled={disabled}
          onChange={(e) => onChange({ hear_about_us_shipper: e.target.value })}
          aria-label={t('registerHearAbout', 'How did you hear about us?')}
        >
          <option value="">{`${t('registerHearAboutPlaceholder', 'How did you hear about us?')}*`}</option>
          {HEAR_ABOUT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`registerHearAbout_${opt.replace(/[^a-zA-Z]/g, '_')}`, opt)}
            </option>
          ))}
        </select>
        {errors.hear_about_us_shipper && (
          <p className="reg-error" role="alert">
            {errors.hear_about_us_shipper}
          </p>
        )}
      </div>

      {hearAbout === 'Other' && (
        <div className="reg-field" data-reg-field="hear_about_us_other_shipper">
          <input
            id="register-hear-other"
            className="reg-input"
            value={hearAboutOther}
            disabled={disabled}
            maxLength={35}
            onChange={(e) => onChange({ hear_about_us_other_shipper: e.target.value })}
            placeholder={`${t('registerHearAboutOther', 'Please specify')}*`}
            aria-label={t('registerHearAboutOther', 'Please specify')}
          />
          {errors.hear_about_us_other_shipper && (
            <p className="reg-error" role="alert">
              {errors.hear_about_us_other_shipper}
            </p>
          )}
        </div>
      )}

      <div className="reg-field" data-reg-field="referral_code">
        <input
          id="register-referral"
          className="reg-input"
          value={referralCode}
          disabled={disabled}
          maxLength={35}
          onChange={(e) => onChange({ referral_code: e.target.value })}
          placeholder={t('registerReferralPlaceholder', 'Referral Code (optional)')}
          aria-label={t('registerReferral', 'Referral Code')}
        />
        {errors.referral_code && (
          <p className="reg-error" role="alert">
            {errors.referral_code}
          </p>
        )}
      </div>

      {includeTerms && (
        <div className="reg-terms-wrap" data-reg-field="terms">
          <div className="reg-terms">
            <input
              type="checkbox"
              id="register-terms-inline"
              checked={terms}
              disabled={disabled}
              onChange={(e) => onChange({ terms: e.target.checked })}
            />
            <label htmlFor="register-terms-inline">
              {t('registerTermsPrefix', 'I agree to the')}{' '}
              <a
                href={resolvedTerms}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (onOpenLegal) {
                    e.preventDefault();
                    onOpenLegal('terms');
                  }
                }}
              >
                {t('registerTermsLink', 'Terms & conditions')}
              </a>{' '}
              {t('registerTermsAnd', 'and')}{' '}
              <a
                href={resolvedPrivacy}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (onOpenLegal) {
                    e.preventDefault();
                    onOpenLegal('privacy');
                  }
                }}
              >
                {t('registerPrivacyLink', 'Privacy policy')}
              </a>
            </label>
          </div>
          {errors.terms && (
            <p className="reg-error reg-terms-error" role="alert">
              {errors.terms}
            </p>
          )}
        </div>
      )}
    </>
  );
};

export function RegisterTermsCheckbox({
  terms,
  lang,
  onChange,
  error,
  disabled,
  links,
  termsUrl: termsUrlProp,
  privacyUrl: privacyUrlProp,
  onOpenLegal,
}: {
  terms: boolean;
  lang: 'en' | 'el';
  onChange: (terms: boolean) => void;
  error?: string;
  disabled?: boolean;
  links?: Record<string, string | undefined> | null;
  termsUrl?: string;
  privacyUrl?: string;
  onOpenLegal?: (doc: 'terms' | 'privacy') => void;
}) {
  const { t } = useTranslation();
  const resolvedTerms = termsUrlProp || resolveTermsUrl(links, lang, 'shipper');
  const resolvedPrivacy = privacyUrlProp || resolvePrivacyUrl(links, lang, 'shipper');

  return (
    <div className="reg-terms-wrap" data-reg-field="terms">
      <div className="reg-terms">
        <input
          type="checkbox"
          id="register-terms"
          checked={terms}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor="register-terms">
          {t(
            'registerTermsDeclare',
            'I declare that I am authorized to legally bind the company I represent and accept the MYVAGON'
          )}{' '}
          <a
            href={resolvedTerms}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (onOpenLegal) {
                e.preventDefault();
                onOpenLegal('terms');
              }
            }}
          >
            {t('registerTermsLink', 'Terms & conditions')}
          </a>{' '}
          {t('registerTermsAnd', 'and')}{' '}
          <a
            href={resolvedPrivacy}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (onOpenLegal) {
                e.preventDefault();
                onOpenLegal('privacy');
              }
            }}
          >
            {t('registerPrivacyLink', 'Privacy policy')}
          </a>{' '}
          {t('registerTermsOnBehalf', 'on its behalf.')}
        </label>
      </div>
      {error && (
        <p className="reg-error reg-terms-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
