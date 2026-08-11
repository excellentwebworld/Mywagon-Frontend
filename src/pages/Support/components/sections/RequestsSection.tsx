import React from 'react';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useTheme } from '../../../../hooks/useTheme';
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
  const { T } = useTheme();

  const myRequests = useMyRequests({
    lang,
    active: activeTab === 'myRequests',
    disabled,
  });

  const myRequestsTabLabel =
    myRequests.meta !== null && myRequests.meta.total >= 0
      ? `${t('support.tabs.myRequests')} (${myRequests.meta.total})`
      : t('support.tabs.myRequests');

  return (
    <div>
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
          {myRequestsTabLabel}
        </button>
      </div>

      <div role="tabpanel">
        {activeTab === 'create' ? (
          <CreateRequestForm lang={lang} disabled={disabled} />
        ) : disabled ? (
          <div
            className="support-placeholder"
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              color: T.t3,
              background: T.sa,
              borderRadius: 12,
              fontSize: 13,
            }}
          >
            {t('support.requests.gatedMessage')}
          </div>
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
              replyLoading={myRequests.replyLoading}
              replyError={myRequests.replyError}
              onClose={myRequests.closeDrawer}
              onSubmitReply={myRequests.submitReply}
            />
          </>
        )}
      </div>
    </div>
  );
}
