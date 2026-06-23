import React from 'react';
import type { LocationItem } from '../../context/AppContext';
import type { SortOption } from '../../pages/AddressBook/types';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { TableLoadingOverlay } from '../ui/TableLoadingOverlay';
import { LocationRowActions } from './LocationRowActions';
import { Pagination } from '../ui/Pagination';

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

      <Pagination
        t={t}
        total={total ?? 0}
        currentPage={currentPage}
        perPage={perPage}
        pageSizeOptions={[10, 12, 25, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPerPage}
        showPageSizeSelector={true}
      />
    </div>
  );
};