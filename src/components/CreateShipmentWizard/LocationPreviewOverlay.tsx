import React from 'react';
import { X } from 'lucide-react';
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
  <div className="wizard-location-preview-overlay" onClick={onClose}>
    <div className="wizard-location-preview-backdrop" />
    <div
      className="wizard-location-preview-pane"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="wizard-location-preview-header">
        <span className="wizard-location-preview-title">
          {t('location') ? `${t('location')} Details` : 'Location Details'}
        </span>
        <button
          type="button"
          className="wizard-location-preview-close"
          onClick={onClose}
          aria-label={t('close') || 'Close'}
        >
          <X size={16} />
        </button>
      </header>
      <div className="wizard-location-preview-body">
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
  </div>
);

export default LocationPreviewOverlay;
