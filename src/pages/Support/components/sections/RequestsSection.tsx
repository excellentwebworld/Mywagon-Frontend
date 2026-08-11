import React from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { SupportRequestTab } from '../../types';
import { CreateRequestForm } from '../requests/CreateRequestForm';
import { MyRequestsTable } from '../requests/MyRequestsTable';
import { RequestDetailDrawer } from '../requests/RequestDetailDrawer';
import { useMyRequests } from '../../hooks/useMyRequests';

interface RequestsSectionProps {
  activeTab: SupportRequestTab;
  onTabChange: (tab: SupportRequestTab) => void;
  disabled?: boolean;
}

export function RequestsSection({
  activeTab,
  onTabChange,
  disabled = false,
}: RequestsSectionProps) {
  const { t, lang } = useTranslation();

  const myRequests = useMyRequests({
    lang,
    active: activeTab === 'myRequests',
    disabled,
  });

  return (
    <div className="requests-section">
      <div className="support-tabs" role="tablist" aria-label={t('support.sections.requests')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'create'}
          className={`support-tab${activeTab === 'create' ? ' active' : ''}`}
          onClick={() => onTabChange('create')}
        >
          {t('support.tabs.createRequest')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'myRequests'}
          className={`support-tab${activeTab === 'myRequests' ? ' active' : ''}`}
          onClick={() => onTabChange('myRequests')}
        >
          {t('support.tabs.myRequests')}
          {myRequests.meta !== null && myRequests.meta.total >= 0 ? (
            <span className="support-tab-count">{myRequests.meta.total}</span>
          ) : null}
        </button>
      </div>

      <div className="requests-tab-panel" role="tabpanel">
        {activeTab === 'create' ? (
          <CreateRequestForm lang={lang} disabled={disabled} />
        ) : disabled ? (
          <div className="support-placeholder">{t('support.requests.gatedMessage')}</div>
        ) : (
          <>
            <MyRequestsTable
              requests={myRequests.requests}
              loading={myRequests.loading}
              error={myRequests.error}
              page={myRequests.page}
              lastPage={myRequests.meta?.lastPage ?? 1}
              onPageChange={myRequests.setPage}
              onSelect={myRequests.openDrawer}
            />
            <RequestDetailDrawer
              open={myRequests.drawerOpen}
              loading={myRequests.detailLoading}
              error={myRequests.detailError}
              detail={myRequests.detail}
              ticketNumber={myRequests.selectedTicket}
              onClose={myRequests.closeDrawer}
            />
          </>
        )}
      </div>
    </div>
  );
}
