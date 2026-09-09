import { apiGet, apiPost } from '../client';

export interface OnboardingStatus {
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
}

export const onboardingService = {
  async getStatus(): Promise<OnboardingStatus> {
    const res = await apiGet<OnboardingStatus>('/onboarding/status');
    return (
      res.data ?? {
        onboarding_completed: true,
        onboarding_completed_at: null,
      }
    );
  },

  async complete(): Promise<OnboardingStatus> {
    const res = await apiPost<OnboardingStatus>('/onboarding/complete', {
      completed: true,
    });
    return (
      res.data ?? {
        onboarding_completed: true,
        onboarding_completed_at: null,
      }
    );
  },

  async reset(): Promise<OnboardingStatus> {
    const res = await apiPost<OnboardingStatus>('/onboarding/reset');
    return (
      res.data ?? {
        onboarding_completed: false,
        onboarding_completed_at: null,
      }
    );
  },
};
