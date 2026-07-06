import { useEffect, useState } from 'react';
import { ApiError, shipmentsService } from '../api';
import type { Shipment } from '../context/AppContext';

export function useShipment(id?: string) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setShipment(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    shipmentsService
      .getMapped(id)
      .then((data) => {
        if (cancelled) return;
        setShipment(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setShipment(null);
        setError(err instanceof ApiError ? err.message : 'Failed to load shipment.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { shipment, loading, error };
}

export function useShipmentsList() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    shipmentsService
      .listMapped({ per_page: 100 })
      .then((result) => {
        if (cancelled) return;
        setShipments(result.shipments);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setShipments([]);
        setError(err instanceof ApiError ? err.message : 'Failed to load shipments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { shipments, loading, error };
}
