/**
 * complianceData.js — Mock data for KYC verification and Policies.
 */

// ═══ KYC ═══
export const KYC_SECTIONS = [
  {
    id: 'company_identity', titleKey: 'compliance.kyc.sec.companyIdentity',
    status: 'approved', submittedAt: '2024-10-15', reviewedAt: '2024-10-18',
    reviewerNote: null,
    docs: [
      { id: 'DK1', name: 'GEMI_Extract_Vikos_2024.pdf', size: '1.2 MB', uploadedAt: '2024-10-15', status: 'approved' },
      { id: 'DK2', name: 'VAT_Certificate.pdf', size: '0.8 MB', uploadedAt: '2024-10-15', status: 'approved' },
    ],
  },
  {
    id: 'authorized_reps', titleKey: 'compliance.kyc.sec.authorizedReps',
    status: 'approved', submittedAt: '2024-10-15', reviewedAt: '2024-10-18',
    reviewerNote: null,
    docs: [
      { id: 'DK3', name: 'ID_Front_Pavlos.jpg', size: '2.1 MB', uploadedAt: '2024-10-15', status: 'approved' },
      { id: 'DK4', name: 'ID_Back_Pavlos.jpg', size: '1.8 MB', uploadedAt: '2024-10-15', status: 'approved' },
    ],
  },
  {
    id: 'proof_of_address', titleKey: 'compliance.kyc.sec.proofOfAddress',
    status: 'revision_required', submittedAt: '2026-04-10', reviewedAt: '2026-04-12',
    reviewerNote: 'The utility bill provided is dated August 2023. Please upload a document dated within the last 3 months.',
    docs: [
      { id: 'DK5', name: 'DEH_Bill_2023.pdf', size: '0.5 MB', uploadedAt: '2026-04-10', status: 'rejected' },
    ],
  },
  {
    id: 'financial_verification', titleKey: 'compliance.kyc.sec.financialVerification',
    status: 'approved', submittedAt: '2024-10-15', reviewedAt: '2024-10-20',
    reviewerNote: null,
    docs: [
      { id: 'DK6', name: 'Eurobank_Confirmation.pdf', size: '0.3 MB', uploadedAt: '2024-10-15', status: 'approved' },
    ],
  },
  {
    id: 'industry_credentials', titleKey: 'compliance.kyc.sec.industryProfile',
    status: 'submitted', submittedAt: '2026-04-16', reviewedAt: null,
    reviewerNote: null,
    docs: [],
  },
];

export const KYC_OVERALL = {
  status: 'action_required',
  percent: 60,
  approvedCount: 3,
  totalSections: 5,
  lastUpdated: '2026-04-15',
  verifiedExpiry: null,
};

export const KYC_STATUS_CONFIG = {
  approved:           { color: '#10B981', bg: '#ECFDF5', icon: '✅', labelKey: 'compliance.kyc.status.approved' },
  submitted:          { color: '#3B82F6', bg: '#EFF6FF', icon: '🔵', labelKey: 'compliance.kyc.status.submitted' },
  under_review:       { color: '#3B82F6', bg: '#EFF6FF', icon: '🔵', labelKey: 'compliance.kyc.status.underReview' },
  revision_required:  { color: '#F59E0B', bg: '#FFFBEB', icon: '⚠️', labelKey: 'compliance.kyc.status.revisionRequired' },
  more_info_needed:   { color: '#3B82F6', bg: '#EFF6FF', icon: 'ℹ️', labelKey: 'compliance.kyc.status.moreInfo' },
  rejected:           { color: '#EF4444', bg: '#FEF2F2', icon: '❌', labelKey: 'compliance.kyc.status.rejected' },
  not_started:        { color: '#9CA3AF', bg: '#F3F4F6', icon: '⬜', labelKey: 'compliance.kyc.status.notStarted' },
  draft:              { color: '#9CA3AF', bg: '#F3F4F6', icon: '📝', labelKey: 'compliance.kyc.status.draft' },
  action_required:    { color: '#F59E0B', bg: '#FFFBEB', icon: '⚠️', labelKey: 'compliance.kyc.status.actionRequired' },
  verified:           { color: '#10B981', bg: '#ECFDF5', icon: '✅', labelKey: 'compliance.kyc.status.verified' },
  in_progress:        { color: '#F59E0B', bg: '#FFFBEB', icon: '🟡', labelKey: 'compliance.kyc.status.inProgress' },
};

// ═══ Policies ═══
export const POLICIES = [
  { id: 'POL-001', typeKey: 'compliance.pol.types.tos', version: '2.1', publishedAt: '2026-03-01', effectiveAt: '2026-04-01', level: 'user', applicable: true, changesSummary: 'Updated liability clauses (Section 7). Added arbitration clause (Section 12).' },
  { id: 'POL-002', typeKey: 'compliance.pol.types.privacy', version: '1.2', publishedAt: '2026-01-15', effectiveAt: '2026-01-15', level: 'user', applicable: true, changesSummary: null },
  { id: 'POL-003', typeKey: 'compliance.pol.types.cookie', version: '1.0', publishedAt: '2024-01-15', effectiveAt: '2024-01-15', level: 'user', applicable: true, changesSummary: null },
  { id: 'POL-004', typeKey: 'compliance.pol.types.dpa', version: '1.1', publishedAt: '2026-02-01', effectiveAt: '2026-02-01', level: 'org', applicable: true, changesSummary: null },
  { id: 'POL-005', typeKey: 'compliance.pol.types.aup', version: '1.0', publishedAt: '2024-01-15', effectiveAt: '2024-01-15', level: 'user', applicable: true, changesSummary: null },
  { id: 'POL-006', typeKey: 'compliance.pol.types.marketing', version: '1.0', publishedAt: '2024-01-15', effectiveAt: '2024-01-15', level: 'user', applicable: true, isToggle: true, changesSummary: null },
  { id: 'POL-007', typeKey: 'compliance.pol.types.carrierLiability', version: '1.0', publishedAt: '2024-01-15', effectiveAt: '2024-01-15', level: 'user', applicable: false, changesSummary: null },
  { id: 'POL-008', typeKey: 'compliance.pol.types.paymentTerms', version: '1.0', publishedAt: '2024-01-15', effectiveAt: '2024-01-15', level: 'org', applicable: true, changesSummary: null },
];

export const POLICY_ACCEPTANCES = {
  'POL-001': { version: '2.0', acceptedAt: '2025-10-02', current: false },
  'POL-002': { version: '1.2', acceptedAt: '2026-01-20', current: true },
  'POL-003': { version: '1.0', acceptedAt: '2024-01-15', current: true },
  'POL-004': { version: '1.1', acceptedAt: '2026-02-10', current: true },
  'POL-005': { version: '1.0', acceptedAt: '2024-01-15', current: true },
  'POL-008': { version: '1.0', acceptedAt: '2024-01-15', current: true },
};

export const MARKETING_CONSENT = false;
