import { useQuery } from '@tanstack/react-query';
import { createShipmentService } from '../api/services/createShipmentService';
import { wizardQueryKeys } from '../pages/CreateShipmentWizard/hooks/wizardQueryKeys';

export interface PrivateLoadQuota {
  status: boolean;
  limit?: number;
  used?: number;
  remaining?: number | null;
  is_unlimited?: boolean;
  message?: string;
  actions?: {
    upgrade_url?: string;
    addon_url?: string;
  };
}

export function usePrivateLoadQuota(draftId: number | null, broadcastType: 'private' | 'public') {
  const query = useQuery({
    queryKey: wizardQueryKeys.privateQuota(draftId),
    queryFn: () => createShipmentService.checkPrivateLoadLimit(draftId ?? undefined),
    enabled: broadcastType === 'private',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    quota: broadcastType === 'private' ? (query.data ?? null) : null,
    loading: broadcastType === 'private' ? query.isLoading : false,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? 'Failed to load private load quota.'
          : null,
  };
}
