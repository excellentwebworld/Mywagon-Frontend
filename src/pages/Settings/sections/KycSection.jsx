/**
 * KycSection — PDS-937: VAT number + government certificate only.
 * Live parity with Laravel Blade shipper profile KYC tab.
 * GET/POST /api/shipper/v1/settings/kyc
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  AlertTriangle, CheckCircle, Clock, Eye, FileText, Upload, XCircle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { kycSettingsService } from '../../../api/services/kycSettingsService';

const STATUS_STYLE = {
  accepted: { color: '#047857', bg: '#ECFDF5', border: '#A7F3D0', Icon: CheckCircle },
  pending: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', Icon: Clock },
  rejected: { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', Icon: XCircle },
  not_started: { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', Icon: AlertTriangle },
};

export default function KycSection({ onStatusChange }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [data, setData] = useState(null);
  const [vatNumber, setVatNumber] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const applyPayload = useCallback((payload) => {
    setData(payload);
    setVatNumber(payload.vat_number || '');
    setFile(null);
    setFileError('');
    onStatusChange?.(payload);
  }, [onStatusChange]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const payload = await kycSettingsService.get();
      applyPayload(payload);
    } catch (e) {
      setLoadFailed(true);
      setData(null);
      toast.error(e instanceof Error ? e.message : t('compliance.kyc.loadError'));
    } finally {
      setLoading(false);
    }
  }, [applyPayload, toast, t]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = data?.kyc_status || 'not_started';
  const style = STATUS_STYLE[status] || STATUS_STYLE.not_started;
  const StatusIcon = style.Icon;
  const canEdit = Boolean(data?.can_edit);

  const onFileChange = (e) => {
    const next = e.target.files?.[0];
    if (!next) return;
    if (next.size > 5 * 1024 * 1024) {
      setFileError(t('compliance.kyc.fileTooLarge'));
      setFile(null);
      return;
    }
    setFileError('');
    setFile(next);
  };

  const submit = async () => {
    if (!vatNumber.trim() || vatNumber.trim().length < 2) {
      toast.error(t('compliance.kyc.vatRequired'));
      return;
    }
    if (!data?.certificate?.url && !file) {
      toast.error(t('compliance.kyc.certRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = await kycSettingsService.submit(vatNumber.trim(), file);
      applyPayload(payload);
      toast.success(t('compliance.kyc.submitSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('compliance.kyc.submitError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton height={28} width={180} />
        <Skeleton height={120} />
        <Skeleton height={220} />
      </div>
    );
  }

  if (loadFailed || !data) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <p style={{ fontSize: 13, color: T.t2, marginBottom: 12 }}>{t('compliance.kyc.loadError')}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
          style={{ background: T.ac, color: '#fff', fontSize: 12 }}
        >
          {t('common.retry', { defaultValue: 'Retry' })}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold" style={{ fontSize: 18, color: T.t1 }}>{t('compliance.kyc.title')}</h2>
        <p style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>{t('compliance.kyc.subtitle')}</p>
      </div>

      {/* Status banner */}
      <div
        className="rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ background: style.bg, border: `1px solid ${style.border}` }}
      >
        <StatusIcon size={18} style={{ color: style.color, marginTop: 2 }} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold" style={{ fontSize: 13, color: style.color }}>
            {t(`compliance.kyc.status.${status === 'not_started' ? 'notStarted' : status}`, {
              defaultValue: status,
            })}
          </div>
          <div style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>
            {status === 'accepted' && t('compliance.kyc.msg.accepted')}
            {status === 'pending' && t('compliance.kyc.msg.pending')}
            {status === 'rejected' && t('compliance.kyc.msg.rejected')}
            {status === 'not_started' && t('compliance.kyc.msg.notStarted')}
          </div>
          {status === 'rejected' && data.kyc_current_rejected_reason && (
            <p className="mt-2 px-3 py-2 rounded-lg" style={{ fontSize: 12, background: '#fff', color: '#991B1B' }}>
              {data.kyc_current_rejected_reason}
            </p>
          )}
          {data.kyc_update_date_time && (
            <div style={{ fontSize: 11, color: T.t3, marginTop: 6 }}>
              {t('compliance.kyc.lastUpdated')}: {new Date(data.kyc_update_date_time).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-xl p-5 space-y-5" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div>
          <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
            {t('compliance.kyc.vatLabel')} <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            disabled={!canEdit || saving}
            maxLength={15}
            className="w-full px-3 py-2.5 rounded-lg outline-none"
            style={{
              border: `1px solid ${T.bd}`,
              background: canEdit ? T.sf : T.sa,
              color: T.t1,
              fontSize: 13,
              opacity: canEdit ? 1 : 0.85,
            }}
            placeholder={t('compliance.kyc.vatPlaceholder')}
          />
        </div>

        <div>
          <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>
            {t('compliance.kyc.certLabel')} <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <p style={{ fontSize: 11, color: T.t3, marginBottom: 10 }}>{t('compliance.kyc.certHint')}</p>

          {data.certificate?.url && (
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3"
              style={{ background: T.sa, border: `1px solid ${T.bd}` }}
            >
              <FileText size={16} style={{ color: T.ac }} />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium" style={{ fontSize: 12, color: T.t1 }}>
                  {data.certificate.file_name || t('compliance.kyc.uploadedCert')}
                </div>
              </div>
              <a
                href={data.certificate.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg no-underline"
                style={{ fontSize: 11, fontWeight: 600, color: T.ac, background: T.al }}
              >
                <Eye size={12} /> {t('compliance.kyc.viewCert')}
              </a>
            </div>
          )}

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full px-4 py-6 rounded-xl cursor-pointer border-none"
                style={{ border: `2px dashed ${T.bd}`, background: T.sa, color: T.t2 }}
              >
                <Upload size={18} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  {file ? file.name : t('compliance.kyc.dragDrop')}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={onFileChange}
              />
              <div style={{ fontSize: 10, color: T.t3, marginTop: 6 }}>PDF, JPG, PNG, WEBP · Max 5MB</div>
              {fileError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{fileError}</div>}
            </>
          )}
        </div>

        {canEdit ? (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg cursor-pointer border-none font-semibold"
            style={{ background: T.ac, color: '#fff', fontSize: 13, opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? t('common.saving', { defaultValue: 'Saving…' })
              : status === 'rejected'
                ? t('compliance.kyc.resubmit')
                : t('compliance.kyc.submit')}
          </button>
        ) : status === 'pending' ? (
          <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 12, color: T.t3 }}>
            {t('compliance.kyc.msg.pendingLocked')}
          </div>
        ) : status === 'accepted' ? (
          <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 12, color: T.t3 }}>
            {t('compliance.kyc.msg.acceptedLocked')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
