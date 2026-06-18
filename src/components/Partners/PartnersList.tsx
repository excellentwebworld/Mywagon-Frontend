import React from 'react';
import type { Partner } from '../../context/AppContext';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import { SORT_OPTIONS } from '../../pages/Partners/constants';

type Props = Pick<
  PartnersState,
  | 't'
  | 'filteredPartners'
  | 'sortBy'
  | 'setSortBy'
  | 'facetFilter'
  | 'selectedPartner'
  | 'expandedRowId'
  | 'openDetailPanel'
  | 'rName'
  | 'showToast'
>;

function getTypeClass(type: Partner['type']) {
  if (type === 'carrier_company') return 'ptn-tp-c';
  if (type === 'freelancer_driver') return 'ptn-tp-f';
  return 'ptn-tp-s';
}

function getStatusClass(status: Partner['status']) {
  if (status === 'active') return 'ptn-st-ac';
  if (status === 'invited') return 'ptn-st-in';
  if (status === 'pending') return 'ptn-st-pe';
  return 'ptn-st-su';
}

function getOtClass(pct: number) {
  if (pct >= 85) return 'ptn-ki-g';
  if (pct >= 70) return 'ptn-ki-w';
  return 'ptn-ki-b';
}

function getCrClass(pct: number) {
  if (pct <= 5) return 'ptn-ki-g';
  if (pct <= 10) return 'ptn-ki-w';
  return 'ptn-ki-b';
}

function getTripStatusClass(st: string) {
  if (st === 'Delivered') return 'ptn-st-ac';
  if (st === 'In Transit') return 'ptn-st-in';
  return 'ptn-st-su';
}

// Map facet key to a display label key
const FACET_LABEL_MAP: Record<string, string> = {
  all: 'allPartners',
  carrier_company: 'carriersType',
  freelancer_driver: 'freelancersType',
  customer: 'customersType',
  st_active: 'activePartners',
  st_invited: 'invitedPartners',
  st_pending: 'pending',
  st_suspended: 'suspendedPartners',
};

