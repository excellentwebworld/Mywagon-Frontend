/**
 * PoliciesSection — Legal document list with acceptance tracking.
 *
 * Shows all policies applicable to the user with status badges,
 * accept/acknowledge actions, marketing consent toggle, version info.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText, ShieldCheck, AlertTriangle, Download, Eye,
  CheckCircle, XCircle, Mail, X,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useToast } from '../../../hooks/useToast';
import { POLICIES, POLICY_ACCEPTANCES, MARKETING_CONSENT } from '../../../mocks/complianceData';

const POLICY_ICONS = {
  'compliance.pol.types.tos': '📄',
  'compliance.pol.types.privacy': '🔒',
  'compliance.pol.types.cookie': '🍪',
  'compliance.pol.types.dpa': '📋',
  'compliance.pol.types.aup': '⚖️',
  'compliance.pol.types.marketing': '📧',
  'compliance.pol.types.carrierLiability': '🚛',
  'compliance.pol.types.paymentTerms': '💳',
};

export default function PoliciesSection({ onPendingChange }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const { toast } = useToast();

  const [acceptances, setAcceptances] = useState({ ...POLICY_ACCEPTANCES });
  const [marketing, setMarketing] = useState(MARKETING_CONSENT);
  const [viewingPolicy, setViewingPolicy] = useState(null);

  const pendingPolicies = POLICIES.filter(p => {
    if (!p.applicable) return false;
    if (p.isToggle) return false;
    const acc = acceptances[p.id];
    return !acc || !acc.current;
  });

  const handleAccept = (policyId, version) => {
    const newAcceptances = {
      ...acceptances,
      [policyId]: { version, acceptedAt: new Date().toISOString().split('T')[0], current: true }
    };
    setAcceptances(newAcceptances);
    toast.success(t('compliance.toast.policyAccepted'));
    setViewingPolicy(null);
    // Recompute pending count and notify parent
    const remaining = POLICIES.filter(p => {
      if (!p.applicable || p.isToggle) return false;
      const acc = newAcceptances[p.id];
      return !acc || !acc.current;
    }).length;
    onPendingChange?.(remaining);
  };

  const toggleMarketing = () => {
    setMarketing(!marketing);
    toast.success(marketing ? t('compliance.toast.marketingDisabled') : t('compliance.toast.marketingEnabled'));
  };

  return (
    <div>
      {/* Pending alert */}
      {pendingPolicies.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
          <div className="flex-1">
            <span className="font-semibold" style={{ fontSize: 12, color: '#92400E' }}>
              {t('compliance.pol.pendingCount', { n: pendingPolicies.length })}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {POLICIES.map(policy => {
          const acc = acceptances[policy.id];
          const icon = POLICY_ICONS[policy.typeKey] || '📄';
          const isAccepted = acc?.current;
          const needsUpdate = acc && !acc.current;
          const notApplicable = !policy.applicable;
          const isToggle = policy.isToggle;

          let statusBadge;
          let statusColor;
          if (notApplicable) { statusBadge = t('compliance.pol.status.notApplicable'); statusColor = '#9CA3AF'; }
          else if (isToggle) { statusBadge = marketing ? t('compliance.pol.status.consented') : t('compliance.pol.status.notConsented'); statusColor = marketing ? '#10B981' : '#9CA3AF'; }
          else if (needsUpdate) { statusBadge = t('compliance.pol.status.updatePending'); statusColor = '#F59E0B'; }
          else if (isAccepted) { statusBadge = t('compliance.pol.status.accepted'); statusColor = '#10B981'; }
          else { statusBadge = t('compliance.pol.status.pending'); statusColor = '#F59E0B'; }

          return (
            <div key={policy.id} className="rounded-xl overflow-hidden" style={{ background: T.sf, border: `1px solid ${notApplicable ? T.bd : needsUpdate ? '#FDE68A' : T.bd}`, opacity: notApplicable ? 0.6 : 1 }}>
              <div className="flex items-center gap-3 px-5 py-4">
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold" style={{ fontSize: 13, color: T.t1 }}>{t(policy.typeKey)}</div>
                  <div style={{ fontSize: 11, color: T.t3 }}>
                    {t('compliance.pol.version')} {policy.version} · {policy.publishedAt}
                  </div>
                  {acc && (
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>
                      {needsUpdate
                        ? `${t('compliance.pol.youAccepted')} v${acc.version} ${t('compliance.pol.on')} ${acc.acceptedAt}`
                        : `${t('compliance.pol.acceptedOn')} ${acc.acceptedAt}`
                      }
                    </div>
                  )}
                  {policy.changesSummary && needsUpdate && (
                    <div style={{ fontSize: 11, color: '#92400E', marginTop: 4 }}>{policy.changesSummary}</div>
                  )}
                </div>

                <span className="px-2.5 py-1 rounded-full shrink-0" style={{ fontSize: 10, fontWeight: 600, background: `${statusColor}15`, color: statusColor }}>
                  {statusBadge}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 px-5 pb-3">
                {!notApplicable && !isToggle && (
                  <>
                    <button onClick={() => setViewingPolicy(policy)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}>
                      <Eye size={11} /> {t('compliance.pol.view')}
                    </button>
                    {(needsUpdate || !isAccepted) && (
                      <button onClick={() => handleAccept(policy.id, policy.version)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 11 }}>
                        <CheckCircle size={11} /> {needsUpdate ? t('compliance.pol.acceptUpdate', { v: policy.version }) : t('compliance.pol.accept')}
                      </button>
                    )}
                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 11 }}
                      onClick={() => toast.info(t('compliance.toast.downloadStarted'))}>
                      <Download size={11} /> PDF
                    </button>
                  </>
                )}
                {isToggle && !notApplicable && (
                  <button onClick={toggleMarketing} className="relative cursor-pointer border-none rounded-full shrink-0" style={{ width: 44, height: 24, background: marketing ? T.ac : T.bd, padding: 0 }}>
                    <span className="absolute rounded-full bg-white shadow" style={{ width: 20, height: 20, top: 2, left: marketing ? 22 : 2, transition: 'left 0.2s' }} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Policy Viewer Modal */}
      {viewingPolicy && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 300 }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewingPolicy(null)} />
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col" style={{ background: T.sf, border: `1px solid ${T.bd}` }}>
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.bd}` }}>
              <div>
                <h3 className="font-bold" style={{ fontSize: 16, color: T.t1 }}>{t(viewingPolicy.typeKey)}</h3>
                <div style={{ fontSize: 12, color: T.t3 }}>{t('compliance.pol.version')} {viewingPolicy.version} · {t('compliance.pol.effective')} {viewingPolicy.effectiveAt}</div>
              </div>
              <button onClick={() => setViewingPolicy(null)} className="cursor-pointer border-none bg-transparent"><X size={18} style={{ color: T.t3 }} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ fontSize: 13, color: T.t1, lineHeight: 1.8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>1. {t('compliance.pol.mockContent.definitions')}</h2>
              <p>1.1 "Platform" means the MYVAGON web application, mobile applications, and associated APIs operated by MYVAGON Technologies S.A.</p>
              <p>1.2 "Shipment" means a consignment of goods tendered by the Shipper for transport through the Platform.</p>
              <p>1.3 "Quote" means a binding price offer submitted by a Carrier or Forwarder in response to a Shipment request.</p>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>2. {t('compliance.pol.mockContent.registration')}</h2>
              <p>2.1 To use the Platform, you must register a business account and complete the KYC verification process.</p>
              <p>2.2 You represent that all information provided during registration is accurate, current, and complete.</p>
              <p>2.3 You are responsible for maintaining the confidentiality of your account credentials.</p>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 12 }}>3. {t('compliance.pol.mockContent.liability')}</h2>
              <p>3.1 MYVAGON acts as a marketplace facilitator and is not a party to the transport contract between Shipper and Carrier.</p>
              <p>3.2 MYVAGON is not liable for loss, damage, or delay of goods during transport.</p>
            </div>
            {/* Footer with accept */}
            {!acceptances[viewingPolicy.id]?.current && (
              <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${T.bd}` }}>
                <button onClick={() => setViewingPolicy(null)} className="px-4 py-2 rounded-lg cursor-pointer border-none" style={{ background: T.sa, border: `1px solid ${T.bd}`, color: T.t2, fontSize: 13 }}>
                  {t('compliance.pol.closeWithout')}
                </button>
                <button onClick={() => handleAccept(viewingPolicy.id, viewingPolicy.version)} className="px-4 py-2 rounded-lg cursor-pointer border-none font-semibold" style={{ background: T.ac, color: '#fff', fontSize: 13 }}>
                  <CheckCircle size={13} className="inline mr-1.5" />{t('compliance.pol.acceptVersion', { v: viewingPolicy.version })}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
