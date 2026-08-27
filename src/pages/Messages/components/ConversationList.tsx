import React from 'react';
import { Search } from 'lucide-react';
import type { Conversation, MessageFilterType } from '../types';
import { ConversationListSkeleton } from './ChatSkeleton';
import { formatConversationTime } from '../../../utils/timezone';

interface ConversationListProps {
  conversations: Conversation[];
  allConversationsCount: number;
  activeConvId: number | string | null;
  totalUnreadCount: number;
  currentFilter: MessageFilterType;
  convSearch: string;
  onFilterChange: (filter: MessageFilterType) => void;
  onSearchChange: (query: string) => void;
  onSelectConversation: (id: number | string) => void;
  loading?: boolean;
  t: (key: string) => string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  allConversationsCount,
  activeConvId,
  totalUnreadCount,
  currentFilter,
  convSearch,
  onFilterChange,
  onSearchChange,
  onSelectConversation,
  loading,
  t,
}) => {
  if (loading) {
    return <ConversationListSkeleton />;
  }
  const getBadgeLabel = (type: string) => {
    if (type === 'company') return t('chatModule.badgeCompany');
    if (type === 'freelancer') return t('chatModule.badgeFreelancer');
    if (type === 'driver') return t('chatModule.badgeDriver');
    if (type === 'admin') return 'Support';
    return type;
  };

  return (
    <div className="conv-pane" id="convPane">
      <div className="conv-header">
        <div className="conv-title">
          <span>{t('chatModule.pgTitle')}</span>
          {totalUnreadCount > 0 && (
            <span className="unread-total" id="unreadTotal">
              {totalUnreadCount}
            </span>
          )}
        </div>

        <div className="conv-search">
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder={t('chatModule.searchPlaceholder')}
            value={convSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="conv-filters">
          <button
            type="button"
            className={`cf-pill ${currentFilter === 'all' ? 'act' : ''}`}
            onClick={() => onFilterChange('all')}
          >
            {t('chatModule.filterAll')} <span className="cnt">{allConversationsCount}</span>
          </button>
          <button
            type="button"
            className={`cf-pill ${currentFilter === 'unread' ? 'act' : ''}`}
            onClick={() => onFilterChange('unread')}
          >
            {t('chatModule.filterUnread')}
            {totalUnreadCount > 0 && <span className="cnt">{totalUnreadCount}</span>}
          </button>
          <button
            type="button"
            className={`cf-pill ${currentFilter === 'carrier' ? 'act' : ''}`}
            onClick={() => onFilterChange('carrier')}
          >
            {t('chatModule.filterCarriers')}
          </button>
          <button
            type="button"
            className={`cf-pill ${currentFilter === 'freelancer' ? 'act' : ''}`}
            onClick={() => onFilterChange('freelancer')}
          >
            {t('chatModule.filterFreelancers')}
          </button>
          <button
            type="button"
            className={`cf-pill ${currentFilter === 'partner' ? 'act' : ''}`}
            onClick={() => onFilterChange('partner')}
          >
            {t('chatModule.filterPartners') || 'Partners'}
          </button>
        </div>
      </div>

      <div className="conv-list">
        {conversations.length === 0 ? (
          <div className="conv-empty-list" style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--t3, #8E8E9A)', fontSize: 13 }}>
            {t('chatModule.noConversationsFound') || 'No conversations found'}
          </div>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === activeConvId;
            const isUnread = c.unread > 0;
            const latestSid = c.latestSid || (c.chips && c.chips[0]);

            return (
              <div
                key={c.id}
                className={`conv-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                onClick={() => onSelectConversation(c.id)}
              >
                <div className={`ci-avatar ${c.avatarClass || (c.type === 'company' ? 'carrier' : c.type)}`}>
                  {c.avatarUrl ? (
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    c.initials || 'ΗΔ'
                  )}
                  {c.online && <span className="ci-online" />}
                </div>
                <div className="ci-body">
                  <div className="ci-top">
                    <span className="ci-name">{c.name}</span>
                    <span className="ci-time">{formatConversationTime(c.lastTime, c.lastTimestamp)}</span>
                  </div>
                  <div className="ci-mid">
                    <span className="ci-preview">{c.lastMsg}</span>
                    {c.unread > 0 && <span className="ci-unread">{c.unread}</span>}
                  </div>
                  <div className="ci-chips">
                    <span className={`ci-chip-role ${c.type}`}>
                      {getBadgeLabel(c.type)}
                    </span>
                    {c.isPartner && (
                      <span className="ci-chip-partner">
                        {t('chatModule.partnerBadge') || 'Partner'}
                      </span>
                    )}
                    {latestSid && (
                      <span className="ci-chip sid">
                        {latestSid}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