export const PartnersList: React.FC<Props> = ({
  t,
  filteredPartners,
  sortBy,
  setSortBy,
  facetFilter,
  selectedPartner,
  expandedRowId,
  openDetailPanel,
  rName,
  showToast,
}) => {
  const count = filteredPartners.length;

  const listTitle = facetFilter.startsWith('reg_')
    ? rName(parseInt(facetFilter.slice(4)))
    : t(FACET_LABEL_MAP[facetFilter] ?? 'allPartners');

  return (
    <div className="ptn-list-pane">
      {/* Toolbar */}
      <div className="ptn-list-toolbar">
        <span className="ptn-list-title" id="ptn-list-title">{listTitle}</span>
        <select
          className="ptn-sort-sel"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy);
            showToast(`Sorted by ${e.target.value}`);
          }}
          id="ptn-sort-select"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="ptn-list-info" id="ptn-list-info">
          {count} {t('partnersLabel')}
        </span>
      </div>

      {/* Table */}
      <div className="ptn-tbl-scroll">
        <table className="ptn-table">
          <thead>
            <tr>
              <th>{t('partnerCol')}</th>
              <th>{t('typeCol')}</th>
              <th>{t('statusCol') || t('status') || 'Status'}</th>
              <th>{t('partnerCol') === 'Partner' ? 'Contact' : 'Επαφή'}</th>
              <th>{t('capabilitiesCol')}</th>
              <th>{t('loads30dCol')}</th>
              <th>{t('ontimeCol')}</th>
              <th>{t('cancelPctCol')}</th>
              <th>{t('lastActCol')}</th>
            </tr>
          </thead>
          <tbody id="ptn-tbody">
            {count === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="ptn-empty">
                    <div className="ei">👥</div>
                    <div className="et">{t('noPartners')}</div>
                    <div className="es">{t('noPartnersSub')}</div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPartners.map((p) => {
                const isSel = selectedPartner?.id === p.id;
                const isExp = expandedRowId === p.id;

                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={isSel ? 'selected' : ''}
                      onClick={() => openDetailPanel(p)}
                    >
                      {/* Partner name + region */}
                      <td>
                        <div className="ptn-p-name">
                          {p.name}
                          {p.tags.includes('preferred') && (
                            <span className="pref-star">★</span>
                          )}
                        </div>
                        <div className="ptn-p-region">{rName(p.regionIdx)}</div>
                      </td>

                      {/* Type badge */}
                      <td>
                        <span className={`ptn-tp ${getTypeClass(p.type)}`}>
                          {p.type === 'carrier_company' ? t('carrierShort') : p.type === 'freelancer_driver' ? t('freelancerShort') : t('customerShort')}
                        </span>
                      </td>

                      {/* Status badge */}
                      <td>
                        <span className={`ptn-st ${getStatusClass(p.status)}`}>
                          {t(p.status) || p.status}
                        </span>
                      </td>

                      {/* Contact */}
                      <td>
                        <div className="ptn-contact-cell">
                          {p.email}
                          <br />
                          {p.phone}
                        </div>
                      </td>

                      {/* Capabilities */}
                      <td>
                        {p.trucks.length > 0 ? (
                          <>
                            {p.trucks.slice(0, 2).map((tk) => (
                              <span key={tk} className="ptn-cap-chip">{tk}</span>
                            ))}
                            {p.trucks.length > 2 && (
                              <span className="ptn-cap-chip" style={{ color: 'var(--text-tertiary)' }}>
                                +{p.trucks.length - 2}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>

                      {/* Loads 30d */}
                      <td>
                        <span className="ptn-ki ptn-ki-n">{p.loads30d}</span>
                      </td>

                      {/* On-time */}
                      <td>
                        <span className={`ptn-ki ${getOtClass(p.otDelivery)}`}>{p.otDelivery}%</span>
                      </td>

                      {/* Cancel % */}
                      <td>
                        <span className={`ptn-ki ${getCrClass(p.cancelRate)}`}>{p.cancelRate}%</span>
                      </td>

                      {/* Last activity */}
                      <td>
                        <span className="ptn-ts">{p.lastActivity}</span>
                      </td>
                    </tr>

                    {/* Expanded row inline preview */}
                    {isExp && (
                      <tr className="ptn-expanded-row">
                        <td colSpan={9}>
                          <div className="ptn-expanded-inner">
                            {/* Capabilities preview */}
                            <div className="ptn-exp-section" style={{ flex: '0 0 180px' }}>
                              <h4>{t('capabilitiesCol')}</h4>
                              {p.trucks.length > 0 ? (
                                p.trucks.map((tk) => (
                                  <div key={tk} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '2px 0' }}>
                                    🚛 {tk}
                                  </div>
                                ))
                              ) : (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>—</span>
                              )}
                            </div>

                            {/* Recent trips preview */}
                            <div className="ptn-exp-section" style={{ flex: 1 }}>
                              <h4>{t('recentTrips')}</h4>
                              {p.trips.slice(0, 3).map((trip) => (
                                <div key={trip.id} className="ptn-exp-trip-row">
                                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{trip.id}</span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: 12, flex: 1, padding: '0 12px' }}>{trip.lane}</span>
                                  <span className="ptn-ts">{trip.pickupDate}</span>
                                  <span className={`ptn-st ${getTripStatusClass(trip.status)}`} style={{ fontSize: 9, marginLeft: 8 }}>
                                    {trip.status}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={(e) => { e.stopPropagation(); openDetailPanel(p); }}
                              >
                                {t('viewProfile')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => { e.stopPropagation(); showToast(`Message to ${p.name}`); }}
                              >
                                💬 {t('partnerMessage')}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="ptn-pag">
        <div className="ptn-pag-info">
          {count === 0
            ? `${t('showingLabel')} 0 ${t('ofLabel')} 0`
            : `${t('showingLabel')} 1–${count} ${t('ofLabel')} ${count}`}
        </div>
        <div className="ptn-pag-btns">
          <button type="button" className="ptn-pg-btn" disabled>‹</button>
          <button type="button" className="ptn-pg-btn active">1</button>
          <button type="button" className="ptn-pg-btn" disabled>›</button>
        </div>
      </div>
    </div>
  );
};
