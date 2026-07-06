import { useEffect, useMemo, useState } from 'react';
import { partnersService } from '../api/services/partnersService';
import { mapPartnerToStep3Carrier, type Step3Carrier } from '../api/mappers/mapPartnerToStep3Carrier';

export function useCreateShipmentPartners() {
  const [carriers, setCarriers] = useState<Step3Carrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPartners() {
      setLoading(true);
      setError(null);
      try {
        const [carrierResult, freelancerResult] = await Promise.all([
          partnersService.listPartnersMapped('carrier_company', ['active'], [], '', 1, 100, '', ''),
          partnersService.listPartnersMapped('freelancer_driver', ['active'], [], '', 1, 100, '', ''),
        ]);

        if (cancelled) return;

        const merged = [...carrierResult.partners, ...freelancerResult.partners].map(mapPartnerToStep3Carrier);
        setCarriers(merged);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load partners.');
        setCarriers([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPartners();

    return () => {
      cancelled = true;
    };
  }, []);

  const carriersList = useMemo(
    () =>
      carriers.filter(
        (p) => p.status === 'active' && (p.type === 'carrier_company' || p.type === 'freelancer_driver')
      ),
    [carriers]
  );

  return { carriersList, loading, error };
}
