import React, { useRef } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { localSampleDocUrl } from '../registerConstants';

type KycStepProps = {
  vat: string;
  certificate: File | null;
  onVat: (v: string) => void;
  onCertificate: (file: File | null) => void;
  errors: {
    kyc_vat_number_shipper?: string;
    shipper_certificate?: string;
  };
  disabled?: boolean;
};

export const KycStep: React.FC<KycStepProps> = ({
  vat,
  certificate,
  onVat,
  onCertificate,
  errors,
  disabled,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const sampleUrl = localSampleDocUrl();

  return (
    <>
      <p className="reg-kyc-hint">
        {t(
          'registerKycBlurb',
          'If you wish to book loads on MYVAGON, you need to get verified. Being verified builds trust and increases your chances of getting business.'
        )}
      </p>

      <div className="reg-field" data-reg-field="kyc_vat_number_shipper">
        <input
          id="register-vat"
          className="reg-input"
          value={vat}
          disabled={disabled}
          maxLength={16}
          onChange={(e) => onVat(e.target.value)}
          placeholder={`${t('registerVat', 'Company V.A.T Number')}*`}
          aria-label={t('registerVat', 'Company V.A.T Number')}
        />
        {errors.kyc_vat_number_shipper && (
          <p className="reg-error" role="alert">
            {errors.kyc_vat_number_shipper}
          </p>
        )}
      </div>

      <div className="reg-field" data-reg-field="shipper_certificate">
        <label className="reg-label" htmlFor="register-certificate-display">
          {t('registerCert', 'Certificate')}*
        </label>
        <div className="reg-cert-row">
          <input
            ref={inputRef}
            id="register-certificate"
            type="file"
            className="reg-file-hidden"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png,image/*"
            disabled={disabled}
            onChange={(e) => onCertificate(e.target.files?.[0] ?? null)}
          />
          <input
            id="register-certificate-display"
            className="reg-input reg-cert-display"
            type="text"
            readOnly
            disabled={disabled}
            value={certificate?.name ?? ''}
            placeholder={t('registerCertUpload', 'Upload Certificate')}
            onClick={() => {
              if (!disabled) inputRef.current?.click();
            }}
          />
          <button
            type="button"
            className="reg-cert-browse"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {t('registerCertBrowse', 'Browse')}
          </button>
        </div>
        {errors.shipper_certificate && (
          <p className="reg-error" role="alert">
            {errors.shipper_certificate}
          </p>
        )}
        <a
          href={sampleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="reg-link"
        >
          {t('registerCertInstructions', 'Instructions to Retrieve Certificate')}
        </a>
      </div>
    </>
  );
};
