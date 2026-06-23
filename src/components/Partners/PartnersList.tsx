import React from 'react';
import type { Partner } from '../../pages/Partners/types';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import { TableLoadingOverlay } from '../ui/TableLoadingOverlay';
import { Pagination } from '../ui/Pagination';

type Props = Pick<
  PartnersState,
  | 't'
  | 'filteredPartners'
  | 'sortBy'
  | 'setSortBy'
  | 'facetFilter'
  | 'selectedPartner'
  | 'openDetailPanel'
  | 'listMeta'
  | 'listLoading'
  | 'currentPage'
  | 'perPage'
  | 'pageSizeOptions'
  | 'goToPage'
  | 'setPageSize'
  | 'acceptPartner'
  | 'declinePartner'
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

const FACET_LABEL_MAP: Record<string, string> = {
  all: 'allPartners',
  carrier_company: 'carriersType',
  freelancer_driver: 'freelancersType',
  supplier: 'suppliersType',
  st_active: 'activePartners',
  st_invited: 'invitationSent',
  inv_recv: 'invitationReceived',
  st_suspended: 'suspendedPartners',
};

export const PartnersList: React.FC<Props> = ({
  t,
  filteredPartners,
  sortBy,
  setSortBy,
  facetFilter,
  selectedPartner,
  openDetailPanel,
  listMeta,
  listLoading,
  currentPage,
  perPage,
  pageSizeOptions,
  goToPage,
  setPageSize,
  acceptPartner,
  declinePartner,
}) => {
  const total = listMeta.total ?? 0;
  const lastPage = listMeta.last_page ?? 1;
  const listTitle = t(FACET_LABEL_MAP[facetFilter] ?? 'allPartners');

  return (
    <div className="ptn-list-pane">
      <div className="ptn-list-toolbar">
        <span className="ptn-list-title" id="ptn-list-title">{listTitle}</span>
        <select
          className="ptn-sort-sel"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          id="ptn-sort-select"
        >
          <option value="name">{t('sortByName')}</option>
          <option value="added">{t('sortByCreated')}</option>
        </select>
        <span className="ptn-list-info" id="ptn-list-info">
          {listLoading ? '…' : `${total} ${t('partnersLabel')}`}
        </span>
      </div>

      <div className={`ptn-tbl-scroll table-scroll-host${listLoading ? ' loading-active' : ''}`}>
        <TableLoadingOverlay active={listLoading} message={t('loading')} />
        <table className="ptn-table">
          <thead>
            <tr>
              <th>{t('partnerCol')}</th>
              <th>{t('uniqueIdCol')}</th>
              <th>{t('typeCol')}</th>
              <th>{t('statusCol')}</th>
              <th>{t('contactCol')}</th>
              <th>{t('ratingTripsCol')}</th>
              <th>{t('capabilitiesCol')}</th>
              <th>{t('createdAtCol')}</th>
            </tr>
          </thead>
          <tbody id="ptn-tbody">
            {filteredPartners.length === 0 && !listLoading ? (
              <tr>
                <td colSpan={8}>
                  <div className="ptn-empty">
                    <div className="ei">👥</div>
                    <div className="et">{t('noPartners')}</div>
                    <div className="es">{t('noPartnersSub')}</div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPartners.map((p) => (
                <tr
                  key={p.id}
                  className={selectedPartner?.id === p.id ? 'selected' : ''}
                  onClick={() => openDetailPanel(p)}
                >
                  <td>
                    <div className="ptn-p-name">
                      {p.name}
                      {p.isPreferred && <span className="pref-star">★</span>}
                    </div>
                    <div className="ptn-p-region">{p.region || '—'}</div>
                  </td>
                  <td>
                    {p.uniqueId ? (
                      <span className="ts">{p.uniqueId}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className={`ptn-tp ${getTypeClass(p.type)}`}>{p.typeLabel}</span>
                  </td>
                  <td>
                    <span className={`ptn-st ${getStatusClass(p.status)}`}>{p.statusLabel}</span>
                    {p.canAcceptDecline && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-ok btn-sm"
                          style={{ padding: '2px 6px', fontSize: 10 }}
                          onClick={() => acceptPartner(p)}
                        >
                          ✓ {t('accept')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ padding: '2px 6px', fontSize: 10 }}
                          onClick={() => declinePartner(p)}
                        >
                          ✕ {t('decline')}
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="ptn-contact-cell">
                      {p.email}
                      <br />
                      {p.phone}
                    </div>
                  </td>
                  <td>
                    {p.rating != null || p.trips > 0 ? (
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        <span style={{ color: '#F59E0B', fontWeight: 700, marginRight: 6 }}>
                          ★ {p.rating ?? '—'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {p.trips} {p.trips === 1 ? t('trip') : t('trips')}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {p.capabilities.length > 0 ? (
                      <>
                        {p.capabilities.map((cap) => (
                          <span key={cap} className="ptn-cap-chip">{cap}</span>
                        ))}
                        {p.capabilitiesExtra > 0 && (
                          <span className="ptn-cap-chip" style={{ color: 'var(--text-tertiary)' }}>
                            +{p.capabilitiesExtra}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span className="ptn-ts">{p.createdAtFormatted}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        t={t}
        total={total}
        currentPage={currentPage}
        perPage={perPage}
        pageSizeOptions={pageSizeOptions}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        showPageSizeSelector={true} />
    </div>
  );
};