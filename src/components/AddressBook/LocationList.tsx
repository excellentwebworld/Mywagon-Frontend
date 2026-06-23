import React from 'react';
import type { LocationItem } from '../../context/AppContext';
import type { SortOption } from '../../pages/AddressBook/types';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { TableLoadingOverlay } from '../ui/TableLoadingOverlay';
import { LocationRowActions } from './LocationRowActions';

type Props = Pick<
  AddressBookState,
  | 'activeDirectoryName'
  | 'activeNode'
  | 'sortBy'
  | 'sortDir'
  | 'toggleLocationSort'
  | 'filteredLocations'
  | 'selectedLoc'
  | 'setSelectedLoc'
  | 'loading'
  | 'listFetching'
  | 'saving'
  | 'listMeta'
  | 'currentPage'
  | 'setCurrentPage'
  | 'perPage'
  | 'setPerPage'
  | 'pageStart'
  | 'pageEnd'
  | 'openEditModal'
  | 'handleArchive'
  | 'handleRestore'
  | 't'
>;

function getRoleClass(role: LocationItem['role']) {
  if (role === 'pickup') return 'role-pickup';
  if (role === 'delivery') return 'role-delivery';
  return 'role-both';
}

function getRoleLabel(role: LocationItem['role'], t: AddressBookState['t']) {
  if (role === 'pickup') return t('pickup');
  if (role === 'delivery') return t('delivery');
  return 'Both';
}

function getLocationTypeLabel(group: LocationItem['group'], t: AddressBookState['t']) {
  if (group === 'customer') return t('abCustomerLocation');
  return t('abMyLocation');
}

function buildPageList(current: number, last: number): number[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set<number>([1, last, current, current - 1, current + 1, 2, last - 1]);
  return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
}

export const LocationList: React.FC<Props> = ({
  activeDirectoryName,
  activeNode,
  sortBy,
  sortDir,
  toggleLocationSort,
  filteredLocations,
  selectedLoc,
  setSelectedLoc,
  loading,
  listFetching,
  saving,
  listMeta,
  currentPage,
  setCurrentPage,
  perPage,
  setPerPage,
  pageStart,
  pageEnd,
  openEditModal,
  handleArchive,
  handleRestore,
  t,
}) => {
  const count = filteredLocations.length;
  const total = listMeta.total;
  const lastPage = listMeta.last_page ?? 1;
  const countLabel = loading ? t('abLoadingLocations') : `${total} location${total !== 1 ? 's' : ''}`;
  const pages = buildPageList(currentPage, lastPage);
  const sortActive = sortBy === 'Name A–Z';
  const tableLoading = loading || listFetching;

  return (
    <div className="list-pane">
      <div className="list-toolbar">
        <span className="list-toolbar-title">{activeDirectoryName}</span>
        <span className="list-info">{countLabel}</span>
      </div>

      <div className={`tbl-scroll${tableLoading ? ' loading-active' : ''}`}>
        <TableLoadingOverlay active={tableLoading} message={t('abLoadingLocations')} />
        <table className="ab-table">
          <thead>
            <tr>
              <th>
                <button
                  type="button"
                  className={`th-sort-btn${sortActive ? ' active' : ''}`}
                  onClick={toggleLocationSort}
                >
                  Location
                  {sortActive && <span className="th-sort-arrow">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                </button>
              </th>
              <th>City</th>
              <th>{t('abLocationType')}</th>
              <th>Role</th>
              <th>Operational</th>
              <th>Contact</th>
              <th>Usage history</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && count === 0 ? (
              <tr>
                <td colSpan={8} className="ab-empty-row" />
              </tr>
            ) : count === 0 ? (
              <tr>
                <td colSpan={8} className="ab-empty-row">
                  {t('noItems')}
                </td>
              </tr>
            ) : (
              filteredLocations.map((l) => {
                const isSel = selectedLoc?.id === l.id;
                const usageCount = l.usageHistoryCount ?? 0;
                return (
                  <tr key={l.id} className={isSel ? 'selected' : ''} onClick={() => setSelectedLoc(l)}>
                    <td>
                      <div className="loc-name">{l.name}</div>
                      <div className="loc-meta">{l.company}</div>
                    </td>
                    <td>
                      <div className="loc-city">{l.city || '—'}</div>
                    </td>
                    <td>
                      <span className={`location-type-badge ${l.group === 'customer' ? 'type-customer' : 'type-my'}`}>
                        {getLocationTypeLabel(l.group, t)}
                      </span>
                    </td>
                    <td>
                      <span className={`role-badge ${getRoleClass(l.role)}`}>{getRoleLabel(l.role, t)}</span>
                    </td>
                    <td>
                      <span className="ops-dock-label">{l.dock || '—'}</span>
                    </td>
                    <td>
                      {l.contacts[0] ? (
                        <div>
                          <div className="loc-contact-name">{l.contacts[0].name}</div>
                          <div className="contact-ph">{l.contacts[0].phone}</div>
                        </div>
                      ) : (
                        <span className="loc-no-contact">—</span>
                      )}
                    </td>
                    <td>
                      <span className="usage-history-cell">
                        {usageCount} {t('abLoads')}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <LocationRowActions
                        location={l}
                        setSelectedLoc={setSelectedLoc}
                        isArchivedView={activeNode === 'archived'}
                        onEdit={openEditModal}
                        onArchive={handleArchive}
                        onRestore={handleRestore}
                        disabled={saving}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="ab-pag">
        <div className="pag-info">
          {total === 0 ? 'Showing 0 of 0' : `Showing ${pageStart}–${pageEnd} of ${total}`}

          <select
            className="pag-length-sel ml-2"
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            disabled={loading}
            aria-label="Rows per page"
          >
            {[10, 12, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
        <div className="pag-controls">

          <div className="pag-btns">
            <button type="button" className="pg-btn" disabled={currentPage <= 1 || loading} onClick={() => setCurrentPage(1)}>
              «
            </button>
            <button type="button" className="pg-btn" disabled={currentPage <= 1 || loading} onClick={() => setCurrentPage(currentPage - 1)}>
              ‹
            </button>
            {pages.map((p, idx) => {
              const prev = pages[idx - 1];
              const gap = prev !== undefined && p - prev > 1;
              return (
                <React.Fragment key={p}>
                  {gap && <span className="pg-ellipsis">…</span>}
                  <button
                    type="button"
                    className={`pg-btn ${p === currentPage ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                    disabled={loading}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}
            <button type="button" className="pg-btn" disabled={currentPage >= lastPage || loading} onClick={() => setCurrentPage(currentPage + 1)}>
              ›
            </button>
            <button type="button" className="pg-btn" disabled={currentPage >= lastPage || loading} onClick={() => setCurrentPage(lastPage)}>
              »
            </button>
          </div>
          {/* <label className="pag-jump">
            <span>Go to</span>
            <input
              type="number"
              min={1}
              max={lastPage}
              defaultValue={currentPage}
              key={currentPage}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt((e.target as HTMLInputElement).value, 10);
                  if (val >= 1 && val <= lastPage) setCurrentPage(val);
                }
              }}
            />
          </label> */}
        </div>
      </div>
    </div>
  );
};
