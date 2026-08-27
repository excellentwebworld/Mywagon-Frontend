import React, { useEffect, useRef } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import type { Conversation } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: Conversation[];
  onSelectConversation: (id: number | string) => void;
  t: (key: string) => string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  results,
  onSelectConversation,
  t,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getBadgeLabel = (type: string) => {
    if (type === 'company') return t('chatModule.badgeCompany');
    if (type === 'freelancer') return t('chatModule.badgeFreelancer');
    if (type === 'driver') return t('chatModule.badgeDriver');
    return type;
  };

  return (
    <div
      className={`g-search-bg ${isOpen ? 'show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="g-search-box">
        <div className="gs-input-row">
          <Search size={20} />
          <input
            ref={inputRef}
            className="gs-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('chatModule.globalSearchPlaceholder')}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: '3px 8px',
              background: 'var(--sa, #F0F0F3)',
              borderRadius: 4,
              color: 'var(--t3, #8E8E9A)',
              border: '1px solid var(--bd, #E4E4E8)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ESC
          </kbd>
        </div>

        <div className="gs-results">
          {!query.trim() ? (
            <div className="gs-hint">{t('chatModule.searchHint')}</div>
          ) : results.length === 0 ? (
            <div className="gs-hint">
              {t('chatModule.searchNoResults')} &quot;{query}&quot;
            </div>
          ) : (
            results.map((c) => (
              <div
                key={c.id}
                className="gs-result"
                onClick={() => {
                  onSelectConversation(c.id);
                  onClose();
                }}
              >
                <div className="gs-icon">
                  <MessageSquare size={16} />
                </div>
                <div className="gs-r-text">
                  <div className="gs-r-title">
                    {c.name}{' '}
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--t3, #8E8E9A)',
                        fontWeight: 400,
                      }}
                    >
                      {getBadgeLabel(c.type)}
                    </span>
                  </div>
                  <div className="gs-r-sub">{c.lastMsg}</div>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--t3, #8E8E9A)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {c.lastTime}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
