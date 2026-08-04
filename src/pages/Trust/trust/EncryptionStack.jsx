/**
 * EncryptionStack — from /settings/trust.
 */

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { CheckCircle } from 'lucide-react';

export default function EncryptionStack({ data }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';
  const rows = data?.encryption || [];

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 16 }}>
        {t('trust.encryption.title')}
      </h2>

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
        <div className="grid grid-cols-3 px-5 py-3" style={{ background: T.sa, borderBottom: `1px solid ${T.bd}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('trust.encryption.layer')}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('trust.encryption.technology')}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
            {t('trust.encryption.status')}
          </span>
        </div>

        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-3 items-center px-5 py-3"
            style={{ background: i % 2 === 0 ? T.sf : T.sh, borderBottom: i < rows.length - 1 ? `1px solid ${T.bd}` : 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: T.t1 }}>
              {row.layer[lang] || row.layer.en}
            </span>
            <code style={{ fontSize: 12, color: T.t2 }}>{row.technology}</code>
            <div className="flex items-center justify-end gap-1.5">
              <CheckCircle size={14} style={{ color: '#10B981' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>
                {t('trust.encryption.active')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
