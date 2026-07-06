import { useQuery } from '@tanstack/react-query';
import { createShipmentService } from '../api/services/createShipmentService';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

export interface PublicLoadQuota {
  status: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  message?: string;
  actions?: {
    upgrade_url?: string;
  };
}

export function usePublicLoadQuota(draftId: number | null, broadcastType: 'private' | 'public') {
  const query = useQuery({
    queryKey: wizardQueryKeys.publicQuota(draftId),
    queryFn: () => createShipmentService.checkPublicLoadLimit(draftId ?? undefined),
    enabled: broadcastType === 'public',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    quota: broadcastType === 'public' ? (query.data ?? null) : null,
    loading: broadcastType === 'public' ? query.isLoading : false,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? 'Failed to load public load quota.'
          : null,
  };
}
