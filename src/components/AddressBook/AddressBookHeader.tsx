import React from 'react';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';

type Props = Pick<AddressBookState, 'lang' | 't' | 'exportCsv' | 'exporting' | 'openCreateModal'>;

export const AddressBookHeader: React.FC<Props> = ({ lang, t, exportCsv, exporting, openCreateModal }) => (
  <div className="ab-head anim">
    <div className="ab-head-l">
      <h1 className="ab-title">{lang === 'el' ? 'Βιβλίο Διευθύνσεων' : 'Address Book'}</h1>
      <p className="ab-sub">
        {lang === 'el'
          ? 'Διαχειριστείτε τοποθεσίες, επαφές και επιχειρησιακά προφίλ'
          : 'Manage locations, contacts and operational profiles'}
      </p>
    </div>
    <div className="ab-head-r">
      <button type="button" className="btn btn-secondary btn-md" onClick={exportCsv} disabled={exporting}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {exporting ? (lang === 'el' ? 'Εξαγωγή…' : 'Exporting…') : t('export')}
      </button>
      <button type="button" className="btn btn-primary btn-md" onClick={openCreateModal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {lang === 'el' ? 'Νέα Τοποθεσία' : 'New Location'}
      </button>
    </div>
  </div>
);
