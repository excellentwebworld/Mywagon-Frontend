/**
 * SecurityPillars — from /settings/trust.
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { CheckCircle, Lock, ShieldCheck, Shield, ClipboardList, Eye, Code } from 'lucide-react';

const ICON_MAP = { Lock, ShieldCheck, Shield, ClipboardList, Eye, Code };

export default function SecurityPillars({ data }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';
  const pillars = data?.pillars || [];

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 16 }}>
        {t('trust.pillars.title')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pillars.map((p) => {
          const Icon = ICON_MAP[p.icon] || Shield;
          const statusLabel = p.status_label || p.statusLabel;
          return (
            <div key={p.id} className="rounded-xl p-5 flex flex-col transition-all duration-200"
              style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center rounded-lg"
                  style={{ width: 40, height: 40, background: `${T.ac}14` }}>
                  <Icon size={20} style={{ color: T.ac }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>
                  {p.title[lang] || p.title.en}
                </h3>
              </div>
              <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.55, flex: 1, marginBottom: 12 }}>
                {p.description[lang] || p.description.en}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(p.tags || []).map((tag) => (
                    <span key={tag} className="rounded-md px-2 py-0.5"
                      style={{ fontSize: 10, fontFamily: 'monospace', color: T.t3, border: `1px solid ${T.bd}`, background: T.sa }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle size={13} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>
                    {statusLabel?.[lang] || statusLabel?.en}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
