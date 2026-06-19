import React from 'react';
import type { LocationItem } from '../../context/AppContext';
import { FACILITY_TYPE_LABELS, PAGE_SIZE_OPTIONS, SORT_OPTIONS } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { LocationRowActions } from './LocationRowActions';

type Props = Pick<
  AddressBookState,
  | 'activeDirectoryName'
  | 'activeNode'
  | 'sortBy'
  | 'setSortBy'
  | 'filteredLocations'
  | 'selectedLoc'
  | 'setSelectedLoc'
  | 'loading'
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
  | 'showToast'
  | 'lang'
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

function getLocationTypeLabel(group: LocationItem['group'], lang: 'en' | 'el') {
  if (group === 'customer') return lang === 'el' ? 'Τοποθεσία Πελάτη' : 'Customer Location';
  return lang === 'el' ? 'Η Τοποθεσία μου' : 'My Location';
}

export const LocationList: React.FC<Props> = ({
  activeDirectoryName,
  activeNode,
  sortBy,
  setSortBy,
  filteredLocations,
  selectedLoc,
  setSelectedLoc,
  loading,
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
  showToast,
  lang,
}) => {
  const count = filteredLocations.length;
  const total = listMeta.total;
  const lastPage = listMeta.last_page ?? 1;
  const countLabel = loading ? 'Loading…' : `${total} location${total !== 1 ? 's' : ''}`;

  const pages = Array.from({ length: lastPage }, (_, i) => i + 1).slice(
    Math.max(0, currentPage - 3),
    Math.min(lastPage, currentPage + 2)
  );

  return (
    <div className="list-pane">
      <div className="list-toolbar">
        <span className="list-toolbar-title">{activeDirectoryName}</span>
        <select
          className="sort-sel"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy);
            showToast(`Sorted by ${e.target.value}`);
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
        <span className="list-info">{countLabel}</span>
      </div>

      <div className="tbl-scroll">
        <table className="ab-table">
          <thead>
            <tr>
              <th>Location</th>
              <th>City / Region</th>
              <th>Location Type</th>
              <th>Role</th>
              <th>Operational</th>
              <th>Contact</th>
              <th>Usage history</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="ab-empty-row">
                  {lang === 'el' ? 'Φόρτωση…' : 'Loading locations…'}
                </td>
              </tr>
            ) : count === 0 ? (
              <tr>
                <td colSpan={8} className="ab-empty-row">
                  {lang === 'el' ? 'Δεν βρέθηκαν τοποθεσίες' : t('noItems')}
                </td>
              </tr>
            ) : (
              filteredLocations.map((l) => {
                const isSel = selectedLoc?.id === l.id;
                const facilityLabel = FACILITY_TYPE_LABELS[l.type] ?? l.type;
                const usageCount = l.usageHistoryCount ?? 0;
                return (
                  <tr key={l.id} className={isSel ? 'selected' : ''} onClick={() => setSelectedLoc(l)}>
                    <td>
                      <div className="loc-name">{l.name}</div>
                      <div className="loc-meta">{l.company}</div>
                    </td>
                    <td>
                      <div className="loc-city">{l.city}</div>
                      <div className="loc-meta">{l.region || '—'}</div>
                    </td>
                    <td>
                      <span className={`location-type-badge ${l.group === 'customer' ? 'type-customer' : 'type-my'}`}>
                        {getLocationTypeLabel(l.group, lang)}
                      </span>
                      {facilityLabel && <div className="loc-meta">{facilityLabel}</div>}
                    </td>
                    <td>
                      <span className={`role-badge ${getRoleClass(l.role)}`}>{getRoleLabel(l.role, t)}</span>
                    </td>
                    <td>
                      <div className="ops-chips">
                        {l.appt && <span className="op-chip">Appt</span>}
                        {l.hours && <span className="op-chip">Hours</span>}
                        {l.dock && <span className="op-chip">{l.dock}</span>}
                      </div>
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
                        {usageCount} {lang === 'el' ? 'Φορτώσεις' : 'Loads'}
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

      <div className="ab-pag">
        <div className="pag-info">
          {total === 0 ? 'Showing 0 of 0' : `Showing ${pageStart}–${pageEnd} of ${total}`}
        </div>
        <div className="pag-controls">
          <select
            className="pag-length-sel"
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            disabled={loading}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <div className="pag-btns">
            <button
              type="button"
              className="pg-btn"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              ‹
            </button>
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                className={`pg-btn ${p === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="pg-btn"
              disabled={currentPage >= lastPage || loading}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
