/**
 * KycSection — KYC verification with overall status + 5 expandable section cards.
 *
 * Each section: status badge, document list, reviewer notes, submit/resubmit actions.
 * Overall progress bar derived from section statuses.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown, ChevronRight, Upload, Eye, RefreshCw, Trash2,
  FileText, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { KYC_SECTIONS, KYC_OVERALL, KYC_STATUS_CONFIG } from '../../../mocks/complianceData';

export default function KycSection() {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [sections, setSections] = useState([...KYC_SECTIONS]);
  const [expanded, setExpanded] = useState(null);

  const overall = KYC_OVERALL;
  const overallCfg = KYC_STATUS_CONFIG[overall.status] || KYC_STATUS_CONFIG.not_started;

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  const handleSubmit = (sectionId) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, status: 'submitted', submittedAt: new Date().toISOString().split('T')[0] } : s));
    toast.success(t('compliance.toast.sectionSubmitted'));
  };

  const handleResubmit = (sectionId) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, status: 'submitted', reviewerNote: null } : s));
    toast.success(t('compliance.toast.sectionResubmitted'));
  };

  return (
    <div className="space-y-4">

      {/* ═══ Overall Status Card ═══ */}
      <div className="rounded-xl p-5" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: T.t3 }}>
              {t('compliance.kyc.overallStatus')}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ fontSize: 18 }}>{overallCfg.icon}</span>
              <span className="font-bold" style={{ fontSize: 18, color: overallCfg.color }}>
                {t(overallCfg.labelKey)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 11, color: T.t3 }}>{t('compliance.kyc.lastUpdated')}: {overall.lastUpdated}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.t1 }}>{overall.percent}%</div>
          </div>
        </div>

        <div className="w-full rounded-full overflow-hidden mb-2" style={{ height: 8, background: T.bd }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overall.percent}%`, background: overallCfg.color }} />
        </div>
        <div style={{ fontSize: 11, color: T.t3 }}>
          {t('compliance.kyc.progressText', { approved: overall.approvedCount, total: overall.totalSections })}
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mt-4">
          {sections.map(s => {
            const cfg = KYC_STATUS_CONFIG[s.status] || KYC_STATUS_CONFIG.not_started;
            return (
              <button key={s.id} onClick={() => toggleExpand(s.id)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg cursor-pointer border-none transition-all"
                style={{ background: expanded === s.id ? T.al : T.sa, border: `1px solid ${expanded === s.id ? T.ac + '40' : T.bd}` }}>
                <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: T.t3, textAlign: 'center', lineHeight: 1.2 }}>
                  {t(s.titleKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Section Cards ═══ */}
      {sections.map(section => {
        const cfg = KYC_STATUS_CONFIG[section.status] || KYC_STATUS_CONFIG.not_started;
        const isExpanded = expanded === section.id;
        const isEditable = ['not_started', 'draft', 'revision_required', 'more_info_needed', 'rejected'].includes(section.status);
        const isReadOnly = ['submitted', 'under_review', 'approved'].includes(section.status);

        return (
          <div key={section.id} className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${section.status === 'revision_required' ? '#FDE68A' : T.bd}` }}>
            {/* Header */}
            <button onClick={() => toggleExpand(section.id)}
              className="flex items-center justify-between w-full px-5 py-3.5 cursor-pointer border-none text-left"
              style={{ background: 'transparent' }}>
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown size={14} style={{ color: T.t3 }} /> : <ChevronRight size={14} style={{ color: T.t3 }} />}
                <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                <span className="font-bold" style={{ fontSize: 14, color: T.t1 }}>{t(section.titleKey)}</span>
              </div>
              <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                {t(cfg.labelKey)}
              </span>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-5 pb-5" style={{ borderTop: `1px solid ${T.bd}` }}>
                {/* Reviewer note */}
                {section.reviewerNote && (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-lg mt-4 mb-4" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
                    <AlertTriangle size={16} style={{ color: cfg.color, marginTop: 2 }} />
                    <div>
                      <div className="font-semibold mb-1" style={{ fontSize: 12, color: cfg.color }}>{t('compliance.kyc.reviewerNote')}</div>
                      <p style={{ fontSize: 12, color: T.t1, lineHeight: 1.6 }}>{section.reviewerNote}</p>
                      {section.reviewedAt && (
                        <div style={{ fontSize: 10, color: T.t3, marginTop: 4 }}>{t('compliance.kyc.reviewedOn')} {section.reviewedAt}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submitted info */}
                {isReadOnly && section.submittedAt && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg mt-4 mb-3" style={{ background: T.sa }}>
                    <Clock size={12} style={{ color: T.t3 }} />
                    <span style={{ fontSize: 12, color: T.t3 }}>
                      {section.status === 'approved'
                        ? `${t('compliance.kyc.approvedOn')} ${section.reviewedAt}`
                        : `${t('compliance.kyc.submittedOn')} ${section.submittedAt} — ${t('compliance.kyc.awaitingReview')}`
                      }
                    </span>
                  </div>
                )}

                {/* Documents */}
                {section.docs.length > 0 && (
                  <div className="mt-3">
                    <div className="font-semibold mb-2" style={{ fontSize: 12, color: T.t2 }}>{t('compliance.kyc.documents')}</div>
                    <div className="space-y-2">
                      {section.docs.map(doc => {
                        const docStatus = KYC_STATUS_CONFIG[doc.status] || KYC_STATUS_CONFIG.not_started;
                        return (
                          <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: T.sa, border: `1px solid ${T.bd}` }}>
                            <FileText size={16} style={{ color: docStatus.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate" style={{ fontSize: 12, color: T.t1 }}>{doc.name}</div>
                              <div style={{ fontSize: 10, color: T.t3 }}>{doc.size} · {t('compliance.kyc.uploadedOn')} {doc.uploadedAt}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 600, background: docStatus.bg, color: docStatus.color }}>
                              {t(docStatus.labelKey)}
                            </span>
                            {isEditable && (
                              <div className="flex gap-1 shrink-0">
                                <button className="p-1 cursor-pointer border-none bg-transparent" style={{ color: T.t3 }}><Eye size={12} /></button>
                                <button className="p-1 cursor-pointer border-none bg-transparent" style={{ color: T.t3 }}><RefreshCw size={12} /></button>
                                <button className="p-1 cursor-pointer border-none bg-transparent" style={{ color: '#EF4444' }}><Trash2 size={12} /></button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upload zone (for editable sections) */}
                {isEditable && (
                  <div className="mt-3 flex items-center justify-center p-6 rounded-lg cursor-pointer" style={{ border: `2px dashed ${T.bd}`, background: T.sa }}
                    onClick={() => toast.info(t('compliance.kyc.uploadMock'))}>
                    <div className="text-center">
                      <Upload size={20} style={{ color: T.t3, margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 12, fontWeight: 500, color: T.t2 }}>{t('compliance.kyc.dragDrop')}</div>
                      <div style={{ fontSize: 10, color: T.t3 }}>PDF, JPG, PNG · Max 10MB</div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isEditable && (
                  <div className="flex gap-2 mt-4">
                    {section.status === 'revision_required' || section.status === 'rejected' ? (
                      <button onClick={() => handleResubmit(section.id)} className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
                        {t('compliance.kyc.resubmit')}
                      </button>
                    ) : (
                      <>
                        <button className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 12 }}>
                          {t('compliance.kyc.saveDraft')}
                        </button>
                        <button onClick={() => handleSubmit(section.id)} className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 12 }}>
                          {t('compliance.kyc.submit')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
