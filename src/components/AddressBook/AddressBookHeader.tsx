import React from 'react';
import type { AddressBookState } from '../../pages/AddressBook/hooks/useAddressBook';
import { ContextualTutorialTrigger } from '../Tutorials';
import '../../styles/tutorials.css';

type Props = Pick<AddressBookState, 't' | 'exportExcel' | 'exporting' | 'openCreateModal'>;

export const AddressBookHeader: React.FC<Props> = ({ t, exportExcel, exporting, openCreateModal }) => (
  <div className="ab-head anim">
    <div className="ab-head-l">
      <div className="tut-title-with-trigger">
        <h1 className="ab-title">{t('addressBook')}</h1>
        <ContextualTutorialTrigger tutorialKey="addressBook" />
      </div>
      <p className="ab-sub">{t('abSubtitle')}</p>
    </div>
    <div className="ab-head-r">
      <button type="button" className="btn btn-secondary btn-md" onClick={exportExcel} disabled={exporting}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {exporting ? t('abExporting') : t('export')}
      </button>
      <button type="button" className="btn btn-primary btn-md" onClick={openCreateModal}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('abNewLocation')}
      </button>
    </div>
  </div>
);
