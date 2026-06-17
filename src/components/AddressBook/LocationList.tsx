import React from 'react';
import type { LocationItem } from '../../context/AppContext';
import { SORT_OPTIONS } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';

type Props = Pick<
  AddressBookState,
  'activeDirectory' | 'sortBy' | 'setSortBy' | 'filteredLocations' | 'selectedLoc' | 'setSelectedLoc' | 't' | 'showToast' | 'lang'
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

export const LocationList: React.FC<Props> = ({
  activeDirectory,
  sortBy,
  setSortBy,
  filteredLocations,
  selectedLoc,
  setSelectedLoc,
  t,
  showToast,
  lang,
}) => {
  const count = filteredLocations.length;
  const countLabel = `${count} location${count !== 1 ? 's' : ''}`;

  return (
    <div className="list-pane">
      <div className="list-toolbar">
        <span className="list-toolbar-title">{activeDirectory?.name || 'All Locations'}</span>
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
              <th>Role</th>
              <th>Operational</th>
              <th>Contact</th>
              <th>Last used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {count === 0 ? (
              <tr>
                <td colSpan={7} className="ab-empty-row">
                  {lang === 'el' ? 'Δεν βρέθηκαν τοποθεσίες' : t('noItems')}
                </td>
              </tr>
            ) : (
              filteredLocations.map((l) => {
                const isSel = selectedLoc?.id === l.id;
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
                      <span className={`role-badge ${getRoleClass(l.role)}`}>{getRoleLabel(l.role, t)}</span>
                    </td>
                    <td>
                      <div className="ops-chips">
                        {l.appt && <span className="op-chip">📅 Appt</span>}
                        {l.hours && <span className="op-chip">🕐 Hours</span>}
                        {l.dock && <span className="op-chip">{l.dock}</span>}
                        {l.maxTruck && parseFloat(l.maxTruck) < 13 && (
                          <span className="op-chip warn">⚠ {l.maxTruck}</span>
                        )}
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
                      <span className="ts-cell">{l.lastUsed}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="act-btn"
                        title="Actions"
                        onClick={() => showToast('Actions menu')}
                      >
                        ⋯
                      </button>
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
          {count === 0 ? 'Showing 0 of 0' : `Showing 1–${count} of ${count}`}
        </div>
        <div className="pag-btns">
          <button type="button" className="pg-btn" disabled>
            ‹
          </button>
          <button type="button" className="pg-btn active">
            1
          </button>
          <button type="button" className="pg-btn" disabled>
            ›
          </button>
        </div>
      </div>
    </div>
  );
};
