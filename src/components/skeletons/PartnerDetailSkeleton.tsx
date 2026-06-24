import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import type { Partner } from '../../pages/Partners/types';

interface Props {
  selectedPartner: Partner;
  closeDetailPanel: () => void;
  t: (key: string) => string;
}

export const PartnerDetailSkeleton: React.FC<Props> = ({
  selectedPartner,
  closeDetailPanel,
  t,
}) => {
  const p = selectedPartner;
  const isCarrierOrDriver = p.type === 'carrier_company' || p.type === 'freelancer_driver';
  const isSupplier = p.type === 'supplier';

  return (
    <div className="ptn-detail-pane open" id="ptn-detail-pane">
      <div className="ptn-dp-inner">
        <div className="ptn-dp-hero">
          <button type="button" className="ptn-dp-close" onClick={closeDetailPanel} id="ptn-dp-close">
            ✕
          </button>
          <div className="ptn-dp-badges">
            <Skeleton width={80} height={20} borderRadius={10} style={{ marginRight: 6 }} />
            <Skeleton width={60} height={20} borderRadius={10} />
          </div>
          <div style={{ marginBottom: 6 }}><Skeleton height={24} width="70%" /></div>
          <div style={{ marginBottom: 12 }}><Skeleton height={16} width="40%" /></div>
          <div className="ptn-dp-meta">
            <Skeleton width={120} style={{ marginBottom: 4 }} />
            <br />
            <Skeleton width={180} style={{ marginBottom: 4 }} />
            <br />
            <Skeleton width={100} />
          </div>
          <div className="ptn-dp-actions">
            <Skeleton width={100} height={32} borderRadius={6} style={{ marginRight: 8 }} />
            <Skeleton width={80} height={32} borderRadius={6} />
          </div>
        </div>

        {isSupplier && (
          <div className="ptn-dps">
            <div className="ptn-dpsh">
              🏢 {t('companyProfileSection')}
              <span className="ptn-ch">▼</span>
            </div>
            <div className="ptn-dpsb">
              <div className="ptn-sg" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div key={idx} className="ptn-sc" style={{ textAlign: 'left' }}>
                    <div className="ptn-sl"><Skeleton width={80} /></div>
                    <div className="sv" style={{ fontSize: 13 }}><Skeleton width={100} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isCarrierOrDriver && (
          <>
            <div className="ptn-dps">
              <div className="ptn-dpsh">
                📊 {t('performanceKpis')}
                <span className="ptn-ch">▼</span>
              </div>
              <div className="ptn-dpsb">
                <div className="ptn-sg">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="ptn-sc-noborder">
                      <div className="sv"><Skeleton width={40} /></div>
                      <div className="ptn-sl"><Skeleton width={80} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ptn-dps">
              <div className="ptn-dpsh">
                🚛 {t('fleetSection')}
                <span className="ptn-ch">▼</span>
              </div>
              <div className="ptn-dpsb">
                <div className="ptn-fleet-row"><Skeleton width="60%" /></div>
                <div className="ptn-fleet-row"><Skeleton width="40%" /></div>
              </div>
            </div>
          </>
        )}

        <div className="ptn-dps">
          <div className="ptn-dpsh">
            📄 {t('contractsSection')}
            <span className="ptn-ch">▼</span>
          </div>
          <div className="ptn-dpsb">
            <table className="ptn-mt2">
              <thead>
                <tr>
                  <th><Skeleton width={50} /></th>
                  <th><Skeleton width={40} /></th>
                  <th><Skeleton width={30} /></th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><Skeleton width="80%" /></td>
                  <td><Skeleton width={40} /></td>
                  <td><Skeleton width={40} /></td>
                  <td />
                </tr>
                <tr>
                  <td><Skeleton width="60%" /></td>
                  <td><Skeleton width={40} /></td>
                  <td><Skeleton width={40} /></td>
                  <td />
                </tr>
              </tbody>
            </table>
            <Skeleton height={32} style={{ marginTop: 10, width: '100%' }} />
          </div>
        </div>

        <div className="ptn-dps">
          <div className="ptn-dpsh">
            🏷️ {t('notesSection')}
            <span className="ptn-ch">▼</span>
          </div>
          <div className="ptn-dpsb">
            <div className="mf" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                Tags
              </label>
              <div className="ptn-tag-list" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                <Skeleton width={50} height={24} borderRadius={12} />
                <Skeleton width={60} height={24} borderRadius={12} />
              </div>
              <div className="ptn-tag-input-group">
                <Skeleton height={32} style={{ flex: 1, marginRight: 8 }} />
                <Skeleton width={60} height={32} />
              </div>
            </div>
            <div className="mf" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
                Notes
              </label>
              <Skeleton height={70} />
            </div>
            <Skeleton height={32} style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
