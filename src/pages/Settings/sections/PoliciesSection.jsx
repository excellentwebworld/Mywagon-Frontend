/**
 * PoliciesSection — PDS-937: Privacy Policy + Terms & Conditions only.
 * Live CMS content from Laravel SystemConfigs (Blade parity).
 * GET /api/shipper/v1/settings/policies
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Eye, FileText, Shield, X } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { policiesSettingsService } from '../../../api/services/policiesSettingsService';

const ICONS = {
  privacy: Shield,
  tos: FileText,
};

export default function PoliciesSection({ onPendingChange }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [viewing, setViewing] = useState(null);

  const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const data = await policiesSettingsService.list(lang);
      setPolicies(data.policies || []);
      // Policies are informational (legacy has no acceptance tracking).
      onPendingChange?.(0);
    } catch (e) {
      setPolicies([]);
      setLoadFailed(true);
      toast.error(e instanceof Error ? e.message : t('compliance.pol.loadError'));
    } finally {
      setLoading(false);
    }
  }, [lang, onPendingChange, toast, t]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const titleFor = (policy) => {
    if (policy.title_key === 'privacy') return t('compliance.pol.types.privacy');
    if (policy.title_key === 'tos') return t('compliance.pol.types.tos');
    return policy.title || policy.id;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton height={28} width={160} />
        <Skeleton height={72} />
        <Skeleton height={72} />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <p style={{ fontSize: 13, color: T.t2, marginBottom: 12 }}>{t('compliance.pol.loadError')}</p>
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
    <div>
      <h2 className="font-bold" style={{ fontSize: 18, color: T.t1 }}>{t('compliance.pol.title')}</h2>
      <p style={{ fontSize: 13, color: T.t3, marginTop: 4, marginBottom: 16 }}>
        {t('compliance.pol.subtitle')}
      </p>

      <div className="space-y-3">
        {policies.map((policy) => {
          const Icon = ICONS[policy.title_key] || FileText;
          return (
            <div
              key={policy.id}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
              style={{ background: T.sf, border: `1px solid ${T.bd}` }}
            >
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{ width: 40, height: 40, background: T.al, color: T.ac }}
              >
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" style={{ fontSize: 14, color: T.t1 }}>
                  {titleFor(policy)}
                </div>
                <div style={{ fontSize: 11, color: T.t3 }}>
                  {policy.updated_at
                    ? `${t('compliance.pol.updated')}: ${new Date(policy.updated_at).toLocaleDateString()}`
                    : t('compliance.pol.cmsManaged')}
                </div>
              </div>
              <button
                type="button"
                disabled={!policy.available}
                onClick={() => setViewing(policy)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer border-none font-semibold shrink-0"
                style={{
                  background: policy.available ? T.al : T.sa,
                  color: policy.available ? T.ac : T.t3,
                  fontSize: 12,
                  opacity: policy.available ? 1 : 0.6,
                }}
              >
                <Eye size={13} /> {t('compliance.pol.view')}
              </button>
            </div>
          );
        })}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div
            className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col"
            style={{ background: T.sf, border: `1px solid ${T.bd}` }}
          >
            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{titleFor(viewing)}</h3>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="p-1.5 rounded-lg cursor-pointer border-none"
                style={{ background: T.sa, color: T.t2 }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex-1 prose-sm" style={{ color: T.t1, fontSize: 13, lineHeight: 1.65 }}>
              {viewing.html ? (
                <div dangerouslySetInnerHTML={{ __html: viewing.html }} />
              ) : (
                <p style={{ color: T.t3 }}>{t('compliance.pol.empty')}</p>
              )}
            </div>
            <div className="px-5 py-3 shrink-0 flex justify-end" style={{ borderTop: `1px solid ${T.bd}` }}>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold"
                style={{ background: T.ac, color: '#fff', fontSize: 12 }}
              >
                {t('common.close', { defaultValue: 'Close' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
