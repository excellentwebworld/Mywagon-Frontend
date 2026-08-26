import { useQuery } from '@tanstack/react-query';
import {
  fetchReferralSummary,
  fetchReferralActivity,
  type ReferralSummaryResponse,
  type ReferralActivityResponse,
  type ListReferralActivityParams,
} from '../api/services/referralService';

export const referralQueryKeys = {
  all: ['referrals'] as const,
  summary: () => [...referralQueryKeys.all, 'summary'] as const,
  activities: (params?: ListReferralActivityParams) =>
    [...referralQueryKeys.all, 'activities', params] as const,
};

export function useReferralSummary(enabled: boolean = true) {
  return useQuery<ReferralSummaryResponse, Error>({
    queryKey: referralQueryKeys.summary(),
    queryFn: () => fetchReferralSummary(),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useReferralActivity(
  params: ListReferralActivityParams = {},
  enabled: boolean = true
) {
  return useQuery<ReferralActivityResponse, Error>({
    queryKey: referralQueryKeys.activities(params),
    queryFn: () => fetchReferralActivity(params),
    enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
