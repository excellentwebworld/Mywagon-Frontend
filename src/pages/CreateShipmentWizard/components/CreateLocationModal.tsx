import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';

interface CreateLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (locId: string) => void;
}

export const CreateLocationModal: React.FC<CreateLocationModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { lang, addLocation, locations } = useApp();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Greece');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!name.trim() || !address.trim() || !city.trim()) return;

    // We can predict the next ID to pass to onCreated
    const nextId = `LOC-${String(locations.length + 1).padStart(3, '0')}`;

    addLocation({
      name: name.trim(),
      company: name.trim(),
      group: 'customer',
      city: city.trim(),
      region: '',
      address: address.trim(),
      lat: 38.0,
      lng: 23.8,
      geoVerified: true,
      role: 'both',
      type: 'Warehouse',
      appt: true,
      hours: 'Mon-Fri 08:00-16:00',
      dock: 'Dock-level',
      equipment: ['Forklift'],
      maxTruck: '18.75m',
      maxWeight: '40T',
      adr: false,
      palletExchange: true,
      loadTime: 45,
      contacts: [],
      tags: [],
      code: '',
      custCode: '',
      lastUsed: 'Never',
      shipments30: 0,
      shipments90: 0,
      otd: 100,
      noteInternal: '',
      noteCarrier: '',
    });

    onCreated(nextId);

    // Reset
    setName('');
    setAddress('');
    setCity('');
    setCountry('Greece');
    onClose();
  };

  return (
    <div className={`modal-bg ${isOpen ? 'show' : ''}`} role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-h">
          <span>📍 {lang === 'el' ? 'Δημιουργία Νέας Τοποθεσίας' : 'Create New Location'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label className="field-l" htmlFor="newLocName">
              {lang === 'el' ? 'Όνομα Τοποθεσίας *' : 'Location Name *'}
            </label>
            <input
              id="newLocName"
              className="inp"
              placeholder="e.g. Patras Warehouse"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newLocAddr">
              {lang === 'el' ? 'Διεύθυνση *' : 'Address *'}
            </label>
            <input
              id="newLocAddr"
              className="inp"
              placeholder="e.g. 10 Industrial St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newLocCity">
              {lang === 'el' ? 'Πόλη *' : 'City *'}
            </label>
            <input
              id="newLocCity"
              className="inp"
              placeholder="e.g. Patras"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-l" htmlFor="newLocCountry">
              {lang === 'el' ? 'Χώρα *' : 'Country *'}
            </label>
            <input
              id="newLocCountry"
              className="inp"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-sm" onClick={onClose}>
            {lang === 'el' ? 'Ακύρωση' : 'Cancel'}
          </button>
          <button
            className="btn btn-p btn-sm"
            onClick={handleCreate}
            disabled={!name.trim() || !address.trim() || !city.trim()}
          >
            {lang === 'el' ? 'Δημιουργία Τοποθεσίας' : 'Create Location'}
          </button>
        </div>
      </div>
    </div>
  );
};
