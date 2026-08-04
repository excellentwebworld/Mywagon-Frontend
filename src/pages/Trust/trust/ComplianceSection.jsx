/**
 * ComplianceSection — from /settings/trust.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import {
  CheckCircle, Clock, Flag, HardDrive, Globe,
  RefreshCw, Building2, LockKeyhole, ChevronDown,
} from 'lucide-react';

const ICON_MAP = { Flag, HardDrive, Globe, RefreshCw, Building2, LockKeyhole };

export default function ComplianceSection({ data }) {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';
  const [expanded, setExpanded] = useState({});
  const certifications = data?.certifications || [];
  const details = data?.compliance_details || [];

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 16 }}>
        {t('trust.compliance.title')}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {certifications.map((cert) => {
          const isCompliant = cert.status === 'compliant';
          return (
            <div key={cert.name} className="rounded-xl p-4 flex flex-col items-center gap-2 text-center"
              style={{ background: T.sf, border: `1px solid ${T.bd}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isCompliant ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: T.t1, marginTop: 4 }}>{cert.name}</span>
              {cert.via && (
                <span style={{ fontSize: 10, color: T.t3 }}>{t('trust.compliance.via')} {cert.via}</span>
              )}
              <span style={{ fontSize: 11, color: T.t2 }}>
                {cert.description[lang] || cert.description.en}
              </span>
              <div className="flex items-center gap-1 mt-1">
                {isCompliant ? (
                  <>
                    <CheckCircle size={14} style={{ color: '#10B981' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>{t('trust.compliance.compliant')}</span>
                  </>
                ) : (
                  <>
                    <Clock size={14} style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#F59E0B' }}>{t('trust.compliance.comingSoon')}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {details.map((detail) => {
          const Icon = ICON_MAP[detail.icon] || Flag;
          const isOpen = expanded[detail.id];
          return (
            <div key={detail.id} className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer border-none text-left"
                style={{ background: 'transparent' }}
                onClick={() => toggleExpand(detail.id)}
              >
                <Icon size={16} style={{ color: T.ac }} />
                <span className="flex-1 font-semibold" style={{ fontSize: 13, color: T.t1 }}>
                  {detail.title[lang] || detail.title.en}
                </span>
                <ChevronDown size={16} style={{ color: T.t3, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4" style={{ borderTop: `1px solid ${T.bd}` }}>
                  <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.55, marginTop: 10 }}>
                    {detail.description[lang] || detail.description.en}
                  </p>
                </div>
              )}
              {!isOpen && (
                <div className="px-4 pb-3 hidden md:block">
                  <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.55, margin: 0 }}>
                    {detail.description[lang] || detail.description.en}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
