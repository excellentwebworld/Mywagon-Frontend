import { apiGet, apiPost, apiPut } from '../client';

export type ChangePasswordBody = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export type TwoFactorMethod = 'authenticator' | 'email';

export type TwoFactorStatus = {
  enabled: boolean;
  method: TwoFactorMethod | null;
  confirmed_at: string | null;
};

export type TwoFactorSetupResult = {
  method: TwoFactorMethod;
  qr_code_svg?: string;
  masked_email?: string;
};

export type TwoFactorEnableResult = {
  enabled: boolean;
  method: TwoFactorMethod;
  confirmed_at: string | null;
  recovery_codes: string[];
};

export const securitySettingsService = {
  async changePassword(body: ChangePasswordBody): Promise<void> {
    await apiPut('/settings/security/password', body);
  },

  async getTwoFactorStatus(): Promise<TwoFactorStatus> {
    const res = await apiGet<TwoFactorStatus>('/settings/security/2fa');
    return res.data as TwoFactorStatus;
  },

  async setupTwoFactor(method: TwoFactorMethod): Promise<TwoFactorSetupResult> {
    const res = await apiPost<TwoFactorSetupResult>('/settings/security/2fa/setup', { method });
    return res.data as TwoFactorSetupResult;
  },

  async enableTwoFactor(method: TwoFactorMethod, code: string): Promise<TwoFactorEnableResult> {
    const res = await apiPost<TwoFactorEnableResult>('/settings/security/2fa/enable', { method, code });
    return res.data as TwoFactorEnableResult;
  },

  async disableTwoFactor(password: string, code: string): Promise<void> {
    await apiPost('/settings/security/2fa/disable', { password, code });
  },

  async resendTwoFactorEmail(): Promise<{ masked_email?: string }> {
    const res = await apiPost<{ masked_email?: string }>('/settings/security/2fa/resend-email', {});
    return (res.data as { masked_email?: string }) ?? {};
  },

  async getRecoveryCodes(password: string, code: string): Promise<string[]> {
    const res = await apiPost<{ recovery_codes: string[] }>('/settings/security/2fa/recovery-codes', {
      password,
      code,
    });
    return (res.data as { recovery_codes: string[] })?.recovery_codes ?? [];
  },

  async regenerateRecoveryCodes(password: string, code: string): Promise<string[]> {
    const res = await apiPost<{ recovery_codes: string[] }>(
      '/settings/security/2fa/recovery-codes/regenerate',
      { password, code }
    );
    return (res.data as { recovery_codes: string[] })?.recovery_codes ?? [];
  },
};
