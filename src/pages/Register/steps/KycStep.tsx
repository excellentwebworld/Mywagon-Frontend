import React, { useRef } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

type KycStepProps = {
  vat: string;
  certificate: File | null;
  onVat: (v: string) => void;
  onCertificate: (file: File | null) => void;
  onSoftVerifyVat: () => void;
  vatHint: string | null;
  vatChecking?: boolean;
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
  onSoftVerifyVat,
  vatHint,
  vatChecking,
  errors,
  disabled,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const laravelBase = (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  const sampleDocUrl = laravelBase ? `${laravelBase}/sample_documents/sample_documents.pdf` : '';

  return (
    <div className="shipper-register-step">
      <p className="shipper-register-kyc-blurb">
        {t(
          'registerKycBlurb',
          'If you wish to book loads on MYVAGON, you need to get verified. Being verified builds trust and increases your chances of getting business.'
        )}
      </p>

      <div className="shipper-login-field">
        <label htmlFor="register-vat">{t('registerVat', 'Company V.A.T Number')}</label>
        <div className="shipper-register-vat-row">
          <input
            id="register-vat"
            className="shipper-login-control"
            value={vat}
            disabled={disabled}
            maxLength={16}
            onChange={(e) => onVat(e.target.value)}
            onBlur={() => void onSoftVerifyVat()}
            placeholder={t('registerVatPlaceholder', 'Company V.A.T Number')}
          />
          <button
            type="button"
            className="shipper-register-back-btn"
            disabled={disabled || vatChecking || vat.trim().length < 2}
            onClick={() => void onSoftVerifyVat()}
          >
            {vatChecking ? t('registerWorking', 'Please wait…') : t('registerVatVerify', 'Verify')}
          </button>
        </div>
        {errors.kyc_vat_number_shipper && (
          <p className="shipper-login-field-error" role="alert">
            {errors.kyc_vat_number_shipper}
          </p>
        )}
        {!errors.kyc_vat_number_shipper && vatHint && (
          <p className="shipper-register-field-hint">{vatHint}</p>
        )}
      </div>

      <div className="shipper-login-field">
        <label htmlFor="register-certificate">{t('registerCert', 'Certificate')}</label>
        <p className="shipper-register-field-hint" style={{ marginBottom: 8 }}>
          {t('registerCertHint', 'PDF, JPG, or PNG · max 2MB')}
        </p>
        <input
          ref={inputRef}
          id="register-certificate"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          disabled={disabled}
          className="shipper-register-file-input"
          onChange={(e) => onCertificate(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="shipper-register-file-btn"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {certificate
            ? certificate.name
            : t('registerCertUpload', 'Upload Certificate')}
        </button>
        {errors.shipper_certificate && (
          <p className="shipper-login-field-error" role="alert">
            {errors.shipper_certificate}
          </p>
        )}
        {sampleDocUrl && (
          <a
            href={sampleDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shipper-register-sample-link"
          >
            {t('registerCertInstructions', 'Instructions to Retrieve Certificate')}
          </a>
        )}
      </div>
    </div>
  );
};
