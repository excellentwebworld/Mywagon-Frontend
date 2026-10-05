/**
 * KycSection — PDS-937: VAT number + government certificate only.
 * Live parity with Laravel Blade shipper profile KYC tab.
 * GET/POST /api/shipper/v1/settings/kyc
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  AlertTriangle, CheckCircle, Clock, Eye, FileText, Upload, XCircle,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { useAuth } from '../../../context/AuthContext';
import { useShipperPermission } from '../../../hooks/useShipperPermission';
import { ACTION_RBAC } from '../../../utils/shipperRbacMap';
import { kycSettingsService } from '../../../api/services/kycSettingsService';
import { formatUtcToDisplayDateTime } from '../../../utils/timezone';

const STATUS_STYLE = {
  accepted: {
    Icon: CheckCircle,
    light: { color: '#047857', bg: '#ECFDF5', border: '#A7F3D0', msg: '#065F46', meta: '#047857' },
    dark: {
      color: '#34D399',
      bg: 'rgba(16, 185, 129, 0.14)',
      border: 'rgba(52, 211, 153, 0.35)',
      msg: '#A7F3D0',
      meta: '#6EE7B7',
    },
  },
  pending: {
    Icon: Clock,
    light: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', msg: '#92400E', meta: '#B45309' },
    dark: {
      color: '#FBBF24',
      bg: 'rgba(245, 158, 11, 0.14)',
      border: 'rgba(251, 191, 36, 0.4)',
      msg: '#FDE68A',
      meta: '#FCD34D',
    },
  },
  rejected: {
    Icon: XCircle,
    light: { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', msg: '#991B1B', meta: '#B91C1C' },
    dark: {
      color: '#F87171',
      bg: 'rgba(239, 68, 68, 0.14)',
      border: 'rgba(248, 113, 113, 0.35)',
      msg: '#FECACA',
      meta: '#FCA5A5',
    },
  },
  not_started: {
    Icon: AlertTriangle,
    light: { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', msg: '#4B5563', meta: '#6B7280' },
    dark: {
      color: '#A3A2B8',
      bg: 'rgba(163, 162, 184, 0.12)',
      border: 'rgba(163, 162, 184, 0.28)',
      msg: '#C9C8D6',
      meta: '#A3A2B8',
    },
  },
};

/** VAT numbers may include a country prefix (e.g. EL) + digits — letters/digits only. Max 16 (register parity). */
const VAT_MAX_LENGTH = 16;
const sanitizeVat = (value) => String(value || '').replace(/[^A-Za-z0-9]/g, '').slice(0, VAT_MAX_LENGTH);

export default function KycSection({ onStatusChange }) {
  const { t } = useTranslation();
  const { T, isDark } = useTheme();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const { canAction, requirePermission: requireRbac } = useShipperPermission();
  const fileRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [data, setData] = useState(null);
  const [vatNumber, setVatNumber] = useState('');
  const [vatError, setVatError] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const applyPayload = useCallback((payload) => {
    setData(payload);
    setVatNumber(sanitizeVat(payload.vat_number || ''));
    setVatError('');
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
  const statusDef = STATUS_STYLE[status] || STATUS_STYLE.not_started;
  const style = isDark ? statusDef.dark : statusDef.light;
  const StatusIcon = statusDef.Icon;
  const canEdit = Boolean(data?.can_edit) && canAction('editCompanyInfo');

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
    if (!requireRbac(ACTION_RBAC.editCompanyInfo)) return;
    const vat = sanitizeVat(vatNumber);
    if (!vat || vat.length < 2) {
      setVatError(t('compliance.kyc.vatRequired'));
      toast.error(t('compliance.kyc.vatRequired'));
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(vat)) {
      setVatError(t('compliance.kyc.vatInvalid'));
      toast.error(t('compliance.kyc.vatInvalid'));
      return;
    }
    if (!data?.certificate?.url && !file) {
      toast.error(t('compliance.kyc.certRequired'));
      return;
    }

    setVatError('');
    setSaving(true);
    try {
      const payload = await kycSettingsService.submit(vat, file);
      applyPayload(payload);
      toast.success(t('compliance.kyc.submitSuccess'));
      await refreshUser().catch(() => {});
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
          <div style={{ fontSize: 12, color: style.msg, marginTop: 2 }}>
            {status === 'accepted' && t('compliance.kyc.msg.accepted')}
            {status === 'pending' && t('compliance.kyc.msg.pending')}
            {status === 'rejected' && t('compliance.kyc.msg.rejected')}
            {status === 'not_started' && t('compliance.kyc.msg.notStarted')}
          </div>
          {status === 'rejected' && data.kyc_current_rejected_reason && (
            <p
              className="mt-2 px-3 py-2 rounded-lg"
              style={{
                fontSize: 12,
                background: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fff',
                color: isDark ? '#FECACA' : '#991B1B',
                border: isDark ? '1px solid rgba(248, 113, 113, 0.3)' : 'none',
              }}
            >
              {data.kyc_current_rejected_reason}
            </p>
          )}
          {data.kyc_update_date_time && (
            <div style={{ fontSize: 11, color: style.meta, marginTop: 6, opacity: 0.9 }}>
              {t('compliance.kyc.lastUpdated')}: {formatUtcToDisplayDateTime(data.kyc_update_date_time) || data.kyc_update_date_time}
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
            onChange={(e) => {
              setVatNumber(sanitizeVat(e.target.value));
              if (vatError) setVatError('');
            }}
            disabled={!canEdit || saving}
            maxLength={VAT_MAX_LENGTH}
            inputMode="text"
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg outline-none"
            style={{
              border: `1px solid ${vatError ? '#EF4444' : T.bd}`,
              background: canEdit ? T.sf : T.sa,
              color: T.t1,
              fontSize: 13,
              opacity: canEdit ? 1 : 0.85,
            }}
            placeholder={t('compliance.kyc.vatPlaceholder')}
            aria-invalid={Boolean(vatError)}
          />
          {vatError && (
            <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{vatError}</div>
          )}
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
              <div style={{ fontSize: 10, color: T.t3, marginTop: 6 }}>{t('Settings.pdf_jpg_png_webp_max_5mb', 'PDF, JPG, PNG, WEBP · Max 5MB')}</div>
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
          <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 12, color: T.t2, border: `1px solid ${T.bd}` }}>
            {t('compliance.kyc.msg.pendingLocked')}
          </div>
        ) : status === 'accepted' ? (
          <div className="px-3 py-2 rounded-lg" style={{ background: T.sa, fontSize: 12, color: T.t2, border: `1px solid ${T.bd}` }}>
            {t('compliance.kyc.msg.acceptedLocked')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
