import React from 'react';
import type { AvailableTruck, DrawerMode } from '../../pages/SearchTrucks/types';
import { ExpansionPanel } from './ExpansionPanel';

interface ResultsTableProps {
  trucks: AvailableTruck[];
  expandedId: string | null;
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onToggleExpand: (id: string) => void;
  onBook: (truck: AvailableTruck, mode?: DrawerMode, occurrence?: string) => void;
  onPageChange: (page: number) => void;
  onMessage: (carrier: string) => void;
  onProfile: () => void;
  onClearFilters: () => void;
  t: (key: string) => string;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  trucks,
  expandedId,
  page,
  totalPages,
  total,
  perPage,
  onToggleExpand,
  onBook,
  onPageChange,
  onMessage,
  onProfile,
  onClearFilters,
  t,
}) => {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="sat-tbl-wrap">
      <table className="sat-tbl">
        <thead>
          <tr>
            <th>{t('satColVisibility')}</th>
            <th>{t('satColAvailable')}</th>
            <th>{t('satColPickup')}</th>
            <th>{t('satColDest')}</th>
            <th>{t('satColEquipment')}</th>
            <th>{t('satColTrip')}</th>
            <th>{t('satColCarrier')}</th>
            <th>{t('satColPrice')}</th>
            <th>{t('satColPosted')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {trucks.length === 0 && (
            <tr>
              <td colSpan={10}>
                <div className="sat-empty">
                  <div style={{ marginBottom: 8 }}>{t('satNoResults')}</div>
                  <button type="button" className="sat-f-clear" onClick={onClearFilters}>
                    {t('satClearAll')}
                  </button>
                </div>
              </td>
            </tr>
          )}

          {trucks.map((truck) => {
            const isExp = expandedId === truck.id;
            const preferredTag = truck.preferred ? (
              <span className="sat-bg sat-bg-ac" style={{ fontSize: 9, marginLeft: 4 }}>
                {t('satPreferred')}
              </span>
            ) : null;

            return (
              <React.Fragment key={truck.id}>
                <tr
                  className={`sat-row ${isExp ? 'expanded' : ''}`}
                  onClick={() => onToggleExpand(truck.id)}
                >
                  <td>
                    <span className={`sat-bg ${truck.vis === 'private' ? 'sat-bg-priv' : 'sat-bg-pub'}`}>
                      <span className="sat-bdot" />
                      {truck.vis === 'private' ? t('satPrivate') : t('satPublic')}
                    </span>
                  </td>
                  <td>
                    <strong>{truck.startDt}</strong>
                    <br />
                    <span className="sat-muted">
                      {truck.startTm} – {truck.endTm}
                    </span>
                    {truck.recurring && (
                      <span className="sat-grp-badge">🔁 {truck.recurrenceLabel}</span>
                    )}
                  </td>
                  <td>
                    <strong>{truck.pickup}</strong>{' '}
                    <span className="sat-muted">• {truck.radius}km</span>
                  </td>
                  <td>
                    {truck.dest === 'Any' ? (
                      <span className="sat-muted">{t('satAnyDirection')}</span>
                    ) : (
                      truck.dest
                    )}
                  </td>
                  <td>
                    {truck.truckType}
                    <br />
                    <span className="sat-muted">
                      {truck.specs} · {truck.capacity}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`sat-bg ${truck.trip === 'Direct only' ? 'sat-bg-wr' : 'sat-bg-ok'}`}
                    >
                      {truck.trip}
                    </span>
                  </td>
                  <td>
                    <div className="sat-cr-cell">
                      <div className="sat-cr-av">{truck.initials}</div>
                      <div>
                        <div className="sat-cr-name">{truck.carrier}</div>
                        <div className="sat-cr-rate">
                          ★ {truck.rating.toFixed(1)} · {truck.type}
                          {preferredTag}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {truck.price != null ? (
                      <span className="sat-price">€ {truck.price.toLocaleString()}</span>
                    ) : (
                      <span className="sat-offer-b">{t('satOfferBased')}</span>
                    )}
                  </td>
                  <td>
                    <span className="sat-muted">{truck.posted}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`sat-bid-btn ${truck.bidSent ? 'sent' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!truck.bidSent) onBook(truck);
                      }}
                    >
                      {truck.bidSent ? `✓ ${t('satSent')}` : t('satBookBid')}
                    </button>
                  </td>
                </tr>
                {isExp && (
                  <ExpansionPanel
                    truck={truck}
                    onBook={onBook}
                    onMessage={onMessage}
                    onProfile={onProfile}
                    t={t}
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="sat-pag">
        <div className="sat-pag-info">
          {t('showing')} {start}–{end} {t('of')} {total} {t('satResults')}
        </div>
        <div className="sat-pag-btns">
          <button
            type="button"
            className="sat-pg-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={`sat-pg-btn ${page === p ? 'act' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className="sat-pg-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};
