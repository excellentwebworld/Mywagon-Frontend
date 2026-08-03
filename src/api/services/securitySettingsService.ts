import { apiPut } from '../client';

export type ChangePasswordBody = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export const securitySettingsService = {
  async changePassword(body: ChangePasswordBody): Promise<void> {
    await apiPut('/settings/security/password', body);
  },
};
