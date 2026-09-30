import React from 'react';
import { Loader2 } from 'lucide-react';
import type { Partner } from '../../pages/Partners/types';
import type { PartnersSortField } from '../../pages/Partners/types';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import { ListSkeleton } from '../skeletons/ListSkeleton';

function SortColumnHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: PartnersSortField;
  sortField: PartnersSortField;
  sortDir: 'asc' | 'desc' | '';
  onSort: (field: PartnersSortField) => void;
}) {
  const isActive = sortField === field;
  const arrow = isActive ? (sortDir === 'asc' ? '↑' : '↓') : '↑';

  return (
    <th>
      <button
        type="button"
        className={`th-sort-btn${isActive ? ' active' : ''}`}
        onClick={() => onSort(field)}
      >
        {label}
        <span className="th-sort-arrow" aria-hidden="true">
          {arrow}
        </span>
      </button>
    </th>
  );
}

type Props = Pick<
  PartnersState,
  | 't'
  | 'filteredPartners'
  | 'sortField'
  | 'sortDir'
  | 'toggleSort'
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
  | 'canAcceptDeclinePartner'
  | 'acceptLoading'
  | 'declineLoading'
  | 'acceptLoadingId'
  | 'declineLoadingId'
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
  st_inv_recv: 'invitationReceived',
  st_suspended: 'suspendedPartners',
};

const TYPE_LABEL_KEYS: Record<Partner['type'], string> = {
  carrier_company: 'carriersType',
  freelancer_driver: 'freelancersType',
  supplier: 'suppliersType',
};

function partnerStatusText(p: Partner, t: (key: string, fallback?: string) => string): string {
  if (p.status === 'active') return t('activePartners');
  if (p.status === 'invited') return t('invitationSent');
  if (p.status === 'pending') return t('invitationReceived');
  return t('suspendedPartners');
}

function partnerTypeText(p: Partner, t: (key: string, fallback?: string) => string): string {
  const key = TYPE_LABEL_KEYS[p.type];
  return key ? t(key) : p.typeLabel || p.type;
}

export const PartnersList: React.FC<Props> = ({
  t,
  filteredPartners,
  sortField,
  sortDir,
  toggleSort,
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
  canAcceptDeclinePartner,
  acceptLoading,
  declineLoading,
  acceptLoadingId,
  declineLoadingId,
}) => {
  const total = listMeta.total ?? 0;
  const lastPage = listMeta.last_page ?? 1;
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);
  const listTitle = t(FACET_LABEL_MAP[facetFilter] ?? 'allPartners');

  return (
    <div className="ptn-list-pane">
      <div className="ptn-list-toolbar">
        <span className="ptn-list-title" id="ptn-list-title" style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>{listTitle}</span>
        <span className="ptn-list-info" id="ptn-list-info">
          {listLoading ? '…' : `${total} ${t('partnersLabel')}`}
        </span>
      </div>

      <div className={`ptn-tbl-scroll table-scroll-host${listLoading ? ' loading-active' : ''}`}>
        <table className="ptn-table">
          <thead>
            <tr>
              <SortColumnHeader
                label={t('partnerCol')}
                field="name"
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <th>{t('uniqueIdCol')}</th>
              <th>{t('typeCol')}</th>
              <th>{t('statusCol')}</th>
              <th>{t('contactCol')}</th>
              <th>{t('ratingTripsCol')}</th>
              <th>{t('capabilitiesCol')}</th>
              <SortColumnHeader
                label={t('createdAtCol')}
                field="created_at"
                sortField={sortField}
                sortDir={sortDir}
                onSort={toggleSort}
              />
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
            ) : filteredPartners.length === 0 && listLoading ? (
              <ListSkeleton type="table" rowCount={8} columnCount={8} />
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
                    <span className={`ptn-tp ${getTypeClass(p.type)}`}>{partnerTypeText(p, t)}</span>
                  </td>
                  <td>
                    <span className={`ptn-st ${getStatusClass(p.status)}`}>{partnerStatusText(p, t)}</span>
                    {p.canAcceptDecline && canAcceptDeclinePartner && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const pid = String(p.id);
                          const isAccepting = acceptLoading && acceptLoadingId === pid;
                          const isDeclining = declineLoading && declineLoadingId === pid;
                          const busy = isAccepting || isDeclining;
                          return (
                            <>
                              <button
                                type="button"
                                className="btn btn-ok btn-sm"
                                style={{ padding: '2px 6px', fontSize: 10, minWidth: 64, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                disabled={busy}
                                onClick={() => acceptPartner(p)}
                              >
                                {isAccepting ? <Loader2 size={12} className="animate-spin" /> : '✓'} {t('accept')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ padding: '2px 6px', fontSize: 10, minWidth: 64, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                                disabled={busy}
                                onClick={() => declinePartner(p)}
                              >
                                {isDeclining ? <Loader2 size={12} className="animate-spin" /> : '✕'} {t('decline')}
                              </button>
                            </>
                          );
                        })()}
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
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      <span style={{ color: '#F59E0B', fontWeight: 700, marginRight: 6 }}>
                        ★ {p.rating != null ? p.rating : '0.00'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {p.trips} {p.trips === 1 ? t('trip') : t('trips')}
                      </span>
                    </div>
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

      <div className="ptn-pag">
        <div className="ptn-pag-info">
          {total === 0
            ? `${t('showingLabel')} 0 ${t('ofLabel')} 0`
            : `${t('showingLabel')} ${start}–${end} ${t('ofLabel')} ${total}`}

          <select
            className="pag-length-sel ml-2"
            value={perPage}
            onChange={(e) => setPageSize(Number(e.target.value))}
            disabled={listLoading}
            aria-label={t('Partners.rows_per_page', 'Rows per page')}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {t('abPerPageOption', '{{n}} / page', { n })}
              </option>
            ))}
          </select>
        </div>
        <div className="ptn-pag-btns">
          <button
            type="button"
            className="ptn-pg-btn"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            ‹
          </button>
          {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
            const page = i + 1;
            return (
              <button
                key={page}
                type="button"
                className={`ptn-pg-btn${currentPage === page ? ' active' : ''}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            );
          })}
          <button
            type="button"
            className="ptn-pg-btn"
            disabled={currentPage >= lastPage}
            onClick={() => goToPage(currentPage + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};
