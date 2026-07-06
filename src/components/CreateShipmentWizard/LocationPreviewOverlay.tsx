import React from 'react';
import type { LocationItem } from '../../context/AppContext';
import { LocationDetailPanel } from '../AddressBook/LocationDetailPanel';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import '../../styles/address-book.css';

interface LocationPreviewOverlayProps {
  location: LocationItem;
  onClose: () => void;
  t: AddressBookState['t'];
  onCopy: AddressBookState['handleCopy'];
}

const noopAsync = async () => {};

export const LocationPreviewOverlay: React.FC<LocationPreviewOverlayProps> = ({
  location,
  onClose,
  t,
  onCopy,
}) => (
  <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)' }} />
    <div
      className="relative h-full overflow-y-auto overflow-x-hidden wizard-location-preview-pane"
      style={{
        width: 380,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        animation: 'wizardSlideInRight 0.25s ease',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <LocationDetailPanel
        selectedLoc={location}
        setSelectedLoc={async () => {
          onClose();
        }}
        detailLoading={false}
        saving={false}
        t={t}
        handleCopy={onCopy}
        openEditModal={noopAsync}
        handleArchive={noopAsync}
        handleRestore={noopAsync}
      />
    </div>
  </div>
);

export default LocationPreviewOverlay;
