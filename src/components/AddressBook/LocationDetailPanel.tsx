import React from 'react';
import type { LocationItem } from '../../context/AppContext';
import { TYPE_COLORS } from '../../pages/AddressBook/constants';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { DetailSection } from './DetailSection';

type Props = Pick<
  AddressBookState,
  | 'selectedLoc'
  | 'setSelectedLoc'
  | 'detailLoading'
  | 'saving'
  | 't'
  | 'showToast'
  | 'handleCopy'
  | 'handleDuplicate'
  | 'openEditModal'
  | 'handleArchive'
  | 'handleRestore'
  | 'goToCreateShipment'
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

export const LocationDetailPanel: React.FC<Props> = ({
  selectedLoc,
  setSelectedLoc,
  detailLoading,
  saving,
  t,
  showToast,
  handleCopy,
  handleDuplicate,
  openEditModal,
  handleArchive,
  handleRestore,
  goToCreateShipment,
}) => {
  if (!selectedLoc) {
    return (
      <div className="detail-pane">
        <div className="dp-inner" />
      </div>
    );
  }

  const l = selectedLoc;
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const mapUrl = mapsKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${l.lat},${l.lng}&zoom=15`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - 0.008}%2C${l.lat - 0.005}%2C${l.lng + 0.008}%2C${l.lat + 0.005}&layer=mapnik&marker=${l.lat}%2C${l.lng}`;
  const mapLink = mapsKey
    ? `https://www.google.com/maps?q=${l.lat},${l.lng}`
    : `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=16/${l.lat}/${l.lng}`;

  return (
    <div className={`detail-pane open`}>
      <div className="dp-inner">
        <div className="dp-hero">
          <button type="button" className="dp-close-btn" onClick={() => setSelectedLoc(null)}>
            ✕
          </button>
          <div className="dp-badges">
            <span className={`role-badge ${getRoleClass(l.role)}`}>{getRoleLabel(l.role, t)}</span>
            <span className="dp-type-badge" style={{ background: TYPE_COLORS[l.type] || 'var(--text-tertiary)' }}>
              {l.type}
            </span>
            {l.status === 'archived' && <span className="dp-archived-badge">Archived</span>}
            {l.tags.map((tag: string) => (
              <span key={tag} className="dp-tag">
                {tag}
              </span>
            ))}
          </div>
          <div className="dp-name">{l.name}</div>
          <div className="dp-company">
            {l.company}
            {l.code && (
              <>
                {' · '}
                <span className="dp-code">{l.code}</span>
              </>
            )}
          </div>
          <div className="dp-addr">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{l.address}</span>
            <button type="button" className="dp-copy-btn" onClick={() => handleCopy(l.address, 'Address copied')}>
              Copy
            </button>
          </div>
          <div className="dp-geo">
            <span className="geo-dot" style={{ background: l.geoVerified ? 'var(--success)' : 'var(--warning)' }} />
            {l.lat.toFixed(3)}, {l.lng.toFixed(3)}
            <span className="geo-status" style={{ color: l.geoVerified ? 'var(--success)' : 'var(--warning)' }}>
              · {l.geoVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>
          <div className="dp-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditModal(l)} disabled={saving}>
              ✏️ Edit
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleDuplicate(l)} disabled={saving}>
              Duplicate
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => goToCreateShipment(l)} disabled={saving}>
              + Shipment
            </button>
            {l.status === 'active' && (
              <button type="button" className="btn btn-secondary btn-sm dp-archive-btn" onClick={() => handleArchive(l)} disabled={saving}>
                Archive
              </button>
            )}
            {l.status === 'archived' && (
              <button type="button" className="btn btn-secondary btn-sm dp-restore-btn" onClick={() => handleRestore(l)} disabled={saving}>
                Restore
              </button>
            )}
          </div>
          {detailLoading && <div className="dp-loading-hint">Loading details…</div>}
        </div>

        <DetailSection title="🗺️ Location Map" bodyClassName="dp-map-sec-body">
          <div className="dp-map-box">
            <iframe title="Location Map" src={mapUrl} loading="lazy" />
            <a className="dp-map-link" href={mapLink} target="_blank" rel="noopener noreferrer">
              Open full map →
            </a>
          </div>
        </DetailSection>

        <DetailSection title="📊 Quick Stats">
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-val">{l.usageHistoryCount ?? 0}</div>
              <div className="stat-label">Usage history (loads)</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{l.shipments30}</div>
              <div className="stat-label">Shipments (30d)</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{l.shipments90}</div>
              <div className="stat-label">Shipments (90d)</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{l.otd ? `${l.otd}%` : '—'}</div>
              <div className="stat-label">On-time rate</div>
            </div>
          </div>
        </DetailSection>

        <DetailSection title="🕐 Hours & Scheduling">
          <div className="dp-row">
            <span className="label">Appointment</span>
            <span className="val">{l.appt ? '✅ Yes' : 'No'}</span>
          </div>
          <div className="dp-row">
            <span className="label">Hours</span>
            <span className="val dp-hours-val">{l.hours || 'Not set'}</span>
          </div>
          {(l.timeRanges ?? []).length > 0 && (
            <div className="dp-row">
              <span className="label">Time ranges</span>
              <span className="val dp-hours-val">
                {(l.timeRanges ?? []).map((tr) => `${tr.start_time}–${tr.end_time}`).join(', ')}
              </span>
            </div>
          )}
          <div className="dp-row">
            <span className="label">Dock</span>
            <span className="val">{l.dock || '—'}</span>
          </div>
        </DetailSection>

        <DetailSection title={`🤝 Contacts (${l.contacts.length})`}>
          {l.contacts.length > 0 ? (
            l.contacts.map((c: LocationItem['contacts'][number], idx: number) => (
              <div key={idx} className="dp-contact-card">
                <div className="dp-contact-role">{c.role}</div>
                <div className="dp-contact-name">{c.name}</div>
                <div className="dp-contact-info">
                  {c.phone && (
                    <>
                      📞 <span className="mono">{c.phone}</span>
                      <br />
                    </>
                  )}
                  {c.email && <>✉️ {c.email}</>}
                </div>
              </div>
            ))
          ) : (
            <div className="dp-no-contacts">
              No contacts.{' '}
              <span className="dp-add-contact-link" onClick={() => openEditModal(l)} onKeyDown={(e) => e.key === 'Enter' && openEditModal(l)} role="button" tabIndex={0}>
                Add one →
              </span>
            </div>
          )}
        </DetailSection>

        <DetailSection title="⚠️ Access & Restrictions">
          <div className="dp-row">
            <span className="label">Max truck</span>
            <span className="val">{l.maxTruck || '—'}</span>
          </div>
          <div className="dp-row">
            <span className="label">Max weight</span>
            <span className="val">{l.maxWeight || '—'}</span>
          </div>
          <div className="dp-row">
            <span className="label">ADR</span>
            <span className="val">{l.adr ? '✅' : '❌'}</span>
          </div>
          <div className="dp-row">
            <span className="label">Pallet exchange</span>
            <span className="val">{l.palletExchange ? '✅' : '❌'}</span>
          </div>
          <div className="dp-row">
            <span className="label">Equipment</span>
            <span className="val">{l.equipment.length ? l.equipment.join(', ') : '—'}</span>
          </div>
        </DetailSection>

        <DetailSection title="📝 Notes">
          {l.noteInternal && (
            <div className="dp-note internal">
              <div className="dp-note-label">🔒 Internal</div>
              {l.noteInternal}
            </div>
          )}
          {l.noteCarrier && (
            <div className="dp-note carrier">
              <div className="dp-note-label">🚛 Carrier-visible</div>
              {l.noteCarrier}
            </div>
          )}
          {!l.noteInternal && !l.noteCarrier && <div className="dp-no-notes">No notes.</div>}
        </DetailSection>

        <DetailSection title="🔖 References">
          <div className="dp-row">
            <span className="label">ID</span>
            <span className="val mono dp-id-val">{l.id}</span>
          </div>
          <div className="dp-row">
            <span className="label">Internal code</span>
            <span className="val">{l.code || '—'}</span>
          </div>
          <div className="dp-row">
            <span className="label">Customer code</span>
            <span className="val">{l.custCode || '—'}</span>
          </div>
          <div className="dp-row">
            <span className="label">Created</span>
            <span className="val">{l.created}</span>
          </div>
        </DetailSection>
      </div>
    </div>
  );
};
