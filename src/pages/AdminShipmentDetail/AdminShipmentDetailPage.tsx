import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShipmentDetail } from '../ShipmentDetail/ShipmentDetail';
import { adminShipmentDetailService } from '../../api/services/adminShipmentDetailService';
import type { Shipment } from '../../context/AppContext';
import { ShipmentDetailSkeleton } from '../../components/skeletons/ShipmentDetailSkeleton';
import fullLogo from '../../assets/logo/fullLogo.svg';

/**
 * Admin Panel deep-link: read-only React shipment detail.
 * URL: /admin/shipments/{shipments.id}
 */
export const AdminShipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const shipmentId = (id || '').trim();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(Boolean(shipmentId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shipmentId || !/^\d+$/.test(shipmentId)) {
      setShipment(null);
      setLoading(false);
      setError('Invalid admin shipment link.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    adminShipmentDetailService
      .getMapped(shipmentId)
      .then((data) => {
        if (cancelled) return;
        setShipment(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setShipment(null);
        setError(err instanceof Error ? err.message : 'Failed to load shipment');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shipmentId]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm">
        <div className="max-w-[1280px] mx-auto px-5 lg:px-7 py-3 flex items-center justify-between gap-3">
          <img src={fullLogo} alt="MyVagon" className="h-8 w-auto" />
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            Admin view · Read only
          </span>
        </div>
      </header>

      {loading ? (
        <div className="max-w-[1280px] mx-auto px-5 lg:px-7 py-5">
          <ShipmentDetailSkeleton />
        </div>
      ) : (
        <ShipmentDetail readOnly shipmentOverride={shipment} overrideError={error} />
      )}
    </div>
  );
};
