/**
 * ComplianceSection — Standards & Compliance.
 *
 * Top row: 4 certification badge cards (GDPR, ISO 27001, SOC 2, eIDAS).
 * Below: 6 detail rows with icon + title + description, collapsible on mobile.
 *
 * Used by: TrustCenterPage
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import {
  CheckCircle, Clock, Flag, HardDrive, Globe,
  RefreshCw, Building2, LockKeyhole, ChevronDown,
} from 'lucide-react';
import { CERTIFICATIONS, COMPLIANCE_DETAILS } from '../../../mocks/trustData';

const ICON_MAP = { Flag, HardDrive, Globe, RefreshCw, Building2, LockKeyhole };

export default function ComplianceSection() {
  const { t, i18n } = useTranslation();
  const { T } = useTheme();
  const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.t1, marginBottom: 16 }}>
        {t('trust.compliance.title')}
      </h2>

      {/* Certification badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {CERTIFICATIONS.map(cert => {
          const isCompliant = cert.status === 'compliant';
          return (
            <div key={cert.name} className="rounded-xl p-4 flex flex-col items-center gap-2 text-center"
              style={{
                background: T.sf,
                border: `1px solid ${T.bd}`,
                position: 'relative',
                overflow: 'hidden',
              }}>
              {/* subtle gradient border accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isCompliant ? 'linear-gradient(90deg, #10B981, #34D399)' : 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} />

              <span style={{ fontSize: 16, fontWeight: 700, color: T.t1, marginTop: 4 }}>
                {cert.name}
              </span>
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981' }}>
                      {t('trust.compliance.compliant')}
                    </span>
                  </>
                ) : (
                  <>
                    <Clock size={14} style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#F59E0B' }}>
                      {t('trust.compliance.comingSoon')}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compliance detail rows */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.bd}` }}>
        {COMPLIANCE_DETAILS.map((detail, i) => {
          const Icon = ICON_MAP[detail.icon] || Flag;
          const isOpen = expanded[detail.id] !== false; // default open on desktop
          return (
            <div key={detail.id}
              style={{ borderBottom: i < COMPLIANCE_DETAILS.length - 1 ? `1px solid ${T.bd}` : 'none', background: T.sf }}>
              <button
                className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer border-none text-left md:cursor-default"
                style={{ background: 'transparent' }}
                onClick={() => toggleExpand(detail.id)}
              >
                <div className="flex items-center justify-center rounded-lg shrink-0"
                  style={{ width: 32, height: 32, background: `${T.ac}10` }}>
                  <Icon size={16} style={{ color: T.ac }} />
                </div>
                <span className="flex-1 font-semibold" style={{ fontSize: 14, color: T.t1 }}>
                  {detail.title[lang] || detail.title.en}
                </span>
                <ChevronDown
                  size={16}
                  className="md:hidden transition-transform duration-200"
                  style={{ color: T.t3, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                />
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-40' : 'max-h-0 md:max-h-40'}`}>
                <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.55, margin: 0, padding: '0 20px 16px 64px' }}>
                  {detail.description[lang] || detail.description.en}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
