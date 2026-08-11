import React from 'react';
import type { PartnersState } from '../../pages/Partners/hooks/usePartners';
import { ContextualTutorialTrigger } from '../Tutorials';
import '../../styles/tutorials.css';

type Props = Pick<PartnersState, 't' | 'openInviteModal'>;

export const PartnersHeader: React.FC<Props> = ({ t, openInviteModal }) => (
  <div className="ptn-head anim">
    <div className="ptn-head-l">
      <div className="tut-title-with-trigger">
        <div className="ptn-title">{t('partnersTitle')}</div>
        <ContextualTutorialTrigger tutorialKey="partners" />
      </div>
      <div className="ptn-sub">{t('partnersSubtitle')}</div>
    </div>
    <div className="ptn-head-r">
      <button type="button" className="btn btn-primary" onClick={openInviteModal} id="btn-invite-partner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('invitePartner')}
      </button>
    </div>
  </div>
);
