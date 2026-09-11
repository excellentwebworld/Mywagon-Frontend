import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { availabilitiesService } from '../../api';
import { mapListItemToTruck } from '../../api/mappers/availabilitiesMapper';
import type { AvailableTruck } from '../../pages/SearchTrucks/types';
import { useTranslation } from '../../hooks/useTranslation';
import { DashUpgradeBlock, formatDashError, translateDashMessage } from './dashErrorUtils';
import { DashTrucksSkeleton } from './DashboardSkeletons';
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
  const [error, setError] = useState<string | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState<string | undefined>();

  const goSearch = useCallback(() => {
    navigate('/search-trucks');
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setUpgradeUrl(undefined);

    Promise.allSettled([
      availabilitiesService.list({ visibility: 'private', per_page: 10 }),
      availabilitiesService.list({ visibility: 'public', per_page: 10 }),
      availabilitiesService.list({
        visibility: 'all',
        per_page: MAP_PIN_LIMIT,
        sort: 'latest_posting_date',
      }),
    ]).then(([partnerRes, publicRes, mapRes]) => {
      if (cancelled) return;

      const failures = [partnerRes, publicRes, mapRes].filter((r) => r.status === 'rejected');
      const allFailed = failures.length === 3;
      const any403 = failures.some((r) => {
        if (r.status !== 'rejected') return false;
        const info = formatDashError(r.reason, 'dashTrucksLoadFailed');
        return info.forbidden;
      });

      if (any403 || allFailed) {
        const firstReject = failures[0];
        const info =
          firstReject && firstReject.status === 'rejected'
            ? formatDashError(firstReject.reason, 'dashTrucksLoadFailed')
            : { key: 'dashTrucksLoadFailed', forbidden: false as const, upgradeUrl: undefined };
        setPartnerCount(null);
        setPublicCount(null);
        setTrucks([]);
        setError(info.key);
        setUpgradeUrl(info.upgradeUrl);
        setLoading(false);
        return;
      }

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
    if (value == null) return DASH;
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
      {loading ? (
        <DashTrucksSkeleton />
      ) : error ? (
        <div className="dash-widget-error" style={{ padding: 16 }}>
          {upgradeUrl ? (
            <DashUpgradeBlock upgradeUrl={upgradeUrl} t={t} />
          ) : (
            translateDashMessage(t, error)
          )}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};
