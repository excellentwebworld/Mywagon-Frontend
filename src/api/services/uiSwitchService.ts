import axios from 'axios';
import { apiPost, axiosInstance } from '../client';
import type { ShipperUser } from '../auth/types';

export type UiTarget = 'classic' | 'react';

export interface UiSwitchResult {
  preferred_ui: UiTarget;
  redirect_url: string;
}

export interface HandoffExchangeResult {
  token: string;
  user: ShipperUser;
}

export const uiSwitchService = {
  async switchTo(target: UiTarget): Promise<UiSwitchResult> {
    const res = await apiPost<UiSwitchResult>('/ui/switch', { target });
    if (!res.data?.redirect_url) {
      throw new Error(res.message || 'Failed to switch UI');
    }
    return res.data;
  },

  /**
   * Public one-time code exchange (no bearer required).
   * Matches Laravel ShipperAuthResource + additional() login shape.
   */
  async exchangeHandoff(code: string): Promise<HandoffExchangeResult> {
    try {
      const response = await axiosInstance.post(
        '/ui/handoff/exchange',
        { code },
        { headers: { Authorization: '' } },
      );
      const body = response.data as {
        status?: boolean;
        success?: boolean;
        bearer_token?: string;
        message?: string;
        data?: ShipperUser;
      };
      if ((!body.status && !body.success) || !body.bearer_token || !body.data) {
        throw new Error(body.message || 'Invalid or expired switch link');
      }
      return { token: body.bearer_token, user: body.data };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message =
          (err.response?.data as { message?: string } | undefined)?.message ||
          err.message ||
          'Invalid or expired switch link';
        throw new Error(message);
      }
      throw err;
    }
  },

  async dismissWhatsNew(version = 'ui_revamp_v1'): Promise<void> {
    await apiPost('/whats-new/dismiss', { version });
  },

  async resetWhatsNew(): Promise<void> {
    await apiPost('/whats-new/reset');
  },
};
