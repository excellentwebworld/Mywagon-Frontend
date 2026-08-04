import { apiGet } from '../client';

export type Localized = { en: string; el: string };

export type TrustService = {
  id: string;
  name: Localized;
  status: string;
  metric: string;
  metric_label: Localized;
  uptime: number;
  sparkline: string[];
};

export type TrustInfrastructure = {
  code: string;
  city: Localized;
  role: string;
  status: string;
  description: Localized;
};

export type TrustPillar = {
  id: string;
  icon: string;
  title: Localized;
  description: Localized;
  tags: string[];
  status_label: Localized;
};

export type TrustEncryptionRow = {
  layer: Localized;
  technology: string;
  status: string;
};

export type TrustCertification = {
  name: string;
  status: string;
  via?: string | null;
  description: Localized;
};

export type TrustComplianceDetail = {
  id: string;
  icon: string;
  title: Localized;
  description: Localized;
};

export type TrustOrgPosture = {
  kyc: { status: string; since: string | null; renews_at: string | null };
  sso: {
    enabled: boolean;
    status: string;
    provider: string | null;
    users_via_sso: number;
  };
  mfa: {
    status: string;
    enforced: boolean;
    total_users: number;
    users_with_mfa: number;
    note?: string | null;
  };
  password_policy: {
    strength: string;
    min_length: number;
    require_uppercase: boolean;
    require_numbers: boolean;
    require_special: boolean;
    hashing: string;
  };
  team?: {
    active_users: number;
    total_users: number;
    seat_total: number | null;
  };
};

export type TrustCenterPayload = {
  generated_at: string;
  overall_status: string;
  badges: Array<{ id: string; label_key: string; sub_key: string }>;
  security_dates: {
    last_security_audit?: string | null;
    last_penetration_test?: string | null;
    next_scheduled_audit?: string | null;
  } | null;
  services: TrustService[];
  uptime: {
    overall_90_days: number;
    history: Array<{ date: string; uptime: number; note?: Localized }>;
  };
  last_incident: {
    date: string;
    title: Localized;
    description: Localized;
    duration: string;
    impact: string;
    data_loss?: string;
    dataLoss?: string;
    status: string;
  } | null;
  infrastructure: TrustInfrastructure[];
  pillars: TrustPillar[];
  encryption: TrustEncryptionRow[];
  certifications: TrustCertification[];
  compliance_details: TrustComplianceDetail[];
  org_posture: TrustOrgPosture;
  footer: {
    security_email: string | null;
    security_url: string | null;
  };
};

export const trustSettingsService = {
  async get(): Promise<TrustCenterPayload> {
    const res = await apiGet<TrustCenterPayload>('/settings/trust');
    return res.data;
  },
};
