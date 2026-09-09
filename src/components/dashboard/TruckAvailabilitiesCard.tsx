import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { availabilitiesService } from '../../api';
import { mapListItemToTruck } from '../../api/mappers/availabilitiesMapper';
import type { AvailableTruck } from '../../pages/SearchTrucks/types';
import { useTranslation } from '../../hooks/useTranslation';
import { TruckMapPreview } from './TruckMapPreview';

const DASH = '—';
const MAP_PIN_LIMIT = 50;

export const TruckAvailabilitiesCard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [partnerCount, setPartnerCount] = useState<number | null>(null);
  const [publicCount, setPublicCount] = useState<number | null>(null);
  const [trucks, setTrucks] = useState<AvailableTruck[]>([]);
  const [loading, setLoading] = useState(true);

  const goSearch = useCallback(() => {
    navigate('/search-trucks');
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      availabilitiesService.list({ visibility: 'private', per_page: 1 }),
      availabilitiesService.list({ visibility: 'public', per_page: 1 }),
      availabilitiesService.list({
        visibility: 'all',
        per_page: MAP_PIN_LIMIT,
        sort: 'latest_posting_date',
      }),
    ]).then(([partnerRes, publicRes, mapRes]) => {
      if (cancelled) return;

      if (partnerRes.status === 'fulfilled') {
        setPartnerCount(partnerRes.value.meta.total ?? 0);
      } else {
        setPartnerCount(null);
      }

      if (publicRes.status === 'fulfilled') {
        setPublicCount(publicRes.value.meta.total ?? 0);
      } else {
        setPublicCount(null);
      }

      if (mapRes.status === 'fulfilled') {
        setTrucks(mapRes.value.items.map(mapListItemToTruck));
      } else {
        setTrucks([]);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const formatCount = (value: number | null) => {
    if (loading || value == null) return DASH;
    return value.toLocaleString();
  };

  return (
    <div className="card dash-truck-card">
      <div className="card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" rx="2" />
            <path d="M16 8h4l3 5v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span>{t('dashTruckAvailTitle')}</span>
        </h3>
        <span className="card-link" style={{ cursor: 'pointer' }} onClick={goSearch}>
          {t('dashSearchTrucks')}
        </span>
      </div>
      <div className="dash-truck-counts">
        <div className="dash-truck-count">
          <div className="dash-truck-count-val">{formatCount(partnerCount)}</div>
          <div className="dash-truck-count-label">{t('dashPartnerTrucks')}</div>
        </div>
        <div className="dash-truck-count">
          <div className="dash-truck-count-val">{formatCount(publicCount)}</div>
          <div className="dash-truck-count-label">{t('dashPublicTrucks')}</div>
        </div>
      </div>
      <TruckMapPreview trucks={trucks} onActivate={goSearch} />
    </div>
  );
};
