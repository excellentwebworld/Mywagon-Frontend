import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  fetchTransporterProfile,
  type TransporterProfileData,
  type TransporterProfileMeta,
} from '../../api/services/transporterProfileService';
import type { TransporterProfileTarget } from './TransporterProfileContext';
import { TransporterProfileContent } from './TransporterProfileContent';
import { SubscriptionGateModal } from '../SearchTrucks/SubscriptionGateModal';
import '../../styles/transporter-profile.css';

interface TransporterProfileModalProps {
  open: boolean;
  target: TransporterProfileTarget | null;
  onClose: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const TransporterProfileModal: React.FC<TransporterProfileModalProps> = ({
  open,
  target,
  onClose,
  t,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [upgradeUrl, setUpgradeUrl] = useState('/subscription');
  const [data, setData] = useState<TransporterProfileData | null>(null);
  const [meta, setMeta] = useState<TransporterProfileMeta | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(
    async (pageNum: number) => {
      if (!target?.id || !target?.type) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchTransporterProfile(target.type, target.id, pageNum);
        setData(res.data);
        setMeta(res.meta);
        setPage(pageNum);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setSubscriptionBlocked(true);
          if (err.upgradeUrl) setUpgradeUrl(err.upgradeUrl);
          onClose();
          return;
        }
        setError(err instanceof Error ? err.message : t('errorLoadingProfile') || 'Failed to load profile');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [target, t, onClose]
  );

  useEffect(() => {
    if (open && target) {
      void load(1);
    } else {
      setData(null);
      setMeta(null);
      setError(null);
      setPage(1);
    }
  }, [open, target?.id, target?.type, load]);

  if (!open && !subscriptionBlocked) return null;

  return (
    <>
      {open && (
        <div className="tp-modal" role="dialog" aria-modal="true" aria-labelledby="tp-modal-title">
          <button type="button" className="tp-modal__backdrop" aria-label="Close" onClick={onClose} />
          <div className="tp-modal__panel">
            <div className="tp-modal__header">
              <h2 id="tp-modal-title">{t('transporterProfile') || 'Transporter profile'}</h2>
              <button type="button" className="tp-modal__close" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="tp-modal__body">
              {loading && !data ? (
                <div className="tp-loading">{t('loading') || 'Loading…'}</div>
              ) : error ? (
                <div className="tp-error">{error}</div>
              ) : data ? (
                <TransporterProfileContent
                  data={data}
                  meta={meta}
                  page={page}
                  loading={loading}
                  onPageChange={(p) => void load(p)}
                  t={t}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
      <SubscriptionGateModal
        open={subscriptionBlocked}
        upgradeUrl={upgradeUrl}
        onRemindLater={() => setSubscriptionBlocked(false)}
        t={t}
      />
    </>
  );
};
